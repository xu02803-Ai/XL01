
import React, { useState } from 'react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    title: string;
    text: string;
  };
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, data }) => {
  const [statusMsg, setStatusMsg] = useState<string>('');

  if (!isOpen) return null;

  // Construct the shareable content
  const currentUrl = `${window.location.origin}${window.location.pathname}`;
  
  const shareText = `${data.title}\n\n${data.text}\n\n🔗 阅读更多 (Read More): ${currentUrl}`;
  
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(currentUrl);

  const handleCopyAndOpen = async (platformName: string, urlToOpen: string) => {
    try {
      await navigator.clipboard.writeText(shareText);
      setStatusMsg(`已复制内容，请在 ${platformName} 粘贴`);
      setTimeout(() => {
        window.open(urlToOpen, '_blank');
        setStatusMsg('');
      }, 1500);
    } catch (err) {
      setStatusMsg('复制失败');
    }
  };

  const platforms = [
    {
      name: 'Twitter / X',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      ),
      color: 'bg-black',
      action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(data.title + "\n\n" + data.text)}&url=${encodedUrl}`, '_blank')
    },
    {
      name: 'Facebook',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036c-2.148 0-2.971.956-2.971 3.035v.975h5.269l-1.44 3.667h-3.829v7.98h-4.838z"/></svg>
      ),
      color: 'bg-[#1877F2]',
      action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank')
    },
    {
      name: 'LINE',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.174-.51.432-.597.065-.02.132-.031.2-.031.214 0 .391.09.51.25l2.443 3.317V8.108c0-.345.282-.63.63-.63.345 0 .627.285.627.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.432-6.975 1.496-1.724 2.552-3.6 2.552-5.968"/></svg>
      ),
      color: 'bg-[#00C300]',
      action: () => window.open(`https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`, '_blank')
    },
    {
      name: 'WeChat',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8.691 2.188C3.891 2.188 0 5.433 0 9.44c0 2.228 1.218 4.209 3.12 5.597l-.767 2.373 2.828-1.43c.995.275 2.067.437 3.18.47-.137-.95.047-1.92.572-2.825a6.56 6.56 0 0 1 2.308-2.392c-.156-.01-.314-.015-.473-.015a.434.434 0 0 1-.432-.433V10.78a.434.434 0 0 1 .432-.433h.004c3.085.12 5.753 2.162 6.559 5.021a8.2 8.2 0 0 0 .524-2.863c0-4.008-3.891-7.252-8.691-7.252zm-2.73 4.388a1.051 1.051 0 1 1 0 2.102 1.051 1.051 0 0 1 0-2.102zm5.738 0a1.051 1.051 0 1 1 0 2.102 1.051 1.051 0 0 1 0-2.102zm3.935 4.954c-4.102 0-7.434 2.866-7.434 6.394 0 1.94 1.092 3.659 2.766 4.888l-.666 2.052 2.457-1.24c.833.226 1.722.36 2.645.36 4.102 0 7.434-2.866 7.434-6.394s-3.332-6.394-7.434-6.394zm-2.33 3.674a.824.824 0 1 1 0 1.649.824.824 0 0 1 0-1.649zm4.908 0a.824.824 0 1 1 0 1.649.824.824 0 0 1 0-1.649z"/></svg>
      ),
      color: 'bg-[#07C160]',
      action: () => handleCopyAndOpen('WeChat', 'https://weixin.qq.com/')
    },
    {
      name: 'Instagram',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
      ),
      color: 'bg-gradient-to-tr from-[#FFD600] via-[#FF0169] to-[#D300C5]',
      action: () => handleCopyAndOpen('Instagram', 'https://www.instagram.com/')
    },
    {
      name: 'YouTube',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
      ),
      color: 'bg-[#FF0000]',
      action: () => handleCopyAndOpen('YouTube', 'https://www.youtube.com/')
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in transition-colors">
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden relative animate-fade-in-up transition-colors">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors z-10"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="p-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">分享简报 (Share)</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">选择平台分享链接 (Select platform)</p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            {platforms.map((p) => (
              <button
                key={p.name}
                onClick={p.action}
                className="flex flex-col items-center gap-2 group w-full"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 ${p.color}`}>
                  {p.icon}
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors text-center leading-tight">{p.name}</span>
              </button>
            ))}
          </div>

          <div className="space-y-3">
             {/* Native Share fallback */}
             {typeof navigator.share === 'function' && (
                <button
                    onClick={() => navigator.share({ title: data.title, text: shareText, url: currentUrl })}
                    className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    更多选项 (System Share)
                </button>
             )}
             
             {/* Copy Link fallback */}
             <button
                onClick={() => {
                   navigator.clipboard.writeText(shareText);
                   setStatusMsg('已复制全部内容 (Copied)');
                   setTimeout(() => setStatusMsg(''), 2000);
                }}
                className="w-full py-3 px-4 border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
             >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                复制链接与内容 (Copy All)
             </button>
          </div>

          {statusMsg && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg animate-fade-in-up whitespace-nowrap">
              {statusMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
