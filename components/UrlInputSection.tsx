import React, { useState } from 'react';
import { Search, Loader2, Globe, Link2 } from 'lucide-react';

interface UrlInputSectionProps {
  onScrape: (url: string) => void;
  isScraping: boolean;
}

export const UrlInputSection: React.FC<UrlInputSectionProps> = ({ onScrape, isScraping }) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onScrape(url);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-8">
      <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl shadow-lg backdrop-blur-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Globe className="text-primary-500" />
            Web Media Grabber
          </h2>
          <p className="text-slate-400">
            Enter a website URL to automatically extract all images and videos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative flex items-center">
          <div className="absolute left-4 text-slate-500">
            <Link2 size={20} />
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl py-4 pl-12 pr-32 text-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all shadow-inner placeholder:text-slate-600"
            required
            disabled={isScraping}
          />
          <button
            type="submit"
            disabled={isScraping || !url.trim()}
            className={\`absolute right-2 top-2 bottom-2 rounded-lg px-6 font-medium text-white shadow-lg transition-all flex items-center gap-2
              \${isScraping || !url.trim() 
                ? 'bg-slate-700 cursor-not-allowed text-slate-400' 
                : 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 hover:shadow-primary-500/25'
              }\`}
          >
            {isScraping ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <Search size={20} />
                <span>Snatch</span>
              </>
            )}
          </button>
        </form>
        
        <div className="mt-3 text-center">
          <p className="text-xs text-slate-500">
            Works best on static content. Some dynamic sites or streaming platforms (YouTube) may be restricted.
          </p>
        </div>
      </div>
    </div>
  );
};
