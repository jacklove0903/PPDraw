import { nanoid } from 'nanoid';
import type { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  Player,
  RoomConfig,
  RoomState,
  RoomSummary,
  ServerToClientEvents,
} from '../../shared/events.js';

/** 房间引擎接口（由 GameEngine 实现，避免循环依赖） */
export interface RoomEngine {
  start(): { ok: boolean; error?: string };
  chooseWord(playerId: string, word: string): void;
  receiveGuess(playerId: string, text: string): { broadcastAs: 'chat' | 'correct' | 'silent' };
  /** 玩家点击"下一回合"按钮，跳过 roundEnd 等待 */
  requestAdvance(): void;
  handlePlayerLeave(playerId: string): void;
  cleanup(): void;
}

/**
 * 房间内存储模型（服务端权威）
 */
export interface Room {
  id: string;
  config: RoomConfig;
  password?: string;
  players: Map<string, Player>;
  status: RoomState['status'];
  currentRound: number;
  currentDrawerId?: string;
  word?: string;
  wordHint?: string;
  phaseEndsAt?: number;
  hostId?: string;
  /** 用于断线重连的 socket 映射 */
  socketByPlayerId: Map<string, string>;
  /** 游戏引擎，懒加载 */
  engine?: RoomEngine;
}

type IO = Server<ClientToServerEvents, ServerToClientEvents>;

/** 向房间内每个玩家广播 room:state（按其视角过滤词） */
export function broadcastRoomState(io: IO, room: Room) {
  for (const [playerId, sid] of room.socketByPlayerId) {
    io.to(sid).emit('room:state', roomManager.toState(room, playerId));
  }
}

/**
 * 全局房间管理（单进程内存版，后续可换 Redis）
 */
export class RoomManager {
  private rooms = new Map<string, Room>();

  create(config: RoomConfig): Room {
    const id = nanoid(6).toUpperCase();
    const room: Room = {
      id,
      config: { ...config, password: undefined },
      password: config.password || undefined,
      players: new Map(),
      status: 'waiting',
      currentRound: 0,
      socketByPlayerId: new Map(),
    };
    this.rooms.set(id, room);
    return room;
  }

  get(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  remove(id: string): void {
    this.rooms.delete(id);
  }

  list(): RoomSummary[] {
    return Array.from(this.rooms.values()).map((r) => ({
      id: r.id,
      name: r.config.name,
      playerCount: r.players.size,
      maxPlayers: r.config.maxPlayers,
      hasPassword: !!r.password,
      status: r.status === 'waiting' ? 'waiting' : 'playing',
    }));
  }

  toState(room: Room, viewerId?: string): RoomState {
    return {
      id: room.id,
      config: room.config,
      players: Array.from(room.players.values()),
      status: room.status,
      currentRound: room.currentRound,
      currentDrawerId: room.currentDrawerId,
      // 仅画者本人可看到完整词
      word: viewerId === room.currentDrawerId ? room.word : undefined,
      wordHint: room.wordHint,
      phaseEndsAt: room.phaseEndsAt,
    };
  }
}

export const roomManager = new RoomManager();
