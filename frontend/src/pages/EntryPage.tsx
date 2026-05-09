import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AVATARS, useUserStore, type AvatarId } from '@/store/user';
import { Avatar } from '@/components/Avatar';

export default function EntryPage() {
  const navigate = useNavigate();
  const { name: storedName, avatar: storedAvatar, setProfile } = useUserStore();
  const [name, setName] = useState(storedName);
  const [avatar, setAvatar] = useState<AvatarId>(storedAvatar);

  const canSubmit = name.trim().length > 0 && name.trim().length <= 12;

  const handleStart = () => {
    if (!canSubmit) return;
    setProfile(name, avatar);
    navigate('/lobby');
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">PPDraw</h1>
          <p className="text-sm text-ink-mute mt-1">画得丑没关系，猜得到就行。</p>
        </header>

        <section className="space-y-5">
          <div>
            <label className="block text-xs text-ink-mute mb-1.5">昵称</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              placeholder="输入一个昵称"
              maxLength={12}
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-xs text-ink-mute mb-2">头像</label>
            <div className="flex flex-wrap gap-3">
              {AVATARS.map((a) => (
                <Avatar
                  key={a}
                  id={a}
                  name={name || a}
                  active={avatar === a}
                  onClick={() => setAvatar(a)}
                />
              ))}
            </div>
          </div>

          <button
            disabled={!canSubmit}
            onClick={handleStart}
            className="btn-accent w-full h-10"
          >
            开始游戏
          </button>
        </section>
      </div>
    </main>
  );
}
