import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'moviepicker-auth-token';

let memCache: string | null | undefined = undefined;

export async function saveToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    memCache = token;
  } catch (err) {
    if (__DEV__) console.warn('[auth-storage] saveToken failed', err);
  }
}

export async function getToken(): Promise<string | null> {
  if (memCache !== undefined) return memCache;
  try {
    const v = await SecureStore.getItemAsync(TOKEN_KEY);
    memCache = v;
    return v;
  } catch (err) {
    if (__DEV__) console.warn('[auth-storage] getToken failed', err);
    memCache = null;
    return null;
  }
}

export async function clearToken(): Promise<void> {
  memCache = null;
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (err) {
    if (__DEV__) console.warn('[auth-storage] clearToken failed', err);
  }
}

export function resetTokenCache(): void {
  memCache = undefined;
}
