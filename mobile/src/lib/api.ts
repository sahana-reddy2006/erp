import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'kinledger_jwt_token';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string) ||
  'http://localhost:3000';

export const DEVICE_PLATFORM: 'ios' | 'android' =
  Platform.OS === 'ios' ? 'ios' : 'android';

export async function saveToken(token: string | null): Promise<void> {
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

export async function loadToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function mobileRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await loadToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/api${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function getWebSocketUrl(token: string): string {
  const wsBase = API_BASE_URL.replace(/^http/i, 'ws');
  return `${wsBase}/ws?token=${encodeURIComponent(token)}&platform=${DEVICE_PLATFORM}`;
}
