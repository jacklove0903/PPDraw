import type { Player } from '@shared/events';
import { Avatar } from './Avatar';

interface GameEndModalProps {
  ranking: Player[];
  isHost: boolean;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

export function GameEndModal({ ranking, isHost, onPlayAgain, onBackToLobby }: GameEndModalProps) {
  const mvp = ranking[0];
  const rest = ranking.slice(1);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-md bg-white rounded-md p-6 shadow-sm">
        <div className="text-center mb-5">
          <div className="text-xs text-ink-mute mb-1">游戏结束</div>
          <div className="text-lg font-semibold">最终排行</div>
        </div>

        {/* MVP */}
        {mvp && (
          <div className="flex items-center gap-3 p-3 rounded border border-accent bg-orange-50/40 mb-3">
            <Avatar id={mvp.avatar as never} name={mvp.name} size={44} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded bg-accent text-white">MVP</span>
                <span className="font-medium truncate">{mvp.name}</span>
              </div>
              <div className="text-xs text-ink-mute mt-0.5">{mvp.score} 分</div>
            </div>
          </div>
        )}

        {/* 其他玩家 */}
        <div className="space-y-1">
          {rest.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-neutral-50">
              <span className="w-5 text-xs text-ink-mute tabular-nums">{i + 2}</span>
              <Avatar id={p.avatar as never} name={p.name} size={28} />
              <span className="flex-1 text-sm truncate">{p.name}</span>
              <span className="text-sm tabular-nums text-ink-soft">{p.score}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-6">
          <button onClick={onBackToLobby} className="btn-ghost h-10">
            返回大厅
          </button>
          <button onClick={onPlayAgain} disabled={!isHost} className="btn-accent h-10" title={isHost ? '' : '只有房主可以发起'}>
            再来一局
          </button>
        </div>
      </div>
    </div>
  );
}
