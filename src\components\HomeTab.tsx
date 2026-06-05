/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Flame, RefreshCw, AlertTriangle } from 'lucide-react';
import { AppLimit, HomeAccountabilityState, SquadFriend } from '../types';
import { DEFAULT_APP_LIMITS, DEFAULT_HOME_ACCOUNTABILITY, DEFAULT_SQUAD_FRIENDS } from '../lib/defaultData';

interface HomeTabProps {
  onNavigate: (tab: 'focus' | 'group') => void;
  accountability?: HomeAccountabilityState;
  appLimits?: AppLimit[];
  squadFriends?: SquadFriend[];
  onAddSafeDay?: () => void | Promise<void>;
  onResetStack?: () => void | Promise<void>;
  onSimulateCrash?: (memberName: string, appName: string, overtimeLabel: string) => void | Promise<void>;
}

interface AppStat {
  id: string;
  name: string;
  timeUsed: string;
  avgTime: string;
  color: string;
  tag: string;
  progress: number;
  isExceeded: boolean;
  member: string;
}

function hoursLabel(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (wholeHours === 0) return `${minutes}m`;
  if (minutes === 0) return `${wholeHours}h`;
  return `${wholeHours}h ${minutes}m`;
}

export default function HomeTab({
  accountability = DEFAULT_HOME_ACCOUNTABILITY,
  appLimits = DEFAULT_APP_LIMITS,
  squadFriends = DEFAULT_SQUAD_FRIENDS,
  onAddSafeDay,
  onResetStack,
  onSimulateCrash,
}: HomeTabProps) {
  const [selectedStatIndex, setSelectedStatIndex] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const colorsPalette = [
    { color: 'from-[#ff3a40] to-[#ff6a1d]', shadow: 'rgba(255,58,64,0.45)', width: 'w-56', height: 'h-4' },
    { color: 'from-[#00c6ff] to-[#0072ff]', shadow: 'rgba(0,198,255,0.45)', width: 'w-48', height: 'h-4' },
    { color: 'from-[#ff007f] to-[#7f00ff]', shadow: 'rgba(255,0,127,0.45)', width: 'w-52', height: 'h-4' },
    { color: 'from-[#10b981] to-[#059669]', shadow: 'rgba(16,185,129,0.45)', width: 'w-44', height: 'h-4' },
    { color: 'from-[#f59e0b] to-[#d97706]', shadow: 'rgba(245,158,11,0.45)', width: 'w-40', height: 'h-4' },
    { color: 'from-[#ec4899] to-[#be185d]', shadow: 'rgba(236,72,153,0.45)', width: 'w-50', height: 'h-4' },
    { color: 'from-[#a855f7] to-[#6b21a8]', shadow: 'rgba(168,85,247,0.45)', width: 'w-46', height: 'h-4' },
    { color: 'from-[#14b8a6] to-[#0f766e]', shadow: 'rgba(20,184,166,0.45)', width: 'w-42', height: 'h-4' },
    { color: 'from-[#3b82f6] to-[#1d4ed8]', shadow: 'rgba(59,130,246,0.45)', width: 'w-54', height: 'h-4' },
    { color: 'from-[#f43f5e] to-[#9f1239]', shadow: 'rgba(244,63,94,0.45)', width: 'w-48', height: 'h-4' },
  ];

  const items = Array.from({ length: Math.min(Math.max(accountability.streakDays, 1), colorsPalette.length) }, (_, index) => ({
    index,
    ...colorsPalette[index % colorsPalette.length],
  }));

  const stats = useMemo<AppStat[]>(() => {
    const seededApps = appLimits.length ? appLimits : DEFAULT_APP_LIMITS;
    const seededMembers = squadFriends.length ? squadFriends : DEFAULT_SQUAD_FRIENDS;

    return seededApps.slice(0, 5).map((limit, index) => {
      const member = seededMembers[index] ?? seededMembers[0];
      const isOffender = accountability.squadStatus === 'broken' && accountability.offendingMember === member?.name;
      const progress = Math.min(100, Math.round((limit.usedHours / Math.max(limit.limitHours, 0.1)) * 100));
      return {
        id: limit.id,
        name: limit.name,
        timeUsed: isOffender ? hoursLabel(accountability.dailyGoalHours + 1.25) : hoursLabel(limit.usedHours),
        avgTime: hoursLabel(Math.max(0.25, limit.limitHours * 0.75)),
        color: limit.color,
        tag: isOffender ? 'LIMIT EXCEEDED' : progress >= 90 ? 'NEAR LIMIT' : 'SAFE FOR NOW',
        progress: isOffender ? 100 : progress,
        isExceeded: isOffender || progress >= 100,
        member: member?.name ?? 'You (Me)',
      };
    });
  }, [accountability, appLimits, squadFriends]);

  const handleAddSafeDay = async () => {
    await onAddSafeDay?.();
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col p-4 overflow-y-auto scrollbar-none justify-between h-full bg-[#050811] text-zinc-100"
    >
      <div className="absolute top-[10%] left-[5%] w-36 h-36 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />
      <div className="absolute top-[40%] right-[5%] w-40 h-40 rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />

      <div className="flex flex-col items-center justify-center mt-2.5 text-center mb-1 select-none z-10">
        <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase font-mono">
          TODAY'S OVERVIEW
        </span>

        <h1 className="text-5xl md:text-6xl font-black font-display tracking-tight text-white mt-1">
          {accountability.todayOverviewLabel}
        </h1>

        <div className="mt-2.5 flex items-center gap-1.5 px-3 py-1 bg-[#10b981]/15 border border-[#10b981]/25 rounded-full text-[11px] font-bold text-[#34d399] tracking-wide">
          <span className="text-[12px]">↘</span>
          <span>{accountability.groupAverageDeltaLabel}</span>
        </div>

        <div className="mt-3.5 mx-auto max-w-[290px] px-3.5 py-2.5 bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/50 rounded-2xl flex items-center gap-2 text-[10.5px] text-zinc-400 font-sans shadow-lg leading-relaxed justify-between">
          <div className="flex items-center gap-2 text-left">
            <span className="text-sm">✨</span>
            <span>{accountability.insightLabel}</span>
          </div>
        </div>

        {accountability.squadStatus === 'broken' && (
          <div className="mt-3 mx-auto w-full max-w-[290px]">
            <AnimatePresence mode="wait">
              <motion.div
                key="alert-broken"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-3.5 py-2.5 bg-red-950/20 border border-red-500/30 rounded-2xl flex flex-col gap-1 text-[11px] text-red-300 font-sans shadow-lg text-center"
              >
                <span className="font-extrabold uppercase tracking-wider text-red-400">⚠️ CRASH DETECTED</span>
                <span>
                  {accountability.offendingMember} went {accountability.offendingOvertime} on {accountability.offendingApp}!
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="relative my-2.5 flex flex-col items-center justify-center py-4 min-h-[200px] select-none z-10">
        <div className="flex flex-col items-center mb-4 text-center">
          <span className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase font-mono">
            SQUAD STREAK RECORD
          </span>
          <div className="flex items-center gap-1.5 mt-1 px-3 py-1 bg-zinc-950/80 border border-zinc-900 rounded-full shadow-md text-xs">
            {accountability.squadStatus !== 'broken' ? (
              <>
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20 animate-pulse" />
                <span className="font-extrabold text-white">{accountability.streakDays} Day Social Streak</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-bounce" />
                <span className="font-extrabold text-red-400">Streak Broken Today</span>
              </>
            )}
          </div>
        </div>

        <div className="absolute w-36 h-36 rounded-full bg-[#00c6ff]/5 blur-[60px] pointer-events-none" />
        {showCelebration && <div className="absolute top-0 text-2xl animate-ping pointer-events-none">✨💎✨</div>}

        <div className="flex flex-col-reverse gap-1 items-center relative pr-2">
          {accountability.squadStatus !== 'broken'
            ? items.map((block) => {
                const floatOffset = block.index % 2 === 0 ? 3 : -3;
                return (
                  <motion.div
                    key={block.index}
                    layoutId={`block-${block.index}`}
                    initial={{ y: -80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1, x: [0, floatOffset, 0], rotate: block.index % 2 === 0 ? 0.3 : -0.3 }}
                    transition={{
                      type: 'spring',
                      stiffness: 140,
                      damping: 10,
                      x: { repeat: Infinity, duration: 4 + block.index * 0.4, ease: 'easeInOut' },
                    }}
                    whileHover={{ scale: 1.05, filter: 'brightness(1.2)' }}
                    className={`p-0.5 rounded-xl bg-gradient-to-r ${block.color} ${block.width} ${block.height} border border-white/20 relative shadow-lg cursor-pointer transform-gpu`}
                    style={{ boxShadow: `0 8px 20px -4px ${block.shadow}, inset 0 2px 7px rgba(255,255,255,0.4)` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent rounded-t-xl" />
                  </motion.div>
                );
              })
            : colorsPalette.slice(0, 7).map((block, idx) => (
                <motion.div
                  key={`crashed-${idx}`}
                  initial={{ y: 0, x: 0, rotate: 0 }}
                  animate={{ x: (idx - 3) * 58 + (idx % 2 === 0 ? 25 : -25), y: 70 + (idx % 3) * 12, rotate: (idx - 3) * 35, scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 90, damping: 12, duration: 0.6 }}
                  className={`absolute p-0.5 rounded-xl bg-gradient-to-r ${block.color} ${block.width} ${block.height} border border-white/10 relative shadow-sm cursor-pointer opacity-75`}
                  style={{ boxShadow: '0 4px 10px rgba(0,0,0,0.5), inset 0 1px 4px rgba(255,255,255,0.2)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-t-xl" />
                </motion.div>
              ))}
        </div>
      </div>

      <div className="bg-zinc-950/80 border border-zinc-900 rounded-2xl p-3.5 my-3 relative select-none z-10 text-center">
        <span className="text-[9.5px] font-mono font-bold tracking-[0.15em] text-zinc-500 uppercase block mb-2.5">
          🔮 SCREEN TIME SIMULATION LAB
        </span>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleAddSafeDay}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#10b981]/10 hover:bg-[#10b981]/20 border border-[#10b981]/20 rounded-xl text-[10px] font-extrabold uppercase tracking-wider text-[#34d399] transition-all active:scale-[0.97] cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Placed Block (+1)</span>
          </button>

          <button
            onClick={() => onResetStack?.()}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#00c6ff]/10 hover:bg-[#00c6ff]/20 border border-[#00c6ff]/25 rounded-xl text-[10px] font-extrabold uppercase tracking-wider text-[#00c6ff] transition-all active:scale-[0.97] cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Stack</span>
          </button>

          <button
            onClick={() => onSimulateCrash?.('Alex Rivera', 'TikTok', '1h 15m over')}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-[10px] font-extrabold uppercase tracking-wider text-red-400 transition-all active:scale-[0.97] cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <span>Alex Slips Up (Crash)</span>
          </button>

          <button
            onClick={() => onSimulateCrash?.('Sarah Chen', 'Instagram', '48m over')}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-[10px] font-extrabold uppercase tracking-wider text-red-400 transition-all active:scale-[0.97] cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <span>Sarah Slips (Crash)</span>
          </button>
        </div>
      </div>

      <div className="w-full relative z-20 my-1 py-1">
        <div className="flex gap-3 overflow-x-auto scrollbar-none px-2 py-1.5 snap-x">
          {stats.map((stat, idx) => {
            const isSelected = selectedStatIndex === idx;
            return (
              <motion.div
                key={stat.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedStatIndex(idx)}
                className={`snap-center shrink-0 w-[245px] rounded-2xl p-3.5 border transition-all duration-300 relative overflow-hidden select-none cursor-pointer ${
                  stat.isExceeded
                    ? 'bg-red-950/15 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                    : isSelected
                      ? 'bg-[#121627]/90 border-blue-500/60 shadow-[0_0_15px_rgba(0,198,255,0.15)] ring-1 ring-blue-500/20'
                      : 'bg-[#0b0e1a]/60 border-zinc-800/80 hover:border-zinc-700/60 shadow-lg'
                }`}
              >
                <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${stat.isExceeded ? 'from-red-600 to-rose-600' : stat.color}`} />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${stat.isExceeded ? 'from-red-600 to-rose-700' : stat.color} p-0.5 flex items-center justify-center text-white font-extrabold text-[11px] shadow-md`}>
                      <span>{stat.member.split(' ').map((n) => n[0]).join('')}</span>
                    </div>

                    <div className="flex flex-col text-left">
                      <span className="text-xs font-black text-white">{stat.member}</span>
                      <span className={`text-[8px] font-bold uppercase tracking-wider ${stat.isExceeded ? 'text-red-400' : 'text-zinc-500'}`}>
                        {stat.name} · {stat.tag}
                      </span>
                    </div>
                  </div>

                  <span className={`text-xs font-black font-mono ${stat.isExceeded ? 'text-red-400 font-extrabold' : 'text-zinc-300'}`}>
                    {stat.timeUsed}
                  </span>
                </div>

                <div className="mt-3.5 flex flex-col gap-1 text-left">
                  <div className="relative w-full h-1.5 bg-zinc-900 border border-zinc-800/80 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.progress}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full bg-gradient-to-r ${stat.isExceeded ? 'from-red-500 to-rose-600' : stat.color}`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[8px] text-zinc-500 font-mono mt-0.5">
                    <span>LATEST SCREEN SESSION</span>
                    <span className="font-bold">Goal Max: {accountability.dailyGoalHours.toFixed(1)}h</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="text-center py-1 mt-1 text-[9px] text-zinc-500 uppercase tracking-[0.15em] font-mono flex items-center justify-center gap-1.5 z-10">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00c6ff]/40" />
        SQUAD TETHER IS ENGAGED · TOWER ACTIVE
      </div>
    </motion.div>
  );
}
