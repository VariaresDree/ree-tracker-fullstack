// src/components/ZoomableImage.jsx
import React from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

export default function ZoomableImage({ src, alt }) {
  return (
    <div className="w-full h-full bg-surface2 border border-border2 rounded-xl overflow-hidden relative group">
      {/* Overlay controls hint */}
      <div className="absolute top-4 right-4 z-10 bg-bg/80 backdrop-blur-sm border border-border2 px-3 py-1.5 rounded-lg text-[0.65rem] font-bold text-muted uppercase tracking-widest pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        Pinch or Scroll to Zoom
      </div>

      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={8} // Allows extreme zoom for dense charts and architectural plans
        centerOnInit={true}
        wheel={{ step: 0.1 }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Manual Controls for Desktop/Mouse users */}
            <div className="absolute bottom-4 right-4 z-10 flex gap-2">
              <button onClick={() => zoomIn()} className="w-8 h-8 bg-surface3 hover:bg-reeBlue/20 border border-border2 hover:border-reeBlue/50 rounded-lg text-textMain flex items-center justify-center transition-colors shadow-sm cursor-pointer">
                +
              </button>
              <button onClick={() => zoomOut()} className="w-8 h-8 bg-surface3 hover:bg-reeBlue/20 border border-border2 hover:border-reeBlue/50 rounded-lg text-textMain flex items-center justify-center transition-colors shadow-sm cursor-pointer">
                -
              </button>
              <button onClick={() => resetTransform()} className="w-8 h-8 bg-surface3 hover:bg-reeRed/20 border border-border2 hover:border-reeRed/50 rounded-lg text-textMain flex items-center justify-center transition-colors shadow-sm cursor-pointer">
                ↺
              </button>
            </div>

            <TransformComponent wrapperClass="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing">
              <img 
                src={src} 
                alt={alt || 'Zoomable reference'} 
                className="max-w-full max-h-[80vh] object-contain"
                draggable="false"
              />
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}