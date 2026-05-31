'use client';

import React, { useState } from 'react';
import { AppMode } from '@/types';

interface HeroProps {
  mode: AppMode;
  onSearch: (query: string) => void;
  onSurpriseMe: (options?: any) => void;
}

const Hero: React.FC<HeroProps> = ({ mode, onSearch, onSurpriseMe }) => {
  const [query, setQuery] = useState('');
  const [timeRange, setTimeRange] = useState('90-120');
  const [seriesFilter, setSeriesFilter] = useState({ seasons: '1', eps: '<10' });

  const getHeroContent = () => {
    switch (mode) {
      case 'wishlist':
        return { title: 'YOUR', title2: 'COLLECTION', sub: 'Your saved items' };
      case 'recommendations':
        return { title: 'AI', title2: 'RECOMMENDATIONS', sub: 'Smart analysis' };
      case 'moods':
        return { title: 'SELECT', title2: 'YOUR MOOD', sub: 'Mood Night Packages' };
      case 'series':
        return { title: 'EXPLORE', title2: 'TV SHOWS', sub: 'Binge-worthy series' };
      case 'games':
        return { title: 'EXPLORE', title2: 'GAMING', sub: 'Massive database' };
      case 'music':
        return { title: 'DISCOVER', title2: 'RHYTHM', sub: 'Millions of songs' };
      case 'books':
        return { title: 'DISCOVER', title2: 'LITERATURE', sub: 'Millions of books' };
      default:
        return { title: 'EXPLORE', title2: 'CINEMA', sub: 'Millions of movies · Search · Discover' };
    }
  };

  const { title, title2, sub } = getHeroContent();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query);
  };

  const showSearch = !['wishlist', 'recommendations', 'moods'].includes(mode);
  const showSurprise = ['movies', 'series'].includes(mode);

  return (
    <div className="px-4 md:px-12 py-12 md:py-24 text-center">
      <div className="font-bebas text-[clamp(2.5rem,10vw,7rem)] leading-[0.9] tracking-[0.06em] mb-2">
        {title}<br />
        <span className="text-transparent" style={{ WebkitTextStroke: '1.5px var(--color-accent)' }}>{title2}</span>
      </div>
      <p className="text-muted text-[0.7rem] md:text-sm font-light tracking-[0.12em] uppercase mb-6 md:mb-9 px-4">
        {sub}
      </p>

      {showSearch && (
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row max-w-[620px] mx-auto mb-10 gap-2 sm:gap-0 px-4 sm:px-0">
          <input 
            type="text" 
            className="flex-1 bg-surface border border-white/10 sm:border-r-0 text-text-custom font-dm text-sm md:text-base px-5 py-3 md:px-6 md:py-4 outline-none rounded-md sm:rounded-l-[2px] sm:rounded-r-none focus:border-accent transition-colors placeholder:text-muted"
            placeholder={`Search ${mode}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button 
            type="submit"
            className="bg-accent border-none text-bg font-bebas text-base md:text-lg tracking-widest px-6 py-3 md:px-8 md:py-4 cursor-pointer rounded-md sm:rounded-r-[2px] sm:rounded-l-none transition-colors hover:bg-[#f5c85a]"
          >
            SEARCH
          </button>
        </form>
      )}

      {showSurprise && (
        <div className="mt-8 flex justify-center px-4">
          <div className="bg-surface p-4 md:p-6 rounded-xl border border-white/10 max-w-[400px] w-full">
            {mode === 'movies' ? (
              <>
                <p className="text-xs md:text-sm mb-3 text-muted font-medium">Short on time? <span className="text-accent">{timeRange}</span> min free</p>
                <div className="flex flex-wrap gap-1.5 md:gap-2 mb-5 justify-center">
                  {['45-90', '90-120', '120-150', '150-180'].map((range) => (
                    <button
                      key={range}
                      className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md font-bebas text-xs md:text-sm tracking-wider transition-all duration-200 border ${
                        timeRange === range ? 'bg-accent border-accent text-bg' : 'bg-surface2 border-white/10 text-muted hover:text-text-custom'
                      }`}
                      onClick={() => setTimeRange(range)}
                    >
                      {range === '45-90' ? '⚡ ' : range === '90-120' ? '🎬 ' : range === '120-150' ? '🍿 ' : '🏛️ '}
                      {range}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-left">
                <p className="text-xs md:text-sm mb-3 text-muted font-medium text-center">Ready for a binge? <span className="text-accent">{seriesFilter.seasons} Seasons • {seriesFilter.eps} Eps</span></p>
                
                <div className="mb-4">
                  <label className="block text-[0.6rem] md:text-[0.7rem] text-muted mb-2 tracking-widest text-center uppercase">SEASONS</label>
                  <div className="flex flex-wrap gap-1.5 md:gap-2 justify-center">
                    {['1', '2-3', '4-6', '7+'].map((range) => (
                      <button
                        key={range}
                        className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md font-bebas text-xs md:text-sm tracking-wider transition-all duration-200 border ${
                          seriesFilter.seasons === range ? 'bg-accent border-accent text-bg' : 'bg-surface2 border-white/10 text-muted hover:text-text-custom'
                        }`}
                        onClick={() => setSeriesFilter({ ...seriesFilter, seasons: range })}
                      >
                         {range === '1' ? '🏷️ ' : range === '2-3' ? '📺 ' : range === '4-6' ? '🍿 ' : '🏛️ '}
                         {range}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-[0.6rem] md:text-[0.7rem] text-muted mb-2 tracking-widest text-center uppercase">EPISODES PER SEASON</label>
                  <div className="flex flex-wrap gap-1.5 md:gap-2 justify-center">
                    {['<10', '10-20', '20+'].map((range) => (
                      <button
                        key={range}
                        className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md font-bebas text-xs md:text-sm tracking-wider transition-all duration-200 border ${
                          seriesFilter.eps === range ? 'bg-accent border-accent text-bg' : 'bg-surface2 border-white/10 text-muted hover:text-text-custom'
                        }`}
                        onClick={() => setSeriesFilter({ ...seriesFilter, eps: range })}
                      >
                         {range === '<10' ? '⚡ ' : range === '10-20' ? '🎬 ' : '🍿 '}
                         {range}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <button 
              className="w-full bg-transparent border border-accent text-accent py-2.5 md:py-3 rounded-lg font-bebas text-lg md:text-xl tracking-wider transition-all hover:bg-accent hover:text-bg hover:shadow-[0_0_20px_rgba(232,184,75,0.4)]"
              onClick={() => onSurpriseMe(mode === 'movies' ? { timeRange } : seriesFilter)}
            >
              ✨ SURPRISE ME
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hero;
