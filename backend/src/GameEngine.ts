import type { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../shared/events.js';
import { broadcastRoomState, type Room, type RoomEngine } from './RoomManager.js';
import { pickRandomWords, type Word } from './words.js';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;

const CHOOSING_SECONDS = 10;
const ROUND_END_SECONDS = 5;
const GAME_END_LINGER_SECONDS = 0; // 进入 gameEnd 后保持状态，由前端按钮触发后续

/**
 * 单房间游戏状态机。
 *
 * 流程：
 *   waiting → start() → [choosing → drawing → roundEnd] × N → gameEnd → (restart)
 *
 * 计分：
 *   猜对者：50 + 剩余秒数 × 2
 *   画者：每位猜对者奖励 30 分
 */
export class GameEngine implements RoomEngine {
  private timer?: NodeJS.Timeout;
  /** 游戏开始时快照的画者顺序 */
  private drawerQueue: string[] = [];
  /** 当前画者的 3 个候选词 */
  private wordChoices: Word[] = [];
  /** 累计 turn 索引（0-based），用于推导回合数和画者 */
  private turnIndex = 0;
  /** 每轮开始时的分数快照，用于计算 delta */
  private roundStartScores = new Map<string, number>();

  constructor(private io: IO, private room: Room) {}

  // ============ Public API ============

  start(): { ok: boolean; error?: string } {
    if (this.room.players.size < 2) {
      return { ok: false, error: '至少需要 2 名玩家才能开始' };
    }
    if (
      this.room.status !== 'waiting' &&
      this.room.status !== 'gameEnd'
    ) {
      return { ok: false, error: '游戏已在进行中' };
    }

    // 重置玩家状态
    for (const p of this.room.players.values()) {
      p.score = 0;
      p.hasGuessed = false;
      p.isDrawing = false;
    }

    this.drawerQueue = Array.from(this.room.players.keys());
    this.turnIndex = 0;
    this.startTurn();
    return { ok: true };
  }

  chooseWord(playerId: string, word: string): void {
    if (this.room.status !== 'choosing') return;
    if (this.room.currentDrawerId !== playerId) return;
    if (!this.wordChoices.some((w) => w.word === word)) return;

    this.clearTimer();
    this.room.status = 'drawing';
    this.room.word = word;
    this.room.wordHint = makeHint(word);
    this.room.phaseEndsAt = Date.now() + this.room.config.roundSeconds * 1000;

    broadcastRoomState(this.io, this.room);

    this.timer = setTimeout(() => this.endRound(), this.room.config.roundSeconds * 1000);
  }

  receiveGuess(
    playerId: string,
    text: string,
  ): { broadcastAs: 'chat' | 'correct' | 'silent' } {
    // 非绘画阶段：普通聊天
    if (this.room.status !== 'drawing') return { broadcastAs: 'chat' };

    const player = this.room.players.get(playerId);
    if (!player) return { broadcastAs: 'silent' };

    // 画者发言：转为普通聊天但不计为猜词（前端 UI 也可隐藏画者发言）
    if (playerId === this.room.currentDrawerId) return { broadcastAs: 'chat' };

    // 已经猜对的玩家发言：屏蔽以免剧透
    if (player.hasGuessed) return { broadcastAs: 'silent' };

    const guess = normalize(text);
    const answer = normalize(this.room.word ?? '');

    if (guess && guess === answer) {
      // 计分
      const remainingMs = Math.max(0, (this.room.phaseEndsAt ?? 0) - Date.now());
      const remainingSec = remainingMs / 1000;
      const guesserPoints = Math.floor(50 + remainingSec * 2);
      player.score += guesserPoints;
      player.hasGuessed = true;

      // 画者每被猜对一次得 30 分
      const drawer = this.room.currentDrawerId
        ? this.room.players.get(this.room.currentDrawerId)
        : undefined;
      if (drawer) drawer.score += 30;

      broadcastRoomState(this.io, this.room);

      // 全员猜对则提前结束
      const guessers = Array.from(this.room.players.values()).filter(
        (p) => p.id !== this.room.currentDrawerId,
      );
      const allGuessed = guessers.length > 0 && guessers.every((p) => p.hasGuessed);
      if (allGuessed) {
        this.clearTimer();
        setImmediate(() => this.endRound());
      }

      return { broadcastAs: 'correct' };
    }

    return { broadcastAs: 'chat' };
  }

  handlePlayerLeave(playerId: string): void {
    if (this.room.status === 'waiting' || this.room.status === 'gameEnd') return;

    // 玩家数不足则结束游戏
    if (this.room.players.size < 2) {
      this.endGame();
      return;
    }

    // 当前画者离开 → 跳到下一回合
    if (this.room.currentDrawerId === playerId) {
      this.clearTimer();
      setImmediate(() => {
        this.turnIndex++;
        this.startTurn();
      });
    }
  }

  cleanup(): void {
    this.clearTimer();
  }

  // ============ Internal transitions ============

  /** 开始一个新回合（选词阶段） */
  private startTurn() {
    this.clearTimer();

    const totalTurns = this.drawerQueue.length * this.room.config.rounds;
    if (this.turnIndex >= totalTurns) {
      this.endGame();
      return;
    }

    const drawerId = this.drawerQueue[this.turnIndex % this.drawerQueue.length];
    // 跳过已离开的画者
    if (!this.room.players.has(drawerId)) {
      this.turnIndex++;
      this.startTurn();
      return;
    }

    // 重置玩家本回合状态
    for (const p of this.room.players.values()) {
      p.hasGuessed = false;
      p.isDrawing = p.id === drawerId;
    }

    this.room.status = 'choosing';
    this.room.currentRound =
      Math.floor(this.turnIndex / this.drawerQueue.length) + 1;
    this.room.currentDrawerId = drawerId;
    this.room.word = undefined;
    this.room.wordHint = undefined;
    this.room.phaseEndsAt = Date.now() + CHOOSING_SECONDS * 1000;

    // 记录本回合开始时的分数快照（用于 delta 计算）
    this.roundStartScores.clear();
    for (const p of this.room.players.values()) {
      this.roundStartScores.set(p.id, p.score);
    }

    this.wordChoices = pickRandomWords(3, this.room.config.category);

    broadcastRoomState(this.io, this.room);

    // 单独把候选词推送给当前画者
    const drawerSid = this.room.socketByPlayerId.get(drawerId);
    if (drawerSid) {
      this.io.to(drawerSid).emit(
        'game:wordChoices',
        this.wordChoices.map((w) => ({ word: w.word, difficulty: w.difficulty })),
      );
    }

    // 选词超时：自动选第一个
    this.timer = setTimeout(() => {
      if (this.room.status === 'choosing') {
        this.chooseWord(drawerId, this.wordChoices[0].word);
      }
    }, CHOOSING_SECONDS * 1000);
  }

  /** 结算当前回合 */
  private endRound() {
    this.clearTimer();
    if (this.room.status !== 'drawing' && this.room.status !== 'choosing') return;

    const word = this.room.word ?? '?';
    this.room.status = 'roundEnd';
    this.room.phaseEndsAt = Date.now() + ROUND_END_SECONDS * 1000;

    // 计算每个玩家本轮 delta
    const scores = Array.from(this.room.players.values()).map((p) => ({
      playerId: p.id,
      delta: p.score - (this.roundStartScores.get(p.id) ?? p.score),
    }));

    const totalTurns = this.drawerQueue.length * this.room.config.rounds;
    const isLast = this.turnIndex >= totalTurns - 1;

    this.io.to(this.room.id).emit('game:roundEnd', { word, scores, isLast });
    broadcastRoomState(this.io, this.room);

    this.timer = setTimeout(() => this.advance(), ROUND_END_SECONDS * 1000);
  }

  /** 从 roundEnd 推进到下一阶段（下一回合或 endGame） */
  private advance() {
    this.clearTimer();
    this.turnIndex++;
    this.startTurn();
  }

  /** 外部调用：玩家点击跳过 roundEnd 等待 */
  requestAdvance(): void {
    if (this.room.status !== 'roundEnd') return;
    this.advance();
  }

  /** 游戏结束 */
  private endGame() {
    this.clearTimer();
    this.room.status = 'gameEnd';
    this.room.currentDrawerId = undefined;
    this.room.word = undefined;
    this.room.wordHint = undefined;
    this.room.phaseEndsAt = undefined;

    for (const p of this.room.players.values()) {
      p.isDrawing = false;
      p.hasGuessed = false;
    }

    const ranking = Array.from(this.room.players.values()).sort(
      (a, b) => b.score - a.score,
    );
    this.io.to(this.room.id).emit('game:gameEnd', { ranking });
    broadcastRoomState(this.io, this.room);

    if (GAME_END_LINGER_SECONDS > 0) {
      this.timer = setTimeout(() => {
        this.room.status = 'waiting';
        broadcastRoomState(this.io, this.room);
      }, GAME_END_LINGER_SECONDS * 1000);
    }
  }

  private clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }
}

// ============ Helpers ============

/** 标准化用于答案比较：去空格、转小写 */
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '');
}

/** 生成字数提示，如 "苹果" → "_ _" */
function makeHint(word: string): string {
  return Array.from(word)
    .map(() => '_')
    .join(' ');
}
