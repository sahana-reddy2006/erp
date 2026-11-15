import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useErp } from '../context/ErpContext';
import { useTheme } from '../context/ThemeContext';

export function ProfileScreen() {
  const { user, family, notifications, updateProfile, markNotificationRead, logout } = useErp();
  const { colors, mode, toggleMode } = useTheme();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savedNotice, setSavedNotice] = useState(false);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{user?.name}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          {user?.email} · {user?.role?.toUpperCase()} · {family?.name}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>Profile Settings</Text>
        <TextInput
          placeholder="Full Name"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        />
        <TextInput
          placeholder="Phone Number"
          placeholderTextColor={colors.textMuted}
          value={phone}
          onChangeText={setPhone}
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        />
        <TouchableOpacity
          onPress={async () => {
            await updateProfile({ name, phone });
            setSavedNotice(true);
            setTimeout(() => setSavedNotice(false), 2000);
          }}
          style={[styles.btn, { backgroundColor: colors.accent }]}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
            {savedNotice ? 'Saved!' : 'Save Profile'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.switchRow}>
          <View>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>Dark Mode</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Sync theme preference across sessions</Text>
          </View>
          <Switch
            value={mode === 'dark'}
            onValueChange={async (val: boolean) => {
              toggleMode();
              await updateProfile({ themePreference: val ? 'dark' : 'light' });
            }}
          />
        </View>
        <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }]}>
          <View>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>Push Notifications</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Real-time family transaction & budget alerts</Text>
          </View>
          <Switch
            value={user?.pushNotificationsEnabled ?? true}
            onValueChange={(val: boolean) => updateProfile({ pushNotificationsEnabled: val })}
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>Recent Notifications</Text>
        {notifications.slice(0, 6).map((n) => (
          <TouchableOpacity
            key={n.id}
            onPress={() => markNotificationRead(n.id)}
            style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }}
          >
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: n.isRead ? '500' : '700' }}>
              {n.title}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{n.message}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={logout}
        style={[styles.btn, { borderColor: colors.danger, borderWidth: 1 }]}
      >
        <Text style={{ color: colors.danger, fontWeight: '700' }}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, paddingBottom: 36 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 10 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15 },
  btn: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
