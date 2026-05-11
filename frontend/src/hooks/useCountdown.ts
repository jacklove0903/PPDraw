import { useEffect, useState } from 'react';

/**
 * 基于结束时间戳的倒计时 hook。
 * 每 250ms 更新一次剩余秒数。
 */
export function useCountdown(endsAt?: number): number {
  const [remaining, setRemaining] = useState(() => calcRemaining(endsAt));

  useEffect(() => {
    setRemaining(calcRemaining(endsAt));
    if (!endsAt) return;
    const id = setInterval(() => {
      setRemaining(calcRemaining(endsAt));
    }, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  return remaining;
}

function calcRemaining(endsAt?: number): number {
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
}
