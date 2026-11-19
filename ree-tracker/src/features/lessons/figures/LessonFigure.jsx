// src/features/lessons/figures/LessonFigure.jsx
//
// One way to draw any lesson figure (2026-11-19): a `type` picks the kit's
// drawing (plot, phasor, circuit, blocks); a `figure` id is a Units and tools ›
// Shapes drawing, as the first lessons used. Loaded lazily, so only lessons
// with a figure fetch the kit.
import ShapeFigure from '../../conversion/shapes/ShapeFigure';
import Blocks from './Blocks';
import Circuit from './Circuit';
import Phasor from './Phasor';
import Plot from './Plot';

const KINDS = { plot: Plot, phasor: Phasor, circuit: Circuit, blocks: Blocks };

export default function LessonFigure({ type, ...spec }) {
  if (type == null) return <ShapeFigure {...spec} />;
  const Drawing = KINDS[type];
  if (!Drawing) throw new Error(`No lesson figure of type "${type}".`);
  return <Drawing {...spec} />;
}
