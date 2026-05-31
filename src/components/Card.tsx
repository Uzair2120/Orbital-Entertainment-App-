'use client';

import React from 'react';
import { Movie, Series, Game, Song, Book } from '@/types';

type CardItem = Movie | Series | Game | Song | Book;

interface CardProps {
  item: CardItem;
  type: 'movies' | 'series' | 'games' | 'music' | 'books';
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onClick: () => void;
  streamingSources?: any[];
  onPlayMusic?: (song: Song) => void;
  isPlaying?: boolean;
  isAudioLoading?: boolean;
  isShared?: boolean;
}

const Card: React.FC<CardProps> = ({ item, type, isFavorite, onToggleFavorite, onClick, streamingSources, onPlayMusic, isPlaying, isAudioLoading, isShared }) => {
  const getPoster = () => {
    switch (type) {
      case 'movies':
      case 'series':
        const m = item as Movie | Series;
        return m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : null;
      case 'games':
        return (item as Game).background_image;
      case 'music':
        const s = item as Song;
        return s.artworkUrl100 ? s.artworkUrl100.replace('100x100bb', '400x400bb') : null;
      case 'books':
        const b = item as Book;
        return b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null;
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'movies': return (item as Movie).title;
      case 'series': return (item as Series).name;
      case 'games': return (item as Game).name;
      case 'music': return (item as Song).trackName;
      case 'books': return (item as Book).title;
    }
  };

  const getSub = () => {
    switch (type) {
      case 'movies': return (item as Movie).release_date?.slice(0, 4) || '—';
      case 'series': return (item as Series).first_air_date?.slice(0, 4) || '—';
      case 'games': return (item as Game).released?.slice(0, 4) || '—';
      case 'music': return (item as Song).artistName;
      case 'books': return '';
    }
  };

  const getRating = () => {
    switch (type) {
      case 'movies': return (item as Movie).vote_average?.toFixed(1);
      case 'series': return (item as Series).vote_average?.toFixed(1);
      case 'games': return (item as Game).rating?.toFixed(1);
      default: return null;
    }
  };

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (type !== 'music' || !onPlayMusic) return;
    onPlayMusic(item as Song);
  };

  const poster = getPoster();
  const rating = getRating();

  const getPlatformIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('netflix')) return 'https://www.google.com/s2/favicons?domain=netflix.com&sz=128';
    if (n.includes('prime video')) return 'https://www.google.com/s2/favicons?domain=primevideo.com&sz=128';
    if (n.includes('disney')) return 'https://www.google.com/s2/favicons?domain=disneyplus.com&sz=128';
    if (n.includes('apple tv')) return 'https://www.google.com/s2/favicons?domain=tv.apple.com&sz=128';
    if (n.includes('google play')) return 'https://www.google.com/s2/favicons?domain=play.google.com&sz=128';
    if (n.includes('hbo') || n.includes('max')) return 'https://www.google.com/s2/favicons?domain=max.com&sz=128';
    if (n.includes('hulu')) return 'https://www.google.com/s2/favicons?domain=hulu.com&sz=128';
    if (n.includes('paramount')) return 'https://www.google.com/s2/favicons?domain=paramountplus.com&sz=128';
    if (n.includes('peacock')) return 'https://www.google.com/s2/favicons?domain=peacocktv.com&sz=128';
    return null;
  };

  return (
    <div 
      className={`group cursor-pointer rounded-sm overflow-hidden bg-surface border transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.015] hover:shadow-[0_18px_40px_rgba(0,0,0,0.4)] animate-in fade-in slide-in-from-bottom-4 duration-350 ${
        isShared && isFavorite 
          ? 'border-accent shadow-[0_0_15px_rgba(232,184,75,0.3)]' 
          : 'border-white/5 hover:border-accent'
      }`}
      onClick={onClick}
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-surface2">
        {poster ? (
          <img 
            src={poster} 
            alt={getTitle()} 
            className="w-full h-full object-cover transition-transform duration-400 group-hover:scale-106" 
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted text-4xl gap-2">
            {type === 'movies' ? '🎬' : type === 'series' ? '📺' : type === 'games' ? '🎮' : type === 'music' ? '🎵' : '📚'}
            <span className="text-[0.72rem] tracking-widest uppercase">No Image</span>
          </div>
        )}

        {/* Comparison Badges */}
        {isShared && (
          <div className="absolute top-2.5 right-12 z-20">
            <div className={`px-2 py-0.5 rounded-[2px] text-[0.6rem] font-bold tracking-widest uppercase shadow-lg ${
              isFavorite ? 'bg-accent text-bg' : 'bg-white/20 text-white backdrop-blur-md border border-white/10'
            }`}>
              {isFavorite ? '✨ MATCHED' : '👤 SHARED'}
            </div>
          </div>
        )}

        {rating && (
          <div className="absolute top-2.5 right-2.5 bg-bg/80 border border-accent text-accent font-bebas text-[0.95rem] px-2 py-0.5 rounded-[2px] backdrop-blur-[4px] z-10">
            ★ {rating}
          </div>
        )}

        <div 
          className={`absolute top-2.5 left-2.5 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer z-10 transition-all duration-200 backdrop-blur-[4px] border border-white/10 ${
            isFavorite ? 'bg-accent2 border-accent2 text-white' : 'bg-bg/80 text-muted hover:border-accent2 hover:text-accent2 hover:scale-110'
          }`}
          onClick={onToggleFavorite}
        >
          ❤
        </div>

        {streamingSources && streamingSources.length > 0 && (
          <div className="absolute bottom-2.5 right-2.5 flex gap-1 z-10">
            {streamingSources.slice(0, 3).map((s, idx) => {
              const icon = getPlatformIcon(s.name);
              return icon ? (
                <img key={idx} src={icon} title={s.name} className="w-5 h-5 rounded-sm bg-black border border-white/10 shadow-lg" alt={s.name} />
              ) : (
                <span key={idx} className="w-5 h-5 bg-surface2 text-accent text-[0.6rem] font-bold flex items-center justify-center rounded-sm border border-white/10">
                  {s.name[0]}
                </span>
              );
            })}
          </div>
        )}

        {type === 'music' && (
          <div className="absolute inset-0 bg-gradient-to-t from-bg/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3.5 gap-2">
             <button 
               className={`w-full py-2 bg-accent text-bg font-bebas text-[0.85rem] tracking-widest rounded-[2px] hover:bg-[#f5c85a] flex items-center justify-center gap-2 ${isAudioLoading ? 'opacity-80' : ''}`}
               onClick={handlePreview}
               disabled={isAudioLoading}
             >
               {isAudioLoading ? (
                 <>
                   <div className="w-3 h-3 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                   LOADING...
                 </>
               ) : (
                 isPlaying ? '⏸ PAUSE PREVIEW' : '▶ PLAY PREVIEW'
               )}
             </button>
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="text-[0.86rem] font-medium leading-[1.3] mb-1 truncate">
          {getTitle()}
        </div>
        <div className="text-[0.73rem] color-muted font-light">
          {getSub()}
        </div>
      </div>
    </div>
  );
};

export default Card;
