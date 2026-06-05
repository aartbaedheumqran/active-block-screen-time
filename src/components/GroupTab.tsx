/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Copy,
  Check,
  Sliders,
  Calendar,
  Play,
  RefreshCw,
  Share2,
  ArrowLeft,
  Send,
  Trophy,
  Zap,
} from 'lucide-react';
import { SquadFriend } from '../types';

interface GroupTabProps {
  squadFriends: SquadFriend[];
  setSquadFriends: React.Dispatch<React.SetStateAction<SquadFriend[]>>;
  dailyGoalHours: number;
  setDailyGoalHours: (hours: number) => void;
  challengeDurationDays: number;
  setChallengeDurationDays: (days: number) => void;
  isChallengeStarted: boolean;
  setIsChallengeStarted: (started: boolean) => void;
  inviteCode: string;
  setInviteCode: (code: string) => void;
  onGenerateInviteCode?: () => Promise<string>;
  onStartChallenge?: () => Promise<void> | void;
  onStopChallenge?: () => Promise<void> | void;
}

export default function GroupTab({
  squadFriends,
  setSquadFriends,
  dailyGoalHours,
  setDailyGoalHours,
  challengeDurationDays,
  setChallengeDurationDays,
  isChallengeStarted,
  setIsChallengeStarted,
  inviteCode,
  setInviteCode,
  onGenerateInviteCode,
  onStartChallenge,
  onStopChallenge,
}: GroupTabProps) {
  const [copied, setCopied] = useState(false);
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<'leaderboard' | 'activity'>('leaderboard');

  const handleCopyCode = async () => {
    await navigator.clipboard?.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateNewCode = async () => {
    if (onGenerateInviteCode) {
      const next = await onGenerateInviteCode();
      setInviteCode(next);
      return;
    }

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let suffix = '';
    for (let i = 0; i < 4; i += 1) suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    setInviteCode(`TOWER-${suffix}`);
  };

  const handleToggleInvite = (id: string) => {
    setSquadFriends((friends) =>
      friends.map((friend) => (friend.id === id ? { ...friend, isInvited: !friend.isInvited } : friend)),
    );
  };

  const invitedCount = squadFriends.filter((friend) => friend.isInvited).length;
  const totalSquadCount = invitedCount + 1;

  const getEndDateStr = () => {
    const date = new Date();
    date.setDate(date.getDate() + challengeDurationDays);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return {
      dateText: date.toLocaleDateString('en-US', options),
      formattedDays: `${challengeDurationDays} days from now`,
    };
  };

  const { dateText, formattedDays } = getEndDateStr();

  const handleStartChallenge = async () => {
    await onStartChallenge?.();
    setIsChallengeStarted(true);
  };

  const handleStopChallenge = async () => {
    await onStopChallenge?.();
    setIsChallengeStarted(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto scrollbar-none h-full relative p-4 bg-gradient-to-b from-[#0a0f1d] to-[#04060b]">
      <AnimatePresence mode="wait">
        {!isChallengeStarted ? (
          <motion.div
            key="config-view"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex flex-col gap-4 flex-1 pb-4"
          >
            <div className="mt-3 mb-2 flex flex-col text-left px-1">
              <div className="flex">
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-mono tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/15 font-bold">
                  <Trophy className="w-3.5 h-3.5" />
                  NEW CHALLENGE
                </span>
              </div>

              <h2 className="text-2xl font-black tracking-tight text-white mt-1.5 font-display">Squad Up</h2>

              <p className="text-[11px] text-zinc-400 mt-1.5 leading-normal font-sans">
                Set a goal, invite friends, crush screen time together.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#101524]/60 border border-[#1b2238]/60 rounded-2xl p-4 flex flex-col"
            >
              <div className="flex items-center justify-between mb-3 text-left">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/15">
                    <Sliders className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] uppercase font-bold text-zinc-300 font-mono tracking-wide">
                    Daily Limit Goal
                  </span>
                </div>
                <span className="text-lg font-black font-display text-white">
                  {dailyGoalHours} <span className="text-xs text-zinc-400 font-bold font-sans">hrs</span>
                </span>
              </div>

              <input
                id="goal-hours-range"
                type="range"
                min="1"
                max="12"
                step="0.5"
                value={dailyGoalHours}
                onChange={(e) => setDailyGoalHours(parseFloat(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer h-1.5 bg-zinc-950/90 rounded-full"
              />

              <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500 mt-2.5">
                <span>1 HOUR ALIENATING</span>
                <span>12 HOURS HEAVY</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-[#101524]/60 border border-[#1b2238]/60 rounded-2xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/15">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-black text-white">Challenge Ends</span>
                  <span className="text-[10px] text-zinc-500">{formattedDays}</span>
                </div>
              </div>

              <button
                onClick={() => setChallengeDurationDays(challengeDurationDays === 8 ? 14 : challengeDurationDays === 14 ? 30 : 8)}
                className="bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-right cursor-pointer select-none active:scale-95 transition-transform"
              >
                <div className="text-[10px] font-black uppercase text-[#00c6ff] font-mono">{dateText.toUpperCase()}</div>
                <div className="text-[8px] text-zinc-500 mt-0.5">Toggle Ends</div>
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#101524]/60 border border-[#1b2238]/60 rounded-2xl p-4 flex flex-col flex-1"
            >
              <div className="flex items-center justify-between mb-4 text-left">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-white">Invite Squad</span>
                </div>

                <div className="px-2.5 py-0.5 rounded-full bg-zinc-950 text-zinc-400 border border-zinc-900 font-mono font-bold text-[10px]">
                  {totalSquadCount} / 6
                </div>
              </div>

              <div className="flex items-center gap-2 bg-[#121625] border border-zinc-800 rounded-xl p-2 mb-4 justify-between">
                <div className="flex items-center gap-2 text-zinc-400 pl-1.5">
                  <Share2 className="w-3.5 h-3.5 text-[#00c6ff]" />
                  <span className="font-mono font-bold text-xs tracking-wider text-white">{inviteCode}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={generateNewCode}
                    className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors cursor-pointer"
                    title="Generate random code"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    id="btn-copy-code"
                    onClick={handleCopyCode}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9.5px] font-extrabold uppercase transition-all duration-300 cursor-pointer ${
                      copied ? 'bg-emerald-500 text-black shadow-md' : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300'
                    }`}
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 max-h-[190px] overflow-y-auto scrollbar-none flex-1">
                {squadFriends.map((friend) => (
                  <div
                    key={friend.id}
                    onClick={() => handleToggleInvite(friend.id)}
                    className={`flex items-center justify-between bg-zinc-950/40 border rounded-xl px-3.5 py-2 hover:bg-zinc-900/40 transition-all select-none cursor-pointer ${
                      friend.isInvited
                        ? 'border-purple-500/40 shadow-[0_2px_12px_rgba(168,85,247,0.1)] bg-purple-500/[0.02]'
                        : 'border-[#1d243c]/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-b from-[#181f34] to-[#04060b] border border-zinc-700/80 flex items-center justify-center text-xs font-black text-white relative">
                          {friend.avatar || friend.name.split(' ').map((n) => n[0]).join('')}
                          <div
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-black ${
                              friend.status === 'focusing' ? 'bg-[#ff3a40] animate-pulse' : friend.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-600'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-zinc-200">{friend.name}</span>
                        <span className="text-[9.5px] text-zinc-500">
                          {friend.status === 'focusing' ? '🔒 Block active' : '💤 Passive screen time'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleToggleInvite(friend.id);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all duration-300 cursor-pointer ${
                          friend.isInvited ? 'bg-purple-500 text-white font-bold' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-zinc-200'
                        }`}
                      >
                        <Send className="w-2.5 h-2.5" />
                        <span>{friend.isInvited ? 'Invited' : 'Invite'}</span>
                      </button>

                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                          friend.isInvited ? 'border-purple-500 bg-purple-500 text-white' : 'border-zinc-800 bg-transparent'
                        }`}
                      >
                        {friend.isInvited && <Check className="w-2.5 h-2.5 stroke-[3.5px]" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <div className="mt-auto pt-2 z-10">
              {invitedCount === 0 ? (
                <div className="w-full text-center py-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-zinc-500 font-bold text-xs tracking-wider cursor-not-allowed select-none">
                  Invite at least 1 friend to start
                </div>
              ) : (
                <button
                  id="btn-start-squad"
                  onClick={handleStartChallenge}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-500 text-white hover:opacity-95 font-black text-xs tracking-wider shadow-[0_4px_20px_rgba(147,51,234,0.4)] active:scale-[0.98] transition-transform select-none cursor-pointer uppercase text-center"
                >
                  <Play className="w-4 h-4 fill-white/10" />
                  <span>Start {dailyGoalHours}h Squad Challenge</span>
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="leaderboard-view"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col gap-4 flex-1 pb-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3.5 mt-2">
              <button
                onClick={handleStopChallenge}
                className="flex items-center gap-1 text-[10px] font-mono font-bold text-zinc-400 hover:text-white cursor-pointer select-none"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>

              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-mono tracking-widest text-emerald-400 animate-pulse font-bold">
                CHALLENGE ACTIVE
              </div>
            </div>

            <div className="flex flex-col text-left">
              <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold">
                🔒 SQUAD TRACKER
              </span>
              <h2 className="text-xl font-black text-white mt-0.5">Current Standings</h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Keep daily screen time under <span className="text-white font-bold">{dailyGoalHours} hours</span> to stay secure.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[#101524]/60 border border-[#1b2238]/60 rounded-xl p-3 flex flex-col text-left">
                <span className="text-[9px] text-zinc-500 uppercase font-mono font-bold">Daily Goal</span>
                <span className="text-base font-black text-white mt-1">&lt; {dailyGoalHours} hrs</span>
              </div>
              <div className="bg-[#101524]/60 border border-[#1b2238]/60 rounded-xl p-3 flex flex-col hover:border-purple-500/30 transition-all text-left">
                <span className="text-[9px] text-zinc-500 uppercase font-mono font-bold">Safe Squad</span>
                <span className="text-base font-black text-emerald-400 mt-1">
                  {squadFriends.filter((friend) => friend.isInvited && friend.status !== 'focusing').length + 1} / {totalSquadCount} safe
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 bg-zinc-950 border border-zinc-900/60 rounded-xl p-0.5 select-none">
              <button
                onClick={() => setActiveLeaderboardTab('leaderboard')}
                className={`py-1.5 rounded-lg text-[9.5px] uppercase font-mono font-black tracking-wide transition-colors cursor-pointer ${
                  activeLeaderboardTab === 'leaderboard' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-400'
                }`}
              >
                Scoreboard
              </button>
              <button
                onClick={() => setActiveLeaderboardTab('activity')}
                className={`py-1.5 rounded-lg text-[9.5px] uppercase font-mono font-black tracking-wide transition-colors cursor-pointer ${
                  activeLeaderboardTab === 'activity' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-400'
                }`}
              >
                Streak Rank
              </button>
            </div>

            {activeLeaderboardTab === 'leaderboard' ? (
              <div className="bg-[#101524]/60 border border-[#1b2238]/60 rounded-2xl p-4 flex flex-col gap-3 flex-1 overflow-y-auto scrollbar-none max-h-[290px]">
                <div className="flex flex-col gap-1.5 bg-[#171e35]/70 border border-[#232d4e] rounded-xl p-3 select-none">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#00c6ff] to-[#0072ff] text-black border border-white/15 flex items-center justify-center text-[10px] font-black">
                        ME
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-black text-white">Your Device</span>
                        <span className="text-[9px] text-zinc-400">Strict Lock is ready</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono font-black text-emerald-400">0.0h</span>
                      <span className="text-[9px] text-zinc-500">used</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '4%' }} />
                  </div>
                </div>

                {squadFriends.filter((friend) => friend.isInvited).map((friend, index) => {
                  const usageFloat = parseFloat(friend.todayScreenTime);
                  const isOver = usageFloat >= dailyGoalHours;
                  const percent = Math.min((usageFloat / dailyGoalHours) * 100, 100);

                  return (
                    <div key={friend.id} className="flex flex-col gap-1.5 bg-zinc-950/40 border border-[#1b2238]/20 rounded-xl p-3 select-none">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-400">
                            #{index + 2}
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-bold text-zinc-200">{friend.name}</span>
                            <span className="text-[9px] text-zinc-500 flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${friend.status === 'focusing' ? 'bg-[#ff3a40]' : 'bg-emerald-500'}`} />
                              {friend.status === 'focusing' ? 'Focus Mode' : 'Monitoring'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-right">
                          <span className={`text-xs font-mono font-bold ${isOver ? 'text-red-400' : 'text-zinc-200'}`}>
                            {friend.todayScreenTime}
                          </span>
                          <span className="text-[9px] text-zinc-500">used</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${isOver ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.2)]' : 'bg-purple-500'}`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#101524]/60 border border-[#1b2238]/60 rounded-2xl p-4 flex flex-col gap-3 flex-1 overflow-y-auto scrollbar-none max-h-[290px] text-left">
                <span className="text-[9px] font-mono tracking-wider text-purple-400 uppercase font-semibold">
                  ⚡ TOP STREAKS IN SQUAD
                </span>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-900">
                    <span className="text-[11px] font-black text-white">1. You (Me)</span>
                    <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1 font-extrabold">
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      14 Days Streak
                    </span>
                  </div>
                  {squadFriends.filter((friend) => friend.isInvited).map((friend, index) => (
                    <div key={friend.id} className="flex items-center justify-between bg-zinc-950/30 p-2.5 rounded-xl border border-zinc-900/60">
                      <span className="text-[11px] font-semibold text-zinc-400">{friend.name}</span>
                      <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-zinc-600" />
                        {8 - index} Days Streak
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-auto pt-3">
              <button
                id="btn-stop-challenge"
                onClick={handleStopChallenge}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 text-[11px] font-mono font-black uppercase tracking-wider rounded-xl active:scale-95 transition-transform cursor-pointer select-none"
              >
                Disband Active Group
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
