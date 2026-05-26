import Toast from 'react-native-toast-message';

export const TOAST_SUCCESS_MS = 2200;
export const TOAST_ERROR_MS = 3000;

export function toastSuccess(message: string, hint?: string) {
  Toast.show({
    type: 'success',
    text1: message,
    text2: hint,
    position: 'bottom',
    visibilityTime: TOAST_SUCCESS_MS,
  });
}

export function toastError(message: string, hint?: string) {
  Toast.show({
    type: 'error',
    text1: message,
    text2: hint,
    position: 'bottom',
    visibilityTime: TOAST_ERROR_MS,
  });
}
