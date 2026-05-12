import { Eraser, Pen, Trash2, Undo2 } from 'lucide-react';
import { confirmDialog } from '@/components/dialog/dialogStore';

const COLORS = [
  '#171717',
  '#737373',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#0ea5e9',
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#92400e',
  '#ffffff',
];

const SIZES = [3, 6, 12, 22];

interface DrawToolbarProps {
  disabled?: boolean;
  color: string;
  size: number;
  tool: 'pen' | 'eraser';
  onColorChange: (c: string) => void;
  onSizeChange: (s: number) => void;
  onToolChange: (t: 'pen' | 'eraser') => void;
  onUndo: () => void;
  onClear: () => void;
}

export function DrawToolbar({
  disabled,
  color,
  size,
  tool,
  onColorChange,
  onSizeChange,
  onToolChange,
  onUndo,
  onClear,
}: DrawToolbarProps) {
  return (
    <div
      className={[
        'flex items-center gap-3 flex-wrap p-2 border border-line rounded bg-white',
        disabled ? 'opacity-50 pointer-events-none select-none' : '',
      ].join(' ')}
    >
      {/* 工具：画笔 / 橡皮 */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onToolChange('pen')}
          className={`w-8 h-8 flex items-center justify-center rounded border ${
            tool === 'pen' ? 'border-ink bg-neutral-100' : 'border-transparent hover:bg-neutral-50'
          }`}
          title="画笔"
        >
          <Pen size={14} />
        </button>
        <button
          onClick={() => onToolChange('eraser')}
          className={`w-8 h-8 flex items-center justify-center rounded border ${
            tool === 'eraser' ? 'border-ink bg-neutral-100' : 'border-transparent hover:bg-neutral-50'
          }`}
          title="橡皮"
        >
          <Eraser size={14} />
        </button>
      </div>

      <div className="w-px h-6 bg-line" />

      {/* 颜色 */}
      <div className="flex items-center gap-1.5">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => {
              onColorChange(c);
              if (tool === 'eraser') onToolChange('pen');
            }}
            className={`w-5 h-5 rounded-full border transition-transform ${
              color === c && tool === 'pen'
                ? 'border-ink scale-110'
                : 'border-line hover:scale-105'
            }`}
            style={{ background: c }}
            title={c}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-line" />

      {/* 粗细 */}
      <div className="flex items-center gap-1">
        {SIZES.map((s) => (
          <button
            key={s}
            onClick={() => onSizeChange(s)}
            className={`w-8 h-8 flex items-center justify-center rounded border ${
              size === s ? 'border-ink bg-neutral-100' : 'border-transparent hover:bg-neutral-50'
            }`}
            title={`粗细 ${s}`}
          >
            <span
              className="rounded-full bg-ink"
              style={{ width: Math.min(s, 16), height: Math.min(s, 16) }}
            />
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* 撤销 / 清空 */}
      <div className="flex items-center gap-1">
        <button onClick={onUndo} className="btn-ghost h-8 px-2.5 text-xs" title="撤销">
          <Undo2 size={13} />
          撤销
        </button>
        <button
          onClick={async () => {
            const ok = await confirmDialog({
              title: '清空画布',
              message: '确认清空当前画布？这一操作无法撤销。',
              confirmText: '清空',
              destructive: true,
            });
            if (ok) onClear();
          }}
          className="btn-ghost h-8 px-2.5 text-xs"
          title="清空"
        >
          <Trash2 size={13} />
          清空
        </button>
      </div>
    </div>
  );
}
