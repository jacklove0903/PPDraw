import type { AvatarId } from '@/store/user';

const PALETTES: Record<AvatarId, string> = {
  a1: 'bg-neutral-200 text-neutral-700',
  a2: 'bg-orange-100 text-orange-700',
  a3: 'bg-emerald-100 text-emerald-700',
  a4: 'bg-sky-100 text-sky-700',
  a5: 'bg-violet-100 text-violet-700',
  a6: 'bg-rose-100 text-rose-700',
  a7: 'bg-amber-100 text-amber-700',
  a8: 'bg-stone-200 text-stone-700',
};

interface AvatarProps {
  id: AvatarId;
  name?: string;
  size?: number;
  active?: boolean;
  onClick?: () => void;
}

/**
 * 极简头像：彩色背景 + 昵称首字符。MVP 占位，后期可替换为实际图标。
 */
export function Avatar({ id, name = '', size = 36, active, onClick }: AvatarProps) {
  const cls = PALETTES[id] ?? PALETTES.a1;
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <div
      onClick={onClick}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={[
        'flex items-center justify-center rounded-full font-medium select-none',
        cls,
        onClick ? 'cursor-pointer' : '',
        active ? 'ring-2 ring-ink ring-offset-2' : '',
      ].join(' ')}
    >
      {initial}
    </div>
  );
}
