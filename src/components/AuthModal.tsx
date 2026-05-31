'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'signin' | 'signup';
  onModeToggle: (mode: 'signin' | 'signup') => void;
  showToast: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, mode, onModeToggle, showToast }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [backdropUrl, setBackdropUrl] = useState('https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=1000');

  useEffect(() => {
    if (isOpen) {
      fetchBackdrop();
    }
  }, [isOpen]);

  const fetchBackdrop = async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
      const res = await fetch(`https://api.themoviedb.org/3/trending/movie/day?api_key=${apiKey}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const randomMovie = data.results[Math.floor(Math.random() * data.results.length)];
        if (randomMovie.backdrop_path) {
          setBackdropUrl(`https://image.tmdb.org/t/p/w1280${randomMovie.backdrop_path}`);
        }
      }
    } catch (e) {
      console.error("Auth backdrop fetch failed", e);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      let result;
      if (mode === 'signin') {
        result = await supabase.auth.signInWithPassword({ email, password });
      } else {
        result = await supabase.auth.signUp({ email, password });
      }
      
      if (result.error) throw result.error;
      
      if (mode === 'signup' && !result.data.session) {
        showToast("Signup successful! Check your email for verification.", 'success');
      } else if (mode === 'signin') {
        showToast("Welcome back!", 'success');
      }
      onClose();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-[15px] z-[1000] flex items-center justify-center p-5 pointer-events-auto">
      <div className="bg-surface border border-white/10 rounded-xl max-w-[880px] w-full max-h-[90vh] overflow-y-auto relative shadow-[0_30px_60px_rgba(0,0,0,0.8)] flex flex-col md:flex-row overflow-hidden">
        
        <button className="absolute top-5 right-5 bg-black/50 border border-white/10 text-white w-10 h-10 rounded-full cursor-pointer text-xl flex items-center justify-center z-[100] transition-all hover:bg-accent2 hover:border-accent2 hover:rotate-90" onClick={onClose}>✕</button>

        {/* IMAGE SIDE */}
        {backdropUrl && (
          <div 
            className="hidden md:flex flex-[1.2] bg-cover bg-center relative p-10 items-end"
            style={{ backgroundImage: `url('${backdropUrl}')` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-bg/90 to-transparent" />
            <div className="relative z-10 font-dm italic text-lg text-white leading-relaxed">
              "Cinema is a matter of what's in the frame and what's out."
              <span className="block text-sm mt-2.5 font-normal text-accent uppercase tracking-widest">— Martin Scorsese</span>
            </div>
          </div>
        )}

        {/* FORM SIDE */}
        <div className="flex-1 bg-surface p-10 flex flex-col justify-center">
          <div className="w-full max-w-[400px] mx-auto">
            <h2 className="font-bebas text-[2.5rem] text-accent text-left mb-1 leading-tight">{mode === 'signin' ? 'WELCOME BACK' : 'CREATE ACCOUNT'}</h2>
            <p className="text-muted text-sm mb-8 line-height-relaxed">
              {mode === 'signin' ? 'Sign in to sync your wishlist across devices.' : 'Join Orbital to discover and save your favorites.'}
            </p>

            <form className="flex flex-col gap-5" onSubmit={handleAuth}>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-muted font-medium uppercase tracking-wider">EMAIL ADDRESS</label>
                <input 
                  type="email" 
                  className="bg-surface2 border border-white/10 text-text-custom p-3 rounded-lg text-base outline-none focus:border-accent transition-all" 
                  placeholder="name@example.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm text-muted font-medium uppercase tracking-wider">PASSWORD</label>
                <input 
                  type="password" 
                  className="bg-surface2 border border-white/10 text-text-custom p-3 rounded-lg text-base outline-none focus:border-accent transition-all" 
                  placeholder="••••••••" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <button 
                type="submit" 
                className="bg-accent text-bg font-bebas text-lg tracking-widest p-3 rounded-lg mt-2.5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:bg-[#f5c85a] disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'WAITING...' : (mode === 'signin' ? 'SIGN IN' : 'SIGN UP')}
              </button>
            </form>
            
            <div className="flex items-center text-center my-6 text-muted text-[0.7rem] tracking-[0.2em] uppercase gap-2.5">
              <span className="flex-1 border-b border-white/10" />
              <span>OR SOCIAL LOGIN</span>
              <span className="flex-1 border-b border-white/10" />
            </div>
            
            <div className="flex gap-3 mb-6">
              <button 
                type="button" 
                className="flex-1 flex items-center justify-center gap-2.5 bg-surface2 border border-white/10 text-text-custom p-2.5 rounded-lg font-dm text-sm cursor-pointer transition-all hover:bg-surface hover:border-accent hover:-translate-y-0.5"
                onClick={() => handleOAuth('google')}
              >
                <img src="https://www.google.com/s2/favicons?domain=google.com&sz=128" alt="Google" className="w-5 h-5" /> Google
              </button>
              <button 
                type="button" 
                className="flex-1 flex items-center justify-center gap-2.5 bg-surface2 border border-white/10 text-text-custom p-2.5 rounded-lg font-dm text-sm cursor-pointer transition-all hover:bg-surface hover:border-accent hover:-translate-y-0.5"
                onClick={() => handleOAuth('github')}
              >
                <img src="https://www.google.com/s2/favicons?domain=github.com&sz=128" alt="GitHub" className="w-5 h-5 invert opacity-80" /> GitHub
              </button>
            </div>

            <div 
              className="text-center text-sm text-muted cursor-pointer mt-4 hover:text-accent"
              onClick={() => onModeToggle(mode === 'signin' ? 'signup' : 'signin')}
            >
              {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
              <span className="text-accent underline font-medium">{mode === 'signin' ? 'Sign Up' : 'Sign In'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
