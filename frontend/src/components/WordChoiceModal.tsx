import { useCountdown } from '@/hooks/useCountdown';

type Difficulty = 'easy' | 'medium' | 'hard';

interface WordChoice {
  word: string;
  difficulty: Difficulty;
}

interface WordChoiceModalProps {
  choices: WordChoice[];
  phaseEndsAt?: number;
  onChoose: (word: string) => void;
}

const DIFF_LABEL: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

const DIFF_CLASS: Record<Difficulty, string> = {
  easy: 'bg-emerald-50 text-emerald-700',
  medium: 'bg-amber-50 text-amber-700',
  hard: 'bg-rose-50 text-rose-700',
};

export function WordChoiceModal({ choices, phaseEndsAt, onChoose }: WordChoiceModalProps) {
  const remaining = useCountdown(phaseEndsAt);

  return (
    <Backdrop>
      <div className="w-full max-w-lg bg-white rounded-md p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">选择本回合要画的词</h2>
          <span className="text-xs text-ink-mute tabular-nums">{remaining}s</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {choices.map((c) => (
            <button
              key={c.word}
              onClick={() => onChoose(c.word)}
              className="border border-line rounded p-4 hover:border-ink hover:bg-neutral-50 transition-colors text-center"
            >
              <div className="text-lg font-medium mb-2">{c.word}</div>
              <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded ${DIFF_CLASS[c.difficulty]}`}>
                {DIFF_LABEL[c.difficulty]}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink-mute text-center">10 秒内未选择将自动选第一个</p>
      </div>
    </Backdrop>
  );
}

/**
 * 等待画者选词时，其他玩家看到的等待面板。
 */
export function WaitingForChoice({ drawerName, phaseEndsAt }: { drawerName: string; phaseEndsAt?: number }) {
  const remaining = useCountdown(phaseEndsAt);
  return (
    <Backdrop>
      <div className="bg-white rounded-md p-6 shadow-sm text-center min-w-[280px]">
        <div className="text-sm text-ink-soft mb-1">{drawerName} 正在选词…</div>
        <div className="text-2xl font-semibold tabular-nums">{remaining}s</div>
      </div>
    </Backdrop>
  );
}

function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-[2px] p-4">
      {children}
    </div>
  );
}
