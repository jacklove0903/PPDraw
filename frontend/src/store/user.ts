import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

export const AVATARS = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'] as const;
export type AvatarId = (typeof AVATARS)[number];

interface UserState {
  playerId: string;
  name: string;
  avatar: AvatarId;
  setProfile: (name: string, avatar: AvatarId) => void;
  reset: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      playerId: nanoid(),
      name: '',
      avatar: 'a1',
      setProfile: (name, avatar) => set({ name: name.trim(), avatar }),
      reset: () => set({ playerId: nanoid(), name: '', avatar: 'a1' }),
    }),
    { name: 'ppdraw-user' },
  ),
);
