'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { AppMode, Movie, Series, Game, Song, Book } from '@/types';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Tabs from '@/components/Tabs';
import Card from '@/components/Card';
import DetailModal from '@/components/DetailModal';
import AuthModal from '@/components/AuthModal';
import Chatbot from '@/components/Chatbot';
import ProfilePage from '@/components/ProfilePage';
import MoodPackage from '@/components/MoodPackage';
import MusicPlayer from '@/components/MusicPlayer';
import WatchParty from '@/components/WatchParty';
import ToastProvider, { ToastMessage } from '@/components/Toast';

const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TOKEN = process.env.NEXT_PUBLIC_TMDB_TOKEN;
const BASE_MOVIE = 'https://api.themoviedb.org/3';
const BASE_MUSIC = 'https://itunes.apple.com/search';
const BASE_BOOK  = 'https://openlibrary.org/search.json';
const BASE_GAME  = 'https://api.rawg.io/api';
const RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY;

const movieCats = {
  trending:   { url: '/trending/movie/day',  label: 'TRENDING TODAY' },
  popular:    { url: '/movie/popular',        label: 'POPULAR MOVIES' },
  top_rated:  { url: '/movie/top_rated',      label: 'TOP RATED' },
  upcoming:   { url: '/movie/upcoming',       label: 'UPCOMING' }
};

const seriesCats = {
  trending:   { url: '/trending/tv/day',     label: 'TRENDING SERIES' },
  popular:    { url: '/tv/popular',           label: 'POPULAR SERIES' },
  top_rated:  { url: '/tv/top_rated',         label: 'TOP RATED' },
  upcoming:   { url: '/tv/on_the_air',        label: 'ON THE AIR' }
};

const gameCats = {
  trending:   { url: '/games/lists/main',    label: 'TRENDING GAMES' },
  popular:    { url: '/games',               label: 'POPULAR GAMES' },
  top_rated:  { url: '/games?ordering=-metacritic', label: 'TOP RATED' }
};

const musicCats = {
  trending:   { term: 'trending', label: 'TRENDING MUSIC' },
  pop:        { term: 'pop',      label: 'POP' },
  rock:       { term: 'rock',     label: 'ROCK' },
  hiphop:     { term: 'hiphop',   label: 'HIP HOP' }
};

const bookCats = {
  fiction:    { term: 'fiction',  label: 'FICTION' },
  mystery:    { term: 'mystery',  label: 'MYSTERY' },
  fantasy:    { term: 'fantasy',  label: 'FANTASY' }
};

const wishlistCats = {
  movies: { label: 'FAVORITE MOVIES', localType: 'movies' },
  series: { label: 'FAVORITE SERIES', localType: 'series' },
  games:  { label: 'FAVORITE GAMES',  localType: 'games' },
  music:  { label: 'FAVORITE MUSIC',  localType: 'music' },
  books:  { label: 'FAVORITE BOOKS',  localType: 'books' },
};

const recommendationCats = {
  movies: { label: 'MOVIE RECS',    isRec: true, recType: 'movies' },
  series: { label: 'SERIES RECS',   isRec: true, recType: 'series' },
  games:  { label: 'GAME RECS',     isRec: true, recType: 'games' },
  music:  { label: 'MUSIC RECS',    isRec: true, recType: 'music' },
  books:  { label: 'BOOK RECS',     isRec: true, recType: 'books' }
};

const moodCats = {
  adventurous: { label: 'ADVENTUROUS', movie: 12, music: 'rock', book: 'adventure' },
  sad:         { label: 'SAD',         movie: 18, music: 'soul', book: 'tragedy' },
  romantic:    { label: 'ROMANTIC',    movie: 10749, music: 'love songs', book: 'romance' },
  thriller:    { label: 'THRILLER',    movie: 53, music: 'dark ambient', book: 'mystery' },
  chill:       { label: 'CHILL',       movie: 35, music: 'lofi', book: 'fiction' }
};

export default function Home() {
  const [mode, setMode] = useState<AppMode>('movies');
  const [cat, setCat] = useState('trending');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState('');
  const [user, setUser] = useState<any>(null);
  const [favorites, setFavorites] = useState<any>({ movies: [], series: [], games: [], music: [], books: [] });
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [moodPackage, setMoodPackage] = useState<any>(null);
  const [sharedItems, setSharedItems] = useState<any[] | null>(null);
  const [isPartyOpen, setIsPartyOpen] = useState(false);
  const [cache, setCache] = useState<Record<string, any>>({});
  const [playingSong, setPlayingSong] = useState<Song | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingPromiseRef = useRef<Promise<void> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const apiFetch = useCallback(async (url: string, options: any = {}) => {
    let finalUrl = url;
    const cleanOptions = { ...options, signal: abortControllerRef.current?.signal };
    
    // Add TMDB API Key if needed
    if (url.includes('api.themoviedb.org')) {
      if (!API_KEY) {
        console.warn('TMDB API Key is missing. Please set NEXT_PUBLIC_TMDB_API_KEY in .env.local');
      }
      finalUrl += (url.includes('?') ? '&' : '?') + `api_key=${API_KEY}`;
      if (cleanOptions.headers?.Authorization) delete cleanOptions.headers.Authorization;
    }

    // iTunes does NOT support CORS. We must use JSONP or a proxy.
    // Since we're in a client component, we can use a JSONP approach for iTunes.
    if (url.includes('itunes.apple.com')) {
      return new Promise((resolve, reject) => {
        const callbackName = `itunes_cb_${Math.random().toString(36).substring(2, 10)}`;
        (window as any)[callbackName] = (data: any) => {
          delete (window as any)[callbackName];
          const script = document.getElementById(callbackName);
          if (script) script.remove();
          resolve(data);
        };

        const script = document.createElement('script');
        script.id = callbackName;
        script.src = `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}callback=${callbackName}`;
        script.onerror = () => {
          delete (window as any)[callbackName];
          script.remove();
          reject(new Error('iTunes JSONP Request Failed'));
        };
        document.body.appendChild(script);

        // Timeout for JSONP
        setTimeout(() => {
          if ((window as any)[callbackName]) {
            delete (window as any)[callbackName];
            script.remove();
            reject(new Error('iTunes Request Timed Out'));
          }
        }, 10000);
      });
    }

    try {
      const r = await fetch(finalUrl, cleanOptions);
      if (!r.ok) {
        const errData = await r.json().catch(() => ({}));
        throw new Error(`API Error: ${r.status} ${errData.status_message || ''}`);
      }
      return r.json();
    } catch (e: any) {
      if (e.name === 'AbortError') return { results: [], docs: [] };
      console.error(`Fetch error for ${url}:`, e);
      // Provide a more helpful error for "Failed to fetch"
      if (e.message === 'Failed to fetch') {
        showToast("Network Error: Could not reach the API. Please check your connection or ad-blocker.", 'error');
      }
      throw e;
    }
  }, [showToast]);

  const syncData = useCallback(async (direction: 'upload' | 'download', currentUser: any, currentFavorites?: any) => {
    if (!currentUser) return;
    try {
      if (direction === 'upload') {
        if (currentFavorites) {
          await supabase.from('profiles').upsert({ id: currentUser.id, favorites: currentFavorites, updated_at: new Date() });
        }
      } else {
        const { data } = await supabase.from('profiles').select('favorites').eq('id', currentUser.id).single();
        if (data?.favorites) {
          setFavorites(data.favorites);
          Object.keys(data.favorites).forEach(type => {
            localStorage.setItem(`cinevault_fav_${type}`, JSON.stringify(data.favorites[type]));
          });
        }
      }
    } catch (e) {
      console.error("Sync error", e);
    }
  }, []);

  const handlePlaySong = async (song: Song) => {
    if (playingSong?.trackId === song.trackId) {
      if (isMusicPlaying) {
        if (playingPromiseRef.current) await playingPromiseRef.current;
        audioRef.current?.pause();
        setIsMusicPlaying(false);
      } else {
        setIsAudioLoading(true);
        const p = audioRef.current?.play();
        if (p) {
          playingPromiseRef.current = p;
          try {
            await p;
            setIsMusicPlaying(true);
          } catch (e) {
            console.error("Playback error", e);
          } finally {
            setIsAudioLoading(false);
          }
        }
      }
      return;
    }

    if (audioRef.current) {
      if (playingPromiseRef.current) {
        try {
          await playingPromiseRef.current;
        } catch (e) {}
      }
      audioRef.current.pause();
    }

    setPlayingSong(song);
    setIsAudioLoading(true);
    const audio = new Audio(song.previewUrl);
    audioRef.current = audio;
    
    const p = audio.play();
    if (p) {
      playingPromiseRef.current = p;
      try {
        await p;
        setIsMusicPlaying(true);
      } catch (e: any) {
        if (e.name !== 'AbortError' && !e.message.includes('interrupted')) {
          console.error("Playback error", e);
        }
      } finally {
        setIsAudioLoading(false);
      }
    }

    audio.onended = () => {
      setIsMusicPlaying(false);
      playingPromiseRef.current = null;
      setIsAudioLoading(false);
    };
  };

  const handleStopSong = async () => {
    if (audioRef.current) {
      if (playingPromiseRef.current) {
        try {
          await playingPromiseRef.current;
        } catch (e) {}
      }
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingSong(null);
    setIsMusicPlaying(false);
    setIsAudioLoading(false);
    playingPromiseRef.current = null;
  };

  const generateShareLink = () => {
    const allFavs: any[] = [];
    ['movies', 'series', 'games', 'music', 'books'].forEach(type => {
      favorites[type].forEach((item: any) => {
        allFavs.push({
          i: item.id || item.trackId || item.key || item.id_book,
          t: type,
          n: item.title || item.name || item.trackName,
          p: item.poster_path || item.background_image || item.artworkUrl100 || item.cover_i
        });
      });
    });

    if (allFavs.length === 0) {
      showToast("Add some items to your wishlist first!", 'info');
      return;
    }

    try {
      const json = JSON.stringify(allFavs);
      const hash = btoa(encodeURIComponent(json)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const url = `${window.location.origin}${window.location.pathname}#match=${hash}`;
      navigator.clipboard.writeText(url).then(() => {
        showToast("Share link copied to clipboard!", 'success');
      });
    } catch (e) {
      console.error("Error generating share link", e);
    }
  };

  useEffect(() => {
    const types = ['movies', 'series', 'games', 'music', 'books'];
    const loadedFavs: any = {};
    types.forEach(type => {
      const val = localStorage.getItem(`cinevault_fav_${type}`);
      try {
        loadedFavs[type] = val ? JSON.parse(val) : [];
      } catch (e) {
        localStorage.removeItem(`cinevault_fav_${type}`);
        loadedFavs[type] = [];
      }
    });
    setFavorites(loadedFavs);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        syncData('download', session.user);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || (event === 'INITIAL_SESSION' && session)) {
        if (session?.user) {
          setUser(session.user);
          syncData('download', session.user);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setFavorites({ movies: [], series: [], games: [], music: [], books: [] });
        localStorage.clear();
      }
    });

    const checkHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#match=')) {
        try {
          let encoded = hash.substring(7).replace(/-/g, '+').replace(/_/g, '/');
          const decoded = decodeURIComponent(atob(encoded));
          const items = JSON.parse(decoded);
          setSharedItems(items);
          setMode('wishlist');
          setCat('movies');
        } catch (e) {
          console.error("Error decoding shared wishlist", e);
        }
      }
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);

    const urlParams = new URLSearchParams(window.location.search);
    let error = urlParams.get('error');
    let errorDescription = urlParams.get('error_description');
    
    if (error || errorDescription) {
      showToast(`Auth Error: ${errorDescription || error}`, 'error');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('hashchange', checkHash);
    };
  }, [syncData]);

  // Comparison Observer
  useEffect(() => {
    if (mode === 'wishlist' && sharedItems) {
      const type = (wishlistCats as any)[cat]?.localType || 'movies';
      const filtered = sharedItems
        .filter((si: any) => si.t === type)
        .map((si: any) => {
          let itemObj: any = {};
          if (si.t === 'movies') itemObj = { id: si.i, title: si.n, poster_path: si.p };
          else if (si.t === 'series') itemObj = { id: si.i, name: si.n, poster_path: si.p };
          else if (si.t === 'games') itemObj = { id: si.i, name: si.n, background_image: si.p };
          else if (si.t === 'music') itemObj = { trackId: si.i, trackName: si.n, artworkUrl100: si.p };
          else if (si.t === 'books') itemObj = { key: si.i, title: si.n, cover_i: si.p };
          return { ...itemObj, isShared: true };
        });
      setItems(filtered);
    }
  }, [favorites, sharedItems, mode, cat]);

  const fetchContent = useCallback(async (reset = false) => {
    if (loading && !reset) return;
    setLoading(true);
    if (reset) { setPage(1); setItems([]); }

    try {
      if (mode === 'wishlist') {
        if (!sharedItems) {
          const type = (wishlistCats as any)[cat]?.localType || 'movies';
          setItems(favorites[type] || []);
        }
        setTotalPages(1);
      } else if (mode === 'moods') {
        await fetchMoodPackage(cat);
      } else {
        const currentPage = reset ? 1 : page;
        let newItems: any[] = [];
        
        if (query) {
          if (mode === 'movies') {
            const d = await apiFetch(`${BASE_MOVIE}/search/movie?query=${encodeURIComponent(query)}&page=${currentPage}`);
            newItems = d.results || [];
            setTotalPages(d.total_pages || 1);
          } else if (mode === 'series') {
            const d = await apiFetch(`${BASE_MOVIE}/search/tv?query=${encodeURIComponent(query)}&page=${currentPage}`);
            newItems = d.results || [];
            setTotalPages(d.total_pages || 1);
          } else if (mode === 'games') {
            const d = await apiFetch(`${BASE_GAME}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(query)}&page=${currentPage}`);
            newItems = d.results || [];
            setTotalPages(Math.ceil((d.count || 0) / 20));
          } else if (mode === 'music') {
            const d = await apiFetch(`${BASE_MUSIC}?term=${encodeURIComponent(query)}&entity=song&limit=20&offset=${(currentPage - 1) * 20}`);
            newItems = d.results || [];
            setTotalPages(10);
          } else if (mode === 'books') {
            const d = await apiFetch(`${BASE_BOOK}?q=${encodeURIComponent(query)}&page=${currentPage}`);
            newItems = d.docs || [];
            setTotalPages(Math.ceil((d.numFound || 0) / 20));
          }
        } else if (mode === 'movies' || mode === 'series') {
          const info = (mode === 'movies' ? (movieCats as any) : (seriesCats as any))[cat];
          const d = await apiFetch(`${BASE_MOVIE}${info.url}?page=${currentPage}`);
          newItems = d.results || [];
          setTotalPages(d.total_pages || 1);
        } else if (mode === 'games') {
          const info = (gameCats as any)[cat];
          const d = await apiFetch(`${BASE_GAME}${info.url}${info.url.includes('?') ? '&' : '?'}key=${RAWG_API_KEY}&page=${currentPage}`);
          newItems = d.results || [];
          setTotalPages(Math.ceil((d.count || 0) / 20));
        } else if (mode === 'music' || mode === 'books') {
          const info = (mode === 'music' ? (musicCats as any) : (bookCats as any))[cat];
          const url = mode === 'music' 
            ? `${BASE_MUSIC}?term=${info.term}&entity=song&limit=20&offset=${(currentPage - 1) * 20}`
            : `${BASE_BOOK}?q=${info.term}&page=${currentPage}&fields=key,title,author_name,cover_i,first_publish_year,description,subjects`;
          const d = await apiFetch(url);
          newItems = mode === 'music' ? (d.results || []) : (d.docs || []);
          setTotalPages(mode === 'music' ? 10 : Math.ceil((d.numFound || 0) / 20));
        } else if (mode === 'recommendations') {
          const seedType = (recommendationCats as any)[cat].recType;
          const seed = favorites[seedType][0];
          if (!seed) {
            newItems = [];
            setTotalPages(1);
          } else if (seedType === 'movies') {
            const d = await apiFetch(`${BASE_MOVIE}/movie/${seed.id}/recommendations?page=${currentPage}`);
            newItems = d.results || [];
            setTotalPages(d.total_pages || 1);
          } else if (seedType === 'series') {
            const d = await apiFetch(`${BASE_MOVIE}/tv/${seed.id}/recommendations?page=${currentPage}`);
            newItems = d.results || [];
            setTotalPages(d.total_pages || 1);
          } else if (seedType === 'games') {
            const d = await apiFetch(`${BASE_GAME}/games/${seed.id}/suggested?key=${RAWG_API_KEY}&page=${currentPage}`);
            newItems = d.results || [];
            setTotalPages(Math.ceil((d.count || 0) / 20));
          } else if (seedType === 'music') {
            const d = await apiFetch(`${BASE_MUSIC}?term=${encodeURIComponent(seed.artistName || seed.trackName)}&entity=song&limit=20`);
            newItems = d.results || [];
            setTotalPages(1);
          } else if (seedType === 'books') {
            const url = `${BASE_BOOK}?q=${encodeURIComponent(seed.author_name?.[0] || seed.title)}&page=${currentPage}&fields=key,title,author_name,cover_i,first_publish_year,description,subjects`;
            const d = await apiFetch(url);
            newItems = d.docs || [];
            setTotalPages(Math.ceil((d.numFound || 0) / 20));
          }
        }

        newItems = newItems || [];
        setItems(prev => {
          const combined = reset ? newItems : [...prev, ...newItems];
          // Use a Map to ensure uniqueness by ID
          const uniqueMap = new Map();
          combined.forEach(item => {
            const id = String(item.id || item.trackId || item.key || item.id_book);
            if (!uniqueMap.has(id)) uniqueMap.set(id, item);
          });
          return Array.from(uniqueMap.values());
        });
        setPage(currentPage + 1);
      }
    } catch (e) {
      console.error("Fetch error", e);
    } finally {
      setLoading(false);
    }
  }, [mode, cat, query, favorites, sharedItems, apiFetch, page, loading]);

  const fetchMoodPackage = useCallback(async (currentCat: string) => {
    setLoading(true);
    try {
      const config = (moodCats as any)[currentCat];
      const movieRes = await apiFetch(`${BASE_MOVIE}/discover/movie?with_genres=${config.movie}&sort_by=popularity.desc`);
      const musicRes = await apiFetch(`${BASE_MUSIC}?term=${config.music}&entity=song&limit=10`);
      const bookRes = await apiFetch(`${BASE_BOOK}?q=${config.book}&limit=10&fields=key,title,author_name,cover_i,first_publish_year,description,subjects`);
      const movie = movieRes.results[Math.floor(Math.random() * Math.min(10, movieRes.results.length))];
      const song = musicRes.results[Math.floor(Math.random() * Math.min(10, musicRes.results.length))];
      const book = bookRes.docs[Math.floor(Math.random() * Math.min(10, bookRes.docs.length))];
      setMoodPackage({ movie, song, book });
    } catch (e) { console.error("Mood error", e); } finally { setLoading(false); }
  }, [apiFetch]);

  useEffect(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    fetchContent(true);
  }, [mode, cat, query]);

  const handleModeChange = (newMode: AppMode) => {
    if (newMode !== 'wishlist' && mode !== 'wishlist') setSharedItems(null);
    setMode(newMode);
    setQuery('');
    setMoodPackage(null);
    const cats = newMode === 'movies' ? movieCats : newMode === 'series' ? seriesCats : newMode === 'games' ? gameCats : newMode === 'music' ? musicCats : newMode === 'books' ? bookCats : newMode === 'wishlist' ? wishlistCats : newMode === 'recommendations' ? recommendationCats : moodCats;
    setCat(Object.keys(cats)[0]);
  };

  const handleSearch = (q: string) => {
    setQuery(q);
  };

  const handleSurpriseMe = (options: any) => {
    showToast("Looking for something special...", 'info');
    fetchContent(true);
  };

  const isFavorite = (id: string, type: string) => {
    const list = favorites[type];
    if (!list) return false;
    return !!list.find((item: any) => String(item.id || item.trackId || item.id_book || item.key) === String(id));
  };

  const toggleFavorite = async (id: string, type: string) => {
    if (!user) { setAuthMode('signin'); setIsAuthModalOpen(true); return; }
    const sid = String(id);
    setFavorites((prev: any) => {
      const list = [...prev[type]];
      const idx = list.findIndex((item: any) => String(item.id || item.trackId || item.id_book || item.key) === sid);
      if (idx > -1) {
        list.splice(idx, 1);
      } else {
        let item = cache[sid];
        if (!item && mode === 'wishlist' && sharedItems) {
          const sharedMatch = sharedItems.find((si: any) => String(si.i) === sid && si.t === type);
          if (sharedMatch) {
            if (type === 'movies') item = { id: sharedMatch.i, title: sharedMatch.n, poster_path: sharedMatch.p };
            else if (type === 'series') item = { id: sharedMatch.i, name: sharedMatch.n, poster_path: sharedMatch.p };
            else if (type === 'games') item = { id: sharedMatch.i, name: sharedMatch.n, background_image: sharedMatch.p };
            else if (type === 'music') item = { trackId: sharedMatch.i, trackName: sharedMatch.n, artworkUrl100: sharedMatch.p };
            else if (type === 'books') item = { key: sharedMatch.i, title: sharedMatch.n, cover_i: sharedMatch.p };
          }
        }
        if (item) list.push(item);
      }
      const updated = { ...prev, [type]: list };
      localStorage.setItem(`cinevault_fav_${type}`, JSON.stringify(list));
      syncData('upload', user, updated);
      return updated;
    });
  };

  const openDetailModal = async (id: string, type?: string) => {
    const sid = String(id);
    let item = cache[sid];
    if (!item) return;

    // Use currentType or the type passed to get actual media type
    const mediaType = type || getActualType(item, currentType);
    
    setIsAudioLoading(true); // Reuse loading state for detail fetch
    try {
      if (mediaType === 'movies') {
        const full = await apiFetch(`${BASE_MOVIE}/movie/${id}`);
        item = { ...item, ...full };
      } else if (mediaType === 'series') {
        const full = await apiFetch(`${BASE_MOVIE}/tv/${id}`);
        item = { ...item, ...full };
      } else if (mediaType === 'games') {
        const full = await apiFetch(`${BASE_GAME}/games/${id}?key=${RAWG_API_KEY}`);
        item = { ...item, ...full };
      } else if (mediaType === 'books') {
        // OpenLibrary works often need another fetch for full description
        const workId = sid.startsWith('/works/') ? sid : `/works/${sid}`;
        const full = await apiFetch(`https://openlibrary.org${workId}.json`);
        item = { ...item, ...full };
      }
      
      setSelectedItem({ ...item, type: mediaType });
      setIsDetailModalOpen(true);
    } catch (e) {
      console.error("Error fetching details", e);
      // Fallback to basic cached item if fetch fails
      setSelectedItem({ ...item, type: mediaType });
      setIsDetailModalOpen(true);
    } finally {
      setIsAudioLoading(false);
    }
  };

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading && page <= totalPages && mode !== 'wishlist' && mode !== 'moods') {
        fetchContent();
      }
    }, { rootMargin: '500px' });
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loading, page, totalPages, fetchContent, mode]);

  const tabs = Object.entries(
    mode === 'movies' ? movieCats : mode === 'series' ? seriesCats : mode === 'games' ? gameCats : mode === 'music' ? musicCats : mode === 'books' ? bookCats : mode === 'wishlist' ? wishlistCats : mode === 'recommendations' ? recommendationCats : moodCats
  ).map(([id, info]) => ({ id, label: (info as any).label }));

  const currentType = mode === 'wishlist' 
    ? (wishlistCats as any)[cat]?.localType || 'movies' 
    : mode === 'recommendations' ? (recommendationCats as any)[cat]?.recType || 'movies' : mode === 'moods' ? cat : mode;

  const getActualType = (item: any, fallbackMode: string) => {
    if (fallbackMode !== 'moods' && fallbackMode !== 'recommendations' && fallbackMode !== 'wishlist') return fallbackMode;
    if (item.title && item.release_date !== undefined) return 'movies';
    if (item.name && item.first_air_date !== undefined) return 'series';
    if (item.background_image) return 'games';
    if (item.trackName) return 'music';
    if (item.cover_i || item.id_book) return 'books';
    return fallbackMode;
  };

  useEffect(() => {
    items.forEach(item => {
      const id = String(item.id || item.trackId || item.key || item.id_book);
      if (!cache[id]) setCache(prev => ({ ...prev, [id]: item }));
    });
  }, [items, cache]);

  return (
    <div className="min-h-screen bg-bg text-text-custom font-dm selection:bg-accent/30">
      <Header currentMode={mode} onModeChange={handleModeChange} onAuthOpen={() => { setAuthMode('signin'); setIsAuthModalOpen(true); }} user={user} onProfileOpen={() => setMode('profile')} />
      <main className="relative pt-6">
        {mode === 'profile' ? (
          <div className="px-6 md:px-12">
            <div className="py-18 text-center animate-in fade-in slide-in-from-top-4 duration-700">
              <h1 className="font-bebas text-[clamp(3rem,8vw,7rem)] leading-[0.9] tracking-[0.06em] mb-2 uppercase">USER <span className="text-transparent" style={{ WebkitTextStroke: '2px var(--color-accent)' }}>PROFILE</span></h1>
              <p className="text-muted text-[0.9rem] font-light tracking-[0.12em] uppercase mb-9">Manage your vault and identity</p>
            </div>
            <ProfilePage user={user} favorites={favorites} onSignOut={async () => { await supabase.auth.signOut(); handleModeChange('movies'); }} onUpdateUser={setUser} showToast={showToast} />
          </div>
        ) : (
          <>
            <Hero mode={mode} onSearch={handleSearch} onSurpriseMe={handleSurpriseMe} />
            <Tabs tabs={tabs} activeTab={cat} onTabChange={setCat} />
            <div className="px-6 md:px-12 pb-16">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pt-4">
                <div className="flex items-baseline gap-3.5">
                  <h2 className="font-bebas text-[1.7rem] tracking-[0.08em] uppercase">{sharedItems ? 'SHARED WISHLIST' : (query ? `SEARCH: ${query}` : (tabs.find(t => t.id === cat)?.label || 'RESULTS'))}</h2>
                  {items.length > 0 && mode !== 'moods' && <span className="text-muted text-[0.8rem] font-light">{items.length} items shown</span>}
                </div>

                <div className="flex flex-wrap gap-3 md:ml-auto">
                  {mode === 'wishlist' && !sharedItems && (
                    <>
                      <button onClick={generateShareLink} className="px-4 py-2 bg-surface2 border border-white/10 text-text-custom font-bebas text-[0.9rem] tracking-wider rounded-[4px] transition-all hover:bg-accent hover:text-bg flex items-center gap-2">🔗 SHARE WISHLIST</button>
                      <button onClick={() => setIsPartyOpen(true)} className="px-4 py-2 bg-surface2 border border-white/10 text-text-custom font-bebas text-[0.9rem] tracking-wider rounded-[4px] transition-all hover:bg-accent2 hover:text-white flex items-center gap-2">🎉 WATCH PARTY</button>
                    </>
                  )}

                  {sharedItems && (
                     <button onClick={() => { setSharedItems(null); handleModeChange('movies'); }} className="px-4 py-2 bg-accent2 text-white font-bebas text-[0.9rem] tracking-wider rounded-[4px] transition-all hover:scale-105">✕ CLEAR SHARED VIEW</button>
                  )}
                </div>
              </div>

              {mode === 'moods' && moodPackage ? (
                <MoodPackage {...moodPackage} onRegenerate={() => fetchMoodPackage(cat)} isFavorite={isFavorite} onToggleFavorite={toggleFavorite} onOpenModal={openDetailModal} onPlayMusic={handlePlaySong} isPlaying={isMusicPlaying && playingSong?.trackId === moodPackage.song.trackId} isAudioLoading={isAudioLoading && playingSong?.trackId === moodPackage.song.trackId} />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-[12px] md:gap-[18px]">
                  {sharedItems && mode === 'wishlist' ? (
                    <>
                      {/* MATCHED */}
                      {items.filter(item => isFavorite(String(item.id || item.trackId || item.key || item.id_book), getActualType(item, currentType))).length > 0 && (
                        <div className="col-span-full mb-6 mt-2"><h3 className="font-bebas text-2xl text-accent flex items-center gap-3">✨ PERFECT MATCHES</h3><div className="h-px bg-accent/20 w-full mt-2"></div></div>
                      )}
                      {items.filter(item => isFavorite(String(item.id || item.trackId || item.key || item.id_book), getActualType(item, currentType))).map((item, idx) => (
                        <Card key={`m-${idx}`} item={item} type={getActualType(item, currentType) as any} isFavorite={true} isShared={true} onToggleFavorite={(e) => { e.stopPropagation(); toggleFavorite(String(item.id || item.trackId || item.key || item.id_book), getActualType(item, currentType)); }} onClick={() => openDetailModal(String(item.id || item.trackId || item.key || item.id_book))} onPlayMusic={handlePlaySong} isPlaying={isMusicPlaying && playingSong?.trackId === (item as Song).trackId} isAudioLoading={isAudioLoading && playingSong?.trackId === (item as Song).trackId} />
                      ))}
                      {/* UNIQUE */}
                      {items.filter(item => !isFavorite(String(item.id || item.trackId || item.key || item.id_book), getActualType(item, currentType))).length > 0 && (
                        <div className="col-span-full mb-6 mt-10"><h3 className="font-bebas text-2xl text-muted flex items-center gap-3">👤 UNIQUE TO THEM</h3><div className="h-px bg-white/10 w-full mt-2"></div></div>
                      )}
                      {items.filter(item => !isFavorite(String(item.id || item.trackId || item.key || item.id_book), getActualType(item, currentType))).map((item, idx) => (
                        <Card key={`u-${idx}`} item={item} type={getActualType(item, currentType) as any} isFavorite={false} isShared={true} onToggleFavorite={(e) => { e.stopPropagation(); toggleFavorite(String(item.id || item.trackId || item.key || item.id_book), getActualType(item, currentType)); }} onClick={() => openDetailModal(String(item.id || item.trackId || item.key || item.id_book))} onPlayMusic={handlePlaySong} isPlaying={isMusicPlaying && playingSong?.trackId === (item as Song).trackId} isAudioLoading={isAudioLoading && playingSong?.trackId === (item as Song).trackId} />
                      ))}
                    </>
                  ) : (
                    items.map((item, idx) => (
                      <Card key={idx} item={item} type={getActualType(item, currentType) as any} isFavorite={isFavorite(String(item.id || item.trackId || item.key || item.id_book), getActualType(item, currentType))} isShared={!!item.isShared} onToggleFavorite={(e) => { e.stopPropagation(); toggleFavorite(String(item.id || item.trackId || item.key || item.id_book), getActualType(item, currentType)); }} onClick={() => openDetailModal(String(item.id || item.trackId || item.key || item.id_book))} onPlayMusic={handlePlaySong} isPlaying={isMusicPlaying && playingSong?.trackId === (item as Song).trackId} isAudioLoading={isAudioLoading && playingSong?.trackId === (item as Song).trackId} />
                    ))
                  )}
                </div>
              )}
              {loading && <div className="flex flex-col items-center justify-center py-20 text-muted gap-3.5"><div className="w-10 h-10 border-2 border-accent/20 border-t-accent rounded-full animate-spin" /><p className="font-bebas tracking-widest text-lg">ACCESSING VAULT...</p></div>}
              <div ref={sentinelRef} className="h-10 w-full" />
            </div>
          </>
        )}
      </main>

      <DetailModal 
        isOpen={isDetailModalOpen} 
        onClose={() => setIsDetailModalOpen(false)} 
        item={selectedItem} 
        type={selectedItem?.type || currentType || 'movies'}
        isFavorite={selectedItem ? isFavorite(String(selectedItem.id || selectedItem.trackId || selectedItem.key || selectedItem.id_book), getActualType(selectedItem, currentType)) : false} 
        onToggleFavorite={() => selectedItem && toggleFavorite(String(selectedItem.id || selectedItem.trackId || selectedItem.key || selectedItem.id_book), getActualType(selectedItem, currentType))} 
        onPlayMusic={handlePlaySong} 
        isMusicPlaying={isMusicPlaying} 
        playingSongId={playingSong?.trackId} 
        isAudioLoading={isAudioLoading} 
      />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} mode={authMode} onModeToggle={setAuthMode} showToast={showToast} />
      <Chatbot favorites={favorites} />
      <MusicPlayer song={playingSong} isPlaying={isMusicPlaying} onToggle={() => playingSong && handlePlaySong(playingSong)} onClose={handleStopSong} isLoading={isAudioLoading} />
      <WatchParty isOpen={isPartyOpen} onClose={() => setIsPartyOpen(false)} user={user} showToast={showToast} />
      <ToastProvider toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
