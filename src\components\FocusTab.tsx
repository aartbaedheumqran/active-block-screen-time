/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Bell, Minus, Plus, Lock, X, Play, 
  ChevronDown, Flame, Smartphone, Edit2, Check,
  Sparkles, EyeOff, RotateCcw, Clock, ArrowRight, HelpCircle
} from 'lucide-react';
import { BlockedApp, AppLimit, FocusSubMode } from '../types';

interface FocusTabProps {
  subMode: FocusSubMode;
  setSubMode: (mode: FocusSubMode) => void;
  blockedApps: BlockedApp[];
  setBlockedApps: React.Dispatch<React.SetStateAction<BlockedApp[]>>;
  appLimits: AppLimit[];
  setAppLimits: React.Dispatch<React.SetStateAction<AppLimit[]>>;
  activeDuration: number; // in mins
  setActiveDuration: (dur: number) => void;
  isFocusing: boolean;
  setIsFocusing: (focus: boolean) => void;
  focusSecondsLeft: number;
  setFocusSecondsLeft: React.Dispatch<React.SetStateAction<number>>;
}

const AVAILABLE_APPS = [
  { name: 'Instagram', color: 'from-pink-500 to-rose-500', glowColor: 'rgba(236,72,153,0.3)', icon: 'camera', defaultTime: '1.4h today' },
  { name: 'TikTok', color: 'from-red-500 to-zinc-900', glowColor: 'rgba(239,68,68,0.3)', icon: 'music', defaultTime: '2.1h today' },
  { name: 'YouTube', color: 'from-red-600 to-amber-600', glowColor: 'rgba(220,38,38,0.3)', icon: 'video', defaultTime: '0.8h today' },
  { name: 'Twitter/X', color: 'from-neutral-800 to-cyan-500', glowColor: 'rgba(6,182,212,0.3)', icon: 'smartphone', defaultTime: '0.5h today' },
  { name: 'Reddit', color: 'from-orange-500 to-red-500', glowColor: 'rgba(249,115,22,0.3)', icon: 'message-circle', defaultTime: '0.3h today' },
  { name: 'Snapchat', color: 'from-yellow-400 to-yellow-600', glowColor: 'rgba(234,179,8,0.3)', icon: 'zap', defaultTime: '0.9h today' },
  { name: 'Facebook', color: 'from-blue-600 to-indigo-700', glowColor: 'rgba(59,130,246,0.3)', icon: 'share-2', defaultTime: '1.1h today' },
  { name: 'Spotify', color: 'from-emerald-500 to-green-600', glowColor: 'rgba(16,185,129,0.3)', icon: 'headphones', defaultTime: '1.2h today' },
];

interface TimelineBlock {
  id: string;
  appName: string;
  color: string;
  glowColor: string;
  startHour: number;
  durationHours: number;
  timeRange: string;
  durationMin: number;
}

export default function FocusTab({
  subMode,
  setSubMode,
  blockedApps,
  setBlockedApps,
  appLimits,
  setAppLimits,
  activeDuration,
  setActiveDuration,
  isFocusing,
  setIsFocusing,
  focusSecondsLeft,
  setFocusSecondsLeft,
}: FocusTabProps) {
  const [showAppSelector, setShowAppSelector] = useState(false);
  const [selectedAppLimitToEdit, setSelectedAppLimitToEdit] = useState<AppLimit | null>(null);
  const [newLimitHours, setNewLimitHours] = useState(2);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Picture 1 Schedule Map Core states
  const [activeFilterApp, setActiveFilterApp] = useState<string | null>(null);
  const [selectedTimelineBlock, setSelectedTimelineBlock] = useState<TimelineBlock | null>(null);
  
  // Custom interactive scrubbable active line (defaults to real current time hour, e.g. 10.5 for 10:30)
  const [currentTimeHour, setCurrentTimeHour] = useState<number>(10.5);

  const durationPresets = [25, 45, 60, 90];

  // Set initial default scrub line to actual device hours
  useEffect(() => {
    const d = new Date();
    const currentDecimalHours = d.getHours() + d.getMinutes() / 60;
    setCurrentTimeHour(parseFloat(currentDecimalHours.toFixed(1)));
  }, []);

  // Sync session timer ticked
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isFocusing && focusSecondsLeft > 0) {
      interval = setInterval(() => {
        setFocusSecondsLeft((prev) => {
          if (prev <= 1) {
            setSessionCompleted(true);
            setIsFocusing(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isFocusing, focusSecondsLeft]);

  const changeDuration = (amount: number) => {
    const nextVal = activeDuration + amount;
    if (nextVal >= 5 && nextVal <= 300) {
      setActiveDuration(nextVal);
      if (!isFocusing) {
        setFocusSecondsLeft(nextVal * 60);
      }
    }
  };

  const handleSelectPreset = (dur: number) => {
    setActiveDuration(dur);
    if (!isFocusing) {
      setFocusSecondsLeft(dur * 60);
    }
  };

  const startFocusSession = () => {
    setFocusSecondsLeft(activeDuration * 60);
    setIsFocusing(true);
    setSessionCompleted(false);
  };

  const addBlockedApp = (app: typeof AVAILABLE_APPS[0]) => {
    const isAlreadyBlocked = blockedApps.some((a) => a.name === app.name);
    if (!isAlreadyBlocked) {
      const newApp: BlockedApp = {
        id: Math.random().toString(),
        name: app.name,
        color: app.color,
        icon: app.icon,
        timeUsedToday: app.defaultTime.replace(' today', ''),
        originalSecondsToday: parseFloat(app.defaultTime) * 3600,
      };
      setBlockedApps([...blockedApps, newApp]);
    }
    setShowAppSelector(false);
  };

  const removeBlockedApp = (id: string) => {
    setBlockedApps(blockedApps.filter((app) => app.id !== id));
  };

  const openEditLimitModal = (appLimit: AppLimit) => {
    setSelectedAppLimitToEdit(appLimit);
    setNewLimitHours(appLimit.limitHours);
  };

  const saveAppLimitChange = () => {
    if (selectedAppLimitToEdit) {
      setAppLimits(
        appLimits.map((l) =>
          l.id === selectedAppLimitToEdit.id ? { ...l, limitHours: newLimitHours } : l
        )
      );
      setSelectedAppLimitToEdit(null);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Picture 1 App circles configuration at the top of the schedule map
  const timelineFilterApps = [
    { name: 'Insta', label: 'Instagram', dotColor: 'bg-pink-500 shadow-pink-500/50' },
    { name: 'TikTok', label: 'TikTok', dotColor: 'bg-red-500 shadow-red-500/50' },
    { name: 'YT', label: 'YouTube', dotColor: 'bg-red-600 shadow-red-600/50' },
    { name: 'X', label: 'Twitter/X', dotColor: 'bg-cyan-400 shadow-cyan-400/50' },
    { name: 'Reddit', label: 'Reddit', dotColor: 'bg-orange-500 shadow-orange-500/50' },
    { name: 'Spotify', label: 'Spotify', dotColor: 'bg-emerald-500 shadow-emerald-500/50' },
  ];

  // Picture 1 Schedule Block Data
  const scheduleBlocks: TimelineBlock[] = [
    // Instagram
    { id: 't1', appName: 'Instagram', color: 'from-pink-500 to-rose-600', glowColor: 'rgba(244,63,94,0.4)', startHour: 8.5, durationHours: 1.5, timeRange: '08:30 – 10:00', durationMin: 90 },
    { id: 't2', appName: 'Instagram', color: 'from-pink-500 to-rose-600', glowColor: 'rgba(244,63,94,0.4)', startHour: 13.5, durationHours: 1.0, timeRange: '13:30 – 14:30', durationMin: 60 },
    
    // TikTok
    { id: 't3', appName: 'TikTok', color: 'from-red-500 to-zinc-900', glowColor: 'rgba(239,68,68,0.4)', startHour: 10.0, durationHours: 1.5, timeRange: '10:00 – 11:30', durationMin: 90 },
    { id: 't4', appName: 'TikTok', color: 'from-red-500 to-zinc-900', glowColor: 'rgba(239,68,68,0.4)', startHour: 16.0, durationHours: 1.5, timeRange: '16:00 – 17:30', durationMin: 90 },
    
    // YouTube
    { id: 't5', appName: 'YouTube', color: 'from-red-600 to-amber-600', glowColor: 'rgba(220,38,38,0.4)', startHour: 7.5, durationHours: 1.0, timeRange: '07:30 – 08:30', durationMin: 60 },
    { id: 't6', appName: 'YouTube', color: 'from-red-600 to-amber-600', glowColor: 'rgba(220,38,38,0.4)', startHour: 12.0, durationHours: 1.5, timeRange: '12:00 – 13:30', durationMin: 90 },
    { id: 't7', appName: 'YouTube', color: 'from-red-600 to-amber-600', glowColor: 'rgba(220,38,38,0.4)', startHour: 18.2, durationHours: 1.2, timeRange: '18:12 – 19:24', durationMin: 72 },

    // X / Twitter
    { id: 't8', appName: 'Twitter/X', color: 'from-[#00c6ff] to-blue-500', glowColor: 'rgba(0,198,255,0.4)', startHour: 7.0, durationHours: 0.8, timeRange: '07:00 – 07:48', durationMin: 48 },
    { id: 't9', appName: 'Twitter/X', color: 'from-[#00c6ff] to-blue-500', glowColor: 'rgba(0,198,255,0.4)', startHour: 12.0, durationHours: 1.0, timeRange: '12:00 – 13:00', durationMin: 60 },
    { id: 't10', appName: 'Twitter/X', color: 'from-[#00c6ff] to-blue-500', glowColor: 'rgba(0,198,255,0.4)', startHour: 17.5, durationHours: 1.2, timeRange: '17:30 – 18:42', durationMin: 72 },

    // Reddit
    { id: 't11', appName: 'Reddit', color: 'from-orange-500 to-red-600', glowColor: 'rgba(249,115,22,0.4)', startHour: 11.5, durationHours: 1.0, timeRange: '11:30 – 12:30', durationMin: 60 },
    { id: 't12', appName: 'Reddit', color: 'from-orange-500 to-red-600', glowColor: 'rgba(249,115,22,0.4)', startHour: 15.0, durationHours: 1.2, timeRange: '15:00 – 16:12', durationMin: 72 },

    // Spotify
    { id: 't13', appName: 'Spotify', color: 'from-emerald-500 to-teal-600', glowColor: 'rgba(16,185,129,0.4)', startHour: 8.0, durationHours: 0.8, timeRange: '08:00 – 08:48', durationMin: 48 },
    { id: 't14', appName: 'Spotify', color: 'from-emerald-500 to-teal-600', glowColor: 'rgba(16,185,129,0.4)', startHour: 12.5, durationHours: 1.2, timeRange: '12:30 – 13:42', durationMin: 72 },
    { id: 't15', appName: 'Spotify', color: 'from-emerald-500 to-teal-600', glowColor: 'rgba(16,185,129,0.4)', startHour: 17.0, durationHours: 1.0, timeRange: '17:00 – 18:00', durationMin: 60 },
  ];

  // Map app filter click to highlight that specific column or selection
  const handleAppFilterClick = (appName: string) => {
    if (activeFilterApp === appName) {
      setActiveFilterApp(null);
    } else {
      setActiveFilterApp(appName);
    }
  };

  // Timeline Hour scaling: 1 hour = 20px height
  const HOUR_HEIGHT = 18;
  const hLabels = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto scrollbar-none h-full relative p-4 bg-gradient-to-b from-[#050811] to-[#010204]">
      
      {/* 1. Header Details (Keep tranquil) */}
      <div className="mt-2 mb-3 flex flex-col text-left px-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 font-bold">
          {subMode === 'active_block' ? '🛡️ Strict Focus Mode' : '🔔 Alert Protection'}
        </span>
        
        <div className="flex items-center gap-2 mt-1">
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2 font-display">
            {subMode === 'active_block' ? 'Active Block' : 'Soft Limit'}
          </h2>
          {subMode === 'active_block' && (
            <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Shield className="w-4 h-4 fill-blue-400/20" />
            </div>
          )}
        </div>
        
        <p className="text-[11px] text-zinc-400 mt-1 leading-normal font-sans">
          {subMode === 'active_block' 
            ? 'Lock apps and lock in. No distractions.' 
            : 'Set daily limits. Stay aware, not locked.'
          }
        </p>
      </div>

      {/* 2. Sub-mode Selector Switch */}
      <div className="grid grid-cols-2 bg-zinc-950/80 border border-zinc-900 rounded-2xl p-1 mb-5 relative select-none">
        
        {/* Active Block Tab button */}
        <button
          id="tab-submode-active"
          onClick={() => !isFocusing && setSubMode('active_block')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-extrabold tracking-wider transition-all duration-300 relative z-10 cursor-pointer ${
            subMode === 'active_block' 
              ? 'text-white' 
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
          disabled={isFocusing}
        >
          {subMode === 'active_block' && (
            <motion.div 
              layoutId="submode-bg"
              className="absolute inset-0 bg-gradient-to-r from-[#ff3a40] to-[#ff6a1d] rounded-xl shadow-[0_4px_15px_rgba(255,58,64,0.3)]"
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5 uppercase">
            <Shield className="w-3.5 h-3.5" />
            Active Block
          </span>
         </button>

        {/* Soft Limit Tab button */}
        <button
          id="tab-submode-soft"
          onClick={() => !isFocusing && setSubMode('soft_limit')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-extrabold tracking-wider transition-all duration-300 relative z-10 cursor-pointer ${
            subMode === 'soft_limit' 
              ? 'text-white' 
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
          disabled={isFocusing}
        >
          {subMode === 'soft_limit' && (
            <motion.div 
              layoutId="submode-bg"
              className="absolute inset-0 bg-gradient-to-r from-[#00c6ff] to-[#0072ff] rounded-xl shadow-[0_4px_15px_rgba(0,114,255,0.3)]"
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5 uppercase">
            <Bell className="w-3.5 h-3.5" />
            Soft Limit
          </span>
        </button>
      </div>

      {/* Main Mode Layouts */}
      <div className="flex-1 flex flex-col">
        {subMode === 'active_block' ? (
          
          /* ================= ACTIVE BLOCK CARD SETS ================= */
          <div className="flex flex-col gap-4 flex-1">
            
            {/* Session Duration Panel */}
            <div className="bg-[#101524]/40 border border-[#1b2238]/40 rounded-2xl p-4 flex flex-col shadow-lg">
              <span className="text-[9px] font-mono tracking-widest text-zinc-400 uppercase flex items-center gap-1.5 mb-3 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                Session Duration
              </span>
              
              {/* Presets Grid */}
              <div className="grid grid-cols-4 gap-1.5 mb-3.5">
                {durationPresets.map((preset) => {
                  const isActive = activeDuration === preset;
                  return (
                    <button
                      key={preset}
                      onClick={() => handleSelectPreset(preset)}
                      className={`py-2 rounded-xl text-xs font-black transition-all duration-300 relative cursor-pointer ${
                        isActive
                          ? 'text-white border border-[#ff3a40] bg-[#ff3a40]/15 shadow-[0_0_12px_rgba(255,58,64,0.15)] scale-[1.04]'
                          : 'bg-[#151a2d]/30 border border-zinc-800/40 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {preset}m
                    </button>
                  );
                })}
              </div>

              {/* Adjuster Counter Slider */}
              <div className="flex items-center justify-between bg-zinc-950/60 border border-zinc-900 rounded-xl px-4 py-2">
                <button 
                  onClick={() => changeDuration(-5)}
                  className="w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-300 active:scale-95 transition-transform"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                
                <span className="text-sm font-black text-white font-mono tracking-tight text-center">
                  {activeDuration} min
                </span>
                
                <button 
                  onClick={() => changeDuration(5)}
                  className="w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-300 active:scale-95 transition-transform"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Red Gradient start button directly under the adjuster */}
              <button
                id="btn-start-focus"
                onClick={startFocusSession}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gradient-to-r from-[#ff3a40] to-[#ff6a1d] text-white hover:opacity-95 font-bold text-xs tracking-wider shadow-[0_4px_20px_rgba(255,58,64,0.4)] active:scale-[0.98] transition-transform cursor-pointer uppercase select-none mt-4"
              >
                <Shield className="w-4 h-4 fill-white/10" />
                <span>Start {activeDuration}min Focus</span>
              </button>
            </div>

            {/* Block Apps Setup Panel */}
            <div className="bg-[#101524]/40 border border-[#1b2238]/40 rounded-2xl p-4 flex flex-col relative z-20 shadow-lg">
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-[9px] font-mono tracking-widest text-[#ff3a40] uppercase flex items-center gap-1.5 font-bold">
                  <Lock className="w-3 h-3 text-[#ff3a40]" />
                  Block Apps
                </span>
                <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/15">
                  {blockedApps.length} locked
                </span>
              </div>

              {/* Selector Trigger Dropdown */}
              <div className="relative mb-3">
                <button
                  id="dropdown-block-apps"
                  onClick={() => setShowAppSelector(!showAppSelector)}
                  className="w-full flex items-center justify-between bg-[#13192a] hover:bg-zinc-900 border border-zinc-800/80 rounded-xl px-3.5 py-3 text-left text-zinc-400 text-xs transition-colors cursor-pointer select-none"
                >
                  <span className="text-[11px] font-medium text-zinc-300">Select an app to block...</span>
                  <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${showAppSelector ? 'rotate-180' : ''}`} />
                </button>

                {/* Simulated Custom Drops */}
                <AnimatePresence>
                  {showAppSelector && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute left-0 right-0 top-[110%] bg-[#0e1322] border border-zinc-800 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.8)] z-30 max-h-[175px] overflow-y-auto overflow-x-hidden p-1.5 scrollbar-none"
                    >
                      {AVAILABLE_APPS.map((app) => {
                        const isBlocked = blockedApps.some((a) => a.name === app.name);
                        return (
                          <button
                            key={app.name}
                            onClick={() => !isBlocked && addBlockedApp(app)}
                            disabled={isBlocked}
                            className={`w-full flex items-center justify-between text-left rounded-xl px-3 py-2 text-xs transition-all ${
                              isBlocked 
                                ? 'opacity-40 bg-transparent text-zinc-600' 
                                : 'hover:bg-zinc-900 text-zinc-200 hover:pl-4'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${app.color}`} />
                              <span>{app.name}</span>
                            </div>
                            <span className="text-[10px] text-zinc-500">{app.defaultTime}</span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Blocked Apps list */}
              <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto scrollbar-none">
                <AnimatePresence initial={false}>
                  {blockedApps.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-2 text-[11px] text-zinc-500 font-sans"
                    >
                      No apps selected. All system networks open.
                    </motion.div>
                  ) : (
                    blockedApps.map((app) => (
                      <motion.div
                        key={app.id}
                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                        animate={{ opacity: 1, height: 'auto', scale: 1 }}
                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                        className="flex items-center justify-between bg-[#151a2d]/90 border border-[#1d243c] rounded-xl px-3 py-2 shadow-sm group select-none"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${app.color} flex items-center justify-center text-white text-[11px] font-bold`}>
                            <span>{app.name[0]}</span>
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-black text-zinc-100">{app.name}</span>
                            <span className="text-[9px] text-zinc-500">{app.timeUsedToday} today</span>
                          </div>
                        </div>

                        <button
                          onClick={() => removeBlockedApp(app.id)}
                          className="w-5.5 h-5.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/*  =================== PICTURE 1 FOCUS TIMELINE SCHEMA MAP =================== */}
            <div className="bg-[#101524]/40 border border-[#1b2238]/40 rounded-3xl p-4 flex flex-col relative z-10 shadow-lg overflow-hidden select-none">
              
              {/* Scroll To Explore Caption */}
              <div className="flex flex-col items-center mb-4 text-center">
                <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-zinc-500">
                  SCROLL TO EXPLORE
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-600 animate-bounce mt-1" />
              </div>

              {/* Horizontal Filter circular buttons for Insta, TikTok, YT, X, Reddit, Spotify (Picture 1) */}
              <div className="flex items-center justify-between px-1 mb-5">
                {timelineFilterApps.map((app) => {
                  const isFiltered = activeFilterApp === app.label;
                  return (
                    <button
                      key={app.name}
                      onClick={() => handleAppFilterClick(app.label)}
                      className="flex flex-col items-center gap-1.5 focus:outline-none select-none cursor-pointer group"
                    >
                      {/* Pulse Ring representation */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 relative ${
                        isFiltered 
                          ? 'bg-[#1b223a] ring-2 ring-blue-500/50 scale-[1.08]' 
                          : 'bg-zinc-950/60 hover:bg-[#131929] border border-zinc-800'
                      }`}>
                        {/* Dot exactly as Picture 1 */}
                        <div className={`w-2.5 h-2.5 rounded-full ${app.dotColor} relative`}>
                          <div className={`absolute -inset-1 rounded-full animate-ping opacity-70 ${app.dotColor}`} />
                        </div>
                      </div>
                      <span className={`text-[9.5px] font-bold font-mono tracking-tight transition-all ${
                        isFiltered ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-300'
                      }`}>
                        {app.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 24-Hour Vertical Grid layout with customizable height */}
              <div className="relative border border-zinc-900 bg-zinc-950/30 rounded-2xl p-3 max-h-[340px] overflow-y-auto scrollbar-none">
                
                {/* Scrubbing Slider controller (satisfying preview mechanics) */}
                <div className="flex items-center justify-between gap-1 mb-3.5 pb-2 border-b border-zinc-900 text-left">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-[10.5px] font-black tracking-tight text-zinc-200">Scrub Time Marker:</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded font-bold">
                      {Math.floor(currentTimeHour).toString().padStart(2, '0')}:{((currentTimeHour % 1) * 60).toFixed(0).padStart(2, '0')}
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="23.9"
                      step="0.1"
                      value={currentTimeHour}
                      onChange={(e) => setCurrentTimeHour(parseFloat(e.target.value))}
                      className="w-20 accent-red-500 cursor-pointer h-1 bg-zinc-900 rounded-lg shrink-0"
                    />
                  </div>
                </div>

                <div className="relative h-[432px] w-full mt-2 pl-6">
                  {/* Drawing horizontal grid lines */}
                  {hLabels.map((hour) => {
                    const topPos = hour * HOUR_HEIGHT;
                    return (
                      <div 
                        key={hour}
                        style={{ top: `${topPos}px` }}
                        className="absolute left-0 right-0 border-t border-zinc-900/60 pb-1 flex items-center pt-0.5 h-[1px]"
                      >
                        {/* Hour number text exactly as Picture 1 */}
                        <span className="absolute -left-6 transform -translate-y-[1px] text-[9.5px] font-mono font-bold text-zinc-600">
                          {hour.toString().padStart(2, '0')}
                        </span>
                      </div>
                    );
                  })}

                  {/* Draw vertical columns lanes representing layout */}
                  <div className="absolute top-0 bottom-0 left-0 right-0 grid grid-cols-6 pointer-events-none border-l border-zinc-900/15">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="border-r border-zinc-900/30 h-full w-full" />
                    ))}
                  </div>

                  {/* Red/Amber scrubbing active time horizontal bar exactly as Picture 1 */}
                  <div 
                    style={{ top: `${currentTimeHour * HOUR_HEIGHT}px` }}
                    className="absolute left-0 right-0 h-[2px] bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)] z-10 select-none pointer-events-none transition-all duration-100"
                  >
                    {/* Glowing Red marker dot on the left boundary */}
                    <div className="absolute -left-1.5 -top-[3.5px] w-2.5 h-2.5 rounded-full bg-red-500 border border-white shadow-[0_0_8px_#ef4444]" />
                  </div>

                  {/* Render Schedule Blocks across designated columns */}
                  {scheduleBlocks.map((block) => {
                    // Match app name to app filter column index
                    const colIndex = timelineFilterApps.findIndex(a => a.label === block.appName);
                    if (colIndex === -1) return null;

                    const widthPercent = 100 / 6;
                    const leftPos = colIndex * widthPercent;
                    const topPos = block.startHour * HOUR_HEIGHT;
                    const blockHeight = block.durationHours * HOUR_HEIGHT;

                    const isDimmed = activeFilterApp !== null && activeFilterApp !== block.appName;
                    const isSelected = selectedTimelineBlock?.id === block.id;

                    return (
                      <motion.div
                        key={block.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ 
                          opacity: isDimmed ? 0.3 : 1.0, 
                          scale: isSelected ? 1.04 : 1.0,
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.08)' : 'transparent'
                        }}
                        style={{
                          left: `${leftPos + 1}%`,
                          top: `${topPos}px`,
                          width: `${widthPercent - 2}%`,
                          height: `${blockHeight - 1}px`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTimelineBlock(block);
                        }}
                        className={`absolute rounded-lg p-0.5 cursor-pointer border transition-all select-none group flex flex-col justify-center items-center ${
                          isSelected
                            ? 'border-yellow-400 z-20 shadow-[0_0_12px_rgba(250,204,21,0.3)]'
                            : 'border-white/10 hover:border-white/20 hover:scale-[1.02]'
                        }`}
                      >
                        {/* Custom gamified colored inner capsule exactly as in picture */}
                        <div 
                          className={`w-full h-full rounded-md bg-gradient-to-br ${block.color} flex items-center justify-center opacity-85 transition-opacity group-hover:opacity-100 overflow-hidden relative`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                          {/* Render tiny acronym name label */}
                          <span className="text-[7.5px] font-black text-black tracking-tighter uppercase leading-none font-mono">
                            {block.appName.substring(0, 3)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Floating detail drawer sheet exactly reflecting Picture 1 */}
              <AnimatePresence>
                {selectedTimelineBlock && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    className="mt-3.5 bg-[#0e1223] border border-zinc-800 rounded-2xl p-4 shadow-xl relative z-10 flex flex-col select-none"
                  >
                    {/* Small dot details with title and close CTA button */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Glowing radial colored dot */}
                        <div className={`w-3.5 h-3.5 rounded-full bg-gradient-to-tr ${selectedTimelineBlock.color} shadow-lg ring-2 ring-white/10`} />
                        <h3 className="text-sm font-black text-white font-display">
                          {selectedTimelineBlock.appName}
                        </h3>
                      </div>
                      
                      <button 
                        onClick={() => setSelectedTimelineBlock(null)}
                        className="w-5 h-5 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Clock range line and precise duration tag pill (Picture 1) */}
                    <div className="mt-4.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Clock className="w-4 h-4 text-zinc-500" />
                        <span className="text-xs font-mono font-bold">
                          {selectedTimelineBlock.timeRange}
                        </span>
                      </div>

                      {/* Pill Tag exactly matching Picture 1 */}
                      <div className="px-3.5 py-1 rounded-full bg-[#1e131d]/60 border border-red-500/25 text-[#ff3a40] text-[10px] font-black uppercase tracking-tight shadow-md">
                        {selectedTimelineBlock.durationMin}min
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>


          </div>
        ) : (
          
          /* ================= SOFT LIMITS CARD SETS ================= */
          <div className="flex flex-col gap-4 flex-1">
            
            <div className="bg-[#101524]/40 border border-[#1b2238]/40 rounded-2xl p-4 flex flex-col z-20 shadow-lg">
              <span className="text-[9px] font-mono tracking-widest text-cyan-400 uppercase flex items-center gap-1.5 mb-3.5 font-bold">
                <Bell className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
                Daily App Limits
              </span>

              {/* Selector Limit addition box */}
              <div className="relative mb-4">
                <button
                  id="dropdown-app-limits"
                  onClick={() => setShowAppSelector(!showAppSelector)}
                  className="w-full flex items-center justify-between bg-[#13192a] hover:bg-zinc-900 border border-zinc-800/80 rounded-xl px-3.5 py-3 text-left text-zinc-400 text-xs transition-colors cursor-pointer select-none"
                >
                  <span className="text-[11px] font-medium text-zinc-300">Select an app to set limit...</span>
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                </button>

                <AnimatePresence>
                  {showAppSelector && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute left-0 right-0 top-[110%] bg-[#0e1322] border border-zinc-800 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.8)] z-30 max-h-[175px] overflow-y-auto overflow-x-hidden p-1.5 scrollbar-none"
                    >
                      {AVAILABLE_APPS.map((app) => {
                        const hasLimit = appLimits.some((l) => l.name === app.name);
                        return (
                          <button
                            key={app.name}
                            onClick={() => {
                              if (!hasLimit) {
                                  const newLimit: AppLimit = {
                                    id: Math.random().toString(),
                                    name: app.name,
                                    limitHours: 2,
                                    usedHours: parseFloat(app.defaultTime),
                                    category: 'Entertainment',
                                    color: app.color,
                                  };
                                  setAppLimits([...appLimits, newLimit]);
                              }
                              setShowAppSelector(false);
                            }}
                            className={`w-full flex items-center justify-between text-left rounded-xl px-3 py-2 text-xs transition-all ${
                              hasLimit 
                                ? 'opacity-40 bg-transparent text-zinc-600' 
                                : 'hover:bg-zinc-900 text-zinc-200 hover:pl-4'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${app.color}`} />
                              <span>{app.name}</span>
                            </div>
                            <span className="text-[10px] text-zinc-500 font-bold">Add Limit</span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Progress Indicator limit lists */}
              <div className="flex flex-col gap-3.5 max-h-[290px] overflow-y-auto scrollbar-none pb-2">
                {appLimits.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-[11px]">
                    No soft limits configured. Custom usage unmonitored.
                  </div>
                ) : (
                  appLimits.map((appLimit) => {
                    const ratio = appLimit.usedHours / appLimit.limitHours;
                    const isExceeded = ratio >= 1.0;
                    
                    let progressBg = 'bg-[#00c6ff]';
                    if (isExceeded) progressBg = 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]';
                    else if (ratio >= 0.70) progressBg = 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.25)]';
                    
                    return (
                      <div key={appLimit.id} className="flex flex-col gap-1.5 select-none">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-tr ${appLimit.color}`} />
                            <span className="text-[11px] font-extrabold text-zinc-200">{appLimit.name}</span>
                            {isExceeded && (
                              <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 px-1 py-0.2 rounded font-bold uppercase animate-pulse">
                                OVER LIMIT ⚠️
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-black text-white">{appLimit.limitHours}h</span>
                            <button
                              onClick={() => openEditLimitModal(appLimit)}
                              className="w-5 h-5 rounded hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-cyan-400 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setAppLimits(appLimits.filter(l => l.id !== appLimit.id))}
                              className="w-5 h-5 rounded hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-red-400 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="relative w-full h-2 bg-zinc-950/80 border border-zinc-900 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(ratio * 100, 100)}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={`h-full rounded-full ${progressBg}`}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono">
                          <span>{appLimit.usedHours.toFixed(1)}h used</span>
                          <span>
                            {isExceeded 
                              ? '0.0h left' 
                              : `${(appLimit.limitHours - appLimit.usedHours).toFixed(1)}h left`
                            }
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="text-center text-[10px] text-zinc-500 font-mono mt-auto py-1.5">
              🔔 Notifications will trigger when daily app usage exceeds soft limits.
            </div>

          </div>
        )}
      </div>

      {/* ================= MODAL APPS LIMIT ADJUST sliders ================= */}
      <AnimatePresence>
        {selectedAppLimitToEdit && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="w-full max-w-[290px] bg-[#121625] border border-zinc-800/80 rounded-2xl p-5 shadow-[0_20px_40px_rgba(0,0,0,0.8)]"
            >
              <h3 className="text-xs font-black uppercase text-center tracking-widest text-cyan-400 mb-2">
                Edit App Limit
              </h3>
              
              <div className="text-center mb-5">
                <span className="text-base font-extrabold text-zinc-100">{selectedAppLimitToEdit.name}</span>
                <p className="text-[10px] text-zinc-500 mt-0.5">Adjust daily allowed hours</p>
              </div>

              {/* Slider Adjustment Control */}
              <div className="flex flex-col gap-2 mb-6">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-mono text-zinc-500">1 Hour</span>
                  <span className="text-lg font-mono font-black text-white">{newLimitHours} hrs</span>
                  <span className="text-[10px] font-mono text-zinc-500">12 Hours</span>
                </div>

                <input
                  type="range"
                  min="1"
                  max="12"
                  step="0.5"
                  value={newLimitHours}
                  onChange={(e) => setNewLimitHours(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-zinc-950/90 rounded-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setSelectedAppLimitToEdit(null)}
                  className="py-2 px-3 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-bold rounded-xl active:scale-95 transition-transform"
                >
                  Cancel
                </button>
                <button
                  onClick={saveAppLimitChange}
                  className="py-2 px-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-black text-xs font-extrabold rounded-xl shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  Apply
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= IMMERSIVE REAL-TIME COUNTDOWN TIMER OVERLAY ================= */}
      <AnimatePresence>
        {isFocusing && (
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 bg-[#050811] z-40 flex flex-col p-6 text-center justify-between"
          >
            {/* Elegant Background Sparkle */}
            <div className="absolute top-[30%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-red-600/10 blur-3xl pointer-events-none animate-pulse" />

            <div className="flex items-center justify-between mt-4">
              <span className="text-[9px] font-mono tracking-widest text-[#ff3a40] uppercase flex items-center gap-1 font-bold">
                <Shield className="w-3.5 h-3.5 fill-[#ff3a40]/10" />
                Active Focus Lock
              </span>
              
              <div className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] tracking-widest uppercase font-mono animate-pulse">
                STRICT LOCK ALIVE
              </div>
            </div>

            {/* Huge Ring Timer visualization */}
            <div className="my-auto py-8 relative flex flex-col items-center justify-center">
              {/* Spinning Rings */}
              <div className="relative w-48 h-48 rounded-full border-2 border-zinc-900 flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
                
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="#181e35"
                    strokeWidth="4"
                    fill="transparent"
                  />
                  <motion.circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="#ff3a40"
                    strokeWidth="5"
                    fill="transparent"
                    strokeDasharray="552"
                    animate={{
                      strokeDashoffset: 552 - (552 * focusSecondsLeft) / (activeDuration * 60)
                    }}
                    transition={{ duration: 1, ease: 'linear' }}
                    strokeLinecap="round"
                  />
                </svg>

                <div className="flex flex-col items-center">
                  <span className="text-[#ff3a40] mb-0.5">
                    <Lock className="w-4 h-4 fill-current animate-pulse" />
                  </span>
                  
                  <span className="text-3xl font-mono font-black tracking-tight text-white mb-0.5">
                    {formatTimer(focusSecondsLeft)}
                  </span>
                  
                  <span className="text-[9px] text-zinc-500 font-mono tracking-wider uppercase">
                    remaining
                  </span>
                </div>
              </div>

              {/* Locked apps visual info */}
              <div className="mt-8 bg-zinc-900/40 border border-zinc-800/40 rounded-xl py-2.5 px-4 max-w-[240px] text-center shadow-lg">
                <span className="text-[9.5px] font-semibold text-zinc-400 flex items-center justify-center gap-1.5">
                  <EyeOff className="w-3.5 h-3.5 text-[#ff6a1d]" />
                  {blockedApps.length === 0 
                    ? 'All system networks secured' 
                    : `${blockedApps.map(a => a.name).join(', ')} Restricted`
                  }
                </span>
              </div>
            </div>

            {/* Cancel Actions */}
            <div className="mb-4 flex flex-col gap-2">
              <span className="text-[9px] text-zinc-600 font-sans">
                Exiting will break your focused screen-time streak.
              </span>
              <button
                id="btn-cancel-focus"
                onClick={() => setIsFocusing(false)}
                className="py-3 bg-zinc-900 hover:bg-zinc-800/80 text-zinc-400 hover:text-white border border-zinc-800 text-xs font-bold rounded-2xl active:scale-95 transition-transform select-none cursor-pointer"
              >
                Interrupt Block
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Focus complete overlays popup */}
      <AnimatePresence>
        {sessionCompleted && (
          <div className="absolute inset-0 bg-[#050811]/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="max-w-[280px] bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-4 animate-bounce">
                <Flame className="w-6 h-6 fill-current" />
              </div>

              <h3 className="text-lg font-black text-white font-display mb-1.5">
                Session Finished!
              </h3>
              <p className="text-[11px] text-zinc-400 leading-normal mb-5.5 font-sans">
                Congratulations! You successfully locked out distractions and completed your <span className="text-emerald-400 font-bold">{activeDuration} min</span> session!
              </p>

              <button
                onClick={() => setSessionCompleted(false)}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-black text-xs font-black rounded-xl active:scale-95 transition-transform shadow-lg cursor-pointer select-none"
              >
                Collect XP ⚡
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
