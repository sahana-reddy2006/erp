import bcrypt from 'bcryptjs';
import type {
  Budget,
  Family,
  NotificationItem,
  SavingsGoal,
  Transaction,
  UserProfile,
  UserRole,
} from '../src/types/erp.ts';

export interface StoredUser extends UserProfile {
  passwordHash: string;
}

export interface StoredNotification extends Omit<NotificationItem, 'isRead'> {}

export interface ResetTokenRecord {
  email: string;
  code: string;
  expiresAt: number;
}

export interface SeedDataset {
  families: Family[];
  users: StoredUser[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  notifications: StoredNotification[];
  resetTokens: ResetTokenRecord[];
}

function getMonthStrings(): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    months.push(`${y}-${m}`);
  }
  return months;
}

export async function createSeedDataset(): Promise<SeedDataset> {
  const familyId = 'fam_arden_01';
  const nowIso = new Date().toISOString();
  const demoPasswordHash = await bcrypt.hash('Family2026!', 10);
  const months = getMonthStrings();
  const currentMonth = months[months.length - 1];
  const prevMonth = months[months.length - 2];

  const family: Family = {
    id: familyId,
    name: 'Arden Extended Household',
    familyCode: 'ARDEN-2026',
    currency: 'INR',
    createdAt: nowIso,
  };

  const memberSpecs: Array<{
    id: string;
    name: string;
    email: string;
    role: UserRole;
    relationship: string;
    phone: string;
    allowance: number;
  }> = [
    { id: 'usr_01', name: 'Eleanor Arden', email: 'eleanor@ardenfamily.org', role: 'admin', relationship: 'Household CFO (Admin)', phone: '+91 98201 11001', allowance: 65000 },
    { id: 'usr_02', name: 'Marcus Arden', email: 'marcus@ardenfamily.org', role: 'parent', relationship: 'Co-Head / Parent', phone: '+91 98201 11002', allowance: 55000 },
    { id: 'usr_03', name: 'Clara Arden-Lin', email: 'clara@ardenfamily.org', role: 'parent', relationship: 'Aunt / Co-Trustee', phone: '+91 98201 11003', allowance: 40000 },
    { id: 'usr_04', name: 'David Lin', email: 'david@ardenfamily.org', role: 'parent', relationship: 'Uncle / Operations', phone: '+91 98201 11004', allowance: 35000 },
    { id: 'usr_05', name: 'Sophia Arden', email: 'sophia@ardenfamily.org', role: 'member', relationship: 'Daughter (University)', phone: '+91 98201 11005', allowance: 18000 },
    { id: 'usr_06', name: 'Liam Arden', email: 'liam@ardenfamily.org', role: 'member', relationship: 'Son (Architect)', phone: '+91 98201 11006', allowance: 30000 },
    { id: 'usr_07', name: 'Maya Lin', email: 'maya@ardenfamily.org', role: 'member', relationship: 'Niece (Medical Resident)', phone: '+91 98201 11007', allowance: 25000 },
    { id: 'usr_08', name: 'Noah Lin', email: 'noah@ardenfamily.org', role: 'member', relationship: 'Nephew (High School)', phone: '+91 98201 11008', allowance: 6000 },
    { id: 'usr_09', name: 'Arthur Arden Sr.', email: 'arthur@ardenfamily.org', role: 'viewer', relationship: 'Grandfather', phone: '+91 98201 11009', allowance: 25000 },
    { id: 'usr_10', name: 'Beatrice Arden', email: 'beatrice@ardenfamily.org', role: 'viewer', relationship: 'Grandmother', phone: '+91 98201 11010', allowance: 25000 },
    { id: 'usr_11', name: 'Hannah Arden-Voss', email: 'hannah@ardenfamily.org', role: 'parent', relationship: 'Sister / Tax Lead', phone: '+91 98201 11011', allowance: 38000 },
    { id: 'usr_12', name: 'Julian Voss', email: 'julian@ardenfamily.org', role: 'member', relationship: 'Brother-in-Law', phone: '+91 98201 11012', allowance: 32000 },
    { id: 'usr_13', name: 'Elena Voss', email: 'elena@ardenfamily.org', role: 'member', relationship: 'Niece (Design)', phone: '+91 98201 11013', allowance: 20000 },
    { id: 'usr_14', name: 'Lucas Voss', email: 'lucas@ardenfamily.org', role: 'viewer', relationship: 'Nephew (Junior)', phone: '+91 98201 11014', allowance: 4500 },
    { id: 'usr_15', name: 'Priya Nair-Arden', email: 'priya@ardenfamily.org', role: 'member', relationship: 'Daughter-in-Law', phone: '+91 98201 11015', allowance: 30000 },
    { id: 'usr_16', name: 'Ethan Arden', email: 'ethan@ardenfamily.org', role: 'member', relationship: 'Cousin (Software)', phone: '+91 98201 11016', allowance: 28000 },
    { id: 'usr_17', name: 'Chloe Arden', email: 'chloe@ardenfamily.org', role: 'member', relationship: 'Cousin (Graduate)', phone: '+91 98201 11017', allowance: 15000 },
    { id: 'usr_18', name: 'Samuel Lin Sr.', email: 'samuel@ardenfamily.org', role: 'viewer', relationship: 'Maternal Grandfather', phone: '+91 98201 11018', allowance: 20000 },
    { id: 'usr_19', name: 'Grace Lin', email: 'grace@ardenfamily.org', role: 'viewer', relationship: 'Maternal Grandmother', phone: '+91 98201 11019', allowance: 20000 },
    { id: 'usr_20', name: 'Olivia Arden', email: 'olivia@ardenfamily.org', role: 'member', relationship: 'Cousin (Marketing)', phone: '+91 98201 11020', allowance: 22000 },
  ];

  const users: StoredUser[] = memberSpecs.map((m) => ({
    id: m.id,
    familyId,
    name: m.name,
    email: m.email,
    passwordHash: demoPasswordHash,
    role: m.role,
    relationship: m.relationship,
    phone: m.phone,
    monthlyAllowance: m.allowance,
    themePreference: 'light',
    pushNotificationsEnabled: true,
    expoPushTokens: [],
    activeStatus: 'active',
    createdAt: nowIso,
  }));

  const transactions: Transaction[] = [];
  let txCounter = 1;

  const pushTx = (
    memberId: string,
    memberName: string,
    type: 'income' | 'expense',
    category: string,
    amount: number,
    description: string,
    date: string,
    paymentMethod = 'Bank Transfer',
    sourceDevice: 'web' | 'ios' | 'android' = 'web'
  ) => {
    transactions.push({
      id: `tx_${String(txCounter++).padStart(4, '0')}`,
      familyId,
      memberId,
      memberName,
      type,
      category,
      amount,
      description,
      date,
      paymentMethod,
      sourceDevice,
      createdAt: `${date}T10:15:00.000Z`,
      updatedAt: `${date}T10:15:00.000Z`,
    });
  };

  // Seed 6 months of realistic Indian Rupee household ledger entries
  months.forEach((monthStr, idx) => {
    const variance = (idx % 3) * 2500;
    pushTx('usr_01', 'Eleanor Arden', 'income', 'Salary', 225000, 'Executive Compensation Deposit', `${monthStr}-01`, 'Direct Deposit', 'web');
    pushTx('usr_02', 'Marcus Arden', 'income', 'Salary', 185000, 'Engineering Director Payroll', `${monthStr}-01`, 'Direct Deposit', 'ios');
    pushTx('usr_03', 'Clara Arden-Lin', 'income', 'Business', 95000 + variance, 'Advisory Retainer Payout', `${monthStr}-05`, 'NEFT / IMPS', 'android');
    pushTx('usr_06', 'Liam Arden', 'income', 'Salary', 110000, 'Architecture Studio Salary', `${monthStr}-15`, 'Direct Deposit', 'ios');
    pushTx('usr_11', 'Hannah Arden-Voss', 'income', 'Investments', 42000 + (idx * 1500), 'Quarterly Dividend & Mutual Fund Yield', `${monthStr}-18`, 'Bank Transfer', 'web');
    pushTx('usr_15', 'Priya Nair-Arden', 'income', 'Salary', 120000, 'Clinical Systems Payroll', `${monthStr}-15`, 'Direct Deposit', 'android');

    pushTx('usr_01', 'Eleanor Arden', 'expense', 'Housing', 75000, 'Primary Residence Home Loan EMI & Maintenance', `${monthStr}-02`, 'Bank Transfer', 'web');
    pushTx('usr_02', 'Marcus Arden', 'expense', 'Utilities', 11500 + (idx * 450), 'BESCOM Electricity, Fiber Broadband & Gas', `${monthStr}-06`, 'UPI', 'ios');
    pushTx('usr_03', 'Clara Arden-Lin', 'expense', 'Groceries', 32000 + variance, 'Monthly Supermarket, Dairy & Fresh Produce', `${monthStr}-08`, 'UPI', 'android');
    pushTx('usr_05', 'Sophia Arden', 'expense', 'Education', 28000, 'University Hostel & Academic Materials', `${monthStr}-10`, 'NEFT / IMPS', 'ios');
    pushTx('usr_07', 'Maya Lin', 'expense', 'Healthcare', 14500, 'Family Health Checkup & Dental Care', `${monthStr}-12`, 'Family Card', 'android');
    pushTx('usr_04', 'David Lin', 'expense', 'Transportation', 16500, 'Fuel, EV Charging & Metro Passes', `${monthStr}-14`, 'UPI', 'web');
    pushTx('usr_12', 'Julian Voss', 'expense', 'Dining & Leisure', 15200 + (idx * 600), 'Sunday Extended Family Dinners', `${monthStr}-19`, 'Credit Card', 'ios');
    pushTx('usr_16', 'Ethan Arden', 'expense', 'Subscriptions', 4800, 'Cloud Storage, OTT & Software Suite', `${monthStr}-21`, 'Credit Card', 'web');
  });

  // Additional current month activity across members and devices
  pushTx('usr_20', 'Olivia Arden', 'income', 'Freelance', 45000, 'Brand Strategy Workshop', `${currentMonth}-04`, 'NEFT / IMPS', 'ios');
  pushTx('usr_08', 'Noah Lin', 'expense', 'Education', 4200, 'Robotics Club Supplies', `${currentMonth}-09`, 'UPI', 'android');
  pushTx('usr_13', 'Elena Voss', 'expense', 'Groceries', 8400, 'Mid-month Pantry Restock', `${currentMonth}-11`, 'UPI', 'ios');
  pushTx('usr_17', 'Chloe Arden', 'expense', 'Transportation', 2800, 'Metro & Campus Commute Pass', `${currentMonth}-13`, 'UPI', 'android');
  pushTx('usr_10', 'Beatrice Arden', 'expense', 'Healthcare', 5600, 'Pharmacy & Wellness Co-pay', `${prevMonth}-24`, 'Debit Card', 'web');

  const budgets: Budget[] = [
    { id: 'bdg_01', familyId, category: 'Housing', month: currentMonth, limitAmount: 80000, createdBy: 'usr_01', updatedAt: nowIso },
    { id: 'bdg_02', familyId, category: 'Groceries', month: currentMonth, limitAmount: 45000, createdBy: 'usr_01', updatedAt: nowIso },
    { id: 'bdg_03', familyId, category: 'Education', month: currentMonth, limitAmount: 38000, createdBy: 'usr_02', updatedAt: nowIso },
    { id: 'bdg_04', familyId, category: 'Utilities', month: currentMonth, limitAmount: 16000, createdBy: 'usr_02', updatedAt: nowIso },
    { id: 'bdg_05', familyId, category: 'Healthcare', month: currentMonth, limitAmount: 20000, createdBy: 'usr_03', updatedAt: nowIso },
    { id: 'bdg_06', familyId, category: 'Transportation', month: currentMonth, limitAmount: 22000, createdBy: 'usr_04', updatedAt: nowIso },
    { id: 'bdg_07', familyId, category: 'Dining & Leisure', month: currentMonth, limitAmount: 19000, createdBy: 'usr_11', updatedAt: nowIso },
    { id: 'bdg_08', familyId, category: 'Subscriptions', month: currentMonth, limitAmount: 6500, createdBy: 'usr_01', updatedAt: nowIso },
  ];

  const goals: SavingsGoal[] = [
    {
      id: 'goal_01',
      familyId,
      title: '12-Month Household Emergency Reserve',
      category: 'Safety Net',
      targetAmount: 1500000,
      currentAmount: 1162500,
      targetDate: '2027-06-30',
      contributions: [
        { id: 'gc_01', memberId: 'usr_01', memberName: 'Eleanor Arden', amount: 600000, date: `${prevMonth}-01`, note: 'Initial treasury FD allocation' },
        { id: 'gc_02', memberId: 'usr_02', memberName: 'Marcus Arden', amount: 362500, date: `${prevMonth}-15`, note: 'Annual bonus transfer' },
        { id: 'gc_03', memberId: 'usr_11', memberName: 'Hannah Arden-Voss', amount: 200000, date: `${currentMonth}-03`, note: 'Quarterly dividend sweep' },
      ],
      updatedAt: nowIso,
    },
    {
      id: 'goal_02',
      familyId,
      title: 'Next-Gen Higher Education Fund',
      category: 'Education',
      targetAmount: 1000000,
      currentAmount: 685000,
      targetDate: '2028-08-15',
      contributions: [
        { id: 'gc_04', memberId: 'usr_03', memberName: 'Clara Arden-Lin', amount: 425000, date: `${prevMonth}-10`, note: 'PPF & index corpus seed' },
        { id: 'gc_05', memberId: 'usr_06', memberName: 'Liam Arden', amount: 260000, date: `${currentMonth}-02`, note: 'Monthly family contribution' },
      ],
      updatedAt: nowIso,
    },
    {
      id: 'goal_03',
      familyId,
      title: 'Solar Rooftop & Inverter Upgrade',
      category: 'Property',
      targetAmount: 450000,
      currentAmount: 310000,
      targetDate: '2027-04-01',
      contributions: [
        { id: 'gc_06', memberId: 'usr_04', memberName: 'David Lin', amount: 185000, date: `${prevMonth}-20`, note: 'Subsidy & escrow deposit' },
        { id: 'gc_07', memberId: 'usr_15', memberName: 'Priya Nair-Arden', amount: 125000, date: `${currentMonth}-05`, note: 'Shared household deposit' },
      ],
      updatedAt: nowIso,
    },
    {
      id: 'goal_04',
      familyId,
      title: 'Annual Multi-Generation Reunion',
      category: 'Family Travel',
      targetAmount: 250000,
      currentAmount: 185000,
      targetDate: '2027-07-20',
      contributions: [
        { id: 'gc_08', memberId: 'usr_12', memberName: 'Julian Voss', amount: 110000, date: `${prevMonth}-18`, note: 'Resort booking reserve' },
        { id: 'gc_09', memberId: 'usr_20', memberName: 'Olivia Arden', amount: 75000, date: `${currentMonth}-06`, note: 'Group travel pool' },
      ],
      updatedAt: nowIso,
    },
  ];

  const notifications: StoredNotification[] = [
    {
      id: 'notif_01',
      familyId,
      recipientId: 'all',
      title: 'Monthly Treasury Sync Complete',
      message: 'All 20 household member accounts and INR budgets are synchronized across Web, iOS, and Android.',
      category: 'security',
      readBy: [],
      createdAt: nowIso,
    },
    {
      id: 'notif_02',
      familyId,
      recipientId: 'all',
      title: 'Dining & Leisure Budget at 80%',
      message: 'Current monthly spend is ₹15,200 of ₹19,000 allocated for Dining & Leisure.',
      category: 'budget',
      readBy: [],
      createdAt: nowIso,
    },
    {
      id: 'notif_03',
      familyId,
      recipientId: 'all',
      title: 'Savings Milestone Reached',
      message: 'Emergency Reserve reached 77.5% of the ₹15,00,000 target.',
      category: 'goal',
      readBy: [],
      createdAt: nowIso,
    },
  ];

  return {
    families: [family],
    users,
    transactions,
    budgets,
    goals,
    notifications,
    resetTokens: [],
  };
}
