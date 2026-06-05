/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AppTab = 'home' | 'group' | 'focus';
export type FocusSubMode = 'active_block' | 'soft_limit';
export type SquadStatus = 'safe' | 'broken' | 'pending';
export type BackendMode = 'booting' | 'supabase' | 'local';

export interface BlockedApp {
  id: string;
  name: string;
  icon: string;
  color: string;
  timeUsedToday: string;
  originalSecondsToday: number;
}

export interface AppLimit {
  id: string;
  name: string;
  limitHours: number;
  usedHours: number;
  category: string;
  color: string;
}

export interface SquadFriend {
  id: string;
  name: string;
  avatar: string;
  isInvited: boolean;
  status: 'offline' | 'focusing' | 'active';
  todayScreenTime: string;
}

export interface HomeAccountabilityState {
  streakDays: number;
  squadStatus: SquadStatus;
  offendingMember: string | null;
  offendingApp: string | null;
  offendingOvertime: string | null;
  todayOverviewLabel: string;
  groupAverageDeltaLabel: string;
  insightLabel: string;
  dailyGoalHours: number;
}

export interface ActiveGroupState {
  groupId: string | null;
  inviteCode: string;
  dailyGoalHours: number;
  challengeDurationDays: number;
  isChallengeStarted: boolean;
}

export interface DailyCheckResult {
  status: 'success' | 'failed' | 'pending' | 'already_checked' | 'local';
  streak?: number;
  failedDisplayName?: string;
  dateKey?: string;
  message?: string;
}

export interface BackendHealth {
  mode: BackendMode;
  userId: string | null;
  isSupabaseConfigured: boolean;
  isSyncing: boolean;
  lastError: string | null;
}
