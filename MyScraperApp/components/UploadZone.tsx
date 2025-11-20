import React, { useCallback, useState } from 'react';
import { Upload, FileImage, FileVideo, Loader2 } from 'lucide-react';

interface UploadZoneProps {
  onFilesSelected: (files: FileList) => void;
  isProcessing: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFilesSelected, isProcessing }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  }, [onFilesSelected]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={\`
        relative w-full p-8 rounded-2xl border-2 border-dashed transition-all duration-300 ease-out
        flex flex-col items-center justify-center text-center gap-4 group cursor-pointer
        \${isDragging 
          ? 'border-primary-500 bg-primary-500/10 scale-[1.01]' 
          : 'border-slate-700 hover:border-slate-500 bg-slate-800/50 hover:bg-slate-800'
        }
      \`}
    >
      <input
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleInputChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        disabled={isProcessing}
      />

      <div className={\`p-4 rounded-full bg-slate-700 group-hover:bg-slate-600 transition-colors \${isProcessing ? 'animate-pulse' : ''}\`}>
        {isProcessing ? (
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        ) : (
          <Upload className="w-8 h-8 text-slate-300 group-hover:text-white transition-colors" />
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-white">
          {isProcessing ? 'Processing Media...' : 'Drop images or videos here'}
        </h3>
        <p className="text-sm text-slate-400">
          or click to browse (Max 20MB per file)
        </p>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
        <div className="flex items-center gap-1">
          <FileImage className="w-4 h-4" /> JPG, PNG, WEBP
        </div>
        <div className="flex items-center gap-1">
          <FileVideo className="w-4 h-4" /> MP4, WEBM
        </div>
      </div>
    </div>
  );
};
