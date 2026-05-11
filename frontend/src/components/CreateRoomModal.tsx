import { useState } from 'react';
import { X } from 'lucide-react';
import { CATEGORIES, type RoomConfig } from '@shared/events';

interface CreateRoomModalProps {
  defaultName: string;
  onClose: () => void;
  onSubmit: (config: RoomConfig) => void;
}

const PLAYER_OPTIONS = [4, 6, 8, 10, 12];
const ROUND_OPTIONS = [1, 2, 3, 4, 5];
const SECOND_OPTIONS = [30, 60, 80, 100, 120];

export function CreateRoomModal({ defaultName, onClose, onSubmit }: CreateRoomModalProps) {
  const [name, setName] = useState(defaultName);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [rounds, setRounds] = useState(3);
  const [roundSeconds, setRoundSeconds] = useState(80);
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState<string>('all');

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      alert('请输入房间名');
      return;
    }
    onSubmit({
      name: trimmed,
      maxPlayers,
      rounds,
      roundSeconds,
      password: password.trim() || undefined,
      category,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-md shadow-sm max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-12 border-b border-line">
          <h2 className="text-sm font-semibold">创建房间</h2>
          <button onClick={onClose} className="text-ink-mute hover:text-ink">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <Field label="房间名">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              placeholder="请输入房间名"
              className="input w-full"
            />
          </Field>

          <Field label="密码（可选）">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={20}
              placeholder="留空则为公开房间"
              className="input w-full"
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="人数上限">
              <Select value={maxPlayers} onChange={setMaxPlayers} options={PLAYER_OPTIONS} suffix="人" />
            </Field>
            <Field label="回合数">
              <Select value={rounds} onChange={setRounds} options={ROUND_OPTIONS} suffix="回合" />
            </Field>
            <Field label="每回合时长">
              <Select value={roundSeconds} onChange={setRoundSeconds} options={SECOND_OPTIONS} suffix="秒" />
            </Field>
          </div>

          <Field label="词库分类">
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded border text-xs transition-colors ${
                    category === c.id
                      ? 'border-ink bg-neutral-100'
                      : 'border-line hover:bg-neutral-50'
                  }`}
                >
                  <span>{c.emoji}</span>
                  <span className="truncate">{c.label}</span>
                </button>
              ))}
            </div>
          </Field>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 h-14 border-t border-line">
          <button onClick={onClose} className="btn-ghost h-9 px-4 text-sm">
            取消
          </button>
          <button onClick={submit} className="btn-accent h-9 px-5 text-sm">
            创建房间
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-ink-soft mb-1.5">{label}</div>
      {children}
    </label>
  );
}

function Select<T extends number>({
  value,
  onChange,
  options,
  suffix,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
  suffix?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value) as T)}
      className="input w-full appearance-none cursor-pointer"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
          {suffix}
        </option>
      ))}
    </select>
  );
}
