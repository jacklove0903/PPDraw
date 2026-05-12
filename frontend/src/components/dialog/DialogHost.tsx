import { useEffect, useState } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useDialogStore, type ToastType } from './dialogStore';

/**
 * 全局弹窗渲染层：toast / confirm / prompt
 * 在 App 根节点挂载一次即可。
 */
export function DialogHost() {
  return (
    <>
      <ToastStack />
      <ConfirmModal />
      <PromptModal />
    </>
  );
}

// ============ Toast ============

function ToastStack() {
  const toasts = useDialogStore((s) => s.toasts);
  const dismiss = useDialogStore((s) => s.dismissToast);

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className="pointer-events-auto cursor-pointer flex items-start gap-2 bg-white border border-line rounded shadow-sm pl-3 pr-4 py-2.5 min-w-[240px] max-w-sm animate-[toast-in_180ms_ease-out]"
        >
          <ToastIcon type={t.type} />
          <div className="text-sm text-ink flex-1 leading-relaxed">{t.text}</div>
        </div>
      ))}
      <style>{`@keyframes toast-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

function ToastIcon({ type }: { type: ToastType }) {
  const size = 16;
  const cls = 'mt-0.5 shrink-0';
  if (type === 'success') return <CheckCircle2 size={size} className={`${cls} text-emerald-600`} />;
  if (type === 'error') return <XCircle size={size} className={`${cls} text-rose-600`} />;
  return <Info size={size} className={`${cls} text-accent`} />;
}

// ============ Confirm ============

function ConfirmModal() {
  const state = useDialogStore((s) => s.confirm);
  const resolve = useDialogStore((s) => s.resolveConfirm);

  // ESC 关闭
  useEffect(() => {
    if (!state.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resolve(false);
      else if (e.key === 'Enter') resolve(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.open, resolve]);

  if (!state.open) return null;

  return (
    <ModalShell onCancel={() => resolve(false)}>
      <ModalHeader title={state.title ?? '请确认'} onClose={() => resolve(false)} />
      <div className="px-5 py-4 text-sm text-ink leading-relaxed">{state.message}</div>
      <div className="flex justify-end gap-2 px-5 pb-4">
        <button onClick={() => resolve(false)} className="btn-ghost h-9 px-4 text-sm">
          {state.cancelText ?? '取消'}
        </button>
        <button
          onClick={() => resolve(true)}
          className={
            state.destructive
              ? 'btn h-9 px-4 text-sm bg-rose-600 text-white hover:bg-rose-700'
              : 'btn-accent h-9 px-4 text-sm'
          }
          autoFocus
        >
          {state.confirmText ?? '确认'}
        </button>
      </div>
    </ModalShell>
  );
}

// ============ Prompt ============

function PromptModal() {
  const state = useDialogStore((s) => s.prompt);
  const resolve = useDialogStore((s) => s.resolvePrompt);
  const [value, setValue] = useState('');

  // 打开时清空
  useEffect(() => {
    if (state.open) setValue('');
  }, [state.open]);

  useEffect(() => {
    if (!state.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resolve(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.open, resolve]);

  if (!state.open) return null;

  return (
    <ModalShell onCancel={() => resolve(null)}>
      <ModalHeader title={state.title ?? '请输入'} onClose={() => resolve(null)} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          resolve(value);
        }}
      >
        <div className="px-5 py-4">
          <div className="text-sm text-ink mb-3 leading-relaxed">{state.message}</div>
          <input
            type={state.inputType ?? 'text'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={state.placeholder}
            autoFocus
            className="input w-full"
          />
        </div>
        <div className="flex justify-end gap-2 px-5 pb-4">
          <button
            type="button"
            onClick={() => resolve(null)}
            className="btn-ghost h-9 px-4 text-sm"
          >
            {state.cancelText ?? '取消'}
          </button>
          <button type="submit" className="btn-accent h-9 px-4 text-sm">
            {state.confirmText ?? '确认'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ============ 共享外壳 ============

function ModalShell({
  children,
  onCancel,
}: {
  children: React.ReactNode;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4 animate-[modal-in_140ms_ease-out]"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-md shadow-sm border border-line"
      >
        {children}
      </div>
      <style>{`@keyframes modal-in{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 h-11 border-b border-line">
      <h3 className="text-sm font-semibold">{title}</h3>
      <button onClick={onClose} className="text-ink-mute hover:text-ink">
        <X size={15} />
      </button>
    </div>
  );
}
