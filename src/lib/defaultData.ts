/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppLimit, BlockedApp, HomeAccountabilityState, SquadFriend } from '../types';

export const DEFAULT_BLOCKED_APPS: BlockedApp[] = [
  { id: '1', name: 'Instagram', color: 'from-pink-500 to-rose-500', icon: 'camera', timeUsedToday: '1.4h', originalSecondsToday: 5040 },
  { id: '2', name: 'TikTok', color: 'from-red-500 to-zinc-900', icon: 'music', timeUsedToday: '2.1h', originalSecondsToday: 7560 },
];

export const DEFAULT_APP_LIMITS: AppLimit[] = [
  { id: '1', name: 'Instagram', limitHours: 2, usedHours: 1.4, category: 'Social', color: 'from-pink-500 to-rose-500' },
  { id: '2', name: 'TikTok', limitHours: 2, usedHours: 2.1, category: 'Social', color: 'from-red-500 to-zinc-900' },
  { id: '3', name: 'YouTube', limitHours: 3, usedHours: 0.8, category: 'Entertainment', color: 'from-red-600 to-amber-600' },
  { id: '4', name: 'Twitter/X', limitHours: 1, usedHours: 0.5, category: 'Social', color: 'from-neutral-800 to-cyan-500' },
  { id: '5', name: 'Reddit', limitHours: 2, usedHours: 0.3, category: 'Entertainment', color: 'from-orange-500 to-red-500' },
  { id: '6', name: 'Spotify', limitHours: 3, usedHours: 1.2, category: 'Music', color: 'from-emerald-500 to-green-600' },
];

export const DEFAULT_SQUAD_FRIENDS: SquadFriend[] = [
  { id: '1', name: 'Alex Rivera', avatar: 'AR', isInvited: true, status: 'focusing', todayScreenTime: '1.1h' },
  { id: '2', name: 'Sarah Chen', avatar: 'SC', isInvited: false, status: 'active', todayScreenTime: '1.8h' },
  { id: '3', name: 'Mike Johnson', avatar: 'MJ', isInvited: false, status: 'active', todayScreenTime: '2.4h' },
  { id: '4', name: 'Emily Davis', avatar: 'ED', isInvited: false, status: 'offline', todayScreenTime: '0.9h' },
  { id: '5', name: 'Marcus Wong', avatar: 'MW', isInvited: false, status: 'focusing', todayScreenTime: '3.1h' },
];

export const DEFAULT_HOME_ACCOUNTABILITY: HomeAccountabilityState = {
  streakDays: 1,
  squadStatus: 'safe',
  offendingMember: null,
  offendingApp: null,
  offendingOvertime: null,
  todayOverviewLabel: '4h 15m',
  groupAverageDeltaLabel: '12% below group avg',
  insightLabel: 'You doom-scrolled 57m more than yesterday!',
  dailyGoalHours: 3,
};

export const DEFAULT_INVITE_CODE = 'TOWER-7X2K';
