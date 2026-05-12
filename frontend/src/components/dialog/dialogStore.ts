import { create } from 'zustand';

// ===== Toast =====
export type ToastType = 'info' | 'success' | 'error';

export interface Toast {
  id: string;
  text: string;
  type: ToastType;
}

// ===== Confirm / Prompt =====
export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** 危险操作时按钮变红 */
  destructive?: boolean;
}

export interface PromptOptions {
  title?: string;
  message: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  inputType?: 'text' | 'password';
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve?: (ok: boolean) => void;
}

interface PromptState extends PromptOptions {
  open: boolean;
  resolve?: (value: string | null) => void;
}

interface DialogStore {
  toasts: Toast[];
  confirm: ConfirmState;
  prompt: PromptState;

  pushToast: (text: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;

  showConfirm: (opts: ConfirmOptions) => Promise<boolean>;
  resolveConfirm: (ok: boolean) => void;

  showPrompt: (opts: PromptOptions) => Promise<string | null>;
  resolvePrompt: (value: string | null) => void;
}

let toastIdSeq = 0;

export const useDialogStore = create<DialogStore>((set, get) => ({
  toasts: [],
  confirm: { open: false, message: '' },
  prompt: { open: false, message: '' },

  pushToast: (text, type = 'info') => {
    const id = `t${++toastIdSeq}`;
    set((s) => ({ toasts: [...s.toasts, { id, text, type }] }));
    setTimeout(() => get().dismissToast(id), 2800);
  },
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  showConfirm: (opts) =>
    new Promise<boolean>((resolve) => {
      set({ confirm: { ...opts, open: true, resolve } });
    }),
  resolveConfirm: (ok) => {
    const { confirm } = get();
    confirm.resolve?.(ok);
    set({ confirm: { open: false, message: '' } });
  },

  showPrompt: (opts) =>
    new Promise<string | null>((resolve) => {
      set({ prompt: { ...opts, open: true, resolve } });
    }),
  resolvePrompt: (value) => {
    const { prompt } = get();
    prompt.resolve?.(value);
    set({ prompt: { open: false, message: '' } });
  },
}));

// ===== 便捷函数：供组件直接调用 =====
export const toast = {
  info: (text: string) => useDialogStore.getState().pushToast(text, 'info'),
  success: (text: string) => useDialogStore.getState().pushToast(text, 'success'),
  error: (text: string) => useDialogStore.getState().pushToast(text, 'error'),
};

export const confirmDialog = (opts: ConfirmOptions): Promise<boolean> =>
  useDialogStore.getState().showConfirm(opts);

export const promptDialog = (opts: PromptOptions): Promise<string | null> =>
  useDialogStore.getState().showPrompt(opts);
