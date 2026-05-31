'use client';

import React from 'react';
import { Movie, Series, Game, Song, Book } from '@/types';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Movie | Series | Game | Song | Book | null;
  type: 'movies' | 'series' | 'games' | 'music' | 'books';
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPlayMusic?: (song: Song) => void;
  isMusicPlaying?: boolean;
  playingSongId?: number;
  isAudioLoading?: boolean;
}

const DetailModal: React.FC<DetailModalProps> = ({ 
  isOpen, onClose, item, type = 'movies', isFavorite, onToggleFavorite, 
  onPlayMusic, isMusicPlaying, playingSongId, isAudioLoading 
}) => {
  if (!isOpen || !item) return null;

  const getBackdrop = () => {
    const safeType = type || 'movies';
    switch (safeType) {
      case 'movies':
      case 'series':
        const m = item as Movie | Series;
        const path = m.backdrop_path || m.poster_path;
        return path ? (path.startsWith('http') ? path : `https://image.tmdb.org/t/p/w1280${path}`) : null;
      case 'games':
        return (item as Game).background_image;
      case 'music':
        const s = item as Song;
        return s.artworkUrl100 ? s.artworkUrl100.replace('100x100bb', '1000x1000bb') : null;
      case 'books':
        const b = item as Book;
        return b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-L.jpg` : null;
      default: return null;
    }
  };

  const getPoster = () => {
    const safeType = type || 'movies';
    switch (safeType) {
      case 'movies':
      case 'series':
        const m = item as Movie | Series;
        const path = m.poster_path;
        return path ? (path.startsWith('http') ? path : `https://image.tmdb.org/t/p/w500${path}`) : null;
      case 'games':
        return (item as Game).background_image;
      case 'music':
        const s = item as Song;
        return s.artworkUrl100 ? s.artworkUrl100.replace('100x100bb', '600x600bb') : null;
      case 'books':
        const b = item as Book;
        return b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-L.jpg` : null;
      default: return null;
    }
  };

  const getDescription = () => {
    let desc = '';
    const safeType = type || 'movies';
    if (safeType === 'movies' || safeType === 'series') desc = (item as Movie).overview;
    else if (safeType === 'games') desc = (item as Game).description_raw || '';
    else if (safeType === 'books') {
      const b = item as Book;
      desc = typeof b.description === 'string' ? b.description : (b.description as any)?.value || '';
    } else if (safeType === 'music') {
      const s = item as Song;
      desc = `Experience "${s.trackName}" by the legendary artist ${s.artistName}. This track is part of the album "${s.collectionName || 'Single'}" and is categorized under ${s.primaryGenreName || 'Music'}. Released in ${s.releaseDate?.slice?.(0, 4) || 'N/A'}, it remains a standout piece in their discography.`;
    }

    if (!desc || desc.length < 5) {
      const typeName = typeof safeType === 'string' ? safeType.slice(0, -1) : 'item';
      return `Detailed information for this ${typeName} is currently being updated in our vault. Stay tuned for a full cinematic breakdown and historical context of this masterpiece. Currently rated at ${(item as any).vote_average?.toFixed(1) || (item as any).rating?.toFixed(1) || 'N/A'}/10 by the global community.`;
    }
    return desc;
  };

  const formatCurrency = (val?: number) => {
    if (!val) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  const formatRuntime = (mins?: number) => {
    if (!mins) return 'N/A';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const backdrop = getBackdrop();
  const poster = getPoster();
  const description = getDescription();

  const renderStats = () => {
    if (type === 'movies') {
      const m = item as Movie;
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 border-y border-white/5 py-6">
          <div className="flex flex-col gap-1"><span className="text-[0.65rem] text-muted font-bold tracking-widest uppercase">Runtime</span><span className="text-sm text-text-custom font-medium">{formatRuntime(m.runtime)}</span></div>
          <div className="flex flex-col gap-1"><span className="text-[0.65rem] text-muted font-bold tracking-widest uppercase">Budget</span><span className="text-sm text-text-custom font-medium">{formatCurrency(m.budget)}</span></div>
          <div className="flex flex-col gap-1"><span className="text-[0.65rem] text-muted font-bold tracking-widest uppercase">Revenue</span><span className="text-sm text-text-custom font-medium">{formatCurrency(m.revenue)}</span></div>
          <div className="flex flex-col gap-1"><span className="text-[0.65rem] text-muted font-bold tracking-widest uppercase">Status</span><span className="text-sm text-accent font-medium">{m.status || 'N/A'}</span></div>
          <div className="flex flex-col gap-1 col-span-2"><span className="text-[0.65rem] text-muted font-bold tracking-widest uppercase">Studio</span><span className="text-sm text-text-custom font-medium truncate">{m.production_companies?.[0]?.name || 'N/A'}</span></div>
        </div>
      );
    }
    if (type === 'series') {
      const s = item as Series;
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 border-y border-white/5 py-6">
          <div className="flex flex-col gap-1"><span className="text-[0.65rem] text-muted font-bold tracking-widest uppercase">Seasons</span><span className="text-sm text-text-custom font-medium">{s.number_of_seasons || 'N/A'}</span></div>
          <div className="flex flex-col gap-1"><span className="text-[0.65rem] text-muted font-bold tracking-widest uppercase">Episodes</span><span className="text-sm text-text-custom font-medium">{s.number_of_episodes || 'N/A'}</span></div>
          <div className="flex flex-col gap-1"><span className="text-[0.65rem] text-muted font-bold tracking-widest uppercase">Status</span><span className="text-sm text-accent font-medium">{s.status || 'N/A'}</span></div>
          <div className="flex flex-col gap-1 col-span-2"><span className="text-[0.65rem] text-muted font-bold tracking-widest uppercase">Network</span><span className="text-sm text-text-custom font-medium truncate">{s.networks?.[0]?.name || 'N/A'}</span></div>
        </div>
      );
    }
    if (type === 'games') {
      const g = item as Game;
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 border-y border-white/5 py-6">
          <div className="flex flex-col gap-1"><span className="text-[0.65rem] text-muted font-bold tracking-widest uppercase">Metacritic</span><span className={`text-sm font-bold ${g.metacritic && g.metacritic > 75 ? 'text-green-500' : 'text-accent'}`}>{g.metacritic || 'N/A'}</span></div>
          <div className="flex flex-col gap-1"><span className="text-[0.65rem] text-muted font-bold tracking-widest uppercase">Playtime</span><span className="text-sm text-text-custom font-medium">{g.playtime ? `${g.playtime}h` : 'N/A'}</span></div>
          <div className="flex flex-col gap-1"><span className="text-[0.65rem] text-muted font-bold tracking-widest uppercase">Developer</span><span className="text-sm text-text-custom font-medium truncate">{g.developers?.[0]?.name || 'N/A'}</span></div>
          <div className="flex flex-col gap-1 col-span-full"><span className="text-[0.65rem] text-muted font-bold tracking-widest uppercase">Platforms</span><div className="flex flex-wrap gap-2 mt-1">{g.platforms?.slice?.(0, 4).map(p => (<span key={p.platform.id} className="text-[0.7rem] bg-surface2 px-2 py-0.5 rounded border border-white/5">{p.platform.name}</span>))}</div></div>
        </div>
      );
    }
    if (type === 'music') {
      const s = item as Song;
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 border-y border-white/5 py-6">
          <div className="flex flex-col gap-1"><span className="text-[0.65rem] text-muted font-bold tracking-widest uppercase">Duration</span><span className="text-sm text-text-custom font-medium">{formatRuntime(s.trackTimeMillis ? Math.floor(s.trackTimeMillis / 60000) : 0)}</span></div>
          <div className="flex flex-col gap-1"><span className="text-[0.65rem] text-muted font-bold tracking-widest uppercase">Price</span><span className="text-sm text-accent font-medium">{s.collectionPrice ? `$${s.collectionPrice}` : 'FREE'}</span></div>
          <div className="flex flex-col gap-1 col-span-2"><span className="text-[0.65rem] text-muted font-bold tracking-widest uppercase">Album</span><span className="text-sm text-text-custom font-medium truncate">{s.collectionName || 'Single'}</span></div>
        </div>
      );
    }
    if (type === 'books') {
      const b = item as Book;
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 border-y border-white/5 py-6">
          <div className="flex flex-col gap-1"><span className="text-[0.65rem] text-muted font-bold tracking-widest uppercase">Pages</span><span className="text-sm text-text-custom font-medium">{b.number_of_pages_median || 'N/A'}</span></div>
          <div className="flex flex-col gap-1"><span className="text-[0.65rem] text-muted font-bold tracking-widest uppercase">Language</span><span className="text-sm text-text-custom font-medium uppercase">{b.language?.[0] || 'EN'}</span></div>
          <div className="flex flex-col gap-1 col-span-2"><span className="text-[0.65rem] text-muted font-bold tracking-widest uppercase">Publisher</span><span className="text-sm text-text-custom font-medium truncate">{b.publisher?.[0] || 'N/A'}</span></div>
        </div>
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-[20px] z-[1000] flex items-center justify-center p-3 sm:p-5 pointer-events-auto animate-in fade-in duration-300">
      <div className="bg-surface border border-white/10 rounded-[30px] max-w-[950px] w-full max-h-[92vh] overflow-y-auto relative shadow-[0_40px_100px_rgba(0,0,0,0.8)] no-scrollbar">
        <button className="absolute top-6 right-6 bg-black/50 border border-white/10 text-white w-10 h-10 rounded-full cursor-pointer text-base md:text-xl flex items-center justify-center z-[110] transition-all hover:bg-accent2 hover:border-accent2 hover:rotate-90" onClick={onClose}>✕</button>

        <div className="relative h-64 md:h-[400px] bg-bg overflow-hidden">
          {backdrop ? (
            <img src={backdrop} className="w-full h-full object-cover object-[center_20%] opacity-50 scale-105" alt="Backdrop" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-surface2 to-bg flex items-center justify-center text-7xl md:text-9xl opacity-20 uppercase font-bebas">{type}</div>
          )}
          <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
        </div>

        <div className="px-6 md:px-12 pb-12 flex flex-col md:flex-row gap-8 md:gap-12 relative">
          <div className="w-full md:w-[240px] flex justify-center md:block shrink-0 -mt-32 md:-mt-48 z-10">
            {poster ? (
              <img src={poster} className="w-[180px] md:w-full rounded-2xl border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.7)] aspect-[2/3] object-cover bg-surface2 transition-transform duration-500 hover:scale-[1.02]" alt="Poster" />
            ) : (
              <div className="w-[180px] md:w-full aspect-[2/3] bg-surface2 rounded-2xl border border-white/10 flex items-center justify-center text-4xl opacity-20">🎬</div>
            )}
          </div>
          
          <div className="flex-1 min-w-0 md:pt-4">
            <div className="flex flex-wrap gap-2 mb-5 justify-center md:justify-start">
              {(item as any).genres?.map((g: any) => (
                <span key={g.id} className="px-3 py-1 bg-accent/10 border border-accent/20 text-accent text-[0.65rem] font-bold tracking-widest uppercase rounded-full">{g.name}</span>
              ))}
            </div>

            <h2 className="font-bebas text-[clamp(2.2rem,6vw,4rem)] tracking-wider leading-[0.9] mb-4 text-text-custom text-center md:text-left uppercase">
              {type === 'movies' ? (item as Movie).title : type === 'series' ? (item as Series).name : type === 'games' ? (item as Game).name : type === 'music' ? (item as Song).trackName : (item as Book).title}
            </h2>

            <div className="flex flex-wrap gap-5 mb-8 justify-center md:justify-start">
              <div className="flex items-center gap-2"><span className="text-accent text-xl">★</span><span className="text-lg text-text-custom font-bold">{(item as any).vote_average?.toFixed(1) || (item as any).rating?.toFixed(1) || 'N/A'}</span></div>
              <div className="flex items-center gap-2 border-l border-white/10 pl-5">
                <span className="text-muted text-[0.7rem] font-bold tracking-widest uppercase">Release</span>
                <span className="text-sm text-text-custom font-medium">
                  {type === 'movies' ? (item as Movie).release_date?.slice?.(0, 4) : type === 'series' ? (item as Series).first_air_date?.slice?.(0, 4) : type === 'games' ? (item as Game).released?.slice?.(0, 4) : (item as any).first_publish_year || 'N/A'}
                </span>
              </div>
            </div>

            <p className="text-[0.9rem] md:text-base leading-relaxed text-[#b8b8c5] font-normal mb-8 text-center md:text-left">
              {description}
            </p>

            {renderStats()}

            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              {type === 'music' && (
                <button 
                  className={`flex-1 px-8 py-4 rounded-2xl font-bebas text-lg md:text-xl tracking-widest bg-accent text-bg border-none transition-all hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(232,184,75,0.3)] flex items-center justify-center gap-3 ${isAudioLoading ? 'opacity-80' : ''}`}
                  onClick={() => onPlayMusic?.(item as Song)}
                  disabled={isAudioLoading}
                >
                  {isAudioLoading ? <div className="w-5 h-5 border-2 border-bg/30 border-t-bg rounded-full animate-spin" /> : (isMusicPlaying && (item as Song).trackId === playingSongId ? '⏸ PAUSE PREVIEW' : '▶ PLAY PREVIEW')}
                </button>
              )}
              {type === 'games' && (item as Game).website && (<a href={(item as Game).website} target="_blank" rel="noopener noreferrer" className="flex-1 px-8 py-4 rounded-2xl font-bebas text-lg md:text-xl tracking-widest bg-white/5 border border-white/10 text-white text-center transition-all hover:bg-white/10 hover:-translate-y-1">🌐 VISIT WEBSITE</a>)}
              <button className={`flex-1 px-8 py-4 rounded-2xl font-bebas text-lg md:text-xl tracking-widest border transition-all hover:-translate-y-1 hover:shadow-lg ${isFavorite ? 'bg-accent2 border-accent2 text-white' : 'bg-surface2 border-white/10 text-text-custom'}`} onClick={onToggleFavorite}>{isFavorite ? '❤️ REMOVE FROM VAULT' : '🤍 ADD TO WISHLIST'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailModal;
