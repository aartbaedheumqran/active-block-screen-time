/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Eye, EyeOff, Image, Loader2, LogIn, Shield, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthScreenProps {
  onAuthenticated: (userId: string, displayName: string, avatarUrl: string | null) => void;
}

type AuthMode = 'signin' | 'signup';

const GOOGLE_LOGO = (
  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearError = () => setError(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Profile picture must be under 5 MB.');
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    clearError();
  };

  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile || !supabase) return null;
    const ext = avatarFile.name.split('.').pop() ?? 'jpg';
    const path = `${userId}/avatar.${ext}`;
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
    if (error) {
      console.warn('Avatar upload failed (non-fatal):', error.message);
      return null;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl ?? null;
  };

  const upsertProfile = async (userId: string, name: string, avatarUrl: string | null) => {
    if (!supabase) return;
    const initials = name
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    await supabase.from('profiles').upsert({
      id: userId,
      display_name: name || 'User',
      avatar: initials || 'ME',
      avatar_url: avatarUrl,
      status: 'active',
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      if (!data.user) throw new Error('Sign-in failed, please try again.');
      // Load existing profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', data.user.id)
        .maybeSingle();
      onAuthenticated(
        data.user.id,
        profile?.display_name ?? data.user.email?.split('@')[0] ?? 'User',
        profile?.avatar_url ?? null,
      );
    } catch (err: any) {
      setError(err.message ?? 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (!displayName.trim()) { setError('Please enter a display name.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;
      if (!data.user) throw new Error('Sign-up failed, please try again.');
      const avatarUrl = await uploadAvatar(data.user.id);
      await upsertProfile(data.user.id, displayName.trim(), avatarUrl);
      if (data.session) {
        onAuthenticated(data.user.id, displayName.trim(), avatarUrl);
      } else {
        setSuccessMessage('Account created! Check your email to confirm, then sign in.');
        setMode('signin');
      }
    } catch (err: any) {
      setError(err.message ?? 'Sign up failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!supabase) return;
    setGoogleLoading(true);
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (oauthError) throw oauthError;
      // Browser will redirect; no further action needed here
    } catch (err: any) {
      setError(err.message ?? 'Google sign in failed.');
      setGoogleLoading(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    setError(null);
    setSuccessMessage(null);
  };

  const isSignUp = mode === 'signup';

  return (
    <div className="min-h-screen bg-[#060810] flex items-center justify-center px-4 py-8">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-[#00c6ff]/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-600/5 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo + brand */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00c6ff] to-[#0072ff] flex items-center justify-center shadow-[0_0_32px_rgba(0,198,255,0.35)]">
            <Shield className="w-7 h-7 text-white fill-white/20" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-white tracking-tight">Active Block</h1>
            <p className="text-zinc-500 text-xs mt-0.5">Social screen-time accountability</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/60 rounded-2xl p-6 shadow-2xl">
          {/* Mode toggle */}
          <div className="flex bg-zinc-800/60 rounded-xl p-1 mb-6 gap-1">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); setSuccessMessage(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                !isSignUp ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); setSuccessMessage(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                isSignUp ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Sign Up
            </button>
          </div>

          {/* Success message */}
          {successMessage && (
            <div className="mb-4 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs">
              {successMessage}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            {/* Avatar upload (sign-up only) */}
            {isSignUp && (
              <div className="flex flex-col items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-16 h-16 rounded-full bg-zinc-800 border-2 border-dashed border-zinc-600 hover:border-[#00c6ff]/60 transition-colors overflow-hidden flex items-center justify-center group"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-6 h-6 text-zinc-500 group-hover:text-[#00c6ff] transition-colors" />
                  )}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-[9px] font-bold">CHANGE</span>
                  </div>
                </button>
                <span className="text-zinc-500 text-[10px]">Profile picture (optional)</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            )}

            {/* Display name (sign-up only) */}
            {isSignUp && (
              <div>
                <label className="block text-zinc-400 text-[11px] font-medium mb-1.5 uppercase tracking-wider">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => { setDisplayName(e.target.value); clearError(); }}
                  placeholder="Your name"
                  maxLength={40}
                  required
                  className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#00c6ff]/60 focus:ring-1 focus:ring-[#00c6ff]/20 transition"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-zinc-400 text-[11px] font-medium mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError(); }}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#00c6ff]/60 focus:ring-1 focus:ring-[#00c6ff]/20 transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-zinc-400 text-[11px] font-medium mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  placeholder={isSignUp ? 'At least 6 characters' : '••••••••'}
                  required
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#00c6ff]/60 focus:ring-1 focus:ring-[#00c6ff]/20 transition pr-10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#00c6ff] to-[#0072ff] hover:from-[#00d4ff] hover:to-[#0080ff] text-white font-bold text-sm py-2.5 rounded-xl transition-all shadow-lg shadow-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-zinc-600 text-[10px] uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-white font-semibold text-sm py-2.5 rounded-xl transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : GOOGLE_LOGO}
            Continue with Google
          </button>

          {/* Switch mode */}
          <p className="text-center text-zinc-600 text-[11px] mt-5">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={switchMode}
              className="text-[#00c6ff] hover:text-[#00d4ff] font-semibold transition"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>

        <p className="text-center text-zinc-700 text-[10px] mt-6">
          Your data is private — we only store screen-time totals and group info.
        </p>
      </div>
    </div>
  );
}
