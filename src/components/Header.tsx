'use client';

import React, { useState } from 'react';
import { AppMode } from '@/types';

interface HeaderProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  onAuthOpen: () => void;
  user: any;
  onProfileOpen: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentMode, onModeChange, onAuthOpen, user, onProfileOpen }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const modes: { id: AppMode; label: string; icon: string; protected?: boolean }[] = [
    { id: 'movies', label: 'MOVIES', icon: '🎬' },
    { id: 'series', label: 'SERIES', icon: '📺' },
    { id: 'games', label: 'GAMES', icon: '🎮' },
    { id: 'music', label: 'MUSIC', icon: '🎵' },
    { id: 'books', label: 'BOOKS', icon: '📚' },
    { id: 'moods', label: 'MOODS', icon: '🎭' },
    { id: 'wishlist', label: 'WISHLIST', icon: '⭐', protected: true },
    { id: 'recommendations', label: 'RECOMMENDATIONS', icon: '✨', protected: true },
  ];

  const handleModeClick = (id: AppMode) => {
    onModeChange(id);
    setIsMenuOpen(false);
  };

  return (
    <>
      <header className="flex items-center px-4 md:px-12 py-4 md:py-6 border-b border-white/10 sticky top-0 z-[100] backdrop-blur-xl bg-bg/80">
        {/* HAMBURGER - Only Mobile, Tablet, & Laptop (Hidden on XL and up) */}
        <button 
          className="xl:hidden mr-3 text-2xl text-text-custom p-1 hover:text-accent transition-colors"
          onClick={() => setIsMenuOpen(true)}
        >
          ☰
        </button>

        <div 
          className="font-bebas text-2xl md:text-3xl tracking-[0.12em] text-accent cursor-pointer select-none shrink-0"
          onClick={() => onModeChange('movies')}
        >
          ORBIT<span className="text-text-custom">AL</span>
        </div>
        
        {/* DESKTOP NAV - Hidden on screens smaller than 1280px (xl) */}
        <div className="hidden xl:flex ml-auto bg-surface p-1 rounded-sm border border-white/10 overflow-x-auto no-scrollbar max-w-full">
          {modes.map((mode) => (
            (!mode.protected || user) && (
              <button
                key={mode.id}
                className={`whitespace-nowrap px-4 py-2 font-bebas text-sm tracking-widest rounded-[2px] transition-all duration-200 ${
                  currentMode === mode.id 
                    ? 'bg-surface2 text-accent' 
                    : 'bg-transparent text-muted hover:text-text-custom'
                }`}
                onClick={() => onModeChange(mode.id)}
              >
                <span className="mr-1.5">{mode.icon}</span>
                <span>{mode.label}</span>
              </button>
            )
          ))}
        </div>

        <div className="ml-auto lg:ml-5 flex items-center shrink-0">
          {user ? (
            <div 
              className="cursor-pointer"
              onClick={onProfileOpen}
            >
              {(user.user_metadata?.custom_avatar || user.user_metadata?.avatar_url || user.user_metadata?.picture) ? (
              <img 
                src={user.user_metadata?.custom_avatar || user.user_metadata?.avatar_url || user.user_metadata?.picture} 
                alt="Avatar"
                className="w-8 h-8 md:w-9 md:h-9 rounded-full border-2 border-accent object-cover transition-transform hover:scale-110"
              />
            ) : (
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full border-2 border-accent bg-surface2 flex items-center justify-center text-[0.6rem] md:text-xs font-bold text-accent transition-transform hover:scale-110">
                {user.email?.substring(0, 2).toUpperCase() || '??'}
              </div>
            )}
            </div>
          ) : (

            <button 
              className="px-4 md:px-7 py-2 md:py-3 rounded-md font-bebas text-sm md:text-lg tracking-wider border border-white/10 bg-surface2 text-text-custom transition-all hover:-translate-y-1 hover:shadow-lg hover:bg-surface2/80"
              onClick={onAuthOpen}
            >
              SIGN IN
            </button>
          )}
        </div>
      </header>

      {/* MOBILE MENU OVERLAY */}
      <div className={`fixed inset-0 z-[2000] bg-black/95 backdrop-blur-xl transition-all duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto translate-x-0' : 'opacity-0 pointer-events-none -translate-x-full'}`}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex justify-between items-center mb-12">
            <div className="font-bebas text-3xl tracking-[0.12em] text-accent">ORBITAL MENU</div>
            <button className="text-3xl text-white p-2 hover:rotate-90 transition-transform" onClick={() => setIsMenuOpen(false)}>✕</button>
          </div>
          
          <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
            {modes.map((mode) => (
              (!mode.protected || user) && (
                <button
                  key={mode.id}
                  className={`flex items-center gap-5 px-6 py-5 rounded-2xl font-bebas text-2xl tracking-[0.12em] transition-all active:scale-95 ${
                    currentMode === mode.id 
                      ? 'bg-accent text-bg shadow-[0_0_30px_rgba(232,184,75,0.3)]' 
                      : 'bg-white/5 text-text-custom border border-white/5 hover:bg-white/10'
                  }`}
                  onClick={() => handleModeClick(mode.id)}
                >
                  <span className="text-3xl">{mode.icon}</span>
                  {mode.label}
                </button>
              )
            ))}
          </div>
          
          <div className="mt-auto pt-8 border-t border-white/10 text-center">
             <p className="text-muted text-[0.8rem] font-dm tracking-[0.2em] uppercase">Your Entertainment Vault</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
