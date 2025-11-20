import React, { useState } from 'react';
import { Layout, Filter, AlertCircle, Trash2, Download } from 'lucide-react';
import { MediaCard } from './components/MediaCard';
import { UrlInputSection } from './components/UrlInputSection';
import { MediaItem, MediaType, FilterType } from './types';
import { analyzeMediaContent } from './services/geminiService';
import { scrapeWebPage, fetchRemoteBlob } from './services/scraperService';

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1]; 
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

export default function App() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState<string>('');

  const handleScrape = async (url: string) => {
    setIsScraping(true);
    setErrorMsg(null);

    try {
      const result = await scrapeWebPage(url);
      setPageTitle(result.title);

      const newItems: MediaItem[] = [];

      result.images.forEach((imgUrl, idx) => {
        if (!mediaItems.find(i => i.url === imgUrl)) {
           const rawName = imgUrl.split('/').pop()?.split(/[?#]/)[0] || \`image-\${idx}.jpg\`;
           const name = rawName.length > 30 ? rawName.substring(0, 20) + '...' + rawName.split('.').pop() : rawName;

           newItems.push({
             id: \`web-img-\${Date.now()}-\${idx}\`,
             url: imgUrl,
             originalName: name,
             type: MediaType.IMAGE,
             timestamp: Date.now(),
             isAnalyzing: false,
             source: 'web'
           });
        }
      });

      result.videos.forEach((vidUrl, idx) => {
         if (!mediaItems.find(i => i.url === vidUrl)) {
           const rawName = vidUrl.split('/').pop()?.split(/[?#]/)[0] || \`video-\${idx}.mp4\`;
           const name = rawName.length > 30 ? rawName.substring(0, 20) + '...' + rawName.split('.').pop() : rawName;

           newItems.push({
             id: \`web-vid-\${Date.now()}-\${idx}\`,
             url: vidUrl,
             originalName: name,
             type: MediaType.VIDEO,
             timestamp: Date.now(),
             isAnalyzing: false,
             source: 'web'
           });
         }
      });

      if (newItems.length === 0) {
        setErrorMsg("No suitable media found. The site might be fully protected or empty.");
      } else {
        setMediaItems(prev => [...newItems, ...prev]);
      }

    } catch (err: any) {
      setErrorMsg(err.message || "Failed to scrape URL.");
    } finally {
      setIsScraping(false);
    }
  };

  const handleAnalyzeItem = async (id: string) => {
    const item = mediaItems.find(i => i.id === id);
    if (!item || item.isAnalyzing) return;

    setMediaItems(prev => prev.map(i => i.id === id ? { ...i, isAnalyzing: true } : i));

    try {
      let blob: Blob;
      let mimeType = item.mimeType;

      if (item.source === 'web') {
         const result = await fetchRemoteBlob(item.url);
         blob = result.blob;
         mimeType = result.mimeType;
      } else {
         const res = await fetch(item.url);
         blob = await res.blob();
         mimeType = blob.type;
      }

      const base64 = await blobToBase64(blob);
      const analysis = await analyzeMediaContent(base64, mimeType || (item.type === MediaType.IMAGE ? 'image/jpeg' : 'video/mp4'));

      setMediaItems(prev => prev.map(i => 
        i.id === id ? { ...i, isAnalyzing: false, analysis, mimeType } : i
      ));

    } catch (err) {
      console.error("Analysis failed", err);
      setMediaItems(prev => prev.map(i => 
        i.id === id ? { ...i, isAnalyzing: false } : i 
      ));
    }
  };

  const handleDelete = (id: string) => {
    setMediaItems(prev => prev.filter(i => i.id !== id));
  };

  const handleClearAll = () => {
    setMediaItems([]);
    setPageTitle('');
    setErrorMsg(null);
  };

  const filteredItems = mediaItems.filter(item => {
    if (filterType === 'IMAGE' && item.type !== MediaType.IMAGE) return false;
    if (filterType === 'VIDEO' && item.type !== MediaType.VIDEO) return false;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const inName = item.originalName.toLowerCase().includes(query);
      const inSummary = item.analysis?.summary.toLowerCase().includes(query);
      const inTags = item.analysis?.tags.some(t => t.toLowerCase().includes(query));
      return inName || inSummary || inTags;
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200 font-sans selection:bg-primary-500/30">
      
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-primary-500 to-indigo-600 p-2 rounded-lg shadow-lg shadow-primary-500/20">
              <Layout className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 hidden sm:block">
              Smart Media Snatcher
            </h1>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
            <span>v2.5 Pro Scraper</span>
            <div className="h-4 w-px bg-slate-800"></div>
            <span className="text-primary-500 font-semibold">{mediaItems.length} Items</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        <UrlInputSection onScrape={handleScrape} isScraping={isScraping} />

        {errorMsg && (
          <div className="max-w-3xl mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={20} />
            <p>{errorMsg}</p>
          </div>
        )}

        <div className="sticky top-20 z-40 bg-slate-950/90 backdrop-blur-sm py-4 mb-6 border-b border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
          <div className="flex items-center gap-4">
            {pageTitle && (
                <div className="hidden md:block">
                    <h3 className="text-sm text-slate-500 uppercase tracking-wider font-bold">Source</h3>
                    <p className="text-white font-medium truncate max-w-[200px]">{pageTitle}</p>
                </div>
            )}
            
            <div className="flex p-1 bg-slate-900 rounded-lg border border-slate-800">
              {(['ALL', 'IMAGE', 'VIDEO'] as FilterType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={\`px-4 py-1.5 text-xs font-medium rounded-md transition-all \${
                    filterType === type 
                      ? 'bg-slate-700 text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-300'
                  }\`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:flex-none sm:w-64">
               <input 
                 type="text" 
                 placeholder="Filter media..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg pl-4 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none"
               />
               <Filter className="absolute right-3 top-2.5 text-slate-600" size={14} />
            </div>
            
            {mediaItems.length > 0 && (
                <button 
                    onClick={handleClearAll}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    title="Clear All"
                >
                    <Trash2 size={18} />
                </button>
            )}
          </div>
        </div>

        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-20">
            {filteredItems.map(item => (
              <div key={item.id} className="h-[300px] animate-in fade-in zoom-in duration-300">
                <MediaCard 
                    item={item} 
                    onDelete={handleDelete} 
                    onAnalyze={handleAnalyzeItem}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-600">
            {!isScraping && !errorMsg && (
                <>
                    <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-4 animate-pulse-slow">
                        <Download className="text-slate-700" size={32} />
                    </div>
                    <p className="text-lg font-medium text-slate-500">Waiting for URL...</p>
                    <p className="text-sm opacity-60">Enter a link above to start snatching media</p>
                </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
