
import React, { useState, useEffect, useRef } from 'react';
import { DailyBriefingData, NewsItem } from '../types';
import SourceList from './SourceList';
import { generateNewsImage, generateNewsAudio } from '../services/geminiService';
import ShareModal from './ShareModal';

interface BriefingDisplayProps {
  data: DailyBriefingData;
  savedHeadlines: Set<string>;
  onToggleBookmark: (item: NewsItem, imageUrl?: string) => void;
  onViewDetail?: (item: NewsItem) => void;
}

// --- Helper: Decode Raw PCM ---
async function decodeAudioData(
  arrayBuffer: ArrayBuffer,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(arrayBuffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- Component: Toast Notification ---
const Toast: React.FC<{ message: string; type: 'success' | 'info'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-24 right-4 z-[60] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in-left ${
      type === 'success' ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'
    }`}>
      {type === 'success' ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
      )}
      <span className="font-medium text-sm">{message}</span>
    </div>
  );
};

// --- Component: News Card ---
const NewsCard: React.FC<{ 
  item: NewsItem; 
  index: number; 
  isActive: boolean; 
  isPlaying: boolean; 
  isSaved: boolean;
  onPlay: () => void;
  onToggleBookmark: (imageUrl?: string) => void;
  onShare: () => void;
  onViewDetail: () => void;
}> = ({ item, index, isActive, isPlaying, isSaved, onPlay, onToggleBookmark, onShare, onViewDetail }) => {
  // Use cached image URL if available, otherwise start null
  const [imageUrl, setImageUrl] = useState<string | null>(item.imageUrl || null);
  const [loadingImg, setLoadingImg] = useState(!item.imageUrl);

  useEffect(() => {
    // If we already have an image (from persistence), don't regenerate
    if (imageUrl) {
        setLoadingImg(false);
        return;
    }

    let mounted = true;
    // Generate image on mount
    generateNewsImage(item.headline).then(url => {
      if (mounted) {
        setImageUrl(url);
        setLoadingImg(false);
      }
    });
    return () => { mounted = false; };
  }, [item.headline, imageUrl]);

  return (
    <div className={`group relative bg-white dark:bg-dark-card border rounded-2xl overflow-hidden transition-all duration-300 ${isActive ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'border-slate-200 dark:border-dark-border hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg'}`}>
      <div className="flex flex-col sm:flex-row h-full">
        {/* Image Section */}
        <div className="sm:w-1/3 h-48 sm:h-auto min-h-[200px] relative bg-slate-100 dark:bg-black/40 overflow-hidden group-hover:brightness-110 transition-all">
          {loadingImg ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          ) : imageUrl ? (
            <img 
              src={imageUrl} 
              alt={item.headline} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-slate-600 bg-slate-200 dark:bg-slate-800">
               <span className="text-xs">No Image</span>
            </div>
          )}
          
          {/* Category Tag */}
          <div className="absolute top-2 left-2 px-2.5 py-1 bg-white/90 dark:bg-black/60 backdrop-blur-md rounded-lg text-xs text-blue-600 dark:text-blue-300 font-mono border border-blue-100 dark:border-blue-500/20 shadow-sm">
            {item.category}
          </div>
        </div>

        {/* Content Section */}
        <div className="sm:w-2/3 p-5 flex flex-col relative cursor-pointer" onClick={onViewDetail}>
          <div className="flex-1">
            <h3 className={`text-lg font-bold mb-3 leading-tight ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-200'} transition-colors`}>
                {item.headline}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                {item.summary}
            </p>
          </div>
          
          {/* Action Footer */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
            {/* Play Button */}
            <button 
              onClick={onPlay}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all transform active:scale-95 ${
                isActive && isPlaying 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 ring-1 ring-blue-400' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isActive && isPlaying ? (
                 <span className="flex items-center gap-2">
                   <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                    </span>
                   Playing
                 </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  Play
                </span>
              )}
            </button>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
                {/* Bookmark */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleBookmark(imageUrl || undefined);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all transform active:scale-95 ${
                        isSaved 
                        ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30' 
                        : 'bg-transparent text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                    title={isSaved ? "Remove from Saved" : "Save for later"}
                >
                    <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill={isSaved ? "currentColor" : "none"} 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="w-4 h-4"
                    >
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
                </button>

                {/* Share */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onShare();
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all transform active:scale-95"
                    title="Share Article"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    <span className="hidden sm:inline">Share</span>
                </button>
            </div>
          </div>
          
          <div className="absolute top-5 right-5 text-xs text-slate-400 dark:text-slate-600 font-mono">#{index + 1}</div>
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---
const BriefingDisplay: React.FC<BriefingDisplayProps> = ({ data, savedHeadlines, onToggleBookmark, onViewDetail }) => {
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [voice, setVoice] = useState<'Male' | 'Female'>('Female');
  const [error, setError] = useState<string>('');
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'info'} | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  
  // Share Modal State
  const [shareModalData, setShareModalData] = useState<{title: string, text: string} | null>(null);

  // Audio Queue & Cache System
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioCache = useRef<Map<string, AudioBuffer>>(new Map()); // Key: headline + voice
  const preloadingRef = useRef<Set<string>>(new Set());
  
  // Race condition lock
  const playbackRequestId = useRef<number>(0);

  // --- Audio Logic ---
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const stopAudio = () => {
    // 1. Stop Web Audio API (Gemini)
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch(e) {}
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    // 2. Stop Browser Speech (Fallback)
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    setUsingFallback(false);
  };

  const getCacheKey = (item: NewsItem) => `${item.headline}-${voice}`;

  const preloadAudio = async (item: NewsItem) => {
    const key = getCacheKey(item);
    if (audioCache.current.has(key) || preloadingRef.current.has(key)) return;
    
    preloadingRef.current.add(key);
    try {
      const textToRead = `${item.headline}。${item.summary}`;
      const pcmBuffer = await generateNewsAudio(textToRead, voice);
      if (pcmBuffer && audioContextRef.current) {
         const audioBuffer = await decodeAudioData(pcmBuffer, audioContextRef.current);
         audioCache.current.set(key, audioBuffer);
      }
    } catch(e) {
      console.warn("Preload failed", e);
    } finally {
      preloadingRef.current.delete(key);
    }
  };

  // Aggressive Pre-loading Strategy
  useEffect(() => {
    if (data.news.length > 0) {
      // Preload first 3 immediately for instant start
      const initialBatch = data.news.slice(0, 3);
      initialBatch.forEach(item => preloadAudio(item));
    }
  }, [data.news, voice]);

  useEffect(() => {
    // Look ahead 2 steps
    if (activeIndex >= 0) {
      const nextBatch = data.news.slice(activeIndex + 1, activeIndex + 3);
      nextBatch.forEach(item => preloadAudio(item));
    }
  }, [activeIndex, voice, data.news]);
  

  // Playback effect
  useEffect(() => {
    if (activeIndex >= 0 && activeIndex < data.news.length && isPlaying) {
      playCurrentItem();
    }
    return () => {};
  }, [activeIndex, voice]); 

  // Helper: Play next slide
  const handleNext = () => {
    if (activeIndex < data.news.length - 1) {
      setActiveIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
      setActiveIndex(-1);
    }
  };

  // Helper: Fallback TTS (Browser Native)
  const playFallback = (text: string) => {
    setUsingFallback(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.0;
    
    // Try to match gender roughly if possible, or just default
    // (Browser voice support varies wildly, keeping it simple is safer)

    utterance.onend = () => {
        if (isPlaying) handleNext();
    };
    utterance.onerror = (e) => {
        console.error("Fallback TTS error", e);
        // Skip on error
        if (isPlaying) handleNext();
    };

    window.speechSynthesis.speak(utterance);
    setLoadingAudio(false);
  };

  const playCurrentItem = async () => {
    const currentRequestId = ++playbackRequestId.current;
    
    stopAudio();
    setLoadingAudio(true);
    setError('');

    if (activeIndex < 0) return;
    const item = data.news[activeIndex];
    const key = getCacheKey(item);
    const textToRead = `${item.headline}。${item.summary}`;
    
    initAudioContext();
    if (!audioContextRef.current) {
        // AudioContext not supported? Try fallback immediately
        playFallback(textToRead);
        return;
    }

    try {
      let audioBuffer = audioCache.current.get(key);

      if (!audioBuffer) {
        // Cache miss, fetch now
        const pcmBuffer = await generateNewsAudio(textToRead, voice);
        
        if (currentRequestId !== playbackRequestId.current) return; // Request cancelled
        
        if (!pcmBuffer) {
             // --- FALLBACK TRIGGER ---
             console.warn("Gemini Audio failed after retries. Switching to fallback.");
             playFallback(textToRead);
             return; 
        }

        audioBuffer = await decodeAudioData(pcmBuffer, audioContextRef.current);
        audioCache.current.set(key, audioBuffer);
      }

      if (currentRequestId !== playbackRequestId.current) return; // Request cancelled

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer!;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        if (currentRequestId === playbackRequestId.current) {
           handleNext();
        }
      };

      source.start(0);
      sourceRef.current = source;
      setLoadingAudio(false);

    } catch (e: any) {
      if (currentRequestId === playbackRequestId.current) {
        console.error("Playback critical failure:", e);
        // Last resort fallback
        playFallback(textToRead);
      }
    }
  };

  const handlePlayToggle = (index: number) => {
    if (activeIndex === index && isPlaying) {
      setIsPlaying(false);
      stopAudio();
      setActiveIndex(-1);
    } else {
      setActiveIndex(index);
      setIsPlaying(true);
    }
  };

  const handleGlobalPlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      stopAudio();
    } else {
      if (activeIndex === -1) setActiveIndex(0);
      setIsPlaying(true);
    }
  };

  // --- Bookmark wrapper to show toast ---
  const handleBookmarkClick = (item: NewsItem, imgUrl?: string) => {
    const wasSaved = savedHeadlines.has(item.headline);
    onToggleBookmark(item, imgUrl);
    setToast({
        msg: wasSaved ? "Article removed from Saved" : "Article saved successfully",
        type: 'success'
    });
  };

  // --- Share Logic ---
  const openShareModal = (item?: NewsItem) => {
    if (item) {
        // Single Article Share
        setShareModalData({
            title: `🔥 ${item.headline}`,
            text: `${item.summary}\n\nVia TechPulse Daily`
        });
    } else {
        // Full Briefing Share
        const text = data.news.map((n, i) => `${i + 1}. ${n.headline}`).join('\n');
        setShareModalData({
            title: `TechPulse Daily (${data.date})`,
            text: `Top Stories:\n${text}\n\nGet the full AI briefing now!`
        });
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-24 relative">
      
      {/* Toast Notification */}
      {toast && (
        <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-16 z-20 py-4 -mx-4 px-4 bg-slate-50/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-slate-200 dark:border-white/5 md:static md:bg-transparent md:border-none md:p-0 transition-colors">
        <div>
           <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Today's <span className="text-blue-600 dark:text-blue-500">Briefing</span></h2>
           <p className="text-slate-500 dark:text-slate-400 mt-1">{data.date}</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          {/* Voice Switcher */}
          <div className="flex bg-slate-200 dark:bg-dark-card rounded-lg p-1 border border-slate-300 dark:border-dark-border">
            <button 
              onClick={() => setVoice('Male')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${voice === 'Male' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Male
            </button>
            <button 
              onClick={() => setVoice('Female')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${voice === 'Female' ? 'bg-white dark:bg-pink-600 text-pink-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Female
            </button>
          </div>

          <div className="h-6 w-px bg-slate-300 dark:bg-dark-border hidden sm:block"></div>
          
          {/* Share All Button (Prominent) */}
          <button
            onClick={() => openShareModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-indigo-500/20 transition-all transform hover:scale-105 active:scale-95"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
             Share Briefing
          </button>

          {/* Global Play Button */}
          <button 
            onClick={handleGlobalPlay}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all transform hover:scale-105 active:scale-95 ${
              isPlaying 
                ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30' 
                : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
            }`}
          >
             {isPlaying ? (
               <>
                 <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                 Stop
               </>
             ) : (
               <>
                 <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                 Listen All
               </>
             )}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm text-center animate-fade-in">
          {error}
        </div>
      )}

      {/* News Grid */}
      {data.news.length === 0 ? (
          <div className="text-center py-20 text-slate-400 dark:text-slate-500">
             <p>No news items available.</p>
          </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
            {data.news.map((item, idx) => (
            <NewsCard 
                key={`${item.headline}-${idx}`}
                item={item} 
                index={idx}
                isActive={activeIndex === idx}
                isPlaying={isPlaying}
                isSaved={savedHeadlines.has(item.headline)}
                onPlay={() => handlePlayToggle(idx)}
                onToggleBookmark={(imgUrl) => handleBookmarkClick(item, imgUrl)}
                onShare={() => openShareModal(item)}
                onViewDetail={() => onViewDetail?.(item)}
            />
            ))}
        </div>
      )}

      {/* Sources */}
      <SourceList metadata={data.groundingMetadata} />

      {/* Floating Audio Status Bar */}
      {(isPlaying || loadingAudio) && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] max-w-lg bg-white/90 dark:bg-dark-card/90 backdrop-blur-xl border border-blue-200 dark:border-blue-500/30 shadow-2xl rounded-2xl p-4 flex items-center gap-4 z-50 animate-fade-in-up">
           <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
              {loadingAudio ? (
                <div className="w-5 h-5 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <div className="flex gap-0.5 items-end h-4">
                  <div className={`w-1 bg-blue-500 dark:bg-blue-400 animate-[bounce_1s_infinite] h-2 ${usingFallback ? 'bg-green-500 dark:bg-green-400' : ''}`}></div>
                  <div className={`w-1 bg-blue-500 dark:bg-blue-400 animate-[bounce_1.2s_infinite] h-4 ${usingFallback ? 'bg-green-500 dark:bg-green-400' : ''}`}></div>
                  <div className={`w-1 bg-blue-500 dark:bg-blue-400 animate-[bounce_0.8s_infinite] h-3 ${usingFallback ? 'bg-green-500 dark:bg-green-400' : ''}`}></div>
                </div>
              )}
           </div>
           <div className="flex-1 min-w-0">
             <p className="text-xs text-blue-600 dark:text-blue-300 font-mono mb-0.5 flex items-center gap-2">
               {loadingAudio ? 'Generating Voice...' : 'Now Playing'} • 
               {usingFallback ? (
                 <span className="text-green-600 dark:text-green-400">System Voice (Fallback)</span>
               ) : (
                 <span>{voice === 'Male' ? 'Puck' : 'Kore'}</span>
               )}
             </p>
             <p className="text-sm text-slate-900 dark:text-white font-medium truncate">
               {activeIndex >= 0 ? data.news[activeIndex].headline : "Initializing..."}
             </p>
           </div>
           <button onClick={() => { setIsPlaying(false); stopAudio(); setActiveIndex(-1); }} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors text-slate-500 dark:text-slate-300">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
           </button>
        </div>
      )}
      
      {/* Share Modal Overlay */}
      <ShareModal 
        isOpen={!!shareModalData}
        onClose={() => setShareModalData(null)}
        data={shareModalData || { title: '', text: '' }}
      />
      
      <style>{`
        .animate-fade-in-left {
          animation: fadeInLeft 0.3s ease-out forwards;
        }
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default BriefingDisplay;
