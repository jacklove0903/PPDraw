import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@shared/events';
import { useUserStore } from '@/store/user';

const URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

/**
 * 获取（或建立）单例 Socket 连接，自动发送 player:hello 握手
 */
export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (socket && socket.connected) return socket;

  if (!socket) {
    socket = io(URL, {
      autoConnect: false,
      transports: ['websocket'],
      // 通过握手 auth 传递身份，保证服务端在收到任何业务事件前已知道玩家
      // 这样刷新后 room:join 不会先于 player:hello 到达
      auth: (cb) => {
        const { playerId, name, avatar } = useUserStore.getState();
        cb({ playerId, name, avatar });
      },
    });

    socket.on('connect', () => {
      const { playerId, name, avatar } = useUserStore.getState();
      if (name) {
        socket!.emit('player:hello', { playerId, name, avatar });
      }
    });
  }

  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
