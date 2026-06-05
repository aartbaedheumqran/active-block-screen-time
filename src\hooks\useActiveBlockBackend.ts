/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { dateKeyFromOffset } from '../lib/time';
import {
  DEFAULT_APP_LIMITS,
  DEFAULT_BLOCKED_APPS,
  DEFAULT_HOME_ACCOUNTABILITY,
  DEFAULT_INVITE_CODE,
  DEFAULT_SQUAD_FRIENDS,
} from '../lib/defaultData';
import { AppLimit, BackendHealth, BlockedApp, HomeAccountabilityState, SquadFriend } from '../types';
import {
  createOrUpdateChallenge,
  ensureBackendIdentity,
  finishFocusSession,
  generateAndPersistJoinCode,
  loadRemoteSnapshot,
  resetRemoteStack,
  runSimulationDailyCheck,
  saveAppLimits,
  saveBlockedApps,
  saveSquadFriends,
  startFocusSession,
  stopChallenge,
  updateGroupSettings,
} from '../services/activeBlockService';

const SNAPSHOT_KEY = 'active-block:local-snapshot';
const SIM_OFFSET_KEY = 'active-block:simulation-offset';

interface LocalSnapshot {
  groupId: string | null;
  inviteCode: string;
  dailyGoalHours: number;
  challengeDurationDays: number;
  isChallengeStarted: boolean;
  blockedApps: BlockedApp[];
  appLimits: AppLimit[];
  squadFriends: SquadFriend[];
  homeState: HomeAccountabilityState;
}

function readLocalSnapshot(): LocalSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as LocalSnapshot) : null;
  } catch {
    return null;
  }
}

function writeLocalSnapshot(snapshot: LocalSnapshot) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

function readSimulationOffset(): number {
  if (typeof window === 'undefined') return 0;
  const value = Number(window.localStorage.getItem(SIM_OFFSET_KEY) ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function writeSimulationOffset(value: number) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SIM_OFFSET_KEY, String(value));
}

function resolveUpdate<T>(previous: T, update: React.SetStateAction<T>): T {
  return typeof update === 'function' ? (update as (prev: T) => T)(previous) : update;
}

export function useActiveBlockBackend() {
  const initialSnapshot = useMemo(() => readLocalSnapshot(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('Your Device');
  const [groupId, setGroupId] = useState<string | null>(initialSnapshot?.groupId ?? null);
  const [inviteCode, setInviteCodeState] = useState(initialSnapshot?.inviteCode ?? DEFAULT_INVITE_CODE);
  const [dailyGoalHours, setDailyGoalHoursState] = useState(initialSnapshot?.dailyGoalHours ?? 3);
  const [challengeDurationDays, setChallengeDurationDaysState] = useState(initialSnapshot?.challengeDurationDays ?? 8);
  const [isChallengeStarted, setIsChallengeStartedState] = useState(initialSnapshot?.isChallengeStarted ?? false);
  const [blockedApps, setBlockedAppsState] = useState<BlockedApp[]>(initialSnapshot?.blockedApps ?? DEFAULT_BLOCKED_APPS);
  const [appLimits, setAppLimitsState] = useState<AppLimit[]>(initialSnapshot?.appLimits ?? DEFAULT_APP_LIMITS);
  const [squadFriends, setSquadFriendsState] = useState<SquadFriend[]>(initialSnapshot?.squadFriends ?? DEFAULT_SQUAD_FRIENDS);
  const [homeState, setHomeState] = useState<HomeAccountabilityState>(
    initialSnapshot?.homeState ?? DEFAULT_HOME_ACCOUNTABILITY,
  );
  const [backendHealth, setBackendHealth] = useState<BackendHealth>({
    mode: 'booting',
    userId: null,
    isSupabaseConfigured,
    isSyncing: true,
    lastError: null,
  });

  const activeSessionId = useRef<string | null>(null);
  const simulationOffset = useRef(readSimulationOffset());

  const snapshot = useMemo<LocalSnapshot>(
    () => ({
      groupId,
      inviteCode,
      dailyGoalHours,
      challengeDurationDays,
      isChallengeStarted,
      blockedApps,
      appLimits,
      squadFriends,
      homeState,
    }),
    [groupId, inviteCode, dailyGoalHours, challengeDurationDays, isChallengeStarted, blockedApps, appLimits, squadFriends, homeState],
  );

  useEffect(() => {
    writeLocalSnapshot(snapshot);
  }, [snapshot]);

  const reportError = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unexpected backend error.';
    console.error('[Active Block backend]', error);
    setBackendHealth((prev) => ({ ...prev, isSyncing: false, lastError: message }));
  }, []);

  const applyRemoteSnapshot = useCallback((remote: LocalSnapshot) => {
    setGroupId(remote.groupId);
    setInviteCodeState(remote.inviteCode);
    setDailyGoalHoursState(remote.dailyGoalHours);
    setChallengeDurationDaysState(remote.challengeDurationDays);
    setIsChallengeStartedState(remote.isChallengeStarted);
    setBlockedAppsState(remote.blockedApps);
    setAppLimitsState(remote.appLimits);
    setSquadFriendsState(remote.squadFriends);
    setHomeState(remote.homeState);
  }, []);

  const refresh = useCallback(async () => {
    if (!userId || !supabase) return;
    try {
      const remote = await loadRemoteSnapshot(userId);
      applyRemoteSnapshot(remote);
      setBackendHealth((prev) => ({ ...prev, mode: 'supabase', isSyncing: false, lastError: null }));
    } catch (error) {
      reportError(error);
    }
  }, [applyRemoteSnapshot, reportError, userId]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const identity = await ensureBackendIdentity();
        if (cancelled) return;

        setUserId(identity.userId);
        setDisplayName(identity.displayName);
        setBackendHealth({
          mode: identity.mode,
          userId: identity.userId,
          isSupabaseConfigured,
          isSyncing: identity.mode === 'supabase',
          lastError: null,
        });

        if (identity.mode === 'supabase') {
          const remote = await loadRemoteSnapshot(identity.userId);
          if (!cancelled) applyRemoteSnapshot(remote);
        }
      } catch (error) {
        if (!cancelled) {
          reportError(error);
          setBackendHealth((prev) => ({ ...prev, mode: 'local', isSyncing: false }));
        }
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [applyRemoteSnapshot, reportError]);

  useEffect(() => {
    if (!supabase || !groupId || !userId) return;

    const channel = supabase
      .channel(`active-block-${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'active_block_groups', filter: `id=eq.${groupId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usage_logs', filter: `group_id=eq.${groupId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tower_events', filter: `group_id=eq.${groupId}` }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, refresh, userId]);

  const setBlockedApps: React.Dispatch<React.SetStateAction<BlockedApp[]>> = useCallback(
    (update) => {
      setBlockedAppsState((previous) => {
        const next = resolveUpdate(previous, update);
        if (userId && backendHealth.mode === 'supabase') saveBlockedApps(userId, next).catch(reportError);
        return next;
      });
    },
    [backendHealth.mode, reportError, userId],
  );

  const setAppLimits: React.Dispatch<React.SetStateAction<AppLimit[]>> = useCallback(
    (update) => {
      setAppLimitsState((previous) => {
        const next = resolveUpdate(previous, update);
        if (userId && backendHealth.mode === 'supabase') saveAppLimits(userId, next).catch(reportError);
        return next;
      });
    },
    [backendHealth.mode, reportError, userId],
  );

  const setSquadFriends: React.Dispatch<React.SetStateAction<SquadFriend[]>> = useCallback(
    (update) => {
      setSquadFriendsState((previous) => {
        const next = resolveUpdate(previous, update);
        if (backendHealth.mode === 'supabase') saveSquadFriends(groupId, next).catch(reportError);
        return next;
      });
    },
    [backendHealth.mode, groupId, reportError],
  );

  const setDailyGoalHours = useCallback(
    (hours: number) => {
      setDailyGoalHoursState(hours);
      setHomeState((previous) => ({ ...previous, dailyGoalHours: hours }));
      if (backendHealth.mode === 'supabase') updateGroupSettings(groupId, hours, challengeDurationDays).catch(reportError);
    },
    [backendHealth.mode, challengeDurationDays, groupId, reportError],
  );

  const setChallengeDurationDays = useCallback(
    (days: number) => {
      setChallengeDurationDaysState(days);
      if (backendHealth.mode === 'supabase') updateGroupSettings(groupId, dailyGoalHours, days).catch(reportError);
    },
    [backendHealth.mode, dailyGoalHours, groupId, reportError],
  );

  const setActiveDuration = useCallback((duration: number) => {
    browserSafeSet('active-block:last-active-duration', String(duration));
  }, []);

  const setInviteCode = useCallback((code: string) => {
    setInviteCodeState(code);
  }, []);

  const generateInviteCode = useCallback(async () => {
    try {
      const next = await generateAndPersistJoinCode(groupId);
      setInviteCodeState(next);
      return next;
    } catch (error) {
      reportError(error);
      return inviteCode;
    }
  }, [groupId, inviteCode, reportError]);

  const startChallenge = useCallback(async () => {
    try {
      const result = await createOrUpdateChallenge({
        userId: userId ?? 'local-user',
        groupId,
        inviteCode,
        dailyGoalHours,
        challengeDurationDays,
        squadFriends,
      });
      setGroupId(result.groupId);
      setInviteCodeState(result.inviteCode);
      setIsChallengeStartedState(true);
      setHomeState((previous) => ({ ...previous, dailyGoalHours, squadStatus: 'safe' }));
      await refresh();
    } catch (error) {
      reportError(error);
      setIsChallengeStartedState(true);
    }
  }, [challengeDurationDays, dailyGoalHours, groupId, inviteCode, refresh, reportError, squadFriends, userId]);

  const endChallenge = useCallback(async () => {
    setIsChallengeStartedState(false);
    try {
      await stopChallenge(groupId);
      await refresh();
    } catch (error) {
      reportError(error);
    }
  }, [groupId, refresh, reportError]);

  const setIsFocusing = useCallback(
    (focus: boolean) => {
      if (backendHealth.mode !== 'supabase' || !userId) return;

      if (focus) {
        startFocusSession(userId, Number(browserSafeGet('active-block:last-active-duration') ?? 25), blockedApps)
          .then((sessionId) => {
            activeSessionId.current = sessionId;
          })
          .catch(reportError);
      } else {
        finishFocusSession(activeSessionId.current, 'interrupted').catch(reportError);
        activeSessionId.current = null;
      }
    },
    [backendHealth.mode, blockedApps, reportError, userId],
  );

  const nextSimulationDateKey = useCallback(() => {
    const dateKey = dateKeyFromOffset(simulationOffset.current);
    simulationOffset.current += 1;
    writeSimulationOffset(simulationOffset.current);
    return dateKey;
  }, []);

  const runSafeDay = useCallback(async () => {
    const dateKey = nextSimulationDateKey();
    try {
      const result = await runSimulationDailyCheck({
        userId: userId ?? 'local-user',
        displayName,
        groupId,
        dailyGoalHours,
        squadFriends,
        currentStreak: homeState.streakDays,
        dateKey,
      });
      setHomeState((previous) => ({
        ...previous,
        streakDays: result.streak ?? previous.streakDays + 1,
        squadStatus: 'safe',
        offendingMember: null,
        offendingApp: null,
        offendingOvertime: null,
        insightLabel: result.message ?? `Brick added! Day ${result.streak ?? previous.streakDays + 1} completed.`,
      }));
      await refresh();
    } catch (error) {
      reportError(error);
    }
  }, [dailyGoalHours, displayName, groupId, homeState.streakDays, nextSimulationDateKey, refresh, reportError, squadFriends, userId]);

  const runCrashDay = useCallback(
    async (memberName: string, appName: string, overtimeLabel: string) => {
      const dateKey = nextSimulationDateKey();
      try {
        await runSimulationDailyCheck({
          userId: userId ?? 'local-user',
          displayName,
          groupId,
          dailyGoalHours,
          squadFriends,
          currentStreak: homeState.streakDays,
          dateKey,
          failure: { memberName, appName, overtimeLabel },
        });
        setHomeState((previous) => ({
          ...previous,
          streakDays: 0,
          squadStatus: 'broken',
          offendingMember: memberName,
          offendingApp: appName,
          offendingOvertime: overtimeLabel,
          insightLabel: `Tower collapsed! ${memberName} exceeded the limit.`,
        }));
        await refresh();
      } catch (error) {
        reportError(error);
      }
    },
    [dailyGoalHours, displayName, groupId, homeState.streakDays, nextSimulationDateKey, refresh, reportError, squadFriends, userId],
  );

  const resetStack = useCallback(async () => {
    const dateKey = nextSimulationDateKey();
    setHomeState((previous) => ({
      ...previous,
      streakDays: 1,
      squadStatus: 'safe',
      offendingMember: null,
      offendingApp: null,
      offendingOvertime: null,
      insightLabel: 'Stack reset for a fresh challenge.',
    }));
    try {
      await resetRemoteStack(groupId, dateKey);
      await refresh();
    } catch (error) {
      reportError(error);
    }
  }, [groupId, nextSimulationDateKey, refresh, reportError]);

  return {
    backendHealth,
    groupId,
    inviteCode,
    setInviteCode,
    generateInviteCode,
    blockedApps,
    setBlockedApps,
    appLimits,
    setAppLimits,
    squadFriends,
    setSquadFriends,
    dailyGoalHours,
    setDailyGoalHours,
    challengeDurationDays,
    setChallengeDurationDays,
    isChallengeStarted,
    setIsChallengeStarted: (started: boolean) => (started ? startChallenge() : endChallenge()),
    startChallenge,
    endChallenge,
    setActiveDuration,
    setIsFocusing,
    homeState,
    runSafeDay,
    runCrashDay,
    resetStack,
    refresh,
  };
}

function browserSafeSet(key: string, value: string) {
  if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
}

function browserSafeGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(key);
}
