// src/config/constants.js

// Offline / pre-fetch fallback TOS. Canonical PRC REE board-exam subtopics —
// MUST mirror the backend seed (ree-tracker-backend/src/config/prcTaxonomy.js);
// the live list is served from the Topic taxonomy via GET /api/config/tos.
export const TOS = {
  Mathematics: [
    'Algebra', 'Trigonometry', 'Analytic Geometry',
    'Differential Calculus', 'Integral Calculus',
    'Complex Numbers and Space Vectors', 'Probability and Statistics',
    'Matrices and Determinants', 'Sequences and Series',
    'Other Engineering Mathematics'
  ],
  ESAS: [
    'General Chemistry', 'College Physics', 'Engineering Materials',
    'Engineering Mechanics', 'Thermodynamics', 'Fluid Mechanics',
    'Engineering Economics and Management',
    'Electrical Engineering Law and Code of Ethics',
    'Contracts and Specifications', 'Computer Fundamentals and Programming',
    'Philippine Electrical Code Parts 1 and 2'
  ],
  EE: [
    'Quantities/Units/Constants', 'Electrical Materials',
    'Passive Circuit Elements', 'Active Circuit Elements', 'AC Impedance',
    'Instruments and Measurements', 'DC Electric Circuits',
    'Transient Response', 'Magnetic Circuits', 'AC Electric Circuits',
    'AC Generators', 'DC Generators', 'Energy Sources', 'Energy Conversion',
    'Prime Movers', 'Rotating Electric Machinery', 'Power System Components',
    'AC Transmission', 'DC Transmission', 'Power System Interconnection',
    'Substation Design', 'Power Distribution', 'Wiring Design for Buildings',
    'Power Electronics', 'Industrial Electronics', 'Illumination',
    'Telecommunications', 'Computer Application in Electrical Power Industry'
  ],
};