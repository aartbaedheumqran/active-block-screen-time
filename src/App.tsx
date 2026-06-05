/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Home, LogOut, Users, Target, Shield } from 'lucide-react';
import DeviceWrapper from './components/DeviceWrapper';
import HomeTab from './components/HomeTab';
import FocusTab from './components/FocusTab';
import GroupTab from './components/GroupTab';
import AuthScreen from './components/AuthScreen';
import { useActiveBlockBackend } from './hooks/useActiveBlockBackend';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { AppTab, FocusSubMode } from './types';

type AuthGateState = 'loading' | 'authenticated' | 'unauthenticated';

export default function App() {
  const backend = useActiveBlockBackend();

  const [authState, setAuthState] = useState<AuthGateState>('loading');
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<AppTab>('focus');
  const [focusSubMode, setFocusSubMode] = useState<FocusSubMode>('active_block');
  const [activeDuration, setActiveDurationState] = useState<number>(25);
  const [isFocusing, setIsFocusingState] = useState<boolean>(false);
  const [focusSecondsLeft, setFocusSecondsLeft] = useState<number>(25 * 60);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // ─── Auth gate ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthState('authenticated');
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setAuthState('authenticated');
        loadAvatarUrl(data.session.user.id);
      } else {
        setAuthState('unauthenticated');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuthState('authenticated');
        loadAvatarUrl(session.user.id);
      } else {
        setAuthState('unauthenticated');
        setUserAvatarUrl(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadAvatarUrl = async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .maybeSingle();
    if (data?.avatar_url) setUserAvatarUrl(data.avatar_url);
  };

  const handleAuthenticated = useCallback(
    (_userId: string, _displayName: string, avatarUrl: string | null) => {
      setUserAvatarUrl(avatarUrl);
      setAuthState('authenticated');
    },
    [],
  );

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setAuthState('unauthenticated');
    setShowSignOutConfirm(false);
  };

  // ─── App logic ────────────────────────────────────────────────────────────
  const setActiveDuration = (duration: number) => {
    setActiveDurationState(duration);
    backend.setActiveDuration(duration);
  };

  const setIsFocusing = (focus: boolean) => {
    setIsFocusingState(focus);
    backend.setIsFocusing(focus);
  };

  const getColorThemeForWrapper = (): 'red-orange' | 'blue-cyan' | 'purple-pink' => {
    if (activeTab === 'home') return 'blue-cyan';
    if (activeTab === 'group') return 'purple-pink';
    return focusSubMode === 'active_block' ? 'red-orange' : 'blue-cyan';
  };

  const handleQuickNavigate = (tab: 'focus' | 'group') => {
    setActiveTab(tab);
  };

  // ─── Loading splash ───────────────────────────────────────────────────────
  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-[#060810] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00c6ff] to-[#0072ff] flex items-center justify-center animate-pulse">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <p className="text-zinc-500 text-xs animate-pulse">Loading Active Block…</p>
        </div>
      </div>
    );
  }

  // ─── Auth screen ──────────────────────────────────────────────────────────
  if (authState === 'unauthenticated') {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  // ─── Main app ─────────────────────────────────────────────────────────────
  return (
    <DeviceWrapper activeColorTheme={getColorThemeForWrapper()}>
      {/* Sign-out button — top right corner */}
      {isSupabaseConfigured && (
        <div className="absolute top-3 right-4 z-50">
          {showSignOutConfirm ? (
            <div className="flex items-center gap-1.5 bg-zinc-900/95 border border-zinc-700 rounded-xl px-2.5 py-1.5 shadow-xl">
              <span className="text-zinc-400 text-[10px]">Sign out?</span>
              <button
                onClick={handleSignOut}
                className="text-red-400 text-[10px] font-bold hover:text-red-300 transition"
              >
                Yes
              </button>
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="text-zinc-500 text-[10px] hover:text-zinc-300 transition"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSignOutConfirm(true)}
              className="w-7 h-7 rounded-full bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center hover:bg-zinc-700 transition"
              title="Sign out"
            >
              {userAvatarUrl ? (
                <img
                  src={userAvatarUrl}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                  onError={() => setUserAvatarUrl(null)}
                />
              ) : (
                <LogOut className="w-3.5 h-3.5 text-zinc-400" />
              )}
            </button>
          )}
        </div>
      )}

      <div className="flex-1 relative w-full h-full overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home-screen"
              className="absolute inset-0 flex flex-col"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
            >
              <HomeTab
                onNavigate={handleQuickNavigate}
                accountability={backend.homeState}
                appLimits={backend.appLimits}
                squadFriends={backend.squadFriends}
                onAddSafeDay={backend.runSafeDay}
                onResetStack={backend.resetStack}
                onSimulateCrash={backend.runCrashDay}
              />
            </motion.div>
          )}

          {activeTab === 'focus' && (
            <motion.div
              key="focus-screen"
              className="absolute inset-0 flex flex-col"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
            >
              <FocusTab
                subMode={focusSubMode}
                setSubMode={setFocusSubMode}
                blockedApps={backend.blockedApps}
                setBlockedApps={backend.setBlockedApps}
                appLimits={backend.appLimits}
                setAppLimits={backend.setAppLimits}
                activeDuration={activeDuration}
                setActiveDuration={setActiveDuration}
                isFocusing={isFocusing}
                setIsFocusing={setIsFocusing}
                focusSecondsLeft={focusSecondsLeft}
                setFocusSecondsLeft={setFocusSecondsLeft}
              />
            </motion.div>
          )}

          {activeTab === 'group' && (
            <motion.div
              key="group-screen"
              className="absolute inset-0 flex flex-col"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
            >
              <GroupTab
                squadFriends={backend.squadFriends}
                setSquadFriends={backend.setSquadFriends}
                dailyGoalHours={backend.dailyGoalHours}
                setDailyGoalHours={backend.setDailyGoalHours}
                challengeDurationDays={backend.challengeDurationDays}
                setChallengeDurationDays={backend.setChallengeDurationDays}
                isChallengeStarted={backend.isChallengeStarted}
                setIsChallengeStarted={backend.setIsChallengeStarted}
                inviteCode={backend.inviteCode}
                setInviteCode={backend.setInviteCode}
                onGenerateInviteCode={backend.generateInviteCode}
                onStartChallenge={backend.startChallenge}
                onStopChallenge={backend.endChallenge}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isFocusing && activeTab !== 'focus' && (
        <div
          onClick={() => setActiveTab('focus')}
          className="absolute top-12 left-4 right-4 bg-red-600 text-white text-[10px] font-mono px-4 py-2.5 rounded-xl border border-red-500 shadow-lg flex items-center justify-between z-40 animate-bounce cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 fill-white/10 animate-pulse" />
            <span className="font-bold">Focus countdown ACTIVE</span>
          </div>
          <span className="bg-black/25 px-2 py-0.5 rounded font-black">TAP TO RETURN</span>
        </div>
      )}

      <nav className="bg-[#0b0e1a]/95 backdrop-blur-md border-t border-zinc-900/60 pb-5 pt-3.5 px-6 z-30 select-none">
        <div className="flex items-center justify-between max-w-sm mx-auto relative">
          <button
            id="nav-home"
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1.5 flex-1 relative transition-colors duration-300 pointer-events-auto cursor-pointer ${
              activeTab === 'home' ? 'text-white font-extrabold' : 'text-zinc-500 hover:text-zinc-400'
            }`}
          >
            {activeTab === 'home' && (
              <span className="absolute -top-1 w-1 h-1 rounded-full bg-[#00c6ff] shadow-[0_0_8px_rgba(0,198,255,1)]" />
            )}
            <Home className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Home</span>
          </button>

          <button
            id="nav-group"
            onClick={() => setActiveTab('group')}
            className={`flex flex-col items-center gap-1.5 flex-1 relative transition-colors duration-300 pointer-events-auto cursor-pointer ${
              activeTab === 'group' ? 'text-white font-extrabold' : 'text-zinc-500 hover:text-zinc-400'
            }`}
          >
            {activeTab === 'group' && (
              <span className="absolute -top-1 w-1 h-1 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,1)]" />
            )}
            <Users className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Group</span>
          </button>

          <button
            id="nav-focus"
            onClick={() => setActiveTab('focus')}
            className={`flex flex-col items-center gap-1.5 flex-1 relative transition-colors duration-300 pointer-events-auto cursor-pointer ${
              activeTab === 'focus' ? 'text-white font-extrabold' : 'text-zinc-500 hover:text-zinc-400'
            }`}
          >
            {activeTab === 'focus' && (
              <span className="absolute -top-1 w-1 h-1 rounded-full bg-[#ff3a40] shadow-[0_0_8px_rgba(255,58,64,1)]" />
            )}
            <Target className={`w-5 h-5 ${isFocusing ? 'animate-spin' : ''}`} />
            <span className="text-[10px] tracking-tight">Focus</span>
          </button>
        </div>
      </nav>
    </DeviceWrapper>
  );
}
