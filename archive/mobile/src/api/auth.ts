import { request } from './client';
import type { components } from './types.gen';

type Schemas = components['schemas'];
export type RegisterRequest = Schemas['RegisterRequest'];
export type RegisterResponse = Schemas['RegisterResponse'];
export type LoginRequest = Schemas['LoginRequest'];
export type LoginResponse = Schemas['LoginResponse'];
export type UserProfile = Schemas['UserProfileResponse'];
export type PatchUserProfileRequest = Schemas['PatchUserProfileRequest'];
export type ChangePasswordRequest = Schemas['ChangePasswordRequest'];
export type PasswordResetRequest = Schemas['PasswordResetRequest'];
export type PasswordResetConfirmRequest = Schemas['PasswordResetConfirmRequest'];
export type PasswordResetConfirmResponse = Schemas['PasswordResetConfirmResponse'];

export function register(body: RegisterRequest) {
  return request<RegisterResponse>('/auth/register', { method: 'POST', body, noAuth: true });
}

export function login(body: LoginRequest) {
  return request<LoginResponse>('/auth/login', { method: 'POST', body, noAuth: true });
}

export function logout() {
  return request<void>('/auth/logout', { method: 'POST' });
}

export function getMe(options?: { signal?: AbortSignal }) {
  return request<UserProfile>('/auth/me', { signal: options?.signal });
}

export function patchMe(body: PatchUserProfileRequest) {
  return request<UserProfile>('/auth/me', { method: 'PATCH', body });
}

export function changePassword(body: ChangePasswordRequest) {
  return request<void>('/auth/me/password', { method: 'PATCH', body });
}

export function requestPasswordReset(body: PasswordResetRequest) {
  return request<void>('/auth/password-reset/request', { method: 'POST', body, noAuth: true });
}

export function confirmPasswordReset(body: PasswordResetConfirmRequest) {
  return request<PasswordResetConfirmResponse>('/auth/password-reset/confirm', {
    method: 'POST',
    body,
    noAuth: true,
  });
}
