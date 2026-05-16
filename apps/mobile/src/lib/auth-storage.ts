import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'moviepicker-auth-token';

/**
 * SecureStore peut jeter sur Android si l'appareil n'a pas de PIN/biométrie,
 * ou sur iOS dans certains contextes (keychain locké). On wrap les appels pour
 * que l'auth dégrade gracieusement (pas de token → comportement guest) plutôt
 * que de faire tomber `request()`.
 */

export async function saveToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (err) {
    if (__DEV__) console.warn('[auth-storage] saveToken failed', err);
  }
}

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (err) {
    if (__DEV__) console.warn('[auth-storage] getToken failed', err);
    return null;
  }
}

export async function clearToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (err) {
    if (__DEV__) console.warn('[auth-storage] clearToken failed', err);
  }
}
