import type { TradeStatus } from '@/types/steam';

/** Short labels for each trade status, used in the filter panel. */
export const STATUS_LABELS: Record<TradeStatus, string> = {
  tradable: 'Tradable',
  market_listed: 'On Market',
  trade_hold: 'Trade Protected',
};

/** Format a trade-hold expiry as Steam does, e.g. `Jun 11, 2026 (7:00:00) GMT`. */
export function formatHoldExpiry(tradeHoldExpires: string): string {
  const d = new Date(tradeHoldExpires);
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  const h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  return `${month} ${day}, ${year} (${h}:${m}:${s}) GMT`;
}

/** Tooltip text explaining why an item can't be moved. */
export function statusTitle(
  status: TradeStatus | 'mixed',
  tradeHoldExpires?: string | null,
): string | null {
  if (status === 'market_listed') {
    return 'This item is listed on the Steam Community Market and cannot be consumed or modified while listed.';
  }
  if (status === 'trade_hold') {
    return tradeHoldExpires
      ? `This item is trade-protected and cannot be consumed, modified, or transferred until ${formatHoldExpiry(tradeHoldExpires)}`
      : 'This item is trade-protected and cannot be consumed, modified, or transferred.';
  }
  return null;
}
