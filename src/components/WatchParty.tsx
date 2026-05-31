'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface Message {
  id?: string;
  user_id: string;
  user_name: string;
  text: string;
  created_at: string;
}

interface WatchPartyProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  showToast: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

const WatchParty: React.FC<WatchPartyProps> = ({ isOpen, onClose, user, showToast }) => {
  const [roomID, setRoomID] = useState<string>('');
  const [isInRoom, setIsInRoom] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [participants, setParticipants] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isJitsiLoading, setIsJitsiLoading] = useState(true);
  const [localFileUrl, setLocalFileUrl] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const guestStreamRef = useRef<HTMLVideoElement>(null);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const candidateQueue = useRef<any[]>([]);

  const joinRoom = (id?: string) => {
    const finalID = id || Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomID(finalID);
    setIsInRoom(true);
    if (!id) setIsAdmin(true); 
  };

  // WebRTC Setup for P2P Casting
  const setupWebRTC = async () => {
    if (pcRef.current) pcRef.current.close();
    
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { candidate: event.candidate }
        });
      }
    };

    pc.ontrack = (event) => {
      if (guestStreamRef.current) {
        guestStreamRef.current.srcObject = event.streams[0];
      }
    };

    pcRef.current = pc;
    return pc;
  };

  const processCandidates = async () => {
    if (!pcRef.current || !pcRef.current.remoteDescription) return;
    while (candidateQueue.current.length > 0) {
      const candidate = candidateQueue.current.shift();
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("Error adding queued candidate", e);
      }
    }
  };

  // MASTER SYNC & P2P ENGINE
  useEffect(() => {
    if (!isInRoom || !roomID) return;

    const channel = supabase.channel(`room_${roomID}`, {
      config: { broadcast: { self: true, ack: true } }
    });
    
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        if (payload.user_id !== user?.id) setMessages(prev => [...prev, payload]);
      })
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (!isAdmin) {
          const pc = await setupWebRTC();
          await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channel.send({ type: 'broadcast', event: 'answer', payload: { answer } });
          await processCandidates();
        }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (isAdmin && pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
          await processCandidates();
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (pcRef.current && pcRef.current.remoteDescription) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (e) {
            console.error("Error adding candidate", e);
          }
        } else {
          candidateQueue.current.push(payload.candidate);
        }
      })
      .on('broadcast', { event: 'video_control' }, ({ payload }) => {
        if (!isAdmin && videoRef.current) {
          if (payload.action === 'play') {
             videoRef.current.currentTime = payload.time;
             videoRef.current.play().catch(() => {});
          } else if (payload.action === 'pause') {
             videoRef.current.pause();
             videoRef.current.currentTime = payload.time;
          }
        }
      })
      .on('presence', { event: 'sync' }, () => {
        setParticipants(Object.keys(channel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user: user?.id || 'guest', name: user?.user_metadata?.full_name || 'Guest' });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      pcRef.current?.close();
    };
  }, [isInRoom, roomID, isAdmin]);

  // Master function to boost WebRTC Bitrate (SDP Munging)
  const setHighBitrate = (sdp: string) => {
    return sdp.replace(/a=fmtp:(\d+) \S*/g, (line) => {
      if (line.includes('max-fs') || line.includes('max-fr')) return line;
      return line + ';x-google-max-bitrate=10000;x-google-min-bitrate=5000;x-google-start-bitrate=8000';
    });
  };

  const startCasting = async () => {
    if (!isAdmin || !videoRef.current || !channelRef.current) return;
    
    const pc = await setupWebRTC();
    // Capture at 60fps for smoothness if possible
    // @ts-ignore
    const stream = videoRef.current.captureStream ? videoRef.current.captureStream(60) : (videoRef.current as any).mozCaptureStream(60);
    
    stream.getTracks().forEach((track: MediaStreamTrack) => pc.addTrack(track, stream));
    
    const offer = await pc.createOffer({
      offerToReceiveVideo: true,
      offerToReceiveAudio: true
    });

    // Munge SDP to force high bitrate
    const highQualityOffer = {
      type: offer.type,
      sdp: setHighBitrate(offer.sdp!)
    };
    
    await pc.setLocalDescription(highQualityOffer);
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'offer',
      payload: { offer: highQualityOffer }
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLocalFileUrl(url);
    }
  };

  const handleVideoAction = async (action: 'play' | 'pause') => {
    if (!isAdmin || !videoRef.current || !channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'video_control',
      payload: { action, time: videoRef.current.currentTime }
    });
  };

  // Jitsi
  useEffect(() => {
    if (isInRoom && jitsiContainerRef.current) {
      const domain = 'meet.jace.sh';
      const options = {
        roomName: `OrbitalParty_${roomID}`,
        width: '100%', height: '100%',
        parentNode: jitsiContainerRef.current,
        userInfo: { displayName: user?.user_metadata?.full_name || 'Guest' },
        configOverwrite: { startWithAudioMuted: true, disableDeepLinking: true, enableWelcomePage: false, prejoinPageEnabled: false },
        interfaceConfigOverwrite: { TOOLBAR_BUTTONS: ['microphone', 'camera', 'hangup', 'tileview'], MOBILE_APP_PROMO: false }
      };
      const scriptId = 'jitsi-external-api';
      let script = document.getElementById(scriptId) as HTMLScriptElement;
      const startJitsi = () => { if ((window as any).JitsiMeetExternalAPI) { const api = new (window as any).JitsiMeetExternalAPI(domain, options); api.addEventListener('videoConferenceJoined', () => setIsJitsiLoading(false)); } };
      if (!script) { script = document.createElement('script'); script.id = scriptId; script.src = `https://${domain}/external_api.js`; script.async = true; script.onload = startJitsi; document.body.appendChild(script); } else { startJitsi(); }
      return () => { if (jitsiContainerRef.current) jitsiContainerRef.current.innerHTML = ''; };
    }
  }, [isInRoom, roomID]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !channelRef.current) return;
    const msg = { user_id: user?.id || 'guest', user_name: user?.user_metadata?.full_name || 'Guest', text: inputText, created_at: new Date().toISOString() };
    await channelRef.current.send({ type: 'broadcast', event: 'chat', payload: msg });
    setMessages(prev => [...prev, msg]);
    setInputText('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-[2500] flex flex-col overflow-hidden text-text-custom font-dm">
      {!isInRoom ? (
        <div className="flex-1 flex items-center justify-center p-6 bg-bg">
          <div className="bg-surface border border-white/10 rounded-2xl max-w-[500px] w-full p-10 text-center shadow-[0_40px_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300">
            <button className="absolute top-5 right-5 text-muted hover:text-white" onClick={onClose}>✕</button>
            <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6 font-bebas text-4xl text-accent">P2P</div>
            <h2 className="font-bebas text-5xl text-accent mb-2 tracking-wider">ORBITAL CINEMA</h2>
            <p className="text-muted mb-8 text-xs uppercase tracking-widest font-light">Direct Peer-to-Peer Movie Streaming.</p>
            <div className="space-y-4">
              <button onClick={() => joinRoom()} className="w-full py-4 bg-accent text-bg font-bebas text-xl tracking-widest rounded-xl hover:bg-[#f5c85a] transition-all">CREATE THEATER</button>
              <div className="flex items-center gap-4 my-6"><div className="flex-1 h-px bg-white/10"></div><span className="text-muted text-[0.6rem] font-bebas tracking-widest">JOIN BY ID</span><div className="flex-1 h-px bg-white/10"></div></div>
              <div className="flex gap-2">
                <input type="text" placeholder="THEATER ID" className="flex-1 bg-surface2 border border-white/10 rounded-xl px-5 py-4 text-text-custom font-bebas outline-none focus:border-accent" value={roomID} onChange={(e) => setRoomID(e.target.value.toUpperCase())} />
                <button onClick={() => roomID && joinRoom(roomID)} className="px-8 bg-surface2 border border-white/10 text-accent font-bebas text-xl rounded-xl">ENTER</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col lg:flex-row overflow-hidden">
          <div className="flex-[3] relative bg-black flex flex-col border-r border-white/10">
            <div className="absolute top-4 left-4 z-[100] flex gap-3">
               <div className="bg-black/60 backdrop-blur-md p-2 px-4 rounded-full border border-white/10 flex items-center gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="font-bebas text-sm tracking-widest text-white uppercase">{isAdmin ? 'PROJECTIONIST' : 'VIEWER'} | {roomID}</span>
               </div>
               {isAdmin && (
                 <>
                   <label className="bg-white/10 backdrop-blur-md text-white font-bebas text-xs tracking-widest p-2 px-4 rounded-full hover:bg-white/20 transition-all cursor-pointer border border-white/10">
                     📁 LOAD MOVIE
                     <input type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
                   </label>
                   {localFileUrl && (
                     <button onClick={startCasting} className="bg-accent text-bg font-bebas text-xs tracking-widest px-4 py-2 rounded-full hover:bg-[#f5c85a] transition-all">
                       📡 START CASTING TO FRIENDS
                     </button>
                   )}
                 </>
               )}
            </div>

            <div className="flex-1 w-full h-full bg-[#050505] flex items-center justify-center relative">
              {isAdmin ? (
                localFileUrl ? (
                  <video 
                    ref={videoRef} 
                    src={localFileUrl} 
                    className="w-full h-full" 
                    controls 
                    crossOrigin="anonymous"
                    onPlay={() => handleVideoAction('play')} 
                    onPause={() => handleVideoAction('pause')}
                  />
                ) : (
                  <div className="text-center opacity-30"><p className="font-bebas text-2xl tracking-widest">SELECT A MOVIE TO START</p></div>
                )
              ) : (
                <div className="w-full h-full">
                  <video 
                    ref={guestStreamRef} 
                    className="w-full h-full" 
                    autoPlay 
                    playsInline 
                  />
                  {!guestStreamRef.current?.srcObject && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                      <div className="text-center opacity-30 animate-pulse">
                        <p className="font-bebas text-2xl tracking-widest">WAITING FOR PROJECTIONIST...</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>


            <div className="bg-surface2/80 backdrop-blur-md p-3 px-6 flex items-center justify-between border-t border-white/10">
               <div className="flex gap-3">
                  <button onClick={() => { navigator.clipboard.writeText(roomID); showToast("Theater ID copied!", 'success'); }} className="bg-white/5 border border-white/10 text-white text-[0.65rem] px-4 py-2 rounded-full font-bebas tracking-widest hover:bg-white/10 transition-all uppercase">COPY ID</button>
                  <button onClick={onClose} className="bg-red-500/10 border border-red-500/20 text-red-400 text-[0.65rem] px-4 py-2 rounded-full font-bebas tracking-widest uppercase">CLOSE THEATER</button>
               </div>
               <span className="text-accent font-bebas text-sm tracking-[0.1em]">{participants} PEOPLE IN THEATER</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-surface min-w-[320px]">
            <div className="h-[250px] bg-black border-b border-white/10 relative overflow-hidden">
               {isJitsiLoading && <div className="absolute inset-0 flex items-center justify-center bg-black z-20 text-[0.5rem] font-bebas tracking-widest text-accent animate-pulse">SETTING UP VIDEO CALL...</div>}
               <div ref={jitsiContainerRef} className="w-full h-full" />
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
               <div className="p-4 bg-surface2/50 border-b border-white/10 flex items-center gap-3">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <h3 className="font-bebas text-lg text-text-custom tracking-widest uppercase">THEATER CHAT</h3>
               </div>
               <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.user_id === user?.id ? 'items-end' : 'items-start'}`}>
                      <span className="text-[0.5rem] text-muted mb-1 uppercase tracking-widest">{msg.user_id === user?.id ? 'You' : msg.user_name}</span>
                      <div className={`p-2.5 px-4 rounded-2xl text-[0.8rem] max-w-[85%] ${msg.user_id === user?.id ? 'bg-accent text-bg rounded-tr-none font-medium' : 'bg-surface2 text-text-custom rounded-tl-none border border-white/5'}`}>{msg.text}</div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
               </div>
               <form onSubmit={sendMessage} className="p-4 bg-surface2 border-t border-white/10 flex gap-2">
                  <input type="text" placeholder="Type to chat..." className="flex-1 bg-bg border border-white/10 rounded-xl px-4 py-2.5 text-xs text-text-custom outline-none focus:border-accent" value={inputText} onChange={(e) => setInputText(e.target.value)} />
                  <button type="submit" className="w-10 h-10 bg-accent text-bg rounded-xl flex items-center justify-center text-lg">➤</button>
               </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WatchParty;
