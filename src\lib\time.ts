/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function dateKeyFromOffset(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function formatMinutes(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function parseScreenTimeToMinutes(value: string): number {
  const normalized = value.trim().toLowerCase();
  const hourMatch = normalized.match(/(\d+(?:\.\d+)?)\s*h/);
  const minuteMatch = normalized.match(/(\d+)\s*m/);

  if (hourMatch) {
    return Math.round(Number(hourMatch[1]) * 60) + (minuteMatch ? Number(minuteMatch[1]) : 0);
  }

  if (minuteMatch) {
    return Number(minuteMatch[1]);
  }

  const numeric = Number.parseFloat(normalized);
  return Number.isFinite(numeric) ? Math.round(numeric * 60) : 0;
}

export function randomJoinCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `TOWER-${suffix}`;
}
