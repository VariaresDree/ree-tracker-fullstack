// src/components/Scratchpad.jsx
import React, { useRef, useState, useEffect } from 'react';

export default function Scratchpad({ isOpen, onClose }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState(null);

  // Canvas 2D can't resolve CSS variables directly, so read the design-system
  // accent once and pass the computed color (keeps the stroke themable instead
  // of a hardcoded hex). Falls back to the previous cyan if the var is unset.
  const accentColor = () =>
    getComputedStyle(canvasRef.current || document.documentElement)
      .getPropertyValue('--accent-signal').trim() || '#06b6d4';

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;

      const ctx = canvas.getContext("2d");
      ctx.lineCap = "round";
      ctx.strokeStyle = accentColor();
      ctx.lineWidth = 3;
      setContext(ctx);
    }
  }, [isOpen]);

  // CRITICAL FIX 3: Canvas Distortion Lock (Resize Observer)
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
        if (!canvasRef.current || !context) return;
        const canvas = canvasRef.current;
        
        // 1. Save the current drawing to a temporary off-screen canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCanvas.getContext('2d').drawImage(canvas, 0, 0);

        // 2. Safely resize the active canvas boundaries
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;

        // 3. Re-apply the context configurations (resizing clears them)
        context.lineCap = "round";
        context.strokeStyle = accentColor();
        context.lineWidth = 3;

        // 4. Paint the saved drawing back onto the resized canvas
        context.drawImage(tempCanvas, 0, 0);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, context]);

  const startDrawing = ({ nativeEvent }) => {
    if (!context) return;
    const { offsetX, offsetY } = nativeEvent;
    context.beginPath();
    context.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing || !context) return;
    const { offsetX, offsetY } = nativeEvent;
    context.lineTo(offsetX, offsetY);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!context) return;
    context.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (context && canvasRef.current) {
      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const handleTouch = (e, action) => {
    e.preventDefault(); 
    if (!canvasRef.current) return;
    
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const nativeEvent = { 
        offsetX: (touch.clientX - rect.left) * scaleX, 
        offsetY: (touch.clientY - rect.top) * scaleY 
    };

    if (action === 'start') startDrawing({ nativeEvent });
    if (action === 'move') draw({ nativeEvent });
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[40] bg-surface/40 backdrop-blur-sm border-2 border-reeCyan rounded-xl overflow-hidden flex flex-col page-fade-in">
      <div className="flex justify-between items-center p-2 bg-bg/90 border-b border-border2 pointer-events-auto">
        <span className="text-eyebrow flex items-center gap-2" style={{ color: 'var(--accent-signal)' }}>
          Scratchpad
        </span>
        <div className="flex gap-2">
          <button onClick={clearCanvas} className="px-3 py-1 bg-surface2 hover:bg-surface3 text-textMain rounded-[var(--radius-sm)] text-[11px] font-bold uppercase transition-colors shadow-sm cursor-pointer">
            Clear
          </button>
          <button onClick={onClose} className="px-3 py-1 bg-[var(--accent-danger)] hover:brightness-110 text-white rounded-[var(--radius-sm)] text-[11px] font-bold uppercase transition-all shadow-sm cursor-pointer">
            Close
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={(e) => handleTouch(e, 'start')}
        onTouchMove={(e) => handleTouch(e, 'move')}
        onTouchEnd={stopDrawing}
        className="flex-1 w-full h-full cursor-crosshair touch-none"
      />
    </div>
  );
}