// src/components/ZoomableImage.jsx
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Button } from './ui';
import { Minus, Plus, RotateCcw } from './ui/icons';

// Inline sizes: the library injects its own unlayered CSS (fit-content), which
// beats Tailwind's layered utilities, so a class here shrink-wraps the zoom area
// to the image. `wheel.step` multiplies a wheel notch's deltaY (about 100).
const FILL = { width: '100%', height: '100%' };

export default function ZoomableImage({ src, alt }) {
  return (
    <div className="w-full h-full bg-surface2 border border-border2 rounded-[var(--radius-default)] overflow-hidden relative">
      <TransformWrapper initialScale={1} minScale={1} maxScale={8} wheel={{ step: 0.005 }}>
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute bottom-4 right-4 z-10 flex gap-2">
              <Button size="icon" variant="secondary" aria-label="Zoom in" onClick={() => zoomIn()}><Plus size={16} strokeWidth={1.75} aria-hidden="true" /></Button>
              <Button size="icon" variant="secondary" aria-label="Zoom out" onClick={() => zoomOut()}><Minus size={16} strokeWidth={1.75} aria-hidden="true" /></Button>
              <Button size="icon" variant="secondary" aria-label="Reset zoom" onClick={() => resetTransform()}><RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" /></Button>
            </div>

            <TransformComponent wrapperStyle={FILL} contentStyle={FILL} wrapperClass="cursor-grab active:cursor-grabbing">
              {/* No width/height attributes: the box is reserved by the viewer, and
                  `src` is a file of unknown size. decoding="async" keeps a large
                  scan off the main thread. */}
              <img
                src={src}
                alt={alt || 'Zoomable reference'}
                className="w-full h-full object-contain"
                draggable="false"
                decoding="async"
              />
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}
