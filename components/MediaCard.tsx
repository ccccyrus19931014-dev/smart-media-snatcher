import React, { useState } from 'react';
import { Download, Tag, Sparkles, Eye, Trash2, FileVideo, FileImage, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { MediaItem, MediaType } from '../types';
import { fetchRemoteBlob } from '../services/scraperService';

interface MediaCardProps {
  item: MediaItem;
  onDelete: (id: string) => void;
  onAnalyze: (id: string) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({ item, onDelete, onAnalyze }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [imgSrc, setImgSrc] = useState(item.url);
  const [imgErrorCount, setImgErrorCount] = useState(0);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDownloading(true);
    try {
        let blob: Blob;
        if (item.source === 'web') {
            const result = await fetchRemoteBlob(item.url);
            blob = result.blob;
        } else {
            const response = await fetch(item.url);
            blob = await response.blob();
        }
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const ext = item.url.split('.').pop()?.split(/[?#]/)[0] || (item.type === MediaType.IMAGE ? 'jpg' : 'mp4');
        const filename = item.analysis?.suggestedFilename 
            ? \`\${item.analysis.suggestedFilename}.\${ext}\`
            : (item.originalName || \`download.\${ext}\`);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Download failed", error);
        alert("Failed to download file. It might be protected.");
    } finally {
        setIsDownloading(false);
    }
  };

  const displayName = item.analysis?.suggestedFilename || item.originalName || "Untitled Media";

  return (
    <div className="group relative bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-slate-500 transition-all duration-300 hover:shadow-xl hover:shadow-black/50 flex flex-col h-full">
      <div className="relative aspect-video bg-slate-900 overflow-hidden">
        {item.type === MediaType.IMAGE ? (
          <img 
            src={imgSrc} 
            alt={displayName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => {
                if (imgErrorCount === 0) {
                    setImgErrorCount(1);
                    setImgSrc(\`https://corsproxy.io/?\${encodeURIComponent(item.url)}\`);
                } else {
                    setImgSrc("https://placehold.co/600x400/1e293b/475569?text=Preview+Unavailable");
                }
            }}
          />
        ) : (
          <video 
            src={item.url} 
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            controls={false}
            muted
          />
        )}
        
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-xs font-medium text-white flex items-center gap-1 shadow-sm">
          {item.type === MediaType.IMAGE ? <FileImage size={12} /> : <FileVideo size={12} />}
          <span className="uppercase opacity-80">{item.url.split('.').pop()?.slice(0,3) || 'UNK'}</span>
        </div>

        {item.isAnalyzing && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10">
            <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
            <span className="text-xs font-medium text-purple-200">Gemini Thinking...</span>
          </div>
        )}

        {!item.isAnalyzing && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
             <button 
              onClick={() => window.open(item.url, '_blank')}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all border border-white/10"
              title="Open Original"
            >
              <ExternalLink size={18} />
            </button>
            
            <button 
              onClick={handleDownload}
              disabled={isDownloading}
              className="p-2 bg-primary-500/80 hover:bg-primary-500 text-white rounded-full backdrop-blur-md transition-all border border-white/10"
              title="Download"
            >
              {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            </button>

             <button 
              onClick={() => onAnalyze(item.id)}
              className="p-2 bg-purple-500/80 hover:bg-purple-500 text-white rounded-full backdrop-blur-md transition-all border border-white/10"
              title="Analyze with AI"
            >
              <Sparkles size={18} />
            </button>

            <button 
              onClick={() => onDelete(item.id)}
              className="p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full backdrop-blur-md transition-all border border-white/10"
              title="Remove"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-white truncate w-full" title={displayName}>
            {displayName}
          </h4>
        </div>
        
        <p className="text-xs text-slate-400 line-clamp-2 h-8 leading-relaxed">
          {item.analysis?.summary || new URL(item.url).hostname}
        </p>

        <div className="flex flex-wrap gap-1 mt-auto min-h-[24px]">
          {item.analysis ? (
            <>
                {item.analysis.category && (
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-primary-500/20 text-primary-300 rounded-full border border-primary-500/30">
                    {item.analysis.category}
                    </span>
                )}
                {item.analysis.tags.slice(0, 2).map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 text-[10px] font-medium bg-slate-700 text-slate-300 rounded-full flex items-center gap-1">
                    <Tag size={8} /> {tag}
                    </span>
                ))}
            </>
          ) : (
              <div onClick={() => onAnalyze(item.id)} className="flex items-center gap-1 text-[10px] text-purple-400 cursor-pointer hover:text-purple-300 transition-colors opacity-60 hover:opacity-100">
                  <Sparkles size={10} />
                  <span>Analyze to generate tags</span>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};
