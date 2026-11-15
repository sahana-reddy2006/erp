import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useErp } from '../context/ErpContext';
import { useTheme } from '../context/ThemeContext';
import { formatINR } from '../lib/format';
import type { UserRole } from '../types';

export function ReportsAndFamilyScreen() {
  const { user, family, report, members, addMember, updateMemberRole } = useErp();
  const { colors } = useTheme();
  const [tab, setTab] = useState<'family' | 'reports'>('family');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Family2026!');
  const [relationship, setRelationship] = useState('Family Member');
  const [role, setRole] = useState<UserRole>('member');

  const canManage = user?.role === 'admin' || user?.role === 'parent';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={[styles.segmented, { backgroundColor: colors.surfaceAlt }]}>
        <TouchableOpacity
          onPress={() => setTab('family')}
          style={[styles.segBtn, tab === 'family' && { backgroundColor: colors.surface }]}
        >
          <Text style={{ color: colors.text, fontWeight: '600' }}>Family ({members.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('reports')}
          style={[styles.segBtn, tab === 'reports' && { backgroundColor: colors.surface }]}
        >
          <Text style={{ color: colors.text, fontWeight: '600' }}>Reports</Text>
        </TouchableOpacity>
      </View>

      {tab === 'family' ? (
        <View style={{ gap: 12 }}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>
              Household Code: {family?.familyCode}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              All {members.length} members synchronize against the shared MongoDB Atlas family ledger.
            </Text>
          </View>

          {canManage && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>Add Family Member</Text>
              <TextInput
                placeholder="Full Name"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
              <TextInput
                placeholder="Login Email"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
              <TextInput
                placeholder="Relationship"
                placeholderTextColor={colors.textMuted}
                value={relationship}
                onChangeText={setRelationship}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
              <TouchableOpacity
                onPress={async () => {
                  if (!name.trim() || !email.trim()) return;
                  await addMember({
                    name,
                    email,
                    password,
                    role,
                    relationship,
                    monthlyAllowance: 25000,
                  });
                  setName('');
                  setEmail('');
                }}
                style={[styles.btn, { backgroundColor: colors.accent }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Provision Member Login</Text>
              </TouchableOpacity>
            </View>
          )}

          {members.map((m) => (
            <View key={m.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{m.name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    {m.relationship} · {m.email}
                  </Text>
                </View>
                <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
                  {m.role}
                </Text>
              </View>
              {user?.role === 'admin' && m.id !== user.id && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  {(['viewer', 'member', 'parent'] as const).map((r) => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => updateMemberRole(m.id, r)}
                      style={[
                        styles.roleChip,
                        {
                          borderColor: m.role === r ? colors.accent : colors.border,
                          backgroundColor: m.role === r ? colors.accentSoft : 'transparent',
                        },
                      ]}
                    >
                      <Text style={{ color: colors.text, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' }}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Expense Breakdown</Text>
            {(report?.expenseByCategory || []).map((cat) => (
              <View key={cat.category} style={{ marginTop: 8 }}>
                <View style={styles.row}>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{cat.category}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, fontVariant: ['tabular-nums'] }}>
                    {formatINR(cat.amount)} ({cat.percentage}%)
                  </Text>
                </View>
                <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
                  <View style={[styles.fill, { backgroundColor: colors.accent, width: `${cat.percentage}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, paddingBottom: 32 },
  segmented: { flexDirection: 'row', padding: 4, borderRadius: 12 },
  segBtn: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15 },
  btn: { minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  roleChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  track: { height: 7, borderRadius: 4, marginTop: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
