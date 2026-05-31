'use client';

import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';

interface Message {
  text: string;
  side: 'user' | 'bot';
  isThinking?: boolean;
}

interface ChatbotProps {
  favorites?: any;
}

const Chatbot: React.FC<ChatbotProps> = ({ favorites }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { text: "Hello! I'm your Orbital Agent. I can help you find movies, series, games, music, or books. What's on your mind?", side: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleChat = () => setIsOpen(!isOpen);

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { text: userMessage, side: 'user' }]);
    setInput('');
    setIsThinking(true);

    try {
      const response = await getGeminiResponse(userMessage);
      setMessages(prev => [...prev, { text: response, side: 'bot' }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { text: "Error: " + error.message, side: 'bot' }]);
    } finally {
      setIsThinking(false);
    }
  };

  const getGeminiResponse = async (q: string) => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey || apiKey.startsWith('ya29.')) {
      return "Error: It looks like your Gemini API Key is missing or is an invalid OAuth Token. Please use a real API Key from Google AI Studio.";
    }

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // Create wishlist context
    let wishlistContext = "";
    if (favorites) {
      const favSummary = Object.entries(favorites).map(([type, items]: [string, any]) => {
        if (!items || items.length === 0) return "";
        const names = items.map((i: any) => i.title || i.name || i.trackName).join(", ");
        return `${type.toUpperCase()}: ${names}`;
      }).filter(s => s !== "").join(" | ");

      if (favSummary) {
        wishlistContext = `The user's current wishlist (favorites) contains: ${favSummary}. Use this to give personalized advice.`;
      } else {
        wishlistContext = "The user's wishlist is currently empty.";
      }
    }

    const context = `You are 'Orbital Agent', a helpful entertainment expert. ${wishlistContext} Answer briefly and keep it friendly.`;

    let r;
    try {
      r = await fetch(url, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: `${context}\n\nUser Question: ${q}` }] }] 
        }) 
      });
    } catch (e: any) {
      throw new Error("Network Error: " + e.message);
    }

    let d;
    try {
      d = await r.json();
    } catch (e) {
      const text = await r.text();
      console.error("Non-JSON response from Gemini:", text);
      throw new Error("The AI server sent an invalid response. Your API Key might be incorrect.");
    }

    
    if (d.error) {
      throw new Error(d.error.message || "API Error");
    }
    
    if (!d.candidates || d.candidates.length === 0 || !d.candidates[0].content?.parts?.[0]?.text) {
      console.error("Gemini API structure unexpected:", d);
      return "I'm sorry, I couldn't process that. The AI response was empty or blocked.";
    }
    
    return d.candidates[0].content.parts[0].text;
  };

  return (
    <div className="fixed bottom-[30px] right-[30px] z-[2000]">
      <div 
        className="w-[60px] h-[60px] bg-accent rounded-full flex items-center justify-center cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-transform duration-300 hover:scale-110 relative"
        onClick={toggleChat}
      >
        <span className="text-[1.8rem]">🤖</span>
        <span className="absolute -top-0.5 -right-0.5 bg-accent2 text-white text-[0.7rem] px-1.5 py-0.5 rounded-full font-bold border-2 border-bg">1</span>
      </div>

      <div className={`absolute bottom-20 right-0 w-[350px] h-[500px] bg-surface border border-white/10 rounded-xl flex flex-col shadow-[0_12px_48px_rgba(0,0,0,0.56)] transition-all duration-300 origin-bottom-right ${isOpen ? 'opacity-100 pointer-events-auto translate-y-0 scale-100' : 'opacity-0 pointer-events-none translate-y-5 scale-95'} overflow-hidden`}>
        <div className="bg-surface2 p-4 flex items-center gap-3 border-b border-white/10">
          <div className="w-2.5 h-2.5 bg-[#4caf50] rounded-full shadow-[0_0_8px_#4caf50]"></div>
          <div className="flex-1">
            <div className="font-bebas tracking-[0.05em] text-[1.1rem] text-accent">ORBITAL AGENT</div>
            <div className="text-[0.7rem] text-muted">Online · AI Assistant</div>
          </div>
          <button className="bg-transparent border-none text-muted cursor-pointer text-base p-1" onClick={toggleChat}>✕</button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 no-scrollbar">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`max-w-[85%] p-2.5 px-3.5 rounded-xl text-[0.88rem] leading-1.4 animate-in fade-in slide-in-from-bottom-2 ${
                msg.side === 'bot' 
                  ? 'self-start bg-surface2 text-text-custom rounded-bl-none' 
                  : 'self-end bg-accent text-bg font-medium rounded-br-none'
              }`}
            >
              {msg.side === 'bot' ? (
                <div className="prose-chatbot prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) as string }} />
              ) : (
                msg.text
              )}
            </div>
          ))}
          {isThinking && (
            <div className="self-start bg-surface2 text-muted italic p-2.5 px-3.5 rounded-xl rounded-bl-none text-[0.88rem] animate-pulse">
              Thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form 
          className="p-4 border-top border-white/10 flex gap-2.5"
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        >
          <input 
            type="text" 
            className="flex-1 bg-surface2 border border-white/10 rounded-full px-4 py-2 text-text-custom text-sm outline-none focus:border-accent"
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button 
            type="submit"
            className="bg-accent border-none w-9 h-9 rounded-full flex items-center justify-center cursor-pointer text-bg transition-transform hover:scale-110"
          >
            ➤
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;
