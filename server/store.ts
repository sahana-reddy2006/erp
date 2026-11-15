import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import {
  BudgetModel,
  FamilyModel,
  NotificationModel,
  ResetTokenModel,
  SavingsGoalModel,
  TransactionModel,
  UserModel,
} from './models.ts';
import {
  createSeedDataset,
  type SeedDataset,
  type StoredNotification,
  type StoredUser,
} from './seed.ts';
import type {
  Budget,
  Family,
  NotificationItem,
  SavingsGoal,
  SavingsGoalContribution,
  Transaction,
  UserProfile,
} from '../src/types/erp.ts';

const DATA_FILE = path.resolve(process.cwd(), '.data', 'kinledger-erp.json');

function toPublicUser(user: StoredUser): UserProfile {
  const { passwordHash: _removed, ...rest } = user;
  return rest;
}

function docToObject<T>(doc: Record<string, unknown>): T {
  const obj = { ...doc };
  if ('_id' in obj && !('id' in obj)) {
    obj.id = String(obj._id);
  }
  delete obj._id;
  delete obj.__v;
  return obj as T;
}

class ErpStore {
  private useMongo = false;
  private initialized = false;
  private memoryData: SeedDataset | null = null;
  private persistQueue: Promise<void> = Promise.resolve();

  async init(): Promise<{ mode: 'mongodb' | 'local-json' }> {
    if (this.initialized) {
      return { mode: this.useMongo ? 'mongodb' : 'local-json' };
    }

    const rawUri = process.env.MONGODB_URI?.trim() || '';
    const mongoUri = rawUri.replace(/^["']|["']$/g, '').trim();
    const hasValidMongoScheme =
      mongoUri.startsWith('mongodb://') || mongoUri.startsWith('mongodb+srv://');

    if (hasValidMongoScheme) {
      try {
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
        this.useMongo = true;
        await this.ensureMongoSeeded();
        this.initialized = true;
        console.log('[KinLedger DB] Connected to MongoDB Atlas');
        return { mode: 'mongodb' };
      } catch (err) {
        console.log(
          '[KinLedger DB] MongoDB Atlas unreachable, using local persistent JSON store:',
          (err as Error).message
        );
      }
    } else if (mongoUri.length > 0) {
      console.log(
        '[KinLedger DB] MONGODB_URI is not a MongoDB Atlas URI; using local persistent JSON store.'
      );
    }

    await this.initLocalStore();
    this.initialized = true;
    console.log('[KinLedger DB] Using local persistent JSON store (.data/kinledger-erp.json)');
    return { mode: 'local-json' };
  }

  getStorageMode(): 'mongodb' | 'local-json' {
    return this.useMongo ? 'mongodb' : 'local-json';
  }

  private async ensureMongoSeeded() {
    const existingFamilies = await FamilyModel.countDocuments();
    if (existingFamilies > 0) return;

    const seed = await createSeedDataset();
    await FamilyModel.insertMany(seed.families.map((f) => ({ ...f, _id: f.id })));
    await UserModel.insertMany(seed.users.map((u) => ({ ...u, _id: u.id })));
    await TransactionModel.insertMany(seed.transactions.map((t) => ({ ...t, _id: t.id })));
    await BudgetModel.insertMany(seed.budgets.map((b) => ({ ...b, _id: b.id })));
    await SavingsGoalModel.insertMany(seed.goals.map((g) => ({ ...g, _id: g.id })));
    await NotificationModel.insertMany(seed.notifications.map((n) => ({ ...n, _id: n.id })));
  }

  private async initLocalStore() {
    try {
      const raw = await fs.readFile(DATA_FILE, 'utf-8');
      this.memoryData = JSON.parse(raw) as SeedDataset;
    } catch {
      this.memoryData = await createSeedDataset();
      await this.flushLocal();
    }
  }

  private flushLocal(): Promise<void> {
    this.persistQueue = this.persistQueue.then(async () => {
      if (!this.memoryData) return;
      await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
      await fs.writeFile(DATA_FILE, JSON.stringify(this.memoryData, null, 2), 'utf-8');
    });
    return this.persistQueue;
  }

  // Families
  async getFamilyById(id: string): Promise<Family | null> {
    if (this.useMongo) {
      const doc = await FamilyModel.findById(id).lean();
      return doc ? docToObject<Family>(doc as Record<string, unknown>) : null;
    }
    return this.memoryData!.families.find((f) => f.id === id) || null;
  }

  async getFamilyByCode(code: string): Promise<Family | null> {
    const normalized = code.trim().toUpperCase();
    if (this.useMongo) {
      const doc = await FamilyModel.findOne({ familyCode: normalized }).lean();
      return doc ? docToObject<Family>(doc as Record<string, unknown>) : null;
    }
    return this.memoryData!.families.find((f) => f.familyCode.toUpperCase() === normalized) || null;
  }

  async createFamily(family: Family): Promise<Family> {
    if (this.useMongo) {
      await FamilyModel.create({ ...family, _id: family.id });
      return family;
    }
    this.memoryData!.families.push(family);
    await this.flushLocal();
    return family;
  }

  // Users
  async getUserByEmail(email: string): Promise<StoredUser | null> {
    const normalized = email.trim().toLowerCase();
    if (this.useMongo) {
      const doc = await UserModel.findOne({ email: normalized }).lean();
      return doc ? docToObject<StoredUser>(doc as Record<string, unknown>) : null;
    }
    return this.memoryData!.users.find((u) => u.email.toLowerCase() === normalized) || null;
  }

  async getUserById(id: string): Promise<StoredUser | null> {
    if (this.useMongo) {
      const doc = await UserModel.findById(id).lean();
      return doc ? docToObject<StoredUser>(doc as Record<string, unknown>) : null;
    }
    return this.memoryData!.users.find((u) => u.id === id) || null;
  }

  async listFamilyMembers(familyId: string): Promise<UserProfile[]> {
    if (this.useMongo) {
      const docs = await UserModel.find({ familyId }).sort({ createdAt: 1 }).lean();
      return docs.map((d) => toPublicUser(docToObject<StoredUser>(d as Record<string, unknown>)));
    }
    return this.memoryData!.users
      .filter((u) => u.familyId === familyId)
      .map(toPublicUser);
  }

  async listFamilyMemberPushTokens(familyId: string, excludeUserId?: string): Promise<string[]> {
    let users: StoredUser[] = [];
    if (this.useMongo) {
      const docs = await UserModel.find({ familyId, pushNotificationsEnabled: true, activeStatus: 'active' }).lean();
      users = docs.map((d) => docToObject<StoredUser>(d as Record<string, unknown>));
    } else {
      users = this.memoryData!.users.filter(
        (u) => u.familyId === familyId && u.pushNotificationsEnabled && u.activeStatus === 'active'
      );
    }
    const tokens = new Set<string>();
    for (const u of users) {
      if (excludeUserId && u.id === excludeUserId) continue;
      for (const t of u.expoPushTokens || []) {
        if (t) tokens.add(t);
      }
    }
    return Array.from(tokens);
  }

  async createUser(user: StoredUser): Promise<UserProfile> {
    if (this.useMongo) {
      await UserModel.create({ ...user, _id: user.id });
      return toPublicUser(user);
    }
    this.memoryData!.users.push(user);
    await this.flushLocal();
    return toPublicUser(user);
  }

  async updateUser(id: string, patch: Partial<StoredUser>): Promise<UserProfile | null> {
    if (this.useMongo) {
      const doc = await UserModel.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
      return doc ? toPublicUser(docToObject<StoredUser>(doc as Record<string, unknown>)) : null;
    }
    const idx = this.memoryData!.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    this.memoryData!.users[idx] = { ...this.memoryData!.users[idx], ...patch };
    await this.flushLocal();
    return toPublicUser(this.memoryData!.users[idx]);
  }

  async deleteUser(id: string, familyId: string): Promise<boolean> {
    if (this.useMongo) {
      const res = await UserModel.deleteOne({ _id: id, familyId });
      return res.deletedCount > 0;
    }
    const before = this.memoryData!.users.length;
    this.memoryData!.users = this.memoryData!.users.filter((u) => !(u.id === id && u.familyId === familyId));
    if (this.memoryData!.users.length !== before) {
      await this.flushLocal();
      return true;
    }
    return false;
  }

  // Password reset tokens
  async saveResetCode(email: string, code: string, expiresAt: number): Promise<void> {
    const normalized = email.trim().toLowerCase();
    if (this.useMongo) {
      await ResetTokenModel.deleteMany({ email: normalized });
      await ResetTokenModel.create({ email: normalized, code, expiresAt });
      return;
    }
    this.memoryData!.resetTokens = this.memoryData!.resetTokens.filter((r) => r.email !== normalized);
    this.memoryData!.resetTokens.push({ email: normalized, code, expiresAt });
    await this.flushLocal();
  }

  async verifyAndConsumeResetCode(email: string, code: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    const now = Date.now();
    if (this.useMongo) {
      const record = await ResetTokenModel.findOne({ email: normalized, code: code.trim() }).lean();
      if (!record || (record as { expiresAt: number }).expiresAt < now) return false;
      await ResetTokenModel.deleteMany({ email: normalized });
      return true;
    }
    const match = this.memoryData!.resetTokens.find(
      (r) => r.email === normalized && r.code === code.trim() && r.expiresAt >= now
    );
    if (!match) return false;
    this.memoryData!.resetTokens = this.memoryData!.resetTokens.filter((r) => r.email !== normalized);
    await this.flushLocal();
    return true;
  }

  // Transactions
  async listTransactions(familyId: string): Promise<Transaction[]> {
    if (this.useMongo) {
      const docs = await TransactionModel.find({ familyId }).sort({ date: -1, createdAt: -1 }).lean();
      return docs.map((d) => docToObject<Transaction>(d as Record<string, unknown>));
    }
    return [...this.memoryData!.transactions]
      .filter((t) => t.familyId === familyId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }

  async getTransactionById(id: string, familyId: string): Promise<Transaction | null> {
    if (this.useMongo) {
      const doc = await TransactionModel.findOne({ _id: id, familyId }).lean();
      return doc ? docToObject<Transaction>(doc as Record<string, unknown>) : null;
    }
    return this.memoryData!.transactions.find((t) => t.id === id && t.familyId === familyId) || null;
  }

  async createTransaction(tx: Transaction): Promise<Transaction> {
    if (this.useMongo) {
      await TransactionModel.create({ ...tx, _id: tx.id });
      return tx;
    }
    this.memoryData!.transactions.unshift(tx);
    await this.flushLocal();
    return tx;
  }

  async updateTransaction(id: string, familyId: string, patch: Partial<Transaction>): Promise<Transaction | null> {
    if (this.useMongo) {
      const doc = await TransactionModel.findOneAndUpdate(
        { _id: id, familyId },
        { $set: patch },
        { new: true }
      ).lean();
      return doc ? docToObject<Transaction>(doc as Record<string, unknown>) : null;
    }
    const idx = this.memoryData!.transactions.findIndex((t) => t.id === id && t.familyId === familyId);
    if (idx === -1) return null;
    this.memoryData!.transactions[idx] = { ...this.memoryData!.transactions[idx], ...patch };
    await this.flushLocal();
    return this.memoryData!.transactions[idx];
  }

  async deleteTransaction(id: string, familyId: string): Promise<boolean> {
    if (this.useMongo) {
      const res = await TransactionModel.deleteOne({ _id: id, familyId });
      return res.deletedCount > 0;
    }
    const before = this.memoryData!.transactions.length;
    this.memoryData!.transactions = this.memoryData!.transactions.filter(
      (t) => !(t.id === id && t.familyId === familyId)
    );
    if (this.memoryData!.transactions.length !== before) {
      await this.flushLocal();
      return true;
    }
    return false;
  }

  // Budgets
  async listBudgets(familyId: string): Promise<Budget[]> {
    if (this.useMongo) {
      const docs = await BudgetModel.find({ familyId }).sort({ month: -1, category: 1 }).lean();
      return docs.map((d) => docToObject<Budget>(d as Record<string, unknown>));
    }
    return this.memoryData!.budgets.filter((b) => b.familyId === familyId);
  }

  async createBudget(budget: Budget): Promise<Budget> {
    if (this.useMongo) {
      await BudgetModel.create({ ...budget, _id: budget.id });
      return budget;
    }
    this.memoryData!.budgets.push(budget);
    await this.flushLocal();
    return budget;
  }

  async updateBudget(id: string, familyId: string, patch: Partial<Budget>): Promise<Budget | null> {
    if (this.useMongo) {
      const doc = await BudgetModel.findOneAndUpdate({ _id: id, familyId }, { $set: patch }, { new: true }).lean();
      return doc ? docToObject<Budget>(doc as Record<string, unknown>) : null;
    }
    const idx = this.memoryData!.budgets.findIndex((b) => b.id === id && b.familyId === familyId);
    if (idx === -1) return null;
    this.memoryData!.budgets[idx] = { ...this.memoryData!.budgets[idx], ...patch };
    await this.flushLocal();
    return this.memoryData!.budgets[idx];
  }

  async deleteBudget(id: string, familyId: string): Promise<boolean> {
    if (this.useMongo) {
      const res = await BudgetModel.deleteOne({ _id: id, familyId });
      return res.deletedCount > 0;
    }
    const before = this.memoryData!.budgets.length;
    this.memoryData!.budgets = this.memoryData!.budgets.filter((b) => !(b.id === id && b.familyId === familyId));
    if (this.memoryData!.budgets.length !== before) {
      await this.flushLocal();
      return true;
    }
    return false;
  }

  // Savings Goals
  async listGoals(familyId: string): Promise<SavingsGoal[]> {
    if (this.useMongo) {
      const docs = await SavingsGoalModel.find({ familyId }).sort({ targetDate: 1 }).lean();
      return docs.map((d) => docToObject<SavingsGoal>(d as Record<string, unknown>));
    }
    return this.memoryData!.goals.filter((g) => g.familyId === familyId);
  }

  async createGoal(goal: SavingsGoal): Promise<SavingsGoal> {
    if (this.useMongo) {
      await SavingsGoalModel.create({ ...goal, _id: goal.id });
      return goal;
    }
    this.memoryData!.goals.push(goal);
    await this.flushLocal();
    return goal;
  }

  async updateGoal(id: string, familyId: string, patch: Partial<SavingsGoal>): Promise<SavingsGoal | null> {
    if (this.useMongo) {
      const doc = await SavingsGoalModel.findOneAndUpdate({ _id: id, familyId }, { $set: patch }, { new: true }).lean();
      return doc ? docToObject<SavingsGoal>(doc as Record<string, unknown>) : null;
    }
    const idx = this.memoryData!.goals.findIndex((g) => g.id === id && g.familyId === familyId);
    if (idx === -1) return null;
    this.memoryData!.goals[idx] = { ...this.memoryData!.goals[idx], ...patch };
    await this.flushLocal();
    return this.memoryData!.goals[idx];
  }

  async contributeToGoal(
    id: string,
    familyId: string,
    contribution: SavingsGoalContribution
  ): Promise<SavingsGoal | null> {
    if (this.useMongo) {
      const doc = await SavingsGoalModel.findOneAndUpdate(
        { _id: id, familyId },
        {
          $inc: { currentAmount: contribution.amount },
          $push: { contributions: contribution },
          $set: { updatedAt: new Date().toISOString() },
        },
        { new: true }
      ).lean();
      return doc ? docToObject<SavingsGoal>(doc as Record<string, unknown>) : null;
    }
    const idx = this.memoryData!.goals.findIndex((g) => g.id === id && g.familyId === familyId);
    if (idx === -1) return null;
    const goal = this.memoryData!.goals[idx];
    goal.currentAmount += contribution.amount;
    goal.contributions.push(contribution);
    goal.updatedAt = new Date().toISOString();
    await this.flushLocal();
    return goal;
  }

  async deleteGoal(id: string, familyId: string): Promise<boolean> {
    if (this.useMongo) {
      const res = await SavingsGoalModel.deleteOne({ _id: id, familyId });
      return res.deletedCount > 0;
    }
    const before = this.memoryData!.goals.length;
    this.memoryData!.goals = this.memoryData!.goals.filter((g) => !(g.id === id && g.familyId === familyId));
    if (this.memoryData!.goals.length !== before) {
      await this.flushLocal();
      return true;
    }
    return false;
  }

  // Notifications
  async listNotifications(familyId: string, userId: string): Promise<NotificationItem[]> {
    let items: StoredNotification[] = [];
    if (this.useMongo) {
      const docs = await NotificationModel.find({
        familyId,
        $or: [{ recipientId: 'all' }, { recipientId: userId }],
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      items = docs.map((d) => docToObject<StoredNotification>(d as Record<string, unknown>));
    } else {
      items = [...this.memoryData!.notifications]
        .filter((n) => n.familyId === familyId && (n.recipientId === 'all' || n.recipientId === userId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 50);
    }

    return items.map((n) => ({
      ...n,
      isRead: (n.readBy || []).includes(userId),
    }));
  }

  async createNotification(notif: StoredNotification): Promise<StoredNotification> {
    if (this.useMongo) {
      await NotificationModel.create({ ...notif, _id: notif.id });
      return notif;
    }
    this.memoryData!.notifications.unshift(notif);
    if (this.memoryData!.notifications.length > 200) {
      this.memoryData!.notifications = this.memoryData!.notifications.slice(0, 200);
    }
    await this.flushLocal();
    return notif;
  }

  async markNotificationRead(id: string, familyId: string, userId: string): Promise<void> {
    if (this.useMongo) {
      await NotificationModel.updateOne({ _id: id, familyId }, { $addToSet: { readBy: userId } });
      return;
    }
    const item = this.memoryData!.notifications.find((n) => n.id === id && n.familyId === familyId);
    if (item && !item.readBy.includes(userId)) {
      item.readBy.push(userId);
      await this.flushLocal();
    }
  }

  async markAllNotificationsRead(familyId: string, userId: string): Promise<void> {
    if (this.useMongo) {
      await NotificationModel.updateMany(
        { familyId, $or: [{ recipientId: 'all' }, { recipientId: userId }] },
        { $addToSet: { readBy: userId } }
      );
      return;
    }
    for (const item of this.memoryData!.notifications) {
      if (
        item.familyId === familyId &&
        (item.recipientId === 'all' || item.recipientId === userId) &&
        !item.readBy.includes(userId)
      ) {
        item.readBy.push(userId);
      }
    }
    await this.flushLocal();
  }
}

export const erpStore = new ErpStore();
