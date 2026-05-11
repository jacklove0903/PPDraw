import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Plus, RefreshCw, Search, Zap } from 'lucide-react';
import type { RoomConfig, RoomSummary } from '@shared/events';
import { useUserStore } from '@/store/user';
import { Avatar } from '@/components/Avatar';
import { CreateRoomModal } from '@/components/CreateRoomModal';
import { getSocket } from '@/socket/client';

export default function LobbyPage() {
  const navigate = useNavigate();
  const { name, avatar } = useUserStore();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const refresh = () => {
    setLoading(true);
    const s = getSocket();
    s.emit('lobby:list', (list) => {
      setRooms(list);
      setLoading(false);
    });
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = (config: RoomConfig) => {
    const s = getSocket();
    s.emit('room:create', config, (res) => {
      if (res.ok && res.roomId) {
        setShowCreate(false);
        navigate(`/room/${res.roomId}`);
      } else {
        alert(res.error || '创建失败');
      }
    });
  };

  const handleJoin = (room: RoomSummary) => {
    const s = getSocket();
    let password: string | undefined;
    if (room.hasPassword) {
      const input = window.prompt(`房间「${room.name}」需要密码`);
      if (input === null) return; // 用户取消
      password = input;
    }
    s.emit('room:join', { roomId: room.id, password }, (res) => {
      if (res.ok) navigate(`/room/${room.id}`);
      else alert(res.error || '加入失败');
    });
  };

  const handleQuickMatch = () => {
    const s = getSocket();
    s.emit('room:quickMatch', (res) => {
      if (res.ok && res.roomId) navigate(`/room/${res.roomId}`);
      else alert(res.error || '匹配失败');
    });
  };

  const filtered = rooms.filter((r) =>
    keyword ? r.name.toLowerCase().includes(keyword.toLowerCase()) : true,
  );

  return (
    <main className="min-h-screen">
      <header className="border-b border-line">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <h1 className="text-base font-semibold">PPDraw</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-soft">{name}</span>
            <Avatar id={avatar} name={name} size={28} />
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索房间"
              className="input w-full pl-8"
            />
          </div>
          <button onClick={refresh} className="btn-ghost" title="刷新">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="flex-1" />
          <button onClick={handleQuickMatch} className="btn-ghost">
            <Zap size={14} />
            快速匹配
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-accent">
            <Plus size={14} />
            创建房间
          </button>
        </div>

        <div className="card overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2.5 text-xs text-ink-mute border-b border-line bg-neutral-50">
            <div className="col-span-6">房间名</div>
            <div className="col-span-2">人数</div>
            <div className="col-span-2">状态</div>
            <div className="col-span-2 text-right">操作</div>
          </div>
          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-ink-mute">
              {loading ? '加载中…' : '暂无房间，点击右上角创建一个'}
            </div>
          ) : (
            filtered.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-12 px-4 py-3 text-sm border-b border-line last:border-b-0 items-center hover:bg-neutral-50"
              >
                <div className="col-span-6 flex items-center gap-2">
                  <span className="font-medium">{r.name}</span>
                  {r.hasPassword && <Lock size={12} className="text-ink-mute" />}
                </div>
                <div className="col-span-2 text-ink-soft">
                  {r.playerCount}/{r.maxPlayers}
                </div>
                <div className="col-span-2 text-ink-soft">
                  {r.status === 'waiting' ? '等待中' : '进行中'}
                </div>
                <div className="col-span-2 text-right">
                  <button
                    disabled={r.status !== 'waiting' || r.playerCount >= r.maxPlayers}
                    onClick={() => handleJoin(r)}
                    className="btn-primary h-8 px-3 text-xs"
                  >
                    加入
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {showCreate && (
        <CreateRoomModal
          defaultName={`${name} 的房间`}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}
    </main>
  );
}
