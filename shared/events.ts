// 前后端共享的 Socket.IO 事件协议与类型定义

export interface Player {
  id: string;
  name: string;
  avatar: string; // 头像标识（如 'a1' ~ 'a8'）
  score: number;
  isHost: boolean;
  isDrawing: boolean;
  hasGuessed: boolean;
}

export interface RoomSummary {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  hasPassword: boolean;
  status: 'waiting' | 'playing';
}

export interface RoomConfig {
  name: string;
  maxPlayers: number;
  rounds: number;
  roundSeconds: number;
  password?: string;
  category?: string;
}

export interface RoomState {
  id: string;
  config: RoomConfig;
  players: Player[];
  status: 'waiting' | 'choosing' | 'drawing' | 'roundEnd' | 'gameEnd';
  currentRound: number;
  currentDrawerId?: string;
  word?: string;          // 仅画者可见
  wordHint?: string;      // 公开的字数提示，如 "_ _ _ _"
  /** 当前阶段结束的 Unix 毫秒时间戳，客户端用于显示倒计时 */
  phaseEndsAt?: number;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  type: 'chat' | 'system' | 'correct';
  timestamp: number;
}

/**
 * 一段笔画数据。可能是完整笔画的一段增量（同一 strokeId 多次发送）。
 * 坐标使用归一化 0~1 区间，便于不同分辨率画布间转换。
 */
export interface DrawStroke {
  strokeId: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  size: number;
  type: 'pen' | 'eraser';
}

// ========== Client → Server ==========
export interface ClientToServerEvents {
  'player:hello': (payload: { playerId: string; name: string; avatar: string }) => void;
  'lobby:list': (cb: (rooms: RoomSummary[]) => void) => void;
  'room:create': (config: RoomConfig, cb: (res: { ok: boolean; roomId?: string; error?: string }) => void) => void;
  'room:join': (payload: { roomId: string; password?: string }, cb: (res: { ok: boolean; error?: string }) => void) => void;
  'room:leave': () => void;
  'room:start': () => void;
  'game:chooseWord': (word: string) => void;
  'game:guess': (text: string) => void;
  'draw:stroke': (stroke: DrawStroke) => void;
  'draw:clear': () => void;
  'draw:undo': () => void;
}

// ========== Server → Client ==========
export interface ServerToClientEvents {
  'room:state': (state: RoomState) => void;
  'room:chat': (message: ChatMessage) => void;
  'game:wordChoices': (words: Array<{ word: string; difficulty: 'easy' | 'medium' | 'hard' }>) => void;
  'game:roundEnd': (payload: { word: string; scores: Array<{ playerId: string; delta: number }> }) => void;
  'game:gameEnd': (payload: { ranking: Player[] }) => void;
  'draw:stroke': (stroke: DrawStroke) => void;
  'draw:clear': () => void;
  'draw:undo': () => void;
  'error:message': (text: string) => void;
}
