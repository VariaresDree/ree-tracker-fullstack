// src/components/MediaViewer.jsx
import React from 'react';
import ZoomableImage from './ZoomableImage';

const extractYouTubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export default function MediaViewer({ item }) {
  if (!item) return null;

  switch (item.type) {
    case 'video':
      let embedUrl = item.url;
      if (item.url.includes('youtube.com') || item.url.includes('youtu.be')) {
        const videoId = extractYouTubeId(item.url);
        if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
      }
      return (
        <div className="w-full aspect-video rounded-xl overflow-hidden border border-border2 shadow-lg bg-black">
          <iframe 
            width="100%" height="100%" src={embedUrl} title={item.title} frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen
          ></iframe>
        </div>
      );
      
    case 'audio':
      return (
        <div className="w-full p-6 bg-surface border border-border2 rounded-xl shadow-sm flex flex-col items-center gap-4 mt-8">
          <div className="w-20 h-20 rounded-full bg-reePurple/10 border border-reePurple/30 flex items-center justify-center text-4xl shadow-[0_0_15px_rgba(139,92,246,0.2)] animate-pulse">🎙️</div>
          <div className="text-sm font-bold text-textMain text-center mt-2">{item.title}</div>
          <div className="text-[11px] font-mono text-muted uppercase tracking-widest -mt-2">Audio Playback Matrix</div>
          <audio controls className="w-full max-w-md mt-4 custom-audio-player">
            <source src={item.url} type="audio/mpeg" />
            <source src={item.url} type="audio/wav" />
            <source src={item.url} type="audio/ogg" />
          </audio>
        </div>
      );
      
    case 'image':
      return (
        <div className="w-full h-[60vh] sm:h-[80vh]">
          <ZoomableImage src={item.url} alt={item.title} />
        </div>
      );
      
    case 'pdf':
      let pdfUrl = item.url;
      
      // Force Drive links into Preview mode
      if (pdfUrl.includes('drive.google.com')) {
        const driveIdMatch = pdfUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (driveIdMatch && driveIdMatch[1]) {
            pdfUrl = `https://drive.google.com/file/d/${driveIdMatch[1]}/preview`;
        } else {
            pdfUrl = pdfUrl.replace(/\/(view|edit)(.*)$/g, '/preview');
        }
      }

      const finalPdfUrl = pdfUrl.includes('drive.google.com') ? pdfUrl : `${pdfUrl}#toolbar=0`;

      return (
        <div className="w-full h-[80vh] rounded-xl overflow-hidden border border-border2 shadow-sm bg-surface2 relative">
          {/* 🚀 ROOT CAUSE FIXED: The strict "sandbox" attribute was removed. 
              Google Drive requires unrestricted iframe access to execute its own UI scripts. */}
          <iframe 
             src={finalPdfUrl} 
             className="w-full h-full relative z-10 border-0" 
             title={item.title}
             allow="autoplay; encrypted-media"
             allowFullScreen
          ></iframe>
        </div>
      );

    default:
      return (
        <div className="p-8 text-center border-2 border-dashed border-border2 rounded-xl text-muted2 text-xs uppercase tracking-widest font-mono mt-8">
          Unsupported media format detected.
        </div>
      );
  }
}