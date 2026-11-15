import mongoose, { Schema } from 'mongoose';

const FamilySchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    familyCode: { type: String, required: true, unique: true, index: true },
    currency: { type: String, default: 'INR' },
    createdAt: { type: String, required: true },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    _id: { type: String, required: true },
    familyId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'parent', 'member', 'viewer'], default: 'member' },
    relationship: { type: String, default: 'Family Member' },
    phone: { type: String, default: '' },
    monthlyAllowance: { type: Number, default: 0 },
    themePreference: { type: String, enum: ['light', 'dark'], default: 'light' },
    pushNotificationsEnabled: { type: Boolean, default: true },
    expoPushTokens: { type: [String], default: [] },
    activeStatus: { type: String, enum: ['active', 'suspended'], default: 'active' },
    createdAt: { type: String, required: true },
  },
  { _id: false }
);

const TransactionSchema = new Schema(
  {
    _id: { type: String, required: true },
    familyId: { type: String, required: true, index: true },
    memberId: { type: String, required: true, index: true },
    memberName: { type: String, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    date: { type: String, required: true, index: true },
    paymentMethod: { type: String, default: 'Bank Transfer' },
    sourceDevice: { type: String, enum: ['web', 'ios', 'android'], default: 'web' },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { _id: false }
);

const BudgetSchema = new Schema(
  {
    _id: { type: String, required: true },
    familyId: { type: String, required: true, index: true },
    category: { type: String, required: true },
    month: { type: String, required: true, index: true },
    limitAmount: { type: Number, required: true },
    createdBy: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { _id: false }
);

const ContributionSchema = new Schema(
  {
    id: { type: String, required: true },
    memberId: { type: String, required: true },
    memberName: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const SavingsGoalSchema = new Schema(
  {
    _id: { type: String, required: true },
    familyId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    targetAmount: { type: Number, required: true },
    currentAmount: { type: Number, default: 0 },
    targetDate: { type: String, required: true },
    contributions: { type: [ContributionSchema], default: [] },
    updatedAt: { type: String, required: true },
  },
  { _id: false }
);

const NotificationSchema = new Schema(
  {
    _id: { type: String, required: true },
    familyId: { type: String, required: true, index: true },
    recipientId: { type: String, default: 'all' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    category: {
      type: String,
      enum: ['transaction', 'budget', 'goal', 'member', 'security'],
      default: 'transaction',
    },
    readBy: { type: [String], default: [] },
    createdAt: { type: String, required: true },
  },
  { _id: false }
);

const ResetTokenSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, index: true },
    code: { type: String, required: true },
    expiresAt: { type: Number, required: true },
  }
);

export const FamilyModel = mongoose.models.Family || mongoose.model('Family', FamilySchema);
export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
export const TransactionModel = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
export const BudgetModel = mongoose.models.Budget || mongoose.model('Budget', BudgetSchema);
export const SavingsGoalModel = mongoose.models.SavingsGoal || mongoose.model('SavingsGoal', SavingsGoalSchema);
export const NotificationModel = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
export const ResetTokenModel = mongoose.models.ResetToken || mongoose.model('ResetToken', ResetTokenSchema);
