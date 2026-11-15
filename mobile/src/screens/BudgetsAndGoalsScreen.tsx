import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useErp } from '../context/ErpContext';
import { useTheme } from '../context/ThemeContext';
import { formatINR } from '../lib/format';

export function BudgetsAndGoalsScreen() {
  const { user, budgets, goals, saveBudget, contributeGoal } = useErp();
  const { colors } = useTheme();
  const [segment, setSegment] = useState<'budgets' | 'goals'>('budgets');
  const [budgetCat, setBudgetCat] = useState('Groceries');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [contribAmount, setContribAmount] = useState('');
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);

  const canManageBudgets = user?.role === 'admin' || user?.role === 'parent';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={[styles.segmented, { backgroundColor: colors.surfaceAlt }]}>
        <TouchableOpacity
          onPress={() => setSegment('budgets')}
          style={[styles.segBtn, segment === 'budgets' && { backgroundColor: colors.surface }]}
        >
          <Text style={{ color: colors.text, fontWeight: '600' }}>Monthly Budgets</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSegment('goals')}
          style={[styles.segBtn, segment === 'goals' && { backgroundColor: colors.surface }]}
        >
          <Text style={{ color: colors.text, fontWeight: '600' }}>Savings Goals</Text>
        </TouchableOpacity>
      </View>

      {segment === 'budgets' ? (
        <View style={{ gap: 12 }}>
          {canManageBudgets && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>Set Category Budget</Text>
              <TextInput
                placeholder="Category (e.g., Groceries)"
                placeholderTextColor={colors.textMuted}
                value={budgetCat}
                onChangeText={setBudgetCat}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
              <TextInput
                placeholder="Monthly Limit (INR · ₹)"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={budgetLimit}
                onChangeText={setBudgetLimit}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
              <TouchableOpacity
                onPress={async () => {
                  if (!Number(budgetLimit)) return;
                  await saveBudget(budgetCat, Number(budgetLimit));
                  setBudgetLimit('');
                }}
                style={[styles.btn, { backgroundColor: colors.accent }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save Budget</Text>
              </TouchableOpacity>
            </View>
          )}

          {budgets.map((b) => {
            const spent = b.spentAmount || 0;
            const pct = b.limitAmount > 0 ? Math.round((spent / b.limitAmount) * 100) : 0;
            const isOver = spent > b.limitAmount;
            return (
              <View key={b.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.row}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{b.category}</Text>
                  <Text style={{ color: isOver ? colors.danger : colors.accent, fontSize: 12, fontWeight: '700' }}>
                    {isOver ? 'Over Budget' : `${pct}% used`}
                  </Text>
                </View>
                <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
                  <View
                    style={[
                      styles.fill,
                      {
                        backgroundColor: isOver ? colors.danger : colors.accent,
                        width: `${Math.min(100, pct)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 12, fontVariant: ['tabular-nums'] }}>
                  {formatINR(spent)} spent of {formatINR(b.limitAmount)}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {goals.map((g) => {
            const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
            return (
              <View key={g.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.row}>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', flex: 1 }}>{g.title}</Text>
                  <Text style={{ color: colors.accent, fontWeight: '700' }}>{pct}%</Text>
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {formatINR(g.currentAmount)} / {formatINR(g.targetAmount)} · Target {g.targetDate}
                </Text>
                <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
                  <View style={[styles.fill, { backgroundColor: colors.accent, width: `${Math.min(100, pct)}%` }]} />
                </View>
                {user?.role !== 'viewer' && (
                  activeGoalId === g.id ? (
                    <View style={{ gap: 8, marginTop: 4 }}>
                      <TextInput
                        placeholder="Deposit Amount"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                        value={contribAmount}
                        onChangeText={setContribAmount}
                        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                      />
                      <TouchableOpacity
                        onPress={async () => {
                          if (!Number(contribAmount)) return;
                          await contributeGoal(g.id, Number(contribAmount), 'Mobile deposit');
                          setContribAmount('');
                          setActiveGoalId(null);
                        }}
                        style={[styles.btn, { backgroundColor: colors.accent }]}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Confirm Deposit</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => setActiveGoalId(g.id)}
                      style={[styles.btn, { borderColor: colors.border, borderWidth: 1 }]}
                    >
                      <Text style={{ color: colors.text, fontWeight: '600' }}>Contribute Funds</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, paddingBottom: 32 },
  segmented: { flexDirection: 'row', padding: 4, borderRadius: 12 },
  segBtn: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15 },
  btn: { minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
