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
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [localFileUrl, setLocalFileUrl] = useState<string>('');

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [castingStream, setCastingStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [isWebcamOn, setIsWebcamOn] = useState(false);

  // Refs for WebRTC to avoid stale state in callbacks and unnecessary useEffect resets
  const localStreamRef = useRef<MediaStream | null>(null);
  const castingStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const guestStreamRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const candidateQueue = useRef<Record<string, any[]>>({});

  // Generate a stable ID for this session (Supabase ID or random for guests)
  const myId = React.useMemo(() => user?.id || `guest_${Math.random().toString(36).substring(2, 9)}`, [user?.id]);
  const myIdRef = useRef(myId);
  useEffect(() => { myIdRef.current = myId; }, [myId]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Auto scroll to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const joinRoom = (id?: string) => {
    const finalID = id || Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomID(finalID);
    setIsInRoom(true);
    if (!id) setIsAdmin(true); 
  };

  // Helper to send offer for renegotiation or initial connection
  const sendOffer = async (targetUserId: string) => {
    if (!channelRef.current) return;
    const pc = createPeerConnection(targetUserId);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      channelRef.current.send({
        type: 'broadcast',
        event: 'offer',
        payload: { offer, from: myIdRef.current, to: targetUserId }
      });
    } catch (e) {
      console.error("Error creating offer", e);
    }
  };

  // WEB CAM ENGINE
  const toggleWebcam = async () => {
    if (isWebcamOn) {
      localStreamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      setLocalStream(null);
      localStreamRef.current = null;
      setIsWebcamOn(false);
      
      // We should ideally remove tracks from PCs, but simplest is to just stop them
      // Most browsers will stop sending video/audio
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
      setIsWebcamOn(true);
      
      // Add webcam tracks to all active peer connections and renegotiate
      for (const [userId, pc] of Object.entries(peerConnections.current)) {
        stream.getTracks().forEach((track: MediaStreamTrack) => pc.addTrack(track, stream));
        await sendOffer(userId);
      }
    } catch (e) {
      showToast("Could not access camera/mic", 'error');
    }
  };

  // WebRTC Setup
  const createPeerConnection = (userId: string) => {
    if (peerConnections.current[userId]) return peerConnections.current[userId];

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { candidate: event.candidate, from: myIdRef.current, to: userId }
        });
      }
    };

    pc.ontrack = (event) => {
      console.log(`Received track from ${userId}`, event.streams[0]?.id);
      // If it's a movie stream (isAdmin casting), put it in guestStreamRef
      // We check if the stream ID starts with 'movie-' which we set during casting
      if (isAdmin === false && event.streams[0]?.id.startsWith('movie-')) {
        if (guestStreamRef.current) {
          guestStreamRef.current.srcObject = event.streams[0];
          guestStreamRef.current.play().catch(e => console.warn("Autoplay blocked", e));
        }
      } else {
        // Otherwise it's a webcam stream
        if (event.streams[0]) {
          setRemoteStreams(prev => ({
            ...prev,
            [userId]: event.streams[0]
          }));
        }
      }
    };

    // Add webcam if on (use Ref to avoid stale state)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => pc.addTrack(track, localStreamRef.current!));
    }
    
    // Add movie if casting (use Ref)
    if (isAdmin && castingStreamRef.current) {
      castingStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => pc.addTrack(track, castingStreamRef.current!));
    }

    peerConnections.current[userId] = pc;
    return pc;
  };

  const startCasting = async () => {
    if (!isAdmin || !videoRef.current) return;
    
    try {
      // @ts-ignore
      const stream = videoRef.current.captureStream ? videoRef.current.captureStream(60) : (videoRef.current as any).mozCaptureStream(60);
      
      // We can't set the ID but we can wrap it in a new stream if needed? 
      // Actually captureStream ID is generated. We'll rely on a naming convention if possible or just assume admin sends it.
      // For now, let's keep the manual ID hack if it works in some browsers, but add a fallback.
      // @ts-ignore
      try { Object.defineProperty(stream, 'id', { value: `movie-${myIdRef.current}` }); } catch(e) {}
      
      setCastingStream(stream);
      castingStreamRef.current = stream;
      
      // Add movie tracks to all active peer connections and renegotiate
      for (const [userId, pc] of Object.entries(peerConnections.current)) {
        stream.getTracks().forEach((track: MediaStreamTrack) => pc.addTrack(track, stream));
        await sendOffer(userId);
      }

      showToast("Casting started!", 'success');
    } catch (e) {
      console.error("Casting error", e);
      showToast("Could not start casting", 'error');
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
        if (payload.user_id !== myIdRef.current) setMessages(prev => [...prev, payload]);
      })
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.to === myIdRef.current) {
          const pc = createPeerConnection(payload.from);
          await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channel.send({ 
            type: 'broadcast', 
            event: 'answer', 
            payload: { answer, from: myIdRef.current, to: payload.from } 
          });
          
          if (candidateQueue.current[payload.from]) {
            while (candidateQueue.current[payload.from].length > 0) {
              const cand = candidateQueue.current[payload.from].shift();
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
          }
        }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.to === myIdRef.current) {
          const pc = peerConnections.current[payload.from];
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
            if (candidateQueue.current[payload.from]) {
              while (candidateQueue.current[payload.from].length > 0) {
                const cand = candidateQueue.current[payload.from].shift();
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              }
            }
          }
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.to === myIdRef.current) {
          const pc = peerConnections.current[payload.from];
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } else {
            if (!candidateQueue.current[payload.from]) candidateQueue.current[payload.from] = [];
            candidateQueue.current[payload.from].push(payload.candidate);
          }
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
      .on('presence', { event: 'join' }, async ({ newPresences }) => {
        newPresences.forEach(async (p: any) => {
          // Race condition fix: Only one peer should initiate the offer.
          // We use ID comparison as a tie-breaker.
          if (p.user !== myIdRef.current && myIdRef.current < p.user) {
            console.log("Initiating offer to newcomer:", p.user);
            await sendOffer(p.user);
          }
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach((p: any) => {
          if (peerConnections.current[p.user]) {
            peerConnections.current[p.user].close();
            delete peerConnections.current[p.user];
          }
          setRemoteStreams(prev => {
            const next = { ...prev };
            delete next[p.user];
            return next;
          });
        });
      })
      .on('presence', { event: 'sync' }, () => {
        setParticipants(Object.keys(channel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user: myId, name: user?.user_metadata?.full_name || 'Guest' });
          setIsVideoLoading(false);

          // When I join, I also check who is already there and send offers if I'm the designated offerer
          const state = channel.presenceState();
          Object.keys(state).forEach(async (userId) => {
            if (userId !== myId && myId < userId) {
               console.log("Initiating offer to existing member:", userId);
               await sendOffer(userId);
            }
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      Object.values(peerConnections.current).forEach(pc => pc.close());
      peerConnections.current = {};
    };
  }, [isInRoom, roomID, myId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLocalFileUrl(url);
    }
  };

  const handleVideoAction = (action: 'play' | 'pause') => {
    if (!isAdmin || !videoRef.current || !channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'video_control',
      payload: { action, time: videoRef.current.currentTime }
    });
  };

  // Check for secure context (HTTPS)
  useEffect(() => {
    if (isOpen && !window.isSecureContext) {
      showToast("Camera/Mic require HTTPS to work.", 'error');
    }
  }, [isOpen]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !channelRef.current) return;
    const msg = { user_id: myId, user_name: user?.user_metadata?.full_name || 'Guest', text: inputText, created_at: new Date().toISOString() };
    await channelRef.current.send({ type: 'broadcast', event: 'chat', payload: msg });
    setMessages(prev => [...prev, msg]);
    setInputText('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-[2500] flex flex-col overflow-hidden text-text-custom font-dm">
      {!isInRoom ? (
        <div className="flex-1 flex items-center justify-center p-6 bg-bg">
          <div className="bg-surface border border-white/10 rounded-2xl max-w-[500px] w-full p-6 sm:p-10 text-center shadow-[0_40px_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 relative">
            <button className="absolute top-5 right-5 text-muted hover:text-white" onClick={onClose}>✕</button>
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6 font-bebas text-3xl sm:text-4xl text-accent">P2P</div>
            <h2 className="font-bebas text-4xl sm:text-5xl text-accent mb-2 tracking-wider">ORBITAL CINEMA</h2>
            <p className="text-muted mb-8 text-[0.65rem] uppercase tracking-widest font-light">Direct Peer-to-Peer Movie Streaming.</p>
            <div className="space-y-4">
              <button onClick={() => joinRoom()} className="w-full py-4 bg-accent text-bg font-bebas text-xl tracking-widest rounded-xl hover:bg-[#f5c85a] transition-all">CREATE THEATER</button>
              <div className="flex items-center gap-4 my-6"><div className="flex-1 h-px bg-white/10"></div><span className="text-muted text-[0.6rem] font-bebas tracking-widest">JOIN BY ID</span><div className="flex-1 h-px bg-white/10"></div></div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" placeholder="THEATER ID" className="flex-1 bg-surface2 border border-white/10 rounded-xl px-5 py-3.5 text-text-custom font-bebas outline-none focus:border-accent" value={roomID} onChange={(e) => setRoomID(e.target.value.toUpperCase())} />
                <button onClick={() => roomID && joinRoom(roomID)} className="px-8 py-3.5 sm:py-0 bg-surface2 border border-white/10 text-accent font-bebas text-xl rounded-xl">ENTER</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col lg:flex-row overflow-hidden bg-black">
          {/* VIDEO SECTION */}
          <div className="h-[45vh] lg:h-full lg:flex-[3] relative flex flex-col border-b lg:border-b-0 lg:border-r border-white/10 shrink-0">
            <div className="absolute top-4 left-4 z-[100] flex flex-wrap gap-2">
               <div className="bg-black/60 backdrop-blur-md p-1.5 px-3 rounded-full border border-white/10 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="font-bebas text-[0.6rem] sm:text-xs tracking-widest text-white uppercase">{isAdmin ? 'PROJECTIONIST' : 'VIEWER'} | {roomID}</span>
               </div>
               {isAdmin && (
                 <div className="flex gap-2">
                   <label className="bg-white/10 backdrop-blur-md text-white font-bebas text-[0.6rem] sm:text-xs tracking-widest p-1.5 px-3 rounded-full hover:bg-white/20 transition-all cursor-pointer border border-white/10">
                     📁 MOVIE
                     <input type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
                   </label>
                   {localFileUrl && (
                     <button onClick={startCasting} className="bg-accent text-bg font-bebas text-[0.6rem] sm:text-xs tracking-widest px-3 py-1.5 rounded-full hover:bg-[#f5c85a] transition-all">
                       📡 CAST
                     </button>
                   )}
                 </div>
               )}
            </div>

            <div className="flex-1 bg-[#050505] flex items-center justify-center relative overflow-hidden">
              {isAdmin ? (
                localFileUrl ? (
                  <video 
                    ref={videoRef} 
                    src={localFileUrl} 
                    className="w-full h-full object-contain" 
                    controls 
                    crossOrigin="anonymous"
                    onPlay={() => handleVideoAction('play')} 
                    onPause={() => handleVideoAction('pause')}
                  />
                ) : (
                  <div className="text-center opacity-30"><p className="font-bebas text-xl tracking-widest">SELECT A MOVIE</p></div>
                )
              ) : (
                <div className="w-full h-full">
                  <video ref={guestStreamRef} className="w-full h-full object-contain" autoPlay playsInline />
                  {!guestStreamRef.current?.srcObject && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                      <div className="text-center opacity-30 animate-pulse"><p className="font-bebas text-xl tracking-widest">WAITING...</p></div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-surface2/80 backdrop-blur-md p-2 px-4 flex items-center justify-between border-t border-white/10 shrink-0">
               <div className="flex gap-2">
                  <button onClick={() => { navigator.clipboard.writeText(roomID); showToast("Copied!", 'success'); }} className="bg-white/5 border border-white/10 text-white text-[0.55rem] px-3 py-1.5 rounded-full font-bebas tracking-widest uppercase">ID</button>
                  <button onClick={onClose} className="bg-red-500/10 border border-red-500/20 text-red-400 text-[0.55rem] px-3 py-1.5 rounded-full font-bebas tracking-widest uppercase">EXIT</button>
               </div>
               <span className="text-accent font-bebas text-[0.65rem] tracking-[0.1em]">{participants} PEOPLE</span>
            </div>
          </div>

          {/* CHAT & CALL SECTION */}
          <div className="flex-1 lg:flex-1 flex flex-col bg-surface overflow-hidden min-h-0">
            {/* VIDEO CALL AREA (CUSTOM P2P) */}
            <div className="h-[220px] sm:h-[260px] lg:h-[320px] bg-black border-b border-white/10 relative overflow-hidden shrink-0 flex flex-col">
               <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 gap-2 content-start no-scrollbar">
                  {/* Local Video */}
                  <div className="relative aspect-video bg-surface2 rounded-lg overflow-hidden border border-white/5">
                    {localStream ? (
                      <video 
                        ref={el => { if (el) el.srcObject = localStream; }} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover scale-x-[-1]" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[0.5rem] font-bebas tracking-widest text-muted">CAMERA OFF</div>
                    )}
                    <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[0.4rem] font-bebas text-accent tracking-widest uppercase">YOU</div>
                  </div>

                  {/* Remote Videos */}
                  {Object.entries(remoteStreams).map(([peerId, stream]) => (
                    <div key={peerId} className="relative aspect-video bg-surface2 rounded-lg overflow-hidden border border-white/5">
                      <video 
                        ref={el => { if (el) el.srcObject = stream; }} 
                        autoPlay 
                        playsInline 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[0.4rem] font-bebas text-white tracking-widest uppercase">FRIEND</div>
                    </div>
                  ))}
               </div>
               
               <div className="p-2 border-t border-white/5 bg-surface/50 flex justify-center">
                  <button 
                    onClick={toggleWebcam} 
                    className={`px-4 py-1.5 rounded-full font-bebas text-[0.6rem] tracking-widest transition-all ${isWebcamOn ? 'bg-red-500 text-white' : 'bg-accent text-bg'}`}
                  >
                    {isWebcamOn ? '🔴 STOP CAMERA' : '📷 START CAMERA'}
                  </button>
               </div>
            </div>

            {/* CHAT AREA */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
               <div className="p-3 bg-surface2/50 border-b border-white/10 flex items-center gap-3 shrink-0">
                  <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
                  <h3 className="font-bebas text-sm text-text-custom tracking-widest uppercase">THEATER CHAT</h3>
               </div>
               
               {/* SCROLLABLE MESSAGES */}
               <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 overscroll-contain no-scrollbar">
                  {messages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-muted text-[0.6rem] uppercase tracking-[0.2em] opacity-20 text-center">No messages yet.</div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div key={idx} className={`flex flex-col ${msg.user_id === myId ? 'items-end' : 'items-start'}`}>
                        <span className="text-[0.45rem] text-muted mb-0.5 uppercase tracking-widest">{msg.user_id === myId ? 'You' : msg.user_name}</span>
                        <div className={`p-2 px-3 rounded-xl text-[0.7rem] max-w-[90%] ${msg.user_id === myId ? 'bg-accent text-bg rounded-tr-none' : 'bg-surface2 text-text-custom rounded-tl-none border border-white/5'}`}>{msg.text}</div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} className="h-1 shrink-0" />
               </div>

               {/* CHAT INPUT */}
               <form onSubmit={sendMessage} className="p-3 bg-surface2 border-t border-white/10 flex gap-2 shrink-0">
                  <input 
                    type="text" 
                    placeholder="Message..." 
                    className="flex-1 bg-bg border border-white/10 rounded-xl px-3 py-2 text-[0.7rem] text-text-custom outline-none focus:border-accent" 
                    value={inputText} 
                    onChange={(e) => setInputText(e.target.value)} 
                  />
                  <button type="submit" className="w-8 h-8 bg-accent text-bg rounded-xl flex items-center justify-center text-sm hover:bg-[#f5c85a] transition-all">➤</button>
               </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WatchParty;
