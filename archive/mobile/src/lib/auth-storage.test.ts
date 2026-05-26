import { saveToken, getToken, clearToken, resetTokenCache } from './auth-storage';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async () => undefined),
  getItemAsync: jest.fn(async () => null),
  deleteItemAsync: jest.fn(async () => undefined),
}));

const SecureStore = require('expo-secure-store') as {
  setItemAsync: jest.Mock;
  getItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
};

beforeEach(() => {
  SecureStore.setItemAsync.mockReset().mockResolvedValue(undefined);
  SecureStore.getItemAsync.mockReset().mockResolvedValue(null);
  SecureStore.deleteItemAsync.mockReset().mockResolvedValue(undefined);
  resetTokenCache();
});

describe('auth-storage', () => {
  it('saveToken persists via SecureStore', async () => {
    await saveToken('tok-1');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('moviepicker-auth-token', 'tok-1');
  });

  it('getToken returns the in-memory cache after a save', async () => {
    await saveToken('tok-2');
    SecureStore.getItemAsync.mockClear();
    const v = await getToken();
    expect(v).toBe('tok-2');
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
  });

  it('getToken reads from SecureStore on cold cache and caches the value', async () => {
    SecureStore.getItemAsync.mockResolvedValueOnce('tok-3');
    const v1 = await getToken();
    const v2 = await getToken();
    expect(v1).toBe('tok-3');
    expect(v2).toBe('tok-3');
    expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(1);
  });

  it('getToken returns null and caches null on SecureStore failure', async () => {
    SecureStore.getItemAsync.mockRejectedValueOnce(new Error('boom'));
    const v1 = await getToken();
    const v2 = await getToken();
    expect(v1).toBeNull();
    expect(v2).toBeNull();
    expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(1);
  });

  it('clearToken removes the value and clears the cache', async () => {
    await saveToken('tok-4');
    await clearToken();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('moviepicker-auth-token');
    SecureStore.getItemAsync.mockResolvedValueOnce(null);
    const v = await getToken();
    expect(v).toBeNull();
  });

  it('saveToken swallows errors', async () => {
    SecureStore.setItemAsync.mockRejectedValueOnce(new Error('write failed'));
    await expect(saveToken('tok-5')).resolves.toBeUndefined();
  });
});
