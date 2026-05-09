import { nanoid } from 'nanoid';
import type { Player, RoomConfig, RoomState, RoomSummary } from '../../shared/events.js';

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
  hostId?: string;
  /** 用于断线重连的 socket 映射 */
  socketByPlayerId: Map<string, string>;
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
    };
  }
}

export const roomManager = new RoomManager();
