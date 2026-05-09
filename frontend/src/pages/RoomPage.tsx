import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play } from 'lucide-react';
import type { ChatMessage, RoomState } from '@shared/events';
import { Avatar } from '@/components/Avatar';
import { DrawCanvas, type DrawCanvasHandle } from '@/components/DrawCanvas';
import { DrawToolbar } from '@/components/DrawToolbar';
import { getSocket } from '@/socket/client';
import { useUserStore } from '@/store/user';

export default function RoomPage() {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  const me = useUserStore();

  const [state, setState] = useState<RoomState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  // 画布工具状态
  const canvasRef = useRef<DrawCanvasHandle>(null);
  const [color, setColor] = useState('#171717');
  const [size, setSize] = useState(6);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

  useEffect(() => {
    const s = getSocket();

    const onState = (next: RoomState) => setState(next);
    const onChat = (msg: ChatMessage) => setMessages((prev) => [...prev, msg]);

    s.on('room:state', onState);
    s.on('room:chat', onChat);

    // 进入页面时主动加入一次（支持刷新重连）
    s.emit('room:join', { roomId }, (res) => {
      if (!res.ok) {
        alert(res.error || '加入失败');
        navigate('/lobby');
      }
    });

    return () => {
      s.off('room:state', onState);
      s.off('room:chat', onChat);
      s.emit('room:leave');
    };
  }, [roomId, navigate]);

  const sendGuess = () => {
    const text = input.trim();
    if (!text) return;
    getSocket().emit('game:guess', text);
    setInput('');
  };

  const startGame = () => {
    alert('回合状态机开发中，当前可在等待室自由绘画测试同步效果');
  };

  if (!state) {
    return (
      <main className="min-h-screen flex items-center justify-center text-sm text-ink-mute">
        进入房间中…
      </main>
    );
  }

  const isHost = state.players.find((p) => p.id === me.playerId)?.isHost;

  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-line">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/lobby')}
            className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
          >
            <ArrowLeft size={14} />
            返回大厅
          </button>
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium">{state.config.name}</span>
            <span className="text-ink-mute">#{state.id}</span>
          </div>
          <div className="text-sm text-ink-soft">
            第 {state.currentRound}/{state.config.rounds} 回合
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
              className="flex items-center gap-2.5 p-1.5 rounded hover:bg-neutral-50"
            >
              <Avatar id={p.avatar as never} name={p.name} size={32} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {p.name}
                  {p.isHost && <span className="ml-1 text-[10px] text-accent">房主</span>}
                </div>
                <div className="text-xs text-ink-mute">{p.score} 分</div>
              </div>
              {p.isDrawing && <span className="text-xs text-accent">画</span>}
            </div>
          ))}
        </aside>

        {/* 画布区域 */}
        <section className="col-span-6 space-y-3">
          <DrawCanvas
            ref={canvasRef}
            drawable={state.status === 'waiting' || state.currentDrawerId === me.playerId}
            color={color}
            size={size}
            tool={tool}
          />
          <DrawToolbar
            disabled={state.status !== 'waiting' && state.currentDrawerId !== me.playerId}
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
            <button onClick={startGame} className="btn-accent w-full h-10">
              <Play size={14} />
              开始游戏
            </button>
          )}
          {state.status === 'waiting' && !isHost && (
            <div className="text-center text-xs text-ink-mute">
              等待房主开始游戏 · 当前可自由绘画测试
            </div>
          )}
        </section>

        {/* 聊天 / 猜词 */}
        <aside className="col-span-3 card flex flex-col h-[480px]">
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {messages.length === 0 ? (
              <div className="text-xs text-ink-mute text-center pt-4">还没有消息</div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="text-sm">
                  {m.type === 'correct' ? (
                    <div className="text-accent">{m.text}</div>
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
              placeholder="输入答案或聊天…"
              className="input w-full"
            />
          </div>
        </aside>
      </div>
    </main>
  );
}
