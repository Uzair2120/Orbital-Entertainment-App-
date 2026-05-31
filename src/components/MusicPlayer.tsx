'use client';

import React from 'react';
import { Song } from '@/types';

interface MusicPlayerProps {
  song: Song | null;
  isPlaying: boolean;
  onToggle: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ song, isPlaying, onToggle, onClose, isLoading }) => {
  if (!song) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-surface border-t border-accent p-3 md:px-12 z-[500] transition-transform duration-500 backdrop-blur-xl bg-bg/90 ${song ? 'translate-y-0' : 'translate-y-full'}`}>
      <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-8">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <img 
            src={song.artworkUrl100?.replace('100x100bb', '200x200bb')} 
            alt={song.trackName}
            className="w-12 h-12 rounded-md border border-white/10 object-cover flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="font-bebas text-lg tracking-wider text-text-custom truncate">
              {song.trackName}
            </div>
            <div className="text-muted text-xs truncate">
              {song.artistName}
            </div>
          </div>
        </div>

        <div className="hidden md:flex flex-1 items-center justify-center gap-1 h-8">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i}
              className={`w-1 bg-accent rounded-full transition-all duration-500 ${isPlaying ? 'animate-music-bar' : 'h-1.5 opacity-30'}`}
              style={{ 
                animationDelay: `${i * 0.1}s`,
                height: isPlaying ? '100%' : '6px'
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={onToggle}
            disabled={isLoading}
            className={`w-10 h-10 flex items-center justify-center bg-accent text-bg rounded-full hover:scale-110 transition-transform flex-shrink-0 ${isLoading ? 'opacity-80' : ''}`}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
            ) : (
              isPlaying ? '⏸' : '▶'
            )}
          </button>
          <button 
            onClick={onClose}
            className="text-muted hover:text-text-custom p-1 flex-shrink-0"
          >
            ✕
          </button>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes music-bar {
          0%, 100% { transform: scaleY(0.2); }
          50% { transform: scaleY(1); }
        }
        .animate-music-bar {
          animation: music-bar 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default MusicPlayer;
