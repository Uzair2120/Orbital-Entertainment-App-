'use client';

import React from 'react';
import Card from './Card';
import { Movie, Song, Book } from '@/types';

interface MoodPackageProps {
  movie: Movie;
  song: Song;
  book: Book;
  onRegenerate: () => void;
  isFavorite: (id: string, type: string) => boolean;
  onToggleFavorite: (id: string, type: any) => void;
  onOpenModal: (id: string, type: any) => void;
  onPlayMusic?: (song: Song) => void;
  isPlaying?: boolean;
}

const MoodPackage: React.FC<MoodPackageProps> = ({ movie, song, book, onRegenerate, isFavorite, onToggleFavorite, onOpenModal, onPlayMusic, isPlaying }) => {
  return (
    <div className="max-w-[1000px] mx-auto py-5 animate-in fade-in slide-in-from-bottom-4 duration-600 px-4 md:px-0">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bebas text-accent mb-2.5 uppercase">YOUR MOOD NIGHT PACKAGE</h2>
        <p className="text-muted text-sm md:text-base px-6">A curated cinematic vibe for your mood.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        <div className="bg-surface p-5 rounded-lg border border-white/10 transition-all hover:border-accent hover:shadow-[0_12px_30px_rgba(0,0,0,0.4)]">
          <div className="text-center font-bebas text-lg tracking-widest text-muted mb-4 pb-2.5 border-b border-white/10 uppercase">🎬 MOVIE</div>
          <Card 
            item={movie} 
            type="movies" 
            isFavorite={isFavorite(String(movie.id), 'movies')} 
            onToggleFavorite={(e) => { e.stopPropagation(); onToggleFavorite(String(movie.id), 'movies'); }} 
            onClick={() => onOpenModal(String(movie.id), 'movies')} 
          />
        </div>

        <div className="bg-surface p-5 rounded-lg border border-white/10 transition-all hover:border-accent hover:shadow-[0_12px_30px_rgba(0,0,0,0.4)]">
          <div className="text-center font-bebas text-lg tracking-widest text-muted mb-4 pb-2.5 border-b border-white/10 uppercase">🎵 MUSIC</div>
          <Card 
            item={song} 
            type="music" 
            isFavorite={isFavorite(String(song.trackId), 'music')} 
            onToggleFavorite={(e) => { e.stopPropagation(); onToggleFavorite(String(song.trackId), 'music'); }} 
            onClick={() => onOpenModal(String(song.trackId), 'music')} 
            onPlayMusic={onPlayMusic}
            isPlaying={isPlaying}
          />
        </div>

        <div className="bg-surface p-5 rounded-lg border border-white/10 transition-all hover:border-accent hover:shadow-[0_12px_30px_rgba(0,0,0,0.4)]">
          <div className="text-center font-bebas text-lg tracking-widest text-muted mb-4 pb-2.5 border-b border-white/10 uppercase">📚 BOOK</div>
          <Card 
            item={book} 
            type="books" 
            isFavorite={isFavorite(book.key, 'books')} 
            onToggleFavorite={(e) => { e.stopPropagation(); onToggleFavorite(book.key, 'books'); }} 
            onClick={() => onOpenModal(book.key, 'books')} 
          />
        </div>
      </div>

      <div className="mt-10 text-center">
        <button 
          className="bg-accent text-bg font-bebas text-lg tracking-widest px-8 py-3 rounded-md transition-all hover:bg-[#f5c85a] hover:-translate-y-0.5"
          onClick={onRegenerate}
        >
          🎲 REGENERATE
        </button>
      </div>
    </div>
  );
};

export default MoodPackage;
