import React, { useMemo, useState } from 'react';
import { Copy, Check, Plus, Search, Shield, Trash2, UserCheck, UserX } from 'lucide-react';
import { formatCurrency, getInitials, getRoleLabel } from '../../lib/format';
import type { Family, UserProfile, UserRole } from '../../types/erp';

interface FamilyMembersViewProps {
  family: Family;
  members: UserProfile[];
  currentUser: UserProfile;
  onCreateMember: (payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    relationship: string;
    phone?: string;
    monthlyAllowance?: number;
  }) => Promise<void>;
  onUpdateMember: (
    id: string,
    payload: {
      role?: UserRole;
      relationship?: string;
      monthlyAllowance?: number;
      activeStatus?: 'active' | 'suspended';
    }
  ) => Promise<void>;
  onDeleteMember: (id: string) => Promise<void>;
}

export function FamilyMembersView({
  family,
  members,
  currentUser,
  onCreateMember,
  onUpdateMember,
  onDeleteMember,
}: FamilyMembersViewProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Family2026!');
  const [role, setRole] = useState<UserRole>('member');
  const [relationship, setRelationship] = useState('Family Member');
  const [phone, setPhone] = useState('');
  const [monthlyAllowance, setMonthlyAllowance] = useState('1000');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = currentUser.role === 'admin' || currentUser.role === 'parent';
  const isAdmin = currentUser.role === 'admin';

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (roleFilter !== 'all' && m.role !== roleFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !m.name.toLowerCase().includes(q) &&
          !m.email.toLowerCase().includes(q) &&
          !m.relationship.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [members, roleFilter, search]);

  const copyFamilyCode = () => {
    navigator.clipboard?.writeText(family.familyCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onCreateMember({
        name,
        email,
        password,
        role,
        relationship,
        phone,
        monthlyAllowance: Number(monthlyAllowance || 0),
      });
      setName('');
      setEmail('');
      setPhone('');
      setShowAddForm(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Family Directory & Access Control
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {members.length} registered members · Individual login credentials & role permissions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={copyFamilyCode}
            className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-mono font-semibold inline-flex items-center gap-2"
          >
            {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            Code: {family.familyCode}
          </button>

          {canManage && (
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="min-h-[44px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Member
            </button>
          )}
        </div>
      </div>

      {/* Role Permission Reference */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Admin</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Full ledger, budgets, goals, and 20+ member role management.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Parent</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Edit any transaction, manage monthly budgets, and invite members.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Member</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Add income/expenses, edit own entries, and contribute to goals.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Viewer</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Read-only visibility into household dashboards and reports.
          </p>
        </div>
      </div>

      {showAddForm && canManage && (
        <form
          onSubmit={handleAddMember}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              Provision Individual Member Login
            </h2>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Daniel Arden"
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Login Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="daniel@ardenfamily.org"
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Initial Password</label>
              <input
                type="text"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
                <option value="parent">Parent</option>
                {isAdmin && <option value="admin">Admin</option>}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Relationship</label>
              <input
                type="text"
                required
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Monthly Allowance</label>
              <input
                type="number"
                min="0"
                value={monthlyAllowance}
                onChange={(e) => setMonthlyAllowance(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] px-5 rounded-xl bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60"
            >
              {saving ? 'Provisioning...' : 'Create Member Account'}
            </button>
          </div>
        </form>
      )}

      {/* Search & Role Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search across all family members..."
            className="w-full min-h-[44px] pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 sm:w-auto">
          {(['all', 'admin', 'parent', 'member', 'viewer'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`min-h-[38px] px-2.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                roleFilter === r
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Member Directory Grid */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
        {filtered.map((m) => {
          const isSelf = m.id === currentUser.id;
          const canModifyTarget =
            canManage && !isSelf && (isAdmin || m.role !== 'admin');

          return (
            <div
              key={m.id}
              className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-display text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0">
                  {getInitials(m.name)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {m.name} {isSelf ? '(You)' : ''}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {m.relationship} · {m.email} · {m.activeStatus === 'active' ? 'Active' : 'Suspended'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400 mr-2">
                  Allowance: <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(m.monthlyAllowance, family.currency)}/mo</span>
                </div>

                {canModifyTarget ? (
                  <div className="flex items-center gap-2">
                    <select
                      aria-label={`Role for ${m.name}`}
                      value={m.role}
                      onChange={(e) => onUpdateMember(m.id, { role: e.target.value as UserRole })}
                      className="min-h-[40px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-100"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="member">Member</option>
                      <option value="parent">Parent</option>
                      {isAdmin && <option value="admin">Admin</option>}
                    </select>

                    <button
                      type="button"
                      onClick={() =>
                        onUpdateMember(m.id, {
                          activeStatus: m.activeStatus === 'active' ? 'suspended' : 'active',
                        })
                      }
                      title={m.activeStatus === 'active' ? 'Suspend member' : 'Reactivate member'}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      {m.activeStatus === 'active' ? (
                        <UserX className="w-4 h-4" />
                      ) : (
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                      )}
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => onDeleteMember(m.id)}
                        aria-label={`Remove ${m.name}`}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 px-2">
                    {getRoleLabel(m.role)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
