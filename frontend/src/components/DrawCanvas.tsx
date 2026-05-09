import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { nanoid } from 'nanoid';
import type { DrawStroke } from '@shared/events';
import { getSocket } from '@/socket/client';

export interface DrawCanvasHandle {
  /** 由父组件触发的本地操作，会自动广播 */
  clear: () => void;
  undo: () => void;
}

interface DrawCanvasProps {
  /** 是否可绘画（非画者时为 false 即只读） */
  drawable: boolean;
  /** 画笔颜色 */
  color: string;
  /** 画笔粗细（CSS 像素，会按归一化坐标自动缩放） */
  size: number;
  /** 工具：画笔 / 橡皮 */
  tool: 'pen' | 'eraser';
}

/**
 * 实时同步画布。
 * - 坐标使用归一化 0~1，便于不同分辨率画布同步。
 * - 历史记录按 strokeId 分组，支持撤销/清空/重绘（resize）。
 * - 节流：本地立即绘制，网络每 ~40ms 发送一次增量段。
 */
export const DrawCanvas = forwardRef<DrawCanvasHandle, DrawCanvasProps>(
  function DrawCanvas({ drawable, color, size, tool }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    /** 已完成的笔画历史（顺序保存，用于撤销/重绘） */
    const strokesRef = useRef<DrawStroke[]>([]);
    /** 同 strokeId 接收到的远端笔画索引，便于增量合并 */
    const remoteStrokeIndex = useRef<Map<string, number>>(new Map());

    /** 当前正在绘制的本地笔画 */
    const activeRef = useRef<{
      id: string;
      points: Array<{ x: number; y: number }>;
      lastEmittedIndex: number;
      lastEmitAt: number;
    } | null>(null);

    /** 取得 2D context */
    const ctx = () => canvasRef.current?.getContext('2d') ?? null;

    /** 重绘整个历史 */
    const redrawAll = useCallback(() => {
      const c = canvasRef.current;
      const g = ctx();
      if (!c || !g) return;
      g.clearRect(0, 0, c.width, c.height);
      for (const s of strokesRef.current) drawStroke(g, s, c.width, c.height);
    }, []);

    /** 适配画布尺寸（DPR + 容器宽度） */
    const fitCanvas = useCallback(() => {
      const c = canvasRef.current;
      const wrap = wrapperRef.current;
      if (!c || !wrap) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = wrap.getBoundingClientRect();
      c.width = Math.floor(rect.width * dpr);
      c.height = Math.floor(rect.height * dpr);
      c.style.width = `${rect.width}px`;
      c.style.height = `${rect.height}px`;
      redrawAll();
    }, [redrawAll]);

    useEffect(() => {
      fitCanvas();
      const ro = new ResizeObserver(fitCanvas);
      if (wrapperRef.current) ro.observe(wrapperRef.current);
      return () => ro.disconnect();
    }, [fitCanvas]);

    /** 监听远端事件 */
    useEffect(() => {
      const s = getSocket();

      const onStroke = (seg: DrawStroke) => {
        const idx = remoteStrokeIndex.current.get(seg.strokeId);
        if (idx === undefined) {
          // 新笔画
          const newStroke: DrawStroke = { ...seg, points: [...seg.points] };
          strokesRef.current.push(newStroke);
          remoteStrokeIndex.current.set(seg.strokeId, strokesRef.current.length - 1);
          // 增量绘制
          const c = canvasRef.current;
          if (c) drawStroke(ctx()!, newStroke, c.width, c.height);
        } else {
          // 已存在，追加点并从原最后一点连线
          const stroke = strokesRef.current[idx];
          const connectFrom = stroke.points.length - 1;
          stroke.points.push(...seg.points);
          const c = canvasRef.current;
          if (c) drawStrokeRange(ctx()!, stroke, connectFrom, c.width, c.height);
        }
      };

      const onClear = () => {
        strokesRef.current = [];
        remoteStrokeIndex.current.clear();
        const c = canvasRef.current;
        const g = ctx();
        if (c && g) g.clearRect(0, 0, c.width, c.height);
      };

      const onUndo = () => {
        const last = strokesRef.current.pop();
        if (last) remoteStrokeIndex.current.delete(last.strokeId);
        redrawAll();
      };

      s.on('draw:stroke', onStroke);
      s.on('draw:clear', onClear);
      s.on('draw:undo', onUndo);
      return () => {
        s.off('draw:stroke', onStroke);
        s.off('draw:clear', onClear);
        s.off('draw:undo', onUndo);
      };
    }, [redrawAll]);

    /** 把屏幕坐标转换为归一化 0~1 */
    const toNormalized = (e: React.PointerEvent) => {
      const c = canvasRef.current!;
      const rect = c.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };
    };

    /** 节流发送当前活动笔画的增量点（不重复 lastEmittedIndex） */
    const flushActive = (force = false) => {
      const a = activeRef.current;
      if (!a) return;
      const now = performance.now();
      if (!force && now - a.lastEmitAt < 40) return;

      const newPoints = a.points.slice(a.lastEmittedIndex + 1);
      if (newPoints.length === 0) return;

      getSocket().emit('draw:stroke', {
        strokeId: a.id,
        points: newPoints,
        color,
        size,
        type: tool,
      });

      a.lastEmittedIndex = a.points.length - 1;
      a.lastEmitAt = now;
    };

    const handlePointerDown = (e: React.PointerEvent) => {
      if (!drawable) return;
      const c = canvasRef.current;
      if (!c) return;
      c.setPointerCapture(e.pointerId);

      const p = toNormalized(e);
      const id = nanoid(8);
      const stroke: DrawStroke = {
        strokeId: id,
        points: [p],
        color,
        size,
        type: tool,
      };
      strokesRef.current.push(stroke);
      remoteStrokeIndex.current.set(id, strokesRef.current.length - 1);

      activeRef.current = {
        id,
        points: stroke.points,
        lastEmittedIndex: -1,
        lastEmitAt: 0,
      };
      // 首点立即广播
      flushActive(true);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
      const a = activeRef.current;
      if (!a) return;
      const p = toNormalized(e);
      a.points.push(p);

      // 本地立即绘制最近一段
      const c = canvasRef.current;
      const stroke = strokesRef.current[strokesRef.current.length - 1];
      if (c && stroke) drawStrokeRange(ctx()!, stroke, a.points.length - 2, c.width, c.height);

      flushActive();
    };

    const handlePointerUp = () => {
      flushActive(true);
      activeRef.current = null;
    };

    /** 暴露给父组件的命令 */
    useImperativeHandle(ref, () => ({
      clear: () => {
        strokesRef.current = [];
        remoteStrokeIndex.current.clear();
        const c = canvasRef.current;
        const g = ctx();
        if (c && g) g.clearRect(0, 0, c.width, c.height);
        getSocket().emit('draw:clear');
      },
      undo: () => {
        const last = strokesRef.current.pop();
        if (last) remoteStrokeIndex.current.delete(last.strokeId);
        redrawAll();
        getSocket().emit('draw:undo');
      },
    }));

    return (
      <div
        ref={wrapperRef}
        className="relative w-full aspect-[4/3] bg-white border border-line rounded overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={drawable ? 'cursor-crosshair touch-none' : 'pointer-events-none touch-none'}
          style={{ display: 'block' }}
        />
      </div>
    );
  },
);

// ============ 绘制工具函数 ============

function drawStroke(g: CanvasRenderingContext2D, s: DrawStroke, w: number, h: number) {
  drawStrokeRange(g, s, 0, w, h);
}

/**
 * 从 fromIndex 开始（含）增量绘制笔画。fromIndex < 0 时按 0 处理。
 * 实现：将 [fromIndex, end] 之间的点连成折线段。
 */
function drawStrokeRange(
  g: CanvasRenderingContext2D,
  s: DrawStroke,
  fromIndex: number,
  w: number,
  h: number,
) {
  const start = Math.max(0, fromIndex);
  const pts = s.points;
  if (pts.length === 0) return;

  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = s.size;
  if (s.type === 'eraser') {
    g.globalCompositeOperation = 'destination-out';
    g.strokeStyle = 'rgba(0,0,0,1)';
  } else {
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = s.color;
  }

  if (pts.length === 1) {
    // 单点：画一个圆点
    const p = pts[0];
    g.beginPath();
    g.arc(p.x * w, p.y * h, s.size / 2, 0, Math.PI * 2);
    g.fillStyle = s.type === 'eraser' ? 'rgba(0,0,0,1)' : s.color;
    g.fill();
    g.restore();
    return;
  }

  g.beginPath();
  g.moveTo(pts[start].x * w, pts[start].y * h);
  for (let i = start + 1; i < pts.length; i++) {
    g.lineTo(pts[i].x * w, pts[i].y * h);
  }
  g.stroke();
  g.restore();
}
