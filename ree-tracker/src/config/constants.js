// src/config/constants.js

// Offline / pre-fetch fallback TOS — used only until the live taxonomy arrives
// from GET /api/config/tos (the server's Topic table, managed in the Library's
// TOS manager). Snapshot of the ACTIVE topics in production on 2026-10-03.
// It is NOT the backend's prcTaxonomy.js seed: production's taxonomy is
// TOS-editor managed and diverged from that seed long ago. Anything that writes
// topic labels (AI ingestion, manual add, review edits) re-pulls the live list
// first (services/liveTaxonomy.js) and the server refuses labels outside it, so
// a stale entry here can only affect offline display.
export const TOS = {
  Mathematics: [
    'Advanced Engineering Mathematics', 'Algebra', 'Analytic Geometry',
    'Calculus 1', 'Calculus 2', 'Complex Numbers', 'Differential Equations',
    'Engineering Data Analytics', 'Math in the Modern World',
    'Numerical Methods & Analysis', 'Plane Geometry', 'Probability & Statistics',
    'Solid Geometry', 'Trigonometry', 'Vector Analysis'
  ],
  ESAS: [
    'Basic Occupational Safety & Health', 'Basic Thermodynamics',
    'Chemistry for Engineers', 'Computer Programming',
    'EE Laws, Codes, & Professional Ethics', 'Electrical Standards & Practices',
    'Engineering Economics', 'Engineering Mechanics',
    'Environmental Science & Engineering', 'Fluid Mechanics',
    'Fundamentals of Deformable Bodies', 'Material Science',
    'Microprocessor Systems and Logic Circuits', 'Physics for Engineers',
    'Quantities/units/constants (ESAS)', 'Research Methods',
    'Technopreneurship & Project Management'
  ],
  EE: [
    'Distribution Systems & Substation Design', 'Electric Circuits 1',
    'Electric Circuits 2', 'Electrical Apparatus & Devices',
    'Electrical Machinery 1', 'Electrical Machinery 2',
    'Electrical System & Illumination Design', 'Electrical Transient Analysis',
    'Electromagnetism', 'Electronics 1 and 2', 'Feedback Control Systems',
    'Fundamentals of Electronic Communications', 'Industrial Electronics',
    'Instrumentation & Control', 'Power Plant Engineering',
    'Power System Analysis', 'Power System Protection',
    'Quantities/units/constants (EE)'
  ],
};
