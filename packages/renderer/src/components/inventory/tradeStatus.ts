import type { TradeStatus } from '@/types/steam';

/** Short labels for each trade status, used in the filter panel. */
export const STATUS_LABELS: Record<TradeStatus, string> = {
  tradable: 'Tradable',
  market_listed: 'Listed on Market',
  trade_hold: 'Trade Hold',
};

/** Tooltip text explaining why an item can't be moved. */
export function statusTitle(
  status: TradeStatus | 'mixed',
  tradeHoldExpires?: string | null,
): string | null {
  if (status === 'market_listed') {
    return "Listed on the Steam Community Market — kept in your inventory until it sells. Can't be moved.";
  }
  if (status === 'trade_hold') {
    const until = tradeHoldExpires ? new Date(tradeHoldExpires).toLocaleString() : null;
    return until
      ? `Under a trade-protection hold until ${until}. Can't be moved.`
      : "Under a trade-protection hold. Can't be moved.";
  }
  return null;
}

/** Human-readable "time left" for a trade hold, or `null` once it has passed. */
export function timeLeft(tradeHoldExpires?: string | null): string | null {
  if (!tradeHoldExpires) return null;
  const ms = new Date(tradeHoldExpires).getTime() - Date.now();
  if (ms <= 0) return null;
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `${days}d left`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours}h left`;
  const mins = Math.max(1, Math.floor(ms / 60_000));
  return `${mins}m left`;
}
