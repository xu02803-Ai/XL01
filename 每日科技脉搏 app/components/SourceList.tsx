
import React from 'react';
import { GroundingMetadata } from '../types';

interface SourceListProps {
  metadata: GroundingMetadata | null;
}

const SourceList: React.FC<SourceListProps> = ({ metadata }) => {
  if (!metadata || !metadata.groundingChunks || metadata.groundingChunks.length === 0) {
    return null;
  }

  // Deduplicate links based on URI
  const uniqueChunks = metadata.groundingChunks.reduce((acc, current) => {
    const x = acc.find(item => item.web?.uri === current.web?.uri);
    if (!x && current.web) {
      return acc.concat([current]);
    }
    return acc;
  }, [] as typeof metadata.groundingChunks);

  return (
    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-dark-border transition-colors">
      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        信息来源 (Sources)
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {uniqueChunks.map((chunk, idx) => (
          chunk.web ? (
            <a 
              key={idx}
              href={chunk.web.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col p-3 rounded-lg bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border hover:border-blue-400 dark:hover:border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group shadow-sm dark:shadow-none"
            >
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-1 transition-colors">
                {chunk.web.title || "Unknown Source"}
              </span>
              <span className="text-xs text-slate-500 mt-1 line-clamp-1 font-mono">
                {new URL(chunk.web.uri).hostname}
              </span>
            </a>
          ) : null
        ))}
      </div>
    </div>
  );
};

export default SourceList;
