import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Play, Trash2 } from 'lucide-react';
import type { ChatMessage, Player, RoomState } from '@shared/events';
import { Avatar } from '@/components/Avatar';
import { DrawCanvas, type DrawCanvasHandle } from '@/components/DrawCanvas';
import { DrawToolbar } from '@/components/DrawToolbar';
import { WordChoiceModal, WaitingForChoice } from '@/components/WordChoiceModal';
import { RoundEndModal } from '@/components/RoundEndModal';
import { GameEndModal } from '@/components/GameEndModal';
import { useCountdown } from '@/hooks/useCountdown';
import { getSocket } from '@/socket/client';
import { useUserStore } from '@/store/user';

type Difficulty = 'easy' | 'medium' | 'hard';

interface RoundResult {
  word: string;
  scores: Array<{ playerId: string; delta: number }>;
  isLast: boolean;
}

export default function RoomPage() {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  const me = useUserStore();

  const [state, setState] = useState<RoomState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  // 游戏阶段相关
  const [wordChoices, setWordChoices] = useState<Array<{ word: string; difficulty: Difficulty }> | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [finalRanking, setFinalRanking] = useState<Player[] | null>(null);

  // 画布工具状态
  const canvasRef = useRef<DrawCanvasHandle>(null);
  const [color, setColor] = useState('#171717');
  const [size, setSize] = useState(6);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

  useEffect(() => {
    const s = getSocket();

    const onState = (next: RoomState) => {
      setState(next);
      // 离开 choosing 阶段后清掉候选词
      if (next.status !== 'choosing') setWordChoices(null);
      // 离开 roundEnd 阶段后清掉本轮结果
      if (next.status !== 'roundEnd') setRoundResult(null);
      // 新一局开始时清掉旧的结算
      if (next.status === 'choosing' || next.status === 'drawing') setFinalRanking(null);
      // 新回合开始时清空画布
      if (next.status === 'choosing') canvasRef.current?.clear();
    };
    const onChat = (msg: ChatMessage) => setMessages((prev) => [...prev, msg]);
    const onWordChoices = (words: Array<{ word: string; difficulty: Difficulty }>) =>
      setWordChoices(words);
    const onRoundEnd = (payload: RoundResult) => setRoundResult(payload);
    const onGameEnd = (payload: { ranking: Player[] }) => setFinalRanking(payload.ranking);
    const onError = (text: string) => alert(text);

    s.on('room:state', onState);
    s.on('room:chat', onChat);
    s.on('game:wordChoices', onWordChoices);
    s.on('game:roundEnd', onRoundEnd);
    s.on('game:gameEnd', onGameEnd);
    s.on('error:message', onError);

    s.emit('room:join', { roomId }, (res) => {
      if (!res.ok) {
        alert(res.error || '加入失败');
        navigate('/lobby');
      }
    });

    return () => {
      s.off('room:state', onState);
      s.off('room:chat', onChat);
      s.off('game:wordChoices', onWordChoices);
      s.off('game:roundEnd', onRoundEnd);
      s.off('game:gameEnd', onGameEnd);
      s.off('room:dissolved', onDissolved);
      s.off('error:message', onError);
    };
  }, [roomId, navigate]);

  const myPlayer = state?.players.find((p) => p.id === me.playerId);
  const isHost = !!myPlayer?.isHost;
  const isDrawer = state?.currentDrawerId === me.playerId;
  const hasGuessed = !!myPlayer?.hasGuessed;

  const remaining = useCountdown(state?.phaseEndsAt);

  const sendGuess = () => {
    const text = input.trim();
    if (!text) return;
    getSocket().emit('game:guess', text);
    setInput('');
  };

  const handleChooseWord = (word: string) => {
    getSocket().emit('game:chooseWord', word);
    setWordChoices(null);
  };

  const handleLeave = () => {
    getSocket().emit('room:leave');
    navigate('/lobby');
  };

  const handlePlayAgain = () => {
    if (!isHost) return;
    getSocket().emit('room:start');
  };

  const handleDissolve = () => {
    if (!isHost) return;
    if (!confirm('确认解散房间？所有玩家将返回大厅。')) return;
    getSocket().emit('room:dissolve');
  };

  if (!state) {
    return (
      <main className="min-h-screen flex items-center justify-center text-sm text-ink-mute">
        进入房间中…
      </main>
    );
  }

  // 是否允许绘画：waiting 状态下任意玩家可热身；drawing 状态下仅画者
  const canDraw = state.status === 'waiting' || (state.status === 'drawing' && isDrawer);
  // 是否允许聊天/猜词输入
  const chatDisabled =
    (state.status === 'drawing' && (isDrawer || hasGuessed)) || state.status === 'gameEnd';

  const chatPlaceholder = (() => {
    if (state.status !== 'drawing') return '输入聊天…';
    if (isDrawer) return '你正在画画，不能聊天';
    if (hasGuessed) return '你已猜对，请勿剧透';
    return '输入答案…';
  })();

  const drawerName = state.currentDrawerId
    ? state.players.find((p) => p.id === state.currentDrawerId)?.name ?? ''
    : '';

  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-line">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
          >
            <ArrowLeft size={14} />
            返回大厅
          </button>
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium">{state.config.name}</span>
            <span className="text-ink-mute">#{state.id}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-ink-soft tabular-nums">
              第 {Math.max(1, state.currentRound)}/{state.config.rounds} 回合
            </div>
            {isHost && (
              <button
                onClick={handleDissolve}
                className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700"
                title="解散房间"
              >
                <Trash2 size={12} />
                解散
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-6 grid grid-cols-12 gap-4">
        {/* 玩家列表 */}
        <aside className="col-span-3 card p-3 space-y-2 h-fit">
          <div className="text-xs text-ink-mute px-1">
            玩家 {state.players.length}/{state.config.maxPlayers}
          </div>
          {state.players.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-2.5 p-1.5 rounded ${
                p.id === state.currentDrawerId ? 'bg-orange-50/50' : 'hover:bg-neutral-50'
              }`}
            >
              <Avatar id={p.avatar as never} name={p.name} size={32} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate flex items-center gap-1">
                  <span className="truncate">{p.name}</span>
                  {p.isHost && <span className="text-[10px] text-ink-mute">房主</span>}
                  {p.hasGuessed && state.status === 'drawing' && (
                    <span className="text-[10px] text-emerald-600">已猜对</span>
                  )}
                </div>
                <div className="text-xs text-ink-mute tabular-nums">{p.score} 分</div>
              </div>
              {p.isDrawing && <span className="text-[10px] text-accent">画</span>}
            </div>
          ))}
        </aside>

        {/* 画布区域 */}
        <section className="col-span-6 space-y-3">
          {/* 顶部状态条：词 / 提示 / 倒计时 */}
          <GameStatusBar
            status={state.status}
            isDrawer={isDrawer}
            word={state.word}
            wordHint={state.wordHint}
            remaining={remaining}
            drawerName={drawerName}
          />

          <div className="relative">
            <DrawCanvas
              ref={canvasRef}
              drawable={canDraw}
              color={color}
              size={size}
              tool={tool}
            />

            {/* 选词阶段覆盖层 */}
            {state.status === 'choosing' && isDrawer && wordChoices && (
              <WordChoiceModal
                choices={wordChoices}
                phaseEndsAt={state.phaseEndsAt}
                onChoose={handleChooseWord}
              />
            )}
            {state.status === 'choosing' && !isDrawer && (
              <WaitingForChoice drawerName={drawerName} phaseEndsAt={state.phaseEndsAt} />
            )}

            {/* 回合结算覆盖层 */}
            {state.status === 'roundEnd' && roundResult && (
              <RoundEndModal
                word={roundResult.word}
                players={state.players}
                scores={roundResult.scores}
                phaseEndsAt={state.phaseEndsAt}
                isLast={roundResult.isLast}
                onAdvance={() => getSocket().emit('game:advance')}
              />
            )}

            {/* 游戏结束覆盖层 */}
            {state.status === 'gameEnd' && finalRanking && (
              <GameEndModal
                ranking={finalRanking}
                isHost={isHost}
                onPlayAgain={handlePlayAgain}
                onBackToLobby={handleLeave}
              />
            )}
          </div>

          <DrawToolbar
            disabled={!canDraw}
            color={color}
            size={size}
            tool={tool}
            onColorChange={setColor}
            onSizeChange={setSize}
            onToolChange={setTool}
            onUndo={() => canvasRef.current?.undo()}
            onClear={() => canvasRef.current?.clear()}
          />

          {state.status === 'waiting' && isHost && (
            <button onClick={handlePlayAgain} className="btn-accent w-full h-10">
              <Play size={14} />
              开始游戏
            </button>
          )}
          {state.status === 'waiting' && !isHost && (
            <div className="text-center text-xs text-ink-mute">
              等待房主开始游戏 · 当前可自由绘画热身
            </div>
          )}
        </section>

        {/* 聊天 / 猜词 */}
        <aside className="col-span-3 card flex flex-col h-[520px]">
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {messages.length === 0 ? (
              <div className="text-xs text-ink-mute text-center pt-4">还没有消息</div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="text-sm break-words">
                  {m.type === 'correct' ? (
                    <div className="text-emerald-600">{m.text}</div>
                  ) : (
                    <div>
                      <span className="text-ink-mute mr-1.5">{m.playerName}:</span>
                      <span>{m.text}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="border-t border-line p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendGuess()}
              placeholder={chatPlaceholder}
              disabled={chatDisabled}
              className="input w-full"
            />
          </div>
        </aside>
      </div>
    </main>
  );
}

// ============ 顶部状态条 ============

interface GameStatusBarProps {
  status: RoomState['status'];
  isDrawer: boolean;
  word?: string;
  wordHint?: string;
  remaining: number;
  drawerName: string;
}

function GameStatusBar({ status, isDrawer, word, wordHint, remaining, drawerName }: GameStatusBarProps) {
  const showTimer = status === 'choosing' || status === 'drawing' || status === 'roundEnd';

  let leftContent: React.ReactNode = null;
  if (status === 'drawing') {
    leftContent = isDrawer ? (
      <div>
        <span className="text-xs text-ink-mute mr-2">你正在画</span>
        <span className="text-base font-semibold text-accent">{word}</span>
      </div>
    ) : (
      <div>
        <span className="text-xs text-ink-mute mr-2">{drawerName} 正在画</span>
        <span className="text-base font-mono tracking-widest">{wordHint}</span>
        {wordHint && (
          <span className="text-xs text-ink-mute ml-2">
            ({wordHint.split(' ').filter(Boolean).length} 个字)
          </span>
        )}
      </div>
    );
  } else if (status === 'choosing') {
    leftContent = (
      <div className="text-sm text-ink-soft">{isDrawer ? '请选择要画的词' : `${drawerName} 正在选词…`}</div>
    );
  } else if (status === 'roundEnd') {
    leftContent = <div className="text-sm text-ink-soft">回合结束</div>;
  } else if (status === 'gameEnd') {
    leftContent = <div className="text-sm text-ink-soft">游戏结束</div>;
  } else {
    leftContent = <div className="text-sm text-ink-mute">等待开始</div>;
  }

  return (
    <div className="h-10 px-3 flex items-center justify-between border border-line rounded bg-white">
      <div className="flex-1 min-w-0">{leftContent}</div>
      {showTimer && (
        <div className="flex items-center gap-1.5 text-sm tabular-nums text-ink-soft">
          <Clock size={13} />
          {remaining}s
        </div>
      )}
    </div>
  );
}
