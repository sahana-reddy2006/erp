import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useErp } from '../context/ErpContext';
import { useTheme } from '../context/ThemeContext';
import { formatINR } from '../lib/format';
import type { Transaction, TransactionType } from '../types';

export function LedgerScreen() {
  const { user, transactions, saveTransaction, deleteTransaction } = useErp();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<'all' | TransactionType>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('Groceries');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const filtered = transactions.filter((t) => (filter === 'all' ? true : t.type === filter));
  const canMutate = user?.role !== 'viewer';

  const openModal = (tx: Transaction | null, defaultType: TransactionType = 'expense') => {
    setEditing(tx);
    if (tx) {
      setType(tx.type);
      setCategory(tx.category);
      setAmount(String(tx.amount));
      setDescription(tx.description);
      setDate(tx.date);
    } else {
      setType(defaultType);
      setCategory(defaultType === 'income' ? 'Salary' : 'Groceries');
      setAmount('');
      setDescription('');
      setDate(new Date().toISOString().slice(0, 10));
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!Number(amount) || !description.trim()) return;
    await saveTransaction({
      id: editing?.id,
      type,
      category,
      amount: Number(amount),
      description,
      date,
      paymentMethod: 'UPI',
    });
    setModalOpen(false);
  };

  const confirmDelete = (tx: Transaction) => {
    Alert.alert('Delete Transaction', `Remove "${tx.description}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteTransaction(tx.id) },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.toolbar}>
        <View style={[styles.segmented, { backgroundColor: colors.surfaceAlt }]}>
          {(['all', 'income', 'expense'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.segBtn, filter === f && { backgroundColor: colors.surface }]}
            >
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {canMutate && (
          <TouchableOpacity
            onPress={() => openModal(null, 'expense')}
            style={[styles.addBtn, { backgroundColor: colors.accent }]}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: Transaction) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 10 }}
        renderItem={({ item }: { item: Transaction }) => (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{item.description}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 3 }}>
                {item.category} · {item.memberName} · {item.date}
              </Text>
              {canMutate && (
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                  <TouchableOpacity onPress={() => openModal(item)}>
                    <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600' }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(item)}>
                    <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '600' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <Text
              style={{
                color: item.type === 'income' ? colors.accent : colors.text,
                fontSize: 15,
                fontWeight: '700',
                fontVariant: ['tabular-nums'],
              }}
            >
              {item.type === 'income' ? '+' : '-'}{formatINR(item.amount)}
            </Text>
          </View>
        )}
      />

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editing ? 'Edit Transaction' : 'Record Income / Expense'}
            </Text>

            <View style={[styles.segmented, { backgroundColor: colors.surfaceAlt }]}>
              {(['expense', 'income'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => {
                    setType(t);
                    setCategory(t === 'income' ? 'Salary' : 'Groceries');
                  }}
                  style={[styles.segBtn, type === t && { backgroundColor: colors.surface }]}
                >
                  <Text style={{ color: colors.text, fontWeight: '600', textTransform: 'capitalize' }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="Amount (INR · ₹)"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />
            <TextInput
              placeholder="Category (e.g., Groceries, Salary)"
              placeholderTextColor={colors.textMuted}
              value={category}
              onChangeText={setCategory}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />
            <TextInput
              placeholder="Description"
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />
            <TextInput
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              value={date}
              onChangeText={setDate}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setModalOpen(false)}
                style={[styles.modalBtn, { borderColor: colors.border, borderWidth: 1 }]}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.modalBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', padding: 16, gap: 10, alignItems: 'center' },
  segmented: { flex: 1, flexDirection: 'row', padding: 4, borderRadius: 12 },
  segBtn: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  addBtn: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center' },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCard: { padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15 },
  modalBtn: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
