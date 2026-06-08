import hotToast from 'react-hot-toast';
import type { ToastOptions } from 'react-hot-toast';

const defaultOpts: ToastOptions = { duration: 4000 };

export const toast = {
  success: (msg: string, opts?: ToastOptions) => hotToast.success(msg, { ...defaultOpts, ...opts }),
  error: (msg: string, opts?: ToastOptions) => hotToast.error(msg, { ...defaultOpts, ...opts }),
  info: (msg: string, opts?: ToastOptions) => hotToast(msg, { ...defaultOpts, icon: 'ℹ️', ...opts }),
  dismiss: (id?: string | number) => hotToast.dismiss(id === undefined ? undefined : String(id)),
};

export default toast;
