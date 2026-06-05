/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { randomJoinCode, formatMinutes, parseScreenTimeToMinutes } from '../lib/time';
import { AppLimit, BlockedApp, DailyCheckResult, HomeAccountabilityState, SquadFriend } from '../types';
import {
  DEFAULT_APP_LIMITS,
  DEFAULT_BLOCKED_APPS,
  DEFAULT_HOME_ACCOUNTABILITY,
  DEFAULT_INVITE_CODE,
  DEFAULT_SQUAD_FRIENDS,
} from '../lib/defaultData';

const LOCAL_USER_KEY = 'active-block:user-id';
const LOCAL_NAME_KEY = 'active-block:display-name';

type RemoteRow = Record<string, any>;

export interface BackendIdentity {
  userId: string;
  displayName: string;
  mode: 'supabase' | 'local';
}

export interface RemoteSnapshot {
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

function browserStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

function localId(): string {
  const storage = browserStorage();
  const existing = storage?.getItem(LOCAL_USER_KEY);
  if (existing) return existing;

  const generated =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `local-${Math.random().toString(36).slice(2)}`;
  storage?.setItem(LOCAL_USER_KEY, generated);
  return generated;
}

function localDisplayName(): string {
  return browserStorage()?.getItem(LOCAL_NAME_KEY) ?? 'Your Device';
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

function asSingleRow<T = RemoteRow>(data: T | T[] | null): T | null {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

function appLimitFromRow(row: RemoteRow): AppLimit {
  return {
    id: row.id,
    name: row.app_name,
    limitHours: Number(row.daily_limit_minutes ?? 120) / 60,
    usedHours: Number(row.used_minutes_today ?? 0) / 60,
    category: row.category ?? 'Social',
    color: row.color ?? 'from-cyan-500 to-blue-500',
  };
}

function blockedAppFromRow(row: RemoteRow): BlockedApp {
  return {
    id: row.id,
    name: row.app_name,
    icon: row.icon ?? 'smartphone',
    color: row.color ?? 'from-zinc-500 to-zinc-700',
    timeUsedToday: row.time_used_today ?? '0h',
    originalSecondsToday: Number(row.original_seconds_today ?? 0),
  };
}

function squadFriendFromMember(row: RemoteRow): SquadFriend {
  const fallbackId = String(row.member_key ?? row.id ?? Math.random());
  return {
    id: fallbackId.replace(/^contact_/, '').replace(/^user_/, ''),
    name: row.display_name ?? 'Squad Member',
    avatar: row.avatar ?? initials(row.display_name ?? 'SM'),
    isInvited: Boolean(row.is_invited),
    status: row.status ?? 'active',
    todayScreenTime: formatMinutes(Number(row.today_screen_time_minutes ?? 0)),
  };
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function homeStateFromGroup(group: RemoteRow | null, latestEvent: RemoteRow | null, appLimits: AppLimit[]): HomeAccountabilityState {
  if (!group) return DEFAULT_HOME_ACCOUNTABILITY;

  const usedMinutes = appLimits.reduce((sum, limit) => sum + Math.round(limit.usedHours * 60), 0);
  const status = group.status === 'failed' ? 'broken' : group.status === 'pending' ? 'pending' : 'safe';
  const failedName = latestEvent?.failed_display_name ?? null;

  return {
    streakDays: Number(group.current_streak ?? 1),
    squadStatus: status,
    offendingMember: status === 'broken' ? failedName : null,
    offendingApp: status === 'broken' ? 'screen time' : null,
    offendingOvertime: status === 'broken' ? 'over the limit' : null,
    todayOverviewLabel: usedMinutes > 0 ? formatMinutes(usedMinutes) : DEFAULT_HOME_ACCOUNTABILITY.todayOverviewLabel,
    groupAverageDeltaLabel: DEFAULT_HOME_ACCOUNTABILITY.groupAverageDeltaLabel,
    insightLabel: latestEvent?.message ?? DEFAULT_HOME_ACCOUNTABILITY.insightLabel,
    dailyGoalHours: Number(group.daily_limit_minutes ?? 180) / 60,
  };
}

export async function ensureBackendIdentity(): Promise<BackendIdentity> {
  if (!isSupabaseConfigured || !supabase) {
    return { userId: localId(), displayName: localDisplayName(), mode: 'local' };
  }

  const client = requireClient();
  const sessionResult = await client.auth.getSession();
  const user = sessionResult.data.session?.user ?? null;

  // No active session — run in local mode until the user signs in via AuthScreen
  if (!user) {
    return { userId: localId(), displayName: localDisplayName(), mode: 'local' };
  }

  // Fetch existing profile (set by AuthScreen on sign-up / first Google login)
  const { data: profile } = await client
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split('@')[0] ??
    localDisplayName();

  // Upsert profile so Google OAuth first-logins also get a row
  await client.from('profiles').upsert({
    id: user.id,
    display_name: displayName,
    avatar: initials(displayName),
    status: 'active',
  });

  return { userId: user.id, displayName, mode: 'supabase' };
}

export async function loadRemoteSnapshot(userId: string): Promise<RemoteSnapshot> {
  const client = requireClient();

  const [profileResult, blockedResult, limitsResult] = await Promise.all([
    client.from('profiles').select('active_group_id').eq('id', userId).maybeSingle(),
    client.from('blocked_apps').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    client.from('app_limits').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (blockedResult.error) throw blockedResult.error;
  if (limitsResult.error) throw limitsResult.error;

  const blockedApps = (blockedResult.data ?? []).map(blockedAppFromRow);
  const appLimits = (limitsResult.data ?? []).map(appLimitFromRow);
  const activeGroupId = profileResult.data?.active_group_id ?? null;

  if (!activeGroupId) {
    return {
      groupId: null,
      inviteCode: DEFAULT_INVITE_CODE,
      dailyGoalHours: 3,
      challengeDurationDays: 8,
      isChallengeStarted: false,
      blockedApps: blockedApps.length ? blockedApps : DEFAULT_BLOCKED_APPS,
      appLimits: appLimits.length ? appLimits : DEFAULT_APP_LIMITS,
      squadFriends: DEFAULT_SQUAD_FRIENDS,
      homeState: DEFAULT_HOME_ACCOUNTABILITY,
    };
  }

  const [groupResult, membersResult, eventResult] = await Promise.all([
    client.from('active_block_groups').select('*').eq('id', activeGroupId).maybeSingle(),
    client.from('group_members').select('*').eq('group_id', activeGroupId).order('joined_at', { ascending: true }),
    client
      .from('tower_events')
      .select('*')
      .eq('group_id', activeGroupId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (groupResult.error) throw groupResult.error;
  if (membersResult.error) throw membersResult.error;
  if (eventResult.error) throw eventResult.error;

  const group = groupResult.data;
  const friends = (membersResult.data ?? [])
    .filter((member) => member.user_id !== userId)
    .map(squadFriendFromMember);

  return {
    groupId: activeGroupId,
    inviteCode: group?.join_code ?? DEFAULT_INVITE_CODE,
    dailyGoalHours: Number(group?.daily_limit_minutes ?? 180) / 60,
    challengeDurationDays: Number(group?.challenge_duration_days ?? 8),
    isChallengeStarted: Boolean(group?.challenge_started_at),
    blockedApps: blockedApps.length ? blockedApps : DEFAULT_BLOCKED_APPS,
    appLimits: appLimits.length ? appLimits : DEFAULT_APP_LIMITS,
    squadFriends: friends.length ? friends : DEFAULT_SQUAD_FRIENDS,
    homeState: homeStateFromGroup(group, eventResult.data, appLimits),
  };
}

export async function saveBlockedApps(userId: string, blockedApps: BlockedApp[]) {
  if (!supabase) return;
  const client = requireClient();
  const { error: deleteError } = await client.from('blocked_apps').delete().eq('user_id', userId);
  if (deleteError) throw deleteError;
  if (!blockedApps.length) return;

  const { error } = await client.from('blocked_apps').insert(
    blockedApps.map((app) => ({
      user_id: userId,
      app_name: app.name,
      icon: app.icon,
      color: app.color,
      time_used_today: app.timeUsedToday,
      original_seconds_today: app.originalSecondsToday,
    })),
  );
  if (error) throw error;
}

export async function saveAppLimits(userId: string, appLimits: AppLimit[]) {
  if (!supabase) return;
  const client = requireClient();
  const { error: deleteError } = await client.from('app_limits').delete().eq('user_id', userId);
  if (deleteError) throw deleteError;
  if (!appLimits.length) return;

  const { error } = await client.from('app_limits').insert(
    appLimits.map((limit) => ({
      user_id: userId,
      app_name: limit.name,
      category: limit.category,
      color: limit.color,
      daily_limit_minutes: Math.round(limit.limitHours * 60),
      used_minutes_today: Math.round(limit.usedHours * 60),
    })),
  );
  if (error) throw error;
}

export async function saveSquadFriends(groupId: string | null, friends: SquadFriend[]) {
  if (!supabase || !groupId || groupId.startsWith('local-')) return;

  const rows = friends.map((friend) => ({
    group_id: groupId,
    user_id: null,
    member_key: `contact_${friend.id}`,
    display_name: friend.name,
    avatar: friend.avatar || initials(friend.name),
    role: 'contact',
    status: friend.status,
    today_screen_time_minutes: parseScreenTimeToMinutes(friend.todayScreenTime),
    is_active: true,
    is_invited: friend.isInvited,
  }));

  const { error } = await requireClient()
    .from('group_members')
    .upsert(rows, { onConflict: 'group_id,member_key' });
  if (error) throw error;
}

export async function createOrUpdateChallenge(params: {
  userId: string;
  groupId: string | null;
  inviteCode: string;
  dailyGoalHours: number;
  challengeDurationDays: number;
  squadFriends: SquadFriend[];
}) {
  if (!supabase) {
    return { groupId: params.groupId ?? `local-${randomJoinCode()}`, inviteCode: params.inviteCode };
  }

  const client = requireClient();
  const dailyLimitMinutes = Math.round(params.dailyGoalHours * 60);
  let groupId = params.groupId?.startsWith('local-') ? null : params.groupId;
  let inviteCode = params.inviteCode;

  if (!groupId) {
    const result = await client.rpc('create_active_block_group', {
      p_group_name: 'Active Block Squad',
      p_daily_limit_minutes: dailyLimitMinutes,
      p_challenge_duration_days: params.challengeDurationDays,
      p_join_code: params.inviteCode,
    });
    if (result.error) throw result.error;
    const row = asSingleRow(result.data);
    groupId = row?.id ?? null;
    inviteCode = row?.join_code ?? inviteCode;
  } else {
    const { error } = await client
      .from('active_block_groups')
      .update({
        daily_limit_minutes: dailyLimitMinutes,
        challenge_duration_days: params.challengeDurationDays,
        challenge_started_at: new Date().toISOString(),
        challenge_ends_at: new Date(Date.now() + params.challengeDurationDays * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', groupId);
    if (error) throw error;
  }

  await saveSquadFriends(groupId, params.squadFriends);
  return { groupId, inviteCode };
}

export async function updateGroupSettings(groupId: string | null, dailyGoalHours: number, challengeDurationDays: number) {
  if (!supabase || !groupId || groupId.startsWith('local-')) return;
  const { error } = await requireClient()
    .from('active_block_groups')
    .update({
      daily_limit_minutes: Math.round(dailyGoalHours * 60),
      challenge_duration_days: challengeDurationDays,
    })
    .eq('id', groupId);
  if (error) throw error;
}

export async function stopChallenge(groupId: string | null) {
  if (!supabase || !groupId || groupId.startsWith('local-')) return;
  const { error } = await requireClient()
    .from('active_block_groups')
    .update({ challenge_started_at: null, challenge_ends_at: null, status: 'pending' })
    .eq('id', groupId);
  if (error) throw error;
}

export async function generateAndPersistJoinCode(groupId: string | null): Promise<string> {
  const nextCode = randomJoinCode();
  if (!supabase || !groupId || groupId.startsWith('local-')) return nextCode;
  const { error } = await requireClient()
    .from('active_block_groups')
    .update({ join_code: nextCode })
    .eq('id', groupId);
  if (error) throw error;
  return nextCode;
}

export async function startFocusSession(userId: string, durationMinutes: number, blockedApps: BlockedApp[]) {
  if (!supabase) return null;
  const { data, error } = await requireClient()
    .from('focus_sessions')
    .insert({
      user_id: userId,
      duration_minutes: durationMinutes,
      blocked_apps: blockedApps.map((app) => app.name),
      status: 'active',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function finishFocusSession(sessionId: string | null, status: 'completed' | 'interrupted') {
  if (!supabase || !sessionId) return;
  const { error } = await requireClient()
    .from('focus_sessions')
    .update({ status, ended_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (error) throw error;
}

export async function resetRemoteStack(groupId: string | null, dateKey: string) {
  if (!supabase || !groupId || groupId.startsWith('local-')) return;
  const client = requireClient();
  const { error: groupError } = await client
    .from('active_block_groups')
    .update({ current_streak: 1, status: 'success', last_evaluated_date: null })
    .eq('id', groupId);
  if (groupError) throw groupError;

  const { error } = await client.from('tower_events').insert({
    group_id: groupId,
    date_key: dateKey,
    type: 'stack_reset',
    streak_after_event: 1,
    message: 'Stack reset for a fresh challenge.',
  });
  if (error && error.code !== '23505') throw error;
}

export async function saveManualUsageLog(params: {
  userId: string;
  groupId: string | null;
  displayName: string;
  totalMinutes: number;
  dailyLimitMinutes: number;
  dateKey: string;
}) {
  if (!supabase || !params.groupId || params.groupId.startsWith('local-')) return;
  const memberKey = `user_${params.userId}`;
  const client = requireClient();

  const { error: memberError } = await client.from('group_members').upsert(
    {
      group_id: params.groupId,
      user_id: params.userId,
      member_key: memberKey,
      display_name: params.displayName,
      avatar: initials(params.displayName),
      role: 'member',
      status: 'active',
      today_screen_time_minutes: params.totalMinutes,
      is_active: true,
      is_invited: true,
    },
    { onConflict: 'group_id,user_id' },
  );
  if (memberError) throw memberError;

  const { error } = await client.from('usage_logs').upsert(
    {
      group_id: params.groupId,
      user_id: params.userId,
      member_key: memberKey,
      display_name: params.displayName,
      date_key: params.dateKey,
      total_minutes: params.totalMinutes,
      daily_limit_minutes: params.dailyLimitMinutes,
      under_limit: params.totalMinutes <= params.dailyLimitMinutes,
      source: 'manual',
      created_by: params.userId,
    },
    { onConflict: 'group_id,date_key,member_key' },
  );
  if (error) throw error;
}

export async function runSimulationDailyCheck(params: {
  userId: string;
  displayName: string;
  groupId: string | null;
  dailyGoalHours: number;
  squadFriends: SquadFriend[];
  currentStreak: number;
  dateKey: string;
  failure?: {
    memberName: string;
    appName: string;
    overtimeLabel: string;
  };
}): Promise<DailyCheckResult> {
  if (!supabase || !params.groupId || params.groupId.startsWith('local-')) {
    return {
      status: params.failure ? 'failed' : 'success',
      streak: params.failure ? 0 : params.currentStreak + 1,
      failedDisplayName: params.failure?.memberName,
      dateKey: params.dateKey,
    };
  }

  const client = requireClient();
  const limitMinutes = Math.round(params.dailyGoalHours * 60);
  const safeMinutes = Math.max(5, Math.min(limitMinutes - 10, Math.round(limitMinutes * 0.55)));
  const overMinutes = Math.min(1440, limitMinutes + 45);
  const invited = params.squadFriends.filter((friend) => friend.isInvited || friend.name === params.failure?.memberName);

  await saveSquadFriends(
    params.groupId,
    params.squadFriends.map((friend) =>
      friend.name === params.failure?.memberName ? { ...friend, isInvited: true } : friend,
    ),
  );

  const logRows = [
    {
      group_id: params.groupId,
      user_id: params.userId,
      member_key: `user_${params.userId}`,
      display_name: params.displayName,
      date_key: params.dateKey,
      total_minutes: safeMinutes,
      daily_limit_minutes: limitMinutes,
      under_limit: true,
      source: params.failure ? 'demo_failure' : 'demo_safe',
      created_by: params.userId,
    },
    ...invited.map((friend) => {
      const isFailure = friend.name === params.failure?.memberName;
      const totalMinutes = isFailure ? overMinutes : safeMinutes;
      return {
        group_id: params.groupId,
        user_id: null,
        member_key: `contact_${friend.id}`,
        display_name: friend.name,
        date_key: params.dateKey,
        total_minutes: totalMinutes,
        daily_limit_minutes: limitMinutes,
        under_limit: totalMinutes <= limitMinutes,
        source: isFailure ? 'demo_failure' : 'demo_safe',
        created_by: params.userId,
      };
    }),
  ];

  const { error: logsError } = await client.from('usage_logs').upsert(logRows, {
    onConflict: 'group_id,date_key,member_key',
  });
  if (logsError) throw logsError;

  const rpcResult = await client.rpc('run_active_block_daily_check', {
    p_group_id: params.groupId,
    p_date_key: params.dateKey,
    p_force_missing_failure: true,
  });

  if (!rpcResult.error) {
    const data = rpcResult.data as DailyCheckResult;
    return data;
  }

  const nextStreak = params.failure ? 0 : params.currentStreak + 1;
  const { error: groupError } = await client
    .from('active_block_groups')
    .update({
      current_streak: nextStreak,
      status: params.failure ? 'failed' : 'success',
      last_evaluated_date: params.dateKey,
    })
    .eq('id', params.groupId);
  if (groupError) throw groupError;

  const { error: eventError } = await client.from('tower_events').insert({
    group_id: params.groupId,
    date_key: params.dateKey,
    type: params.failure ? 'tower_collapsed' : 'brick_added',
    streak_after_event: nextStreak,
    failed_member_key: params.failure ? `contact_${params.failure.memberName}` : null,
    failed_display_name: params.failure?.memberName ?? null,
    message: params.failure
      ? `Tower collapsed! ${params.failure.memberName} exceeded the limit.`
      : `Brick added! Day ${nextStreak} completed.`,
  });
  if (eventError && eventError.code !== '23505') throw eventError;

  return {
    status: params.failure ? 'failed' : 'success',
    streak: nextStreak,
    failedDisplayName: params.failure?.memberName,
    dateKey: params.dateKey,
  };
}
