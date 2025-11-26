
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import BriefingDisplay from './components/BriefingDisplay';
import { fetchDailyTechNews, askFollowUpQuestion } from './services/geminiService';
import { DailyBriefingData, AppState, ViewMode, NewsItem, Theme } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [briefingData, setBriefingData] = useState<DailyBriefingData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // View State
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  
  // Theme State
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('techpulse_theme');
        return (saved as Theme) || 'auto';
    }
    return 'auto';
  });

  // Saved Articles State
  const [savedNews, setSavedNews] = useState<NewsItem[]>(() => {
    const saved = localStorage.getItem('techpulse_saved');
    return saved ? JSON.parse(saved) : [];
  });

  // Chat State
  const [showChat, setShowChat] = useState(false);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatAnswer, setChatAnswer] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // Apply Theme Effect
  useEffect(() => {
    const root = window.document.documentElement;
    const applyDark = () => root.classList.add('dark');
    const removeDark = () => root.classList.remove('dark');

    if (theme === 'dark') {
      applyDark();
    } else if (theme === 'light') {
      removeDark();
    } else {
      // Auto Mode: 6AM to 6PM is Light, otherwise Dark
      const hour = new Date().getHours();
      const isDay = hour >= 6 && hour < 18;
      if (isDay) removeDark();
      else applyDark();
    }
    localStorage.setItem('techpulse_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'auto';
      return 'light';
    });
  };

  // Persist saved news
  useEffect(() => {
    localStorage.setItem('techpulse_saved', JSON.stringify(savedNews));
  }, [savedNews]);

  const handleGenerateNews = async () => {
    setViewMode('daily'); // Switch to daily view on generate
    setAppState(AppState.LOADING);
    setErrorMsg('');
    setChatAnswer('');
    setShowChat(false);
    setBriefingData(null);
    
    try {
      console.log("🚀 Starting news generation...");
      const data = await fetchDailyTechNews(today);
      if (!data.news || data.news.length === 0) {
        throw new Error("No news items found. Please try again.");
      }
      console.log("✅ News generation successful, items:", data.news.length);
      setBriefingData(data);
      setAppState(AppState.SUCCESS);
    } catch (err: any) {
      console.error("❌ News generation failed:", err);
      setAppState(AppState.ERROR);
      setErrorMsg(err.message || "Failed to fetch news. Check browser console for details.");
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuestion.trim()) return;

    // Use current view data for context
    const currentContext = viewMode === 'saved' ? savedNews : briefingData?.news;
    if (!currentContext || currentContext.length === 0) return;

    setIsChatting(true);
    try {
      const answer = await askFollowUpQuestion(currentContext, chatQuestion);
      setChatAnswer(answer);
    } catch (err) {
      setChatAnswer("Sorry, I couldn't process that request.");
    } finally {
      setIsChatting(false);
    }
  };

  const handleToggleBookmark = (item: NewsItem, imageUrl?: string) => {
    setSavedNews(prev => {
      const exists = prev.find(i => i.headline === item.headline);
      if (exists) {
        return prev.filter(i => i.headline !== item.headline);
      }
      // Add new item, preserving image if generated
      return [...prev, { ...item, imageUrl: imageUrl || item.imageUrl }];
    });
  };

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'daily' && !briefingData && appState === AppState.IDLE) {
      // Just switch view, don't auto-fetch unless user clicks generate
    }
  };

  // Determine what to display based on ViewMode
  const getDisplayData = (): DailyBriefingData | null => {
    if (viewMode === 'saved') {
      return {
        news: savedNews,
        groundingMetadata: null,
        date: "My Saved Collection"
      };
    }
    return briefingData;
  };

  const displayData = getDisplayData();
  const savedHeadlines = new Set(savedNews.map(i => i.headline));

  // Should we show the Hero? 
  // Show if: IDLE AND Daily Mode. 
  // If Saved Mode, show content immediately (if saved items exist or empty state).
  const showHero = appState === AppState.IDLE && viewMode === 'daily';
  
  return (
    <div className="min-h-screen font-sans transition-colors duration-300 bg-slate-50 text-slate-900 dark:bg-dark-bg dark:text-slate-200 selection:bg-blue-500/30">
      <Header 
        viewMode={viewMode} 
        onViewChange={handleViewChange} 
        savedCount={savedNews.length}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="container mx-auto px-4 py-8 sm:py-12 flex flex-col items-center">
        
        {/* Hero Section */}
        {showHero && (
          <div className="text-center max-w-2xl mt-10 sm:mt-20 animate-fade-in-up">
            <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-2xl mb-6 ring-1 ring-blue-500/20 shadow-[0_0_20px_rgba(56,189,248,0.15)]">
              <span className="text-3xl">⚡️</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
              每日 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300">科技脉搏</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
              使用 Google Gemini 2.5 与实时搜索功能，为您生成今日最前沿的科技新闻简报。<br className="hidden sm:block"/>
              AI 驱动，精准摘要，不再错过任何重要更新。
            </p>
            <button 
              onClick={handleGenerateNews}
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white transition-all duration-200 bg-blue-600 rounded-full hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 dark:focus:ring-offset-gray-900 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:-translate-y-1"
            >
              生成今日简报 (Generate Briefing)
              <svg className="w-5 h-5 ml-2 -mr-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
            </button>
          </div>
        )}

        {/* Loading State (Daily only) */}
        {viewMode === 'daily' && appState === AppState.LOADING && (
          <div className="flex flex-col items-center justify-center mt-20">
            <div className="relative w-24 h-24">
              <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500/30 rounded-full animate-pulse"></div>
              <div className="absolute top-0 left-0 w-full h-full border-t-4 border-blue-500 rounded-full animate-spin"></div>
            </div>
            <h2 className="mt-8 text-xl font-semibold text-slate-700 dark:text-white">正在搜寻全网科技资讯...</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 animate-pulse">Connecting to Gemini 2.5 Flash & Google Search...</p>
          </div>
        )}

        {/* Error State (Daily only) */}
        {viewMode === 'daily' && appState === AppState.ERROR && (
          <div className="w-full max-w-md bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20 rounded-xl p-6 text-center mt-10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-200 mb-2">Oops, something went wrong</h3>
            <p className="text-red-600 dark:text-red-300/80 mb-6 text-sm">{errorMsg}</p>
            <button 
              onClick={handleGenerateNews}
              className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Content Display (Daily Success OR Saved View) */}
        {((viewMode === 'daily' && appState === AppState.SUCCESS) || viewMode === 'saved') && displayData && (
          <div className="w-full animate-fade-in">
             {/* Action Bar */}
             <div className="flex justify-between max-w-5xl mx-auto mb-6 items-center px-2">
               {viewMode === 'daily' ? (
                 <button 
                   onClick={handleGenerateNews} 
                   className="flex items-center text-sm text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white transition-colors"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                   New Briefing
                 </button>
               ) : (
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {savedNews.length} Saved Article{savedNews.length !== 1 ? 's' : ''}
                  </span>
               )}
               
               {!showChat && (
                 <button
                   onClick={() => setShowChat(true)}
                   className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-blue-600/20 hover:bg-slate-100 dark:hover:bg-blue-600/30 text-blue-600 dark:text-blue-400 rounded-lg border border-slate-200 dark:border-blue-500/30 transition-all text-sm font-medium shadow-sm dark:shadow-none"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                   AI Chat
                 </button>
               )}
             </div>

            <div className="flex flex-col lg:flex-row gap-8 max-w-[1400px] mx-auto">
              {/* Main Content */}
              <div className={`transition-all duration-500 ${showChat ? 'lg:w-2/3' : 'w-full flex justify-center'}`}>
                 <BriefingDisplay 
                    data={displayData} 
                    savedHeadlines={savedHeadlines}
                    onToggleBookmark={handleToggleBookmark}
                 />
              </div>

              {/* Chat Sidebar */}
              {showChat && (
                <div className="lg:w-1/3 w-full animate-slide-in-right">
                  <div className="sticky top-24 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-4 sm:p-6 shadow-xl dark:shadow-2xl flex flex-col h-[calc(100vh-8rem)] transition-colors">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-dark-border pb-4">
                      <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Gemini 3 Pro
                      </h3>
                      <button onClick={() => setShowChat(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2 custom-scrollbar">
                      <div className="bg-slate-50 dark:bg-dark-bg/50 p-3 rounded-lg border border-slate-100 dark:border-dark-border/50">
                        <p className="text-sm text-slate-700 dark:text-slate-300">👋 你好! 我是您的 AI 助手。对今天的哪条新闻感兴趣？您可以问我更多细节。</p>
                      </div>
                      {chatAnswer && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-500/20">
                          <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{chatAnswer}</p>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleAskQuestion} className="relative">
                      <input
                        type="text"
                        value={chatQuestion}
                        onChange={(e) => setChatQuestion(e.target.value)}
                        placeholder="Ask about a news item..."
                        className="w-full bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl py-3 pl-4 pr-12 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      />
                      <button 
                        type="submit"
                        disabled={isChatting || !chatQuestion.trim()}
                        className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-500 transition-colors"
                      >
                         {isChatting ? (
                           <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                         ) : (
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                         )}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      
      <style>{`
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .animate-slide-in-right {
          animation: slideInRight 0.4s ease-out forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        /* Custom Scrollbar for chat */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #94a3b8;
          border-radius: 20px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #334155;
        }
      `}</style>
    </div>
  );
};

export default App;
