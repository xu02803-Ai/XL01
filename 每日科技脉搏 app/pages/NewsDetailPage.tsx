import React, { useState, useEffect } from 'react';
import { NewsItem } from '../types';

interface NewsDetailPageProps {
  onNavigate: (page: string, params?: any) => void;
  newsData?: NewsItem & { date?: string };
}

const NewsDetailPage: React.FC<NewsDetailPageProps> = ({ onNavigate, newsData }) => {
  const [article, setArticle] = useState<NewsItem & { date?: string } | null>(newsData || null);
  const [relatedNews, setRelatedNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(!newsData);

  useEffect(() => {
    // 如果没有通过 props 传递数据，尝试从 localStorage 获取
    if (!newsData) {
      const stored = localStorage.getItem('selectedNews');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setArticle(parsed);
        } catch (e) {
          console.error('Failed to parse stored news data');
        }
      }
    }
    setIsLoading(false);

    // 模拟获取相关新闻
    const savedNews = localStorage.getItem('techpulse_saved');
    if (savedNews) {
      try {
        const news = JSON.parse(savedNews);
        setRelatedNews(news.slice(0, 3));
      } catch (e) {
        console.error('Failed to load related news');
      }
    }
  }, [newsData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-dark-bg dark:to-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading article...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-dark-bg dark:to-dark-bg">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => onNavigate('main')}
            className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            ← 返回首页
          </button>
          <div className="bg-white dark:bg-dark-card rounded-2xl p-8 text-center">
            <p className="text-slate-600 dark:text-slate-400">抱歉，文章未找到</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-dark-bg dark:to-dark-bg">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header with back button */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => onNavigate('main')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7"/>
            </svg>
            返回首页
          </button>
          <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
            {article.category}
          </span>
        </div>

        {/* Featured Image */}
        {article.imageUrl && (
          <div className="mb-8 rounded-2xl overflow-hidden shadow-lg">
            <img
              src={article.imageUrl}
              alt={article.headline}
              className="w-full h-96 object-cover"
            />
          </div>
        )}

        {/* Article Content */}
        <article className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-8 mb-8">
          {/* Title */}
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            {article.headline}
          </h1>

          {/* Meta Information */}
          <div className="flex flex-wrap gap-4 mb-8 pb-8 border-b border-slate-200 dark:border-dark-border">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
              </svg>
              <span className="text-slate-600 dark:text-slate-400">
                {article.date || new Date().toLocaleDateString('zh-CN')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 7h10v10H7z"/>
              </svg>
              <span className="text-slate-600 dark:text-slate-400">{article.category}</span>
            </div>
          </div>

          {/* Summary/Content */}
          <div className="prose dark:prose-invert max-w-none">
            {/* Quick Summary */}
            <div className="bg-slate-50 dark:bg-slate-800/50 border-l-4 border-blue-500 p-4 mb-6 rounded">
              <p className="font-semibold text-slate-900 dark:text-white mb-2">📰 摘要</p>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {article.summary}
              </p>
            </div>

            {/* Full Content */}
            {article.content && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">📖 详细内容</h3>
                <div className="space-y-4">
                  {article.content.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className="text-slate-700 dark:text-slate-300 leading-relaxed text-lg">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Impact Section */}
            {article.impact && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-200 mb-3">
                  💡 影响与意义
                </h3>
                <p className="text-amber-900 dark:text-amber-100 leading-relaxed">
                  {article.impact}
                </p>
              </div>
            )}

            {/* Source Information */}
            {article.source && (
              <div className="border-t border-slate-200 dark:border-dark-border pt-4 mt-6">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">📚 来源：</span> {article.source}
                </p>
              </div>
            )}

            {/* Additional details section */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mt-6">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-3">
                ℹ️ 关于本文
              </h3>
              <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                <li>• 本新闻来自科技动态聚合系统</li>
                <li>• 采用 AI 技术自动生成详细摘要和内容</li>
                <li>• 信息来源于全球主流科技媒体</li>
                <li>• 支持收藏、分享和交互功能</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8 pt-8 border-t border-slate-200 dark:border-dark-border">
            <button className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              </svg>
              收藏文章
            </button>
            <button className="flex-1 px-4 py-3 border-2 border-slate-300 dark:border-dark-border text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-dark-card/50 transition flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
              </svg>
              分享文章
            </button>
          </div>
        </article>

        {/* Related News */}
        {relatedNews.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">相关新闻</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedNews.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onNavigate('newsDetail', { newsData: item })}
                  className="bg-white dark:bg-dark-card rounded-2xl p-6 hover:shadow-lg transition cursor-pointer"
                >
                  <span className="inline-block px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium mb-3">
                    {item.category}
                  </span>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2 hover:text-blue-600">
                    {item.headline}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                    {item.summary}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default NewsDetailPage;
