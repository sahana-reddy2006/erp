import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { useErp } from '../context/ErpContext';
import { useTheme } from '../context/ThemeContext';
import { formatINR } from '../lib/format';

export function DashboardScreen({ navigation }: { navigation: { navigate: (route: string, params?: unknown) => void } }) {
  const { user, family, report, transactions, goals, wsConnected, refreshAll } = useErp();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll().catch(() => {});
    setRefreshing(false);
  };

  const series = report?.monthlySeries || [];
  const maxVal = Math.max(1000, ...series.flatMap((s) => [s.income, s.expense]));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.heading, { color: colors.text }]}>{family?.name}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            {user?.name} · {wsConnected ? 'Live Sync Active' : 'Connecting...'}
          </Text>
        </View>
      </View>

      {/* 2x2 Mobile KPI Grid */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Net Cashflow</Text>
          <Text style={[styles.kpiValue, { color: colors.text }]}>
            {formatINR(report?.netBalance ?? 0)}
          </Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Savings Rate</Text>
          <Text style={[styles.kpiValue, { color: colors.accent }]}>{report?.savingsRate ?? 0}%</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Monthly Income</Text>
          <Text style={[styles.kpiValue, { color: colors.accent }]}>
            {formatINR(report?.totalIncome ?? 0)}
          </Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Monthly Expense</Text>
          <Text style={[styles.kpiValue, { color: colors.text }]}>
            {formatINR(report?.totalExpense ?? 0)}
          </Text>
        </View>
      </View>

      {/* Quick Touch Actions */}
      {user?.role !== 'viewer' && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Ledger', { quickAdd: 'income' })}
            style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 14 }}>+ Add Income</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Ledger', { quickAdd: 'expense' })}
            style={[styles.actionBtn, { backgroundColor: colors.accent, borderColor: colors.accent }]}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>+ Add Expense</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Responsive SVG Cashflow Chart */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>6-Month Cashflow</Text>
        <Svg width="100%" height={150} viewBox="0 0 320 150">
          {series.map((pt, idx) => {
            const x = 16 + idx * 50;
            const incH = Math.max(4, (pt.income / maxVal) * 105);
            const expH = Math.max(4, (pt.expense / maxVal) * 105);
            return (
              <React.Fragment key={pt.month}>
                <Rect x={x} y={120 - incH} width={14} height={incH} rx={3} fill={colors.accent} />
                <Rect x={x + 17} y={120 - expH} width={14} height={expH} rx={3} fill={colors.textMuted} opacity={0.55} />
                <SvgText x={x + 15} y={140} fontSize={10} fill={colors.textMuted} textAnchor="middle">
                  {pt.label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>

      {/* Recent Transactions */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Ledger')}>
            <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>View All</Text>
          </TouchableOpacity>
        </View>
        {transactions.slice(0, 5).map((tx) => (
          <View key={tx.id} style={[styles.txRow, { borderTopColor: colors.border }]}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                {tx.description}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                {tx.category} · {tx.memberName} · {tx.sourceDevice.toUpperCase()}
              </Text>
            </View>
            <Text
              style={{
                color: tx.type === 'income' ? colors.accent : colors.text,
                fontSize: 14,
                fontWeight: '700',
                fontVariant: ['tabular-nums'],
              }}
            >
              {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
            </Text>
          </View>
        ))}
      </View>

      {/* Savings Goals Preview */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Savings Goals</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Budgets')}>
            <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>Manage</Text>
          </TouchableOpacity>
        </View>
        {goals.slice(0, 3).map((g) => {
          const pct = Math.min(100, Math.round((g.currentAmount / Math.max(1, g.targetAmount)) * 100));
          return (
            <View key={g.id} style={{ marginTop: 12 }}>
              <View style={styles.sectionHeader}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{g.title}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{pct}%</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.surfaceAlt }]}>
                <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${pct}%` }]} />
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, paddingBottom: 32 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { width: '48.4%', padding: 14, borderRadius: 16, borderWidth: 1 },
  kpiLabel: { fontSize: 12, fontWeight: '500' },
  kpiValue: { fontSize: 20, fontWeight: '700', marginTop: 6, fontVariant: ['tabular-nums'] },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: { padding: 16, borderRadius: 18, borderWidth: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  progressTrack: { height: 7, borderRadius: 4, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
});
