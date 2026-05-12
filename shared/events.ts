// 前后端共享的 Socket.IO 事件协议与类型定义

/**
 * 词库分类常量。'all' 表示混合所有分类（随机）。
 * 前后端共享，CreateRoomModal 与 pickRandomWords 都基于此。
 */
export const CATEGORIES = [
  { id: 'all', label: '随机混合', emoji: '🎲' },
  { id: '动物', label: '动物', emoji: '🐶' },
  { id: '水果', label: '水果', emoji: '🍎' },
  { id: '蔬菜', label: '蔬菜', emoji: '🥕' },
  { id: '食物', label: '食物', emoji: '🍜' },
  { id: '物品', label: '日常物品', emoji: '📱' },
  { id: '自然', label: '自然现象', emoji: '🌈' },
  { id: '交通', label: '交通工具', emoji: '🚗' },
  { id: '运动', label: '运动', emoji: '⚽' },
  { id: '职业', label: '职业', emoji: '👨‍🍳' },
  { id: '服饰', label: '服饰', emoji: '👕' },
  { id: '乐器', label: '乐器', emoji: '🎸' },
  { id: '身体', label: '身体部位', emoji: '🦵' },
  { id: '动作', label: '动作', emoji: '🏃' },
  { id: '情绪', label: '情绪', emoji: '😊' },
  { id: '节日', label: '节日', emoji: '🎄' },
  { id: '建筑', label: '建筑', emoji: '🏛️' },
  { id: '影视动漫', label: '影视 / 动漫', emoji: '🎬' },
  { id: '网络流行', label: '网络流行词', emoji: '🔥' },
  { id: '国家地标', label: '国家 / 地标', emoji: '🗽' },
  { id: '成语', label: '成语 (高难)', emoji: '📜' },
] as const;

export type CategoryId = typeof CATEGORIES[number]['id'];


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
  /** 创建者 playerId，用于前端判断是否是“我的房间”（跳过密码提示） */
  creatorId?: string;
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
  /** 快速匹配：寻找任一无密码、等待中、未满的房间；若无则自动创建一个 */
  'room:quickMatch': (cb: (res: { ok: boolean; roomId?: string; error?: string }) => void) => void;
  'room:leave': () => void;
  /** 解散房间（仅房主），锁定朿器后踢出所有玩家 */
  'room:dissolve': () => void;
  'room:start': () => void;
  'game:chooseWord': (word: string) => void;
  /** 跳过当前 roundEnd 等待，立即进入下一阶段（下一回合或最终结算） */
  'game:advance': () => void;
  'game:guess': (text: string) => void;
  'draw:stroke': (stroke: DrawStroke) => void;
  'draw:clear': () => void;
  'draw:undo': () => void;
}

// ========== Server → Client ==========
export interface ServerToClientEvents {
  'room:state': (state: RoomState) => void;
  'room:chat': (message: ChatMessage) => void;
  /** 房主解散房间，所有客户端返回大厅 */
  'room:dissolved': () => void;
  'game:wordChoices': (words: Array<{ word: string; difficulty: 'easy' | 'medium' | 'hard' }>) => void;
  'game:roundEnd': (payload: {
    word: string;
    scores: Array<{ playerId: string; delta: number }>;
    /** 本回合是否是整局的最后一个回合 */
    isLast: boolean;
  }) => void;
  'game:gameEnd': (payload: { ranking: Player[] }) => void;
  'draw:stroke': (stroke: DrawStroke) => void;
  'draw:clear': () => void;
  'draw:undo': () => void;
  /** 新加入 / 刷新时下发完整笔画历史 */
  'draw:history': (strokes: DrawStroke[]) => void;
  'error:message': (text: string) => void;
}
