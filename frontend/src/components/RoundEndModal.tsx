import type { Player } from '@shared/events';
import { useCountdown } from '@/hooks/useCountdown';

interface RoundEndModalProps {
  word: string;
  players: Player[];
  scores: Array<{ playerId: string; delta: number }>;
  phaseEndsAt?: number;
  isLast: boolean;
  onAdvance: () => void;
}

export function RoundEndModal({
  word,
  players,
  scores,
  phaseEndsAt,
  isLast,
  onAdvance,
}: RoundEndModalProps) {
  const remaining = useCountdown(phaseEndsAt);
  const deltaById = new Map(scores.map((s) => [s.playerId, s.delta]));

  // 按本轮得分降序
  const ranked = [...players].sort((a, b) => (deltaById.get(b.id) ?? 0) - (deltaById.get(a.id) ?? 0));

  const buttonText = isLast ? '查看最终结算' : '下一回合';

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-sm bg-white rounded-md p-6 shadow-sm">
        <div className="text-center mb-5">
          <div className="text-xs text-ink-mute mb-1">本回合答案</div>
          <div className="text-2xl font-semibold text-accent">{word}</div>
        </div>

        <div className="space-y-1.5">
          {ranked.map((p) => {
            const delta = deltaById.get(p.id) ?? 0;
            return (
              <div key={p.id} className="flex items-center justify-between text-sm px-2 py-1.5 rounded hover:bg-neutral-50">
                <span className="font-medium truncate">{p.name}</span>
                <span className={`tabular-nums ${delta > 0 ? 'text-accent' : 'text-ink-mute'}`}>
                  {delta > 0 ? `+${delta}` : delta === 0 ? '—' : delta}
                </span>
              </div>
            );
          })}
        </div>

        <button
          onClick={onAdvance}
          className="btn-accent w-full h-10 mt-5 tabular-nums"
        >
          {buttonText} ({remaining}s)
        </button>
      </div>
    </div>
  );
}
