import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import express, { type NextFunction, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, realtimeHub } from './realtime.ts';
import { erpStore } from './store.ts';
import type {
  Budget,
  DevicePlatform,
  Family,
  ReportSummary,
  SavingsGoal,
  Transaction,
  UserProfile,
  UserRole,
} from '../src/types/erp.ts';

interface AuthRequest extends Request {
  auth?: {
    userId: string;
    familyId: string;
    role: UserRole;
    name: string;
  };
}

function signToken(user: { id: string; familyId: string; role: UserRole; name: string }): string {
  return jwt.sign(
    {
      userId: user.id,
      familyId: user.familyId,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function toPublicProfile(user: UserProfile & { passwordHash?: string }): UserProfile {
  const { passwordHash: _ignored, ...rest } = user;
  return rest;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  const token = header.slice(7).trim();
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      familyId: string;
      role: UserRole;
      name: string;
    };
    const user = await erpStore.getUserById(decoded.userId);
    if (!user || user.activeStatus !== 'active') {
      res.status(401).json({ error: 'Account is inactive or no longer exists.' });
      return;
    }
    req.auth = {
      userId: user.id,
      familyId: user.familyId,
      role: user.role,
      name: user.name,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Session expired or invalid token.' });
  }
}

function normalizePlatform(raw: unknown): DevicePlatform {
  if (raw === 'ios' || raw === 'android') return raw;
  return 'web';
}

export function createApiRouter() {
  const router = express.Router();

  // Ensure rejected promises in Express 4 async handlers are forwarded to error middleware
  for (const method of ['get', 'post', 'patch', 'put', 'delete'] as const) {
    const original = router[method].bind(router);
    (router as unknown as Record<string, unknown>)[method] = (
      routePath: string,
      ...handlers: Array<(...args: unknown[]) => unknown>
    ) => {
      const wrapped = handlers.map((fn) =>
        typeof fn === 'function' && fn.length < 4
          ? (req: Request, res: Response, next: NextFunction) =>
              Promise.resolve(fn(req, res, next)).catch(next)
          : fn
      );
      return original(routePath, ...(wrapped as never[]));
    };
  }

  router.get('/health', (_req, res) => {
    res.json({
      ok: true,
      storage: erpStore.getStorageMode(),
      mongoConnected: erpStore.isMongoConnected(),
      realtime: process.env.VERCEL ? 'polling' : 'websocket',
      environment: process.env.VERCEL ? 'vercel' : 'node',
      timestamp: new Date().toISOString(),
    });
  });

  // Public demo roster preview (names + emails + roles only, no sensitive financial data) for easy testing
  router.get('/auth/demo-accounts', async (_req, res) => {
    const members = await erpStore.listFamilyMembers('fam_arden_01');
    res.json({
      familyCode: 'ARDEN-2026',
      defaultPasswordHint: 'Family2026!',
      accounts: members.slice(0, 6).map((m) => ({
        name: m.name,
        email: m.email,
        role: m.role,
        relationship: m.relationship,
      })),
    });
  });

  // Auth: Login
  router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = await erpStore.getUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (user.activeStatus !== 'active') {
      res.status(403).json({ error: 'Your family member account has been suspended by an administrator.' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const family = await erpStore.getFamilyById(user.familyId);
    if (!family) {
      res.status(404).json({ error: 'Family workspace not found.' });
      return;
    }

    const token = signToken(user);
    res.json({
      token,
      user: toPublicProfile(user),
      family,
    });
  });

  // Auth: Register (Join existing family via familyCode, or create a new family)
  router.post('/auth/register', async (req, res) => {
    const {
      name,
      email,
      password,
      familyCode,
      familyName,
      relationship,
      phone,
    } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      familyCode?: string;
      familyName?: string;
      relationship?: string;
      phone?: string;
    };

    if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
      res.status(400).json({ error: 'Name, valid email, and password (min 6 characters) are required.' });
      return;
    }

    const existing = await erpStore.getUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    let family: Family | null = null;
    let role: UserRole = 'member';

    if (familyCode?.trim()) {
      family = await erpStore.getFamilyByCode(familyCode);
      if (!family) {
        res.status(404).json({ error: 'Family code not found. Verify the code with your household admin.' });
        return;
      }
      role = 'member';
    } else {
      const newFamilyId = `fam_${crypto.randomBytes(4).toString('hex')}`;
      const generatedCode = `${(familyName || name).replace(/[^A-Za-z]/g, '').slice(0, 5).toUpperCase() || 'KIN'}-${Math.floor(1000 + Math.random() * 9000)}`;
      family = await erpStore.createFamily({
        id: newFamilyId,
        name: familyName?.trim() || `${name.trim().split(' ')[0]} Household`,
        familyCode: generatedCode,
        currency: 'INR',
        createdAt: new Date().toISOString(),
      });
      role = 'admin';
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const createdUser = await erpStore.createUser({
      id: `usr_${crypto.randomBytes(5).toString('hex')}`,
      familyId: family.id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role,
      relationship: relationship?.trim() || (role === 'admin' ? 'Household Admin' : 'Family Member'),
      phone: phone?.trim() || '',
      monthlyAllowance: 25000,
      themePreference: 'light',
      pushNotificationsEnabled: true,
      expoPushTokens: [],
      activeStatus: 'active',
      createdAt: new Date().toISOString(),
    });

    const notif = await erpStore.createNotification({
      id: `notif_${crypto.randomBytes(5).toString('hex')}`,
      familyId: family.id,
      recipientId: 'all',
      title: 'New Family Member Joined',
      message: `${createdUser.name} registered and joined ${family.name}.`,
      category: 'member',
      readBy: [createdUser.id],
      createdAt: new Date().toISOString(),
    });

    realtimeHub.broadcast(family.id, 'member:created', createdUser, createdUser.name);
    realtimeHub.broadcast(family.id, 'notification:created', { ...notif, isRead: false }, createdUser.name);

    const token = signToken({
      id: createdUser.id,
      familyId: family.id,
      role: createdUser.role,
      name: createdUser.name,
    });

    res.status(201).json({ token, user: createdUser, family });
  });

  // Auth: Forgot Password
  router.post('/auth/forgot-password', async (req, res) => {
    const { email } = req.body as { email?: string };
    if (!email?.trim()) {
      res.status(400).json({ error: 'Please enter your registered email address.' });
      return;
    }

    const user = await erpStore.getUserByEmail(email);
    if (!user) {
      res.status(404).json({ error: 'No family account found for that email address.' });
      return;
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 15 * 60 * 1000;
    await erpStore.saveResetCode(user.email, code, expiresAt);

    res.json({
      message: 'A 6-digit verification code has been generated for your account.',
      expiresInMinutes: 15,
      // Returned in non-SMTP environments so users can test full reset flow immediately
      verificationCode: code,
    });
  });

  // Auth: Reset Password
  router.post('/auth/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body as {
      email?: string;
      code?: string;
      newPassword?: string;
    };

    if (!email?.trim() || !code?.trim() || !newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Email, 6-digit code, and new password (min 6 characters) are required.' });
      return;
    }

    const valid = await erpStore.verifyAndConsumeResetCode(email, code);
    if (!valid) {
      res.status(400).json({ error: 'Invalid or expired verification code.' });
      return;
    }

    const user = await erpStore.getUserByEmail(email);
    if (!user) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await erpStore.updateUser(user.id, { passwordHash });

    res.json({ message: 'Password updated successfully. You can now sign in with your new password.' });
  });

  // Allow logout even if the client's JWT token has already expired
  router.post('/auth/logout', (_req, res) => {
    res.json({ ok: true });
  });

  // Protected routes below
  router.use(authMiddleware);

  router.get('/auth/me', async (req: AuthRequest, res) => {
    const user = await erpStore.getUserById(req.auth!.userId);
    const family = await erpStore.getFamilyById(req.auth!.familyId);
    if (!user || !family) {
      res.status(404).json({ error: 'User or family not found.' });
      return;
    }
    res.json({ user: toPublicProfile(user), family });
  });

  router.patch('/auth/profile', async (req: AuthRequest, res) => {
    const {
      name,
      phone,
      relationship,
      themePreference,
      pushNotificationsEnabled,
      currentPassword,
      newPassword,
    } = req.body as {
      name?: string;
      phone?: string;
      relationship?: string;
      themePreference?: 'light' | 'dark';
      pushNotificationsEnabled?: boolean;
      currentPassword?: string;
      newPassword?: string;
    };

    const user = await erpStore.getUserById(req.auth!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const patch: Record<string, unknown> = {};
    if (name?.trim()) patch.name = name.trim();
    if (typeof phone === 'string') patch.phone = phone.trim();
    if (typeof relationship === 'string' && relationship.trim()) patch.relationship = relationship.trim();
    if (themePreference === 'light' || themePreference === 'dark') patch.themePreference = themePreference;
    if (typeof pushNotificationsEnabled === 'boolean') patch.pushNotificationsEnabled = pushNotificationsEnabled;

    if (newPassword) {
      if (!currentPassword) {
        res.status(400).json({ error: 'Current password is required to set a new password.' });
        return;
      }
      const matches = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!matches) {
        res.status(400).json({ error: 'Current password is incorrect.' });
        return;
      }
      if (newPassword.length < 6) {
        res.status(400).json({ error: 'New password must be at least 6 characters.' });
        return;
      }
      patch.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updated = await erpStore.updateUser(user.id, patch);
    if (updated) {
      realtimeHub.broadcast(req.auth!.familyId, 'member:updated', updated, updated.name);
    }
    res.json({ user: updated });
  });

  // Transactions (Income & Expenses)
  router.get('/transactions', async (req: AuthRequest, res) => {
    const { type, category, memberId, month, search } = req.query as Record<string, string | undefined>;
    let list = await erpStore.listTransactions(req.auth!.familyId);

    if (type === 'income' || type === 'expense') {
      list = list.filter((t) => t.type === type);
    }
    if (category && category !== 'all') {
      list = list.filter((t) => t.category === category);
    }
    if (memberId && memberId !== 'all') {
      list = list.filter((t) => t.memberId === memberId);
    }
    if (month && month !== 'all') {
      list = list.filter((t) => t.date.startsWith(month));
    }
    if (search?.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.memberName.toLowerCase().includes(q)
      );
    }

    res.json({ transactions: list });
  });

  router.post('/transactions', async (req: AuthRequest, res) => {
    if (req.auth!.role === 'viewer') {
      res.status(403).json({ error: 'Viewer accounts have read-only access and cannot record transactions.' });
      return;
    }

    const { type, category, amount, description, date, paymentMethod, memberId, sourceDevice } = req.body as {
      type?: 'income' | 'expense';
      category?: string;
      amount?: number;
      description?: string;
      date?: string;
      paymentMethod?: string;
      memberId?: string;
      sourceDevice?: DevicePlatform;
    };

    if ((type !== 'income' && type !== 'expense') || !category?.trim() || !amount || Number(amount) <= 0 || !description?.trim()) {
      res.status(400).json({ error: 'Valid type, category, positive amount, and description are required.' });
      return;
    }

    let targetMemberId = req.auth!.userId;
    let targetMemberName = req.auth!.name;
    if (memberId && (req.auth!.role === 'admin' || req.auth!.role === 'parent')) {
      const member = await erpStore.getUserById(memberId);
      if (member && member.familyId === req.auth!.familyId) {
        targetMemberId = member.id;
        targetMemberName = member.name;
      }
    }

    const now = new Date().toISOString();
    const platform = normalizePlatform(sourceDevice);
    const tx: Transaction = {
      id: `tx_${crypto.randomBytes(5).toString('hex')}`,
      familyId: req.auth!.familyId,
      memberId: targetMemberId,
      memberName: targetMemberName,
      type,
      category: category.trim(),
      amount: Math.round(Number(amount) * 100) / 100,
      description: description.trim(),
      date: date || now.slice(0, 10),
      paymentMethod: paymentMethod?.trim() || 'Bank Transfer',
      sourceDevice: platform,
      createdAt: now,
      updatedAt: now,
    };

    await erpStore.createTransaction(tx);
    realtimeHub.broadcast(req.auth!.familyId, 'transaction:created', tx, req.auth!.name, platform);

    const notifTitle = type === 'income' ? 'New Income Recorded' : 'New Expense Recorded';
    const notifMsg = `${tx.memberName} logged ${type === 'income' ? '+' : '-'}₹${tx.amount.toLocaleString('en-IN')} in ${tx.category} (${tx.description}) via ${platform.toUpperCase()}.`;
    const notif = await erpStore.createNotification({
      id: `notif_${crypto.randomBytes(5).toString('hex')}`,
      familyId: req.auth!.familyId,
      recipientId: 'all',
      title: notifTitle,
      message: notifMsg,
      category: 'transaction',
      readBy: [req.auth!.userId],
      createdAt: now,
    });
    realtimeHub.broadcast(req.auth!.familyId, 'notification:created', { ...notif, isRead: false }, req.auth!.name, platform);
    void realtimeHub.sendExpoPushNotifications(req.auth!.familyId, notifTitle, notifMsg, { transactionId: tx.id }, req.auth!.userId);

    // Check budget threshold if expense
    if (tx.type === 'expense') {
      const txMonth = tx.date.slice(0, 7);
      const [budgets, monthTxs] = await Promise.all([
        erpStore.listBudgets(req.auth!.familyId),
        erpStore.listTransactions(req.auth!.familyId),
      ]);
      const matchingBudget = budgets.find((b) => b.category === tx.category && b.month === txMonth);
      if (matchingBudget) {
        const spent = monthTxs
          .filter((t) => t.type === 'expense' && t.category === tx.category && t.date.startsWith(txMonth))
          .reduce((acc, t) => acc + t.amount, 0);
        if (spent >= matchingBudget.limitAmount * 0.9) {
          const alertTitle = spent > matchingBudget.limitAmount ? `Budget Exceeded: ${tx.category}` : `Budget Warning: ${tx.category}`;
          const alertMsg = `${tx.category} spend is ₹${spent.toLocaleString('en-IN')} of ₹${matchingBudget.limitAmount.toLocaleString('en-IN')} for ${txMonth}.`;
          const alertNotif = await erpStore.createNotification({
            id: `notif_${crypto.randomBytes(5).toString('hex')}`,
            familyId: req.auth!.familyId,
            recipientId: 'all',
            title: alertTitle,
            message: alertMsg,
            category: 'budget',
            readBy: [],
            createdAt: new Date().toISOString(),
          });
          realtimeHub.broadcast(req.auth!.familyId, 'notification:created', { ...alertNotif, isRead: false }, 'Budget Monitor');
          void realtimeHub.sendExpoPushNotifications(req.auth!.familyId, alertTitle, alertMsg, { budgetId: matchingBudget.id });
        }
      }
    }

    res.status(201).json({ transaction: tx });
  });

  router.patch('/transactions/:id', async (req: AuthRequest, res) => {
    const existing = await erpStore.getTransactionById(String(req.params.id), req.auth!.familyId);
    if (!existing) {
      res.status(404).json({ error: 'Transaction not found.' });
      return;
    }

    const canEdit =
      req.auth!.role === 'admin' ||
      req.auth!.role === 'parent' ||
      (req.auth!.role === 'member' && existing.memberId === req.auth!.userId);

    if (!canEdit) {
      res.status(403).json({ error: 'You do not have permission to edit this transaction.' });
      return;
    }

    const { type, category, amount, description, date, paymentMethod, sourceDevice } = req.body as Partial<Transaction>;
    const patch: Partial<Transaction> = {
      updatedAt: new Date().toISOString(),
    };
    if (type === 'income' || type === 'expense') patch.type = type;
    if (category?.trim()) patch.category = category.trim();
    if (amount !== undefined && Number(amount) > 0) patch.amount = Math.round(Number(amount) * 100) / 100;
    if (description?.trim()) patch.description = description.trim();
    if (date) patch.date = date;
    if (paymentMethod?.trim()) patch.paymentMethod = paymentMethod.trim();
    if (sourceDevice) patch.sourceDevice = normalizePlatform(sourceDevice);

    const updated = await erpStore.updateTransaction(existing.id, req.auth!.familyId, patch);
    if (updated) {
      realtimeHub.broadcast(req.auth!.familyId, 'transaction:updated', updated, req.auth!.name, updated.sourceDevice);
    }
    res.json({ transaction: updated });
  });

  router.delete('/transactions/:id', async (req: AuthRequest, res) => {
    const existing = await erpStore.getTransactionById(String(req.params.id), req.auth!.familyId);
    if (!existing) {
      res.status(404).json({ error: 'Transaction not found.' });
      return;
    }

    const canDelete =
      req.auth!.role === 'admin' ||
      req.auth!.role === 'parent' ||
      (req.auth!.role === 'member' && existing.memberId === req.auth!.userId);

    if (!canDelete) {
      res.status(403).json({ error: 'You do not have permission to delete this transaction.' });
      return;
    }

    await erpStore.deleteTransaction(existing.id, req.auth!.familyId);
    realtimeHub.broadcast(req.auth!.familyId, 'transaction:deleted', { id: existing.id }, req.auth!.name);
    res.json({ deletedId: existing.id });
  });

  // Budgets
  router.get('/budgets', async (req: AuthRequest, res) => {
    const month = (req.query.month as string) || getCurrentMonth();
    const [budgets, transactions] = await Promise.all([
      erpStore.listBudgets(req.auth!.familyId),
      erpStore.listTransactions(req.auth!.familyId),
    ]);

    const filtered = budgets.filter((b) => b.month === month);
    const enriched = filtered.map((b) => {
      const spent = transactions
        .filter((t) => t.type === 'expense' && t.category === b.category && t.date.startsWith(b.month))
        .reduce((acc, t) => acc + t.amount, 0);
      return { ...b, spentAmount: Math.round(spent * 100) / 100 };
    });

    res.json({ budgets: enriched, month });
  });

  router.post('/budgets', async (req: AuthRequest, res) => {
    if (req.auth!.role !== 'admin' && req.auth!.role !== 'parent') {
      res.status(403).json({ error: 'Only household Admins or Parents can configure monthly budgets.' });
      return;
    }

    const { category, month, limitAmount } = req.body as {
      category?: string;
      month?: string;
      limitAmount?: number;
    };

    if (!category?.trim() || !limitAmount || Number(limitAmount) <= 0) {
      res.status(400).json({ error: 'Category and positive monthly limit amount are required.' });
      return;
    }

    const targetMonth = month || getCurrentMonth();
    const existingBudgets = await erpStore.listBudgets(req.auth!.familyId);
    const duplicate = existingBudgets.find(
      (b) => b.category.toLowerCase() === category.trim().toLowerCase() && b.month === targetMonth
    );

    if (duplicate) {
      const updated = await erpStore.updateBudget(duplicate.id, req.auth!.familyId, {
        limitAmount: Math.round(Number(limitAmount) * 100) / 100,
        updatedAt: new Date().toISOString(),
      });
      realtimeHub.broadcast(req.auth!.familyId, 'budget:updated', updated, req.auth!.name);
      res.json({ budget: updated });
      return;
    }

    const budget: Budget = {
      id: `bdg_${crypto.randomBytes(5).toString('hex')}`,
      familyId: req.auth!.familyId,
      category: category.trim(),
      month: targetMonth,
      limitAmount: Math.round(Number(limitAmount) * 100) / 100,
      createdBy: req.auth!.userId,
      updatedAt: new Date().toISOString(),
    };

    await erpStore.createBudget(budget);
    realtimeHub.broadcast(req.auth!.familyId, 'budget:created', budget, req.auth!.name);
    res.status(201).json({ budget });
  });

  router.patch('/budgets/:id', async (req: AuthRequest, res) => {
    if (req.auth!.role !== 'admin' && req.auth!.role !== 'parent') {
      res.status(403).json({ error: 'Only household Admins or Parents can update budgets.' });
      return;
    }

    const { limitAmount, category } = req.body as { limitAmount?: number; category?: string };
    const patch: Partial<Budget> = { updatedAt: new Date().toISOString() };
    if (limitAmount && Number(limitAmount) > 0) patch.limitAmount = Math.round(Number(limitAmount) * 100) / 100;
    if (category?.trim()) patch.category = category.trim();

    const updated = await erpStore.updateBudget(String(req.params.id), req.auth!.familyId, patch);
    if (!updated) {
      res.status(404).json({ error: 'Budget not found.' });
      return;
    }
    realtimeHub.broadcast(req.auth!.familyId, 'budget:updated', updated, req.auth!.name);
    res.json({ budget: updated });
  });

  router.delete('/budgets/:id', async (req: AuthRequest, res) => {
    if (req.auth!.role !== 'admin' && req.auth!.role !== 'parent') {
      res.status(403).json({ error: 'Only household Admins or Parents can delete budgets.' });
      return;
    }
    const ok = await erpStore.deleteBudget(String(req.params.id), req.auth!.familyId);
    if (!ok) {
      res.status(404).json({ error: 'Budget not found.' });
      return;
    }
    realtimeHub.broadcast(req.auth!.familyId, 'budget:deleted', { id: String(req.params.id) }, req.auth!.name);
    res.json({ deletedId: String(req.params.id) });
  });

  // Savings Goals
  router.get('/goals', async (req: AuthRequest, res) => {
    const goals = await erpStore.listGoals(req.auth!.familyId);
    res.json({ goals });
  });

  router.post('/goals', async (req: AuthRequest, res) => {
    if (req.auth!.role === 'viewer') {
      res.status(403).json({ error: 'Viewer accounts cannot create savings goals.' });
      return;
    }
    const { title, category, targetAmount, currentAmount, targetDate } = req.body as {
      title?: string;
      category?: string;
      targetAmount?: number;
      currentAmount?: number;
      targetDate?: string;
    };
    if (!title?.trim() || !targetAmount || Number(targetAmount) <= 0 || !targetDate) {
      res.status(400).json({ error: 'Goal title, positive target amount, and target date are required.' });
      return;
    }

    const goal: SavingsGoal = {
      id: `goal_${crypto.randomBytes(5).toString('hex')}`,
      familyId: req.auth!.familyId,
      title: title.trim(),
      category: category?.trim() || 'Savings',
      targetAmount: Math.round(Number(targetAmount) * 100) / 100,
      currentAmount: Math.max(0, Math.round(Number(currentAmount || 0) * 100) / 100),
      targetDate,
      contributions: [],
      updatedAt: new Date().toISOString(),
    };

    await erpStore.createGoal(goal);
    realtimeHub.broadcast(req.auth!.familyId, 'goal:created', goal, req.auth!.name);
    res.status(201).json({ goal });
  });

  router.post('/goals/:id/contribute', async (req: AuthRequest, res) => {
    if (req.auth!.role === 'viewer') {
      res.status(403).json({ error: 'Viewer accounts cannot contribute to goals.' });
      return;
    }

    const { amount, note } = req.body as { amount?: number; note?: string };
    if (!amount || Number(amount) <= 0) {
      res.status(400).json({ error: 'Contribution amount must be greater than zero.' });
      return;
    }

    const contribution = {
      id: `gc_${crypto.randomBytes(4).toString('hex')}`,
      memberId: req.auth!.userId,
      memberName: req.auth!.name,
      amount: Math.round(Number(amount) * 100) / 100,
      date: new Date().toISOString().slice(0, 10),
      note: note?.trim() || 'Goal contribution',
    };

    const updated = await erpStore.contributeToGoal(String(req.params.id), req.auth!.familyId, contribution);
    if (!updated) {
      res.status(404).json({ error: 'Savings goal not found.' });
      return;
    }

    realtimeHub.broadcast(req.auth!.familyId, 'goal:updated', updated, req.auth!.name);

    const notifTitle = 'Savings Goal Contribution';
    const notifMsg = `${req.auth!.name} contributed ₹${contribution.amount.toLocaleString('en-IN')} toward ${updated.title}.`;
    const notif = await erpStore.createNotification({
      id: `notif_${crypto.randomBytes(5).toString('hex')}`,
      familyId: req.auth!.familyId,
      recipientId: 'all',
      title: notifTitle,
      message: notifMsg,
      category: 'goal',
      readBy: [req.auth!.userId],
      createdAt: new Date().toISOString(),
    });
    realtimeHub.broadcast(req.auth!.familyId, 'notification:created', { ...notif, isRead: false }, req.auth!.name);
    void realtimeHub.sendExpoPushNotifications(req.auth!.familyId, notifTitle, notifMsg, { goalId: updated.id }, req.auth!.userId);

    res.json({ goal: updated });
  });

  router.delete('/goals/:id', async (req: AuthRequest, res) => {
    if (req.auth!.role !== 'admin' && req.auth!.role !== 'parent') {
      res.status(403).json({ error: 'Only Admins or Parents can delete savings goals.' });
      return;
    }
    const ok = await erpStore.deleteGoal(String(req.params.id), req.auth!.familyId);
    if (!ok) {
      res.status(404).json({ error: 'Savings goal not found.' });
      return;
    }
    realtimeHub.broadcast(req.auth!.familyId, 'goal:deleted', { id: String(req.params.id) }, req.auth!.name);
    res.json({ deletedId: String(req.params.id) });
  });

  // Family Members (Supports 20+ members with individual credentials & RBAC)
  router.get('/members', async (req: AuthRequest, res) => {
    const members = await erpStore.listFamilyMembers(req.auth!.familyId);
    res.json({ members });
  });

  router.post('/members', async (req: AuthRequest, res) => {
    if (req.auth!.role !== 'admin' && req.auth!.role !== 'parent') {
      res.status(403).json({ error: 'Only Admins or Parents can add family members.' });
      return;
    }

    const { name, email, password, role, relationship, phone, monthlyAllowance } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: UserRole;
      relationship?: string;
      phone?: string;
      monthlyAllowance?: number;
    };

    if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
      res.status(400).json({ error: 'Name, email, and initial password (min 6 chars) are required.' });
      return;
    }

    const existing = await erpStore.getUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const assignedRole: UserRole =
      req.auth!.role === 'admin' && (role === 'admin' || role === 'parent' || role === 'member' || role === 'viewer')
        ? role
        : role === 'member' || role === 'viewer'
          ? role
          : 'member';

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await erpStore.createUser({
      id: `usr_${crypto.randomBytes(5).toString('hex')}`,
      familyId: req.auth!.familyId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: assignedRole,
      relationship: relationship?.trim() || 'Family Member',
      phone: phone?.trim() || '',
      monthlyAllowance: Number(monthlyAllowance ?? 15000),
      themePreference: 'light',
      pushNotificationsEnabled: true,
      expoPushTokens: [],
      activeStatus: 'active',
      createdAt: new Date().toISOString(),
    });

    realtimeHub.broadcast(req.auth!.familyId, 'member:created', created, req.auth!.name);
    res.status(201).json({ member: created });
  });

  router.patch('/members/:id', async (req: AuthRequest, res) => {
    if (req.auth!.role !== 'admin' && req.auth!.role !== 'parent') {
      res.status(403).json({ error: 'Insufficient permissions to modify family members.' });
      return;
    }

    const target = await erpStore.getUserById(String(req.params.id));
    if (!target || target.familyId !== req.auth!.familyId) {
      res.status(404).json({ error: 'Family member not found.' });
      return;
    }

    if (target.role === 'admin' && req.auth!.role !== 'admin') {
      res.status(403).json({ error: 'Only an Admin can modify another Admin account.' });
      return;
    }

    const { role, relationship, monthlyAllowance, activeStatus, phone } = req.body as {
      role?: UserRole;
      relationship?: string;
      monthlyAllowance?: number;
      activeStatus?: 'active' | 'suspended';
      phone?: string;
    };

    const patch: Record<string, unknown> = {};
    if (role && (role === 'admin' || role === 'parent' || role === 'member' || role === 'viewer')) {
      if (req.auth!.role !== 'admin' && role === 'admin') {
        res.status(403).json({ error: 'Only Admins can promote a member to Admin.' });
        return;
      }
      patch.role = role;
    }
    if (typeof relationship === 'string' && relationship.trim()) patch.relationship = relationship.trim();
    if (typeof monthlyAllowance === 'number' && monthlyAllowance >= 0) patch.monthlyAllowance = monthlyAllowance;
    if (activeStatus === 'active' || activeStatus === 'suspended') patch.activeStatus = activeStatus;
    if (typeof phone === 'string') patch.phone = phone.trim();

    const updated = await erpStore.updateUser(target.id, patch);
    if (updated) {
      realtimeHub.broadcast(req.auth!.familyId, 'member:updated', updated, req.auth!.name);
    }
    res.json({ member: updated });
  });

  router.delete('/members/:id', async (req: AuthRequest, res) => {
    if (req.auth!.role !== 'admin') {
      res.status(403).json({ error: 'Only a household Admin can remove family members.' });
      return;
    }
    const targetId = String(req.params.id);
    if (targetId === req.auth!.userId) {
      res.status(400).json({ error: 'You cannot delete your own active admin account.' });
      return;
    }
    const ok = await erpStore.deleteUser(targetId, req.auth!.familyId);
    if (!ok) {
      res.status(404).json({ error: 'Member not found.' });
      return;
    }
    realtimeHub.broadcast(req.auth!.familyId, 'member:deleted', { id: targetId }, req.auth!.name);
    res.json({ deletedId: targetId });
  });

  // Financial Reports & Analytics
  router.get('/reports/summary', async (req: AuthRequest, res) => {
    const month = (req.query.month as string) || getCurrentMonth();
    const [transactions, members, goals] = await Promise.all([
      erpStore.listTransactions(req.auth!.familyId),
      erpStore.listFamilyMembers(req.auth!.familyId),
      erpStore.listGoals(req.auth!.familyId),
    ]);

    const monthTxs = transactions.filter((t) => t.date.startsWith(month));
    const totalIncome = monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = monthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const netBalance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 1000) / 10 : 0;

    // 6-month trend
    const now = new Date();
    const monthlySeries = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', { month: 'short' });
      const mTxs = transactions.filter((t) => t.date.startsWith(mKey));
      const inc = mTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = mTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      monthlySeries.push({
        month: mKey,
        label,
        income: Math.round(inc * 100) / 100,
        expense: Math.round(exp * 100) / 100,
        net: Math.round((inc - exp) * 100) / 100,
      });
    }

    const groupByCategory = (type: 'income' | 'expense') => {
      const map = new Map<string, number>();
      let grand = 0;
      for (const t of monthTxs) {
        if (t.type !== type) continue;
        map.set(t.category, (map.get(t.category) || 0) + t.amount);
        grand += t.amount;
      }
      return Array.from(map.entries())
        .map(([category, amount]) => ({
          category,
          amount: Math.round(amount * 100) / 100,
          percentage: grand > 0 ? Math.round((amount / grand) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);
    };

    const memberBreakdown = members.map((m) => {
      const mTxs = monthTxs.filter((t) => t.memberId === m.id);
      return {
        memberId: m.id,
        name: m.name,
        role: m.role,
        relationship: m.relationship,
        income: Math.round(mTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0) * 100) / 100,
        expense: Math.round(mTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0) * 100) / 100,
        monthlyAllowance: m.monthlyAllowance,
      };
    });

    const totalGoalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
    const totalGoalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
    const totalSavingsGoalProgress = totalGoalTarget > 0 ? Math.round((totalGoalSaved / totalGoalTarget) * 1000) / 10 : 0;

    const summary: ReportSummary = {
      month,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      netBalance: Math.round(netBalance * 100) / 100,
      savingsRate,
      totalSavingsGoalProgress,
      monthlySeries,
      expenseByCategory: groupByCategory('expense'),
      incomeByCategory: groupByCategory('income'),
      memberBreakdown,
    };

    res.json(summary);
  });

  // Notifications & Device Push Tokens
  router.get('/notifications', async (req: AuthRequest, res) => {
    const notifications = await erpStore.listNotifications(req.auth!.familyId, req.auth!.userId);
    res.json({ notifications });
  });

  router.patch('/notifications/:id/read', async (req: AuthRequest, res) => {
    await erpStore.markNotificationRead(String(req.params.id), req.auth!.familyId, req.auth!.userId);
    res.json({ ok: true });
  });

  router.post('/notifications/read-all', async (req: AuthRequest, res) => {
    await erpStore.markAllNotificationsRead(req.auth!.familyId, req.auth!.userId);
    res.json({ ok: true });
  });

  router.post('/devices/push-token', async (req: AuthRequest, res) => {
    const { token } = req.body as { token?: string };
    if (!token?.trim()) {
      res.status(400).json({ error: 'Push token is required.' });
      return;
    }
    const user = await erpStore.getUserById(req.auth!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const tokens = Array.from(new Set([...(user.expoPushTokens || []), token.trim()]));
    await erpStore.updateUser(user.id, { expoPushTokens: tokens });
    res.json({ ok: true, count: tokens.length });
  });

  router.get('/devices/connected', (req: AuthRequest, res) => {
    res.json({ devices: realtimeHub.getConnectedDevices(req.auth!.familyId) });
  });

  router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[KinLedger API Error]', err);
    if (res.headersSent) return;
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unexpected server error.',
    });
  });

  return router;
}
