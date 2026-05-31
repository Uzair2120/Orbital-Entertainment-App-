'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ProfilePageProps {
  user: any;
  favorites: any;
  onSignOut: () => void;
  onUpdateUser: (user: any) => void;
  showToast: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, favorites, onSignOut, onUpdateUser, showToast }) => {
  const [name, setName] = useState(user?.user_metadata?.custom_name || user?.user_metadata?.full_name || user?.user_metadata?.user_name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const avatar = user?.user_metadata?.custom_avatar || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || `https://ui-avatars.com/api/?name=${user?.email || 'User'}&background=random`;
  const provider = user?.app_metadata?.provider || 'User';

  React.useEffect(() => {
    if (user) {
      setName(user?.user_metadata?.custom_name || user?.user_metadata?.full_name || user?.user_metadata?.user_name || '');
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { 
          full_name: name,
          custom_name: name 
        }
      });
      if (error) throw error;
      onUpdateUser(data.user);
      showToast("Profile updated!", 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      let { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: { 
          avatar_url: publicUrl,
          custom_avatar: publicUrl 
        }
      });
      if (updateError) throw updateError;

      onUpdateUser(data.user);
      showToast("Profile picture updated!", 'success');
    } catch (e: any) {
      showToast("Upload failed: " + e.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative animate-in fade-in duration-400 fill-mode-forwards">
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] bg-[radial-gradient(circle,rgba(232,184,75,0.1)_0%,transparent_70%)] blur-[120px] -z-10 opacity-15 pointer-events-none" />
      
      <div className="max-w-[1200px] w-full mx-auto grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6 lg:gap-10 px-4 sm:px-6 lg:px-10 box-border animate-in slide-in-from-bottom-8 duration-800 ease-out fill-mode-forwards">
        
        {/* LEFT HERO SIDE */}
        <div className="bg-white/5 backdrop-blur-[30px] border border-white/[0.08] rounded-[30px] p-6 sm:p-10 text-center h-fit lg:sticky lg:top-[120px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
          <div className="relative w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] mx-auto mb-6 sm:mb-8 group">
            {avatar ? (
              <img 
                src={avatar} 
                alt="Profile Avatar" 
                className="w-full h-full rounded-[40px] object-cover border-2 border-accent p-1.5 bg-bg -rotate-3 transition-all duration-500 group-hover:rotate-0 group-hover:scale-105 group-hover:rounded-full"
              />
            ) : (
              <div className="w-full h-full rounded-[40px] border-2 border-accent bg-surface2 flex items-center justify-center text-4xl text-accent -rotate-3">
                👤
              </div>
            )}
            <label className="absolute -bottom-2.5 -right-2.5 bg-accent text-bg w-11 h-11 rounded-[15px] flex items-center justify-center cursor-pointer text-lg shadow-[0_10px_20px_rgba(232,184,75,0.3)] transition-all hover:-translate-y-1 hover:rotate-12 z-[2]" title="Change Picture">
              📷
              <input type="file" className="hidden" onChange={handleAvatarUpload} accept="image/*" disabled={isUploading} />
            </label>
          </div>
          
          <h2 className="font-bebas text-4xl text-text-custom mb-1.5 uppercase">{name || 'ORBITAL MEMBER'}</h2>
          <p className="text-accent text-[0.9rem] tracking-[0.2em] font-bold uppercase">Verified {provider}</p>

          <div className="mt-10 pt-10 border-t border-white/10 flex flex-col gap-4">
             <button 
              className="w-full py-4 bg-surface2 border border-white/10 rounded-2xl font-bebas text-xl text-text-custom tracking-widest transition-all hover:bg-white/10 active:scale-95"
              onClick={onSignOut}
             >
               SIGN OUT
             </button>
             <p className="text-muted text-[0.65rem] tracking-[0.2em] uppercase">Orbital Intelligence v1.0</p>
          </div>
        </div>

        {/* RIGHT CONTENT SIDE */}
        <div className="space-y-6 sm:space-y-8">
           <div className="bg-white/5 backdrop-blur-[30px] border border-white/[0.08] rounded-[30px] p-6 sm:p-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
              <h3 className="font-bebas text-2xl sm:text-3xl text-accent mb-6 sm:mb-8 tracking-widest uppercase">Vault Settings</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-muted text-[0.65rem] font-bold uppercase tracking-[0.2em] mb-2.5">Your Identity (Display Name)</label>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <input 
                      type="text" 
                      className="w-full sm:flex-1 bg-bg border border-white/10 rounded-2xl px-5 py-3.5 sm:px-6 sm:py-4 text-text-custom font-dm text-base focus:border-accent outline-none transition-all shadow-inner"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                    />
                    <button 
                      className={`w-full sm:w-auto px-8 py-3.5 sm:py-0 rounded-2xl font-bebas text-lg tracking-widest transition-all shadow-lg ${isUpdating ? 'bg-accent/50 cursor-not-allowed' : 'bg-accent text-bg hover:bg-[#f5c85a] active:scale-95'}`}
                      onClick={handleUpdateProfile}
                      disabled={isUpdating}
                    >
                      {isUpdating ? 'UPDATING...' : 'SAVE'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-bg/50 border border-white/5 rounded-2xl p-5 sm:p-6 overflow-hidden">
                    <span className="block text-muted text-[0.6rem] font-bold uppercase tracking-[0.2em] mb-1">Email Address</span>
                    <span className="text-text-custom font-dm text-sm truncate block">{user?.email}</span>
                  </div>
                  <div className="bg-bg/50 border border-white/5 rounded-2xl p-5 sm:p-6">
                    <span className="block text-muted text-[0.6rem] font-bold uppercase tracking-[0.2em] mb-1">Member Since</span>
                    <span className="text-text-custom font-dm text-sm block">{new Date(user?.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
           </div>

           <div className="bg-white/5 backdrop-blur-[30px] border border-white/[0.08] rounded-[30px] p-6 sm:p-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
              <h3 className="font-bebas text-2xl sm:text-3xl text-accent mb-6 sm:mb-8 tracking-widest uppercase">Wishlist Statistics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-bg/50 border border-white/5 rounded-2xl p-4 sm:p-6 text-center">
                   <div className="text-muted text-[0.55rem] sm:text-[0.6rem] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-1 sm:mb-2">Movies</div>
                   <div className="text-[1.5rem] sm:text-[2rem] font-bebas text-accent">{favorites.movies?.length || 0}</div>
                </div>
                <div className="bg-bg/50 border border-white/5 rounded-2xl p-4 sm:p-6 text-center">
                   <div className="text-muted text-[0.55rem] sm:text-[0.6rem] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-1 sm:mb-2">Series</div>
                   <div className="text-[1.5rem] sm:text-[2rem] font-bebas text-accent">{favorites.series?.length || 0}</div>
                </div>
                <div className="bg-bg/50 border border-white/5 rounded-2xl p-4 sm:p-6 text-center">
                   <div className="text-muted text-[0.55rem] sm:text-[0.6rem] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-1 sm:mb-2">Games</div>
                   <div className="text-[1.5rem] sm:text-[2rem] font-bebas text-accent">{favorites.games?.length || 0}</div>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
