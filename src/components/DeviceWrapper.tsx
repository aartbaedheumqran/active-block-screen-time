/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface DeviceWrapperProps {
  children: React.ReactNode;
  activeColorTheme: 'red-orange' | 'blue-cyan' | 'purple-pink';
}

export default function DeviceWrapper({ children, activeColorTheme }: DeviceWrapperProps) {
  // Glow gradients matching corresponding tab states
  const getGlowStyles = () => {
    switch (activeColorTheme) {
      case 'red-orange':
        return 'from-orange-600/20 via-red-950/10 to-transparent';
      case 'blue-cyan':
        return 'from-cyan-600/20 via-blue-950/10 to-transparent';
      case 'purple-pink':
        return 'from-purple-600/20 via-fuchsia-950/10 to-transparent';
      default:
        return 'from-blue-600/10 to-transparent';
    }
  };

  return (
    <div className="fixed inset-0 bg-[#050811] text-[#f4f6fa] flex items-center justify-center overflow-hidden font-sans">
      {/* Immersive background noise grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#111625_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />
      
      {/* Dynamic ambient highlights in background for immersive feel */}
      <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[130px] bg-gradient-to-tr transition-all duration-1000 pointer-events-none opacity-40 ${getGlowStyles()}`} />

      {/* Main App Container: Fullscreen on mobile, perfectly centered on desktop to match user design density */}
      <div className="w-full h-full max-w-md bg-[#070b13] shadow-2xl relative flex flex-col overflow-hidden sm:border-x sm:border-zinc-900/80">
        <div className="w-full h-full overflow-hidden relative flex flex-col pt-3 pb-safe">
          {children}
        </div>
      </div>
    </div>
  );
}

