import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useErp } from '../context/ErpContext';
import { useTheme } from '../context/ThemeContext';
import { mobileRequest } from '../lib/api';

type AuthMode = 'login' | 'register' | 'forgot';

export function AuthScreen() {
  const { login, register } = useErp();
  const { colors, mode: themeMode, toggleMode } = useTheme();

  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('eleanor@ardenfamily.org');
  const [password, setPassword] = useState('Family2026!');
  const [name, setName] = useState('');
  const [familyCode, setFamilyCode] = useState('ARDEN-2026');
  const [relationship, setRelationship] = useState('');

  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (authMode === 'login') {
        await login(email, password);
      } else if (authMode === 'register') {
        await register({ name, email, password, familyCode, relationship });
      } else if (resetStep === 'request') {
        const res = await mobileRequest<{ message: string; verificationCode: string }>('/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email }),
        });
        setResetCode(res.verificationCode);
        setInfo(`${res.message} Code: ${res.verificationCode}`);
        setResetStep('confirm');
      } else {
        const res = await mobileRequest<{ message: string }>('/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ email, code: resetCode, newPassword }),
        });
        setInfo(res.message);
        setPassword(newPassword);
        setAuthMode('login');
        setResetStep('request');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={[styles.brand, { color: colors.text }]}>KinLedger ERP</Text>
          <TouchableOpacity
            onPress={toggleMode}
            style={[styles.themeBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>
              {themeMode === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.tabs, { backgroundColor: colors.surfaceAlt }]}>
            <TouchableOpacity
              style={[styles.tab, authMode === 'login' && { backgroundColor: colors.surface }]}
              onPress={() => {
                setAuthMode('login');
                setError(null);
              }}
            >
              <Text style={[styles.tabText, { color: colors.text }]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, authMode === 'register' && { backgroundColor: colors.surface }]}
              onPress={() => {
                setAuthMode('register');
                setError(null);
              }}
            >
              <Text style={[styles.tabText, { color: colors.text }]}>Register</Text>
            </TouchableOpacity>
          </View>

          {error && <Text style={[styles.alert, { color: colors.danger }]}>{error}</Text>}
          {info && <Text style={[styles.alert, { color: colors.accent }]}>{info}</Text>}

          {authMode === 'register' && (
            <>
              <TextInput
                placeholder="Full Name"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
              <TextInput
                placeholder="Relationship (e.g. Son, Aunt)"
                placeholderTextColor={colors.textMuted}
                value={relationship}
                onChangeText={setRelationship}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
              <TextInput
                placeholder="Household Code (e.g. ARDEN-2026)"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                value={familyCode}
                onChangeText={setFamilyCode}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
            </>
          )}

          <TextInput
            placeholder="Email Address"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />

          {authMode !== 'forgot' && (
            <TextInput
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />
          )}

          {authMode === 'forgot' && resetStep === 'confirm' && (
            <>
              <TextInput
                placeholder="6-Digit Reset Code"
                placeholderTextColor={colors.textMuted}
                value={resetCode}
                onChangeText={setResetCode}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
              <TextInput
                placeholder="New Password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
            </>
          )}

          <TouchableOpacity
            disabled={loading}
            onPress={handleSubmit}
            style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
          >
            <Text style={styles.primaryBtnText}>
              {loading
                ? 'Processing...'
                : authMode === 'login'
                  ? 'Sign In'
                  : authMode === 'register'
                    ? 'Create Account'
                    : resetStep === 'request'
                      ? 'Send Reset Code'
                      : 'Reset Password'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setAuthMode(authMode === 'forgot' ? 'login' : 'forgot');
              setError(null);
            }}
            style={styles.linkBtn}
          >
            <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>
              {authMode === 'forgot' ? 'Back to Sign In' : 'Forgot password?'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  brand: { fontSize: 22, fontWeight: '700' },
  themeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  card: { padding: 20, borderRadius: 20, borderWidth: 1, gap: 12 },
  tabs: { flexDirection: 'row', padding: 4, borderRadius: 12, marginBottom: 4 },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  tabText: { fontSize: 14, fontWeight: '600' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  linkBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  alert: { fontSize: 13, fontWeight: '500' },
});
