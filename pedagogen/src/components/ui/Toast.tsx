'use client';

import toast, { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#1C1917',
          color: '#FAFAF8',
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '14px',
        },
        success: {
          iconTheme: {
            primary: '#059669',
            secondary: '#FAFAF8',
          },
        },
        error: {
          iconTheme: {
            primary: '#DC2626',
            secondary: '#FDF6E3',
          },
        },
      }}
    />
  );
}

export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) =>
    toast(message, {
      icon: 'ℹ️',
    }),
  loading: (message: string) => toast.loading(message),
  promise: toast.promise,
  dismiss: toast.dismiss,
};
