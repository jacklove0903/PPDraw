import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Player,
} from '../../shared/events.js';
import { broadcastRoomState, roomManager, type Room } from './RoomManager.js';
import { GameEngine } from './GameEngine.js';

interface SocketData {
  playerId?: string;
  name?: string;
  avatar?: string;
  roomId?: string;
}

type IO = Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

/** 懒加载获取（或创建）房间的游戏引擎 */
function getEngine(io: IO, room: Room): GameEngine {
  if (!room.engine) room.engine = new GameEngine(io, room);
  return room.engine as GameEngine;
}

export function registerSocketHandlers(io: IO, socket: IOSocket) {
  // 玩家身份握手
  socket.on('player:hello', ({ playerId, name, avatar }) => {
    socket.data.playerId = playerId;
    socket.data.name = name;
    socket.data.avatar = avatar;
    console.log(`[hello] ${name} (${playerId}) connected`);
  });

  // 大厅：列出房间
  socket.on('lobby:list', (cb) => {
    cb(roomManager.list());
  });

  // 创建房间
  socket.on('room:create', (config, cb) => {
    if (!socket.data.playerId) {
      cb({ ok: false, error: '请先设置昵称' });
      return;
    }
    const room = roomManager.create(config);
    cb({ ok: true, roomId: room.id });
  });

  // 快速匹配：找一个可加入的房间，没有则用默认配置创建一个
  socket.on('room:quickMatch', (cb) => {
    if (!socket.data.playerId) {
      cb({ ok: false, error: '请先设置昵称' });
      return;
    }
    const existing = roomManager.findMatchable();
    if (existing) {
      cb({ ok: true, roomId: existing.id });
      return;
    }
    const room = roomManager.create({
      name: `${socket.data.name ?? '玩家'} 的快速房间`,
      maxPlayers: 8,
      rounds: 3,
      roundSeconds: 80,
      category: 'all',
    });
    cb({ ok: true, roomId: room.id });
  });

  // 加入房间
  socket.on('room:join', ({ roomId, password }, cb) => {
    const { playerId, name, avatar } = socket.data;
    if (!playerId || !name || !avatar) {
      cb({ ok: false, error: '请先设置昵称' });
      return;
    }

    const room = roomManager.get(roomId);
    if (!room) {
      cb({ ok: false, error: '房间不存在' });
      return;
    }
    if (room.password && room.password !== password) {
      cb({ ok: false, error: '密码错误' });
      return;
    }
    if (room.players.size >= room.config.maxPlayers && !room.players.has(playerId)) {
      cb({ ok: false, error: '房间已满' });
      return;
    }

    // 已存在则视为重连
    const existing = room.players.get(playerId);
    const player: Player = existing ?? {
      id: playerId,
      name,
      avatar,
      score: 0,
      isHost: room.players.size === 0,
      isDrawing: false,
      hasGuessed: false,
    };
    if (player.isHost) room.hostId = playerId;
    room.players.set(playerId, player);
    room.socketByPlayerId.set(playerId, socket.id);
    socket.data.roomId = roomId;
    socket.join(roomId);

    cb({ ok: true });
    broadcastRoomState(io, room);
  });

  // 离开房间
  socket.on('room:leave', () => {
    leaveCurrentRoom(io, socket);
  });

  // 开始游戏（仅房主）
  socket.on('room:start', () => {
    const room = currentRoom(socket);
    if (!room) return;
    if (room.hostId !== socket.data.playerId) {
      socket.emit('error:message', '只有房主可以开始游戏');
      return;
    }
    const engine = getEngine(io, room);
    const res = engine.start();
    if (!res.ok) socket.emit('error:message', res.error ?? '无法开始');
  });

  // 画者选词
  socket.on('game:chooseWord', (word: string) => {
    const room = currentRoom(socket);
    if (!room || !room.engine) return;
    room.engine.chooseWord(socket.data.playerId!, word);
  });

  // 跳过 roundEnd 等待
  socket.on('game:advance', () => {
    const room = currentRoom(socket);
    if (!room || !room.engine) return;
    room.engine.requestAdvance();
  });

  // 画布笔画广播
  // MVP：waiting 状态下任何人可画（用于测试 / 热身），drawing 状态下仅画者可画
  const canDraw = (room: Room) => {
    if (room.status === 'waiting') return true;
    if (room.status === 'drawing') return room.currentDrawerId === socket.data.playerId;
    return false;
  };

  socket.on('draw:stroke', (stroke) => {
    const room = currentRoom(socket);
    if (!room || !canDraw(room)) return;
    socket.to(room.id).emit('draw:stroke', stroke);
  });

  socket.on('draw:clear', () => {
    const room = currentRoom(socket);
    if (!room || !canDraw(room)) return;
    socket.to(room.id).emit('draw:clear');
  });

  socket.on('draw:undo', () => {
    const room = currentRoom(socket);
    if (!room || !canDraw(room)) return;
    socket.to(room.id).emit('draw:undo');
  });

  // 聊天 / 猜词（由引擎判定是否广播，返回消息类型）
  socket.on('game:guess', (text) => {
    const room = currentRoom(socket);
    if (!room) return;
    const playerId = socket.data.playerId!;
    const player = room.players.get(playerId);
    if (!player) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    const decision = room.engine
      ? room.engine.receiveGuess(playerId, trimmed)
      : ({ broadcastAs: 'chat' as const });

    if (decision.broadcastAs === 'silent') return;

    if (decision.broadcastAs === 'correct') {
      io.to(room.id).emit('room:chat', {
        id: `${Date.now()}-${playerId}`,
        playerId,
        playerName: player.name,
        text: `${player.name} 猜对了！`,
        type: 'correct',
        timestamp: Date.now(),
      });
    } else {
      io.to(room.id).emit('room:chat', {
        id: `${Date.now()}-${playerId}`,
        playerId,
        playerName: player.name,
        text: trimmed,
        type: 'chat',
        timestamp: Date.now(),
      });
    }
  });

  // 断开连接
  socket.on('disconnect', () => {
    leaveCurrentRoom(io, socket);
    console.log(`[disconnect] ${socket.data.name ?? socket.id}`);
  });
}

function currentRoom(socket: IOSocket): Room | undefined {
  const id = socket.data.roomId;
  return id ? roomManager.get(id) : undefined;
}

function leaveCurrentRoom(io: IO, socket: IOSocket) {
  const room = currentRoom(socket);
  if (!room) return;
  const playerId = socket.data.playerId;
  if (playerId) {
    room.players.delete(playerId);
    room.socketByPlayerId.delete(playerId);
    // 房主转移
    if (room.hostId === playerId) {
      const next = room.players.values().next().value;
      if (next) {
        next.isHost = true;
        room.hostId = next.id;
      } else {
        room.engine?.cleanup();
        roomManager.remove(room.id);
        return;
      }
    }
    // 通知引擎玩家离开（画者离开、不足 2 人等会被处理）
    room.engine?.handlePlayerLeave(playerId);
  }
  socket.leave(room.id);
  socket.data.roomId = undefined;
  if (room.players.size === 0) {
    room.engine?.cleanup();
    roomManager.remove(room.id);
    return;
  }
  broadcastRoomState(io, room);
}
