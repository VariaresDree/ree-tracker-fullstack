// src/config/prcTaxonomy.js
// Canonical PRC REE board-exam Table of Specifications — the seed for the
// Topic taxonomy (roadmap 3.3). Topic names are the user-supplied PRC TOS
// subtopics, VERBATIM (2026-07-09); do not editorialize them. `aliases` maps
// the app's legacy curriculum-course labels (the old hardcoded TOS) onto
// their closest PRC topic so existing questions and history re-attribute —
// each alias resolves to exactly ONE topic. Labels with no honest PRC home
// (e.g. "Feedback Control Systems") are deliberately NOT aliased: the
// migration auto-creates them as curated:false topics so their data stays
// visible until an admin merges them.
//
// Subject-level weights (Math 25 / ESAS 30 / EE 45) live in SyllabusWeight
// (roadmap 3.2) — PRC publishes weights per subject, not per subtopic.

const PRC_TAXONOMY = {
    Mathematics: [
        { name: 'Algebra', aliases: ['Algebra & Complex Numbers'] },
        { name: 'Trigonometry', aliases: [] },
        { name: 'Analytic Geometry', aliases: [] },
        { name: 'Differential Calculus', aliases: ['Calculus 1'] },
        { name: 'Integral Calculus', aliases: ['Calculus 2'] },
        { name: 'Complex Numbers and Space Vectors', aliases: [] },
        { name: 'Probability and Statistics', aliases: ['Probability & Statistics', 'Engineering Data Analytics'] },
        { name: 'Matrices and Determinants', aliases: [] },
        { name: 'Sequences and Series', aliases: [] },
        // PRC: "Other Engineering Mathematics such as Differential Equations,
        // Fourier Series, Laplace Transforms, and others"
        { name: 'Other Engineering Mathematics', aliases: ['Differential Equations', 'Numerical Methods & Analysis'] },
    ],
    ESAS: [
        { name: 'General Chemistry', aliases: ['Chemistry for Engineers'] },
        { name: 'College Physics', aliases: ['Physics for Engineers'] },
        { name: 'Engineering Materials', aliases: ['Material Science'] },
        { name: 'Engineering Mechanics', aliases: ['Fundamentals of Deformable Bodies'] },
        { name: 'Thermodynamics', aliases: ['Basic Thermodynamics'] },
        { name: 'Fluid Mechanics', aliases: [] },
        { name: 'Engineering Economics and Management', aliases: ['Engineering Economics', 'Technopreneurship & Project Management'] },
        { name: 'Electrical Engineering Law and Code of Ethics', aliases: ['EE Laws, Codes, & Professional Ethics'] },
        { name: 'Contracts and Specifications', aliases: [] },
        { name: 'Computer Fundamentals and Programming', aliases: ['Computer Programming', 'Microprocessor Systems and Logic Circuits'] },
        { name: 'Philippine Electrical Code Parts 1 and 2', aliases: [] },
    ],
    EE: [
        { name: 'Quantities/Units/Constants', aliases: [] },
        { name: 'Electrical Materials', aliases: [] },
        { name: 'Passive Circuit Elements', aliases: [] },
        { name: 'Active Circuit Elements', aliases: ['Electronics 1 and 2'] },
        { name: 'AC Impedance', aliases: [] },
        { name: 'Instruments and Measurements', aliases: ['Instrumentation & Control'] },
        { name: 'DC Electric Circuits', aliases: ['Electric Circuits 1'] },
        { name: 'Transient Response', aliases: [] },
        { name: 'Magnetic Circuits', aliases: ['Electromagnetism'] },
        { name: 'AC Electric Circuits', aliases: ['Electric Circuits 2'] },
        // Curriculum convention: Electrical Machinery 1 = DC machines,
        // Electrical Machinery 2 = AC machines.
        { name: 'AC Generators', aliases: ['Electrical Machinery 2'] },
        { name: 'DC Generators', aliases: ['Electrical Machinery 1'] },
        { name: 'Energy Sources', aliases: [] },
        { name: 'Energy Conversion', aliases: [] },
        { name: 'Prime Movers', aliases: ['Power Plant Engineering'] },
        { name: 'Rotating Electric Machinery', aliases: [] },
        { name: 'Power System Components', aliases: ['Electrical Apparatus & Devices'] },
        { name: 'AC Transmission', aliases: [] },
        { name: 'DC Transmission', aliases: [] },
        { name: 'Power System Interconnection', aliases: ['Power System Analysis'] },
        { name: 'Substation Design', aliases: [] },
        { name: 'Power Distribution', aliases: ['Distribution Systems & Substation Design'] },
        { name: 'Wiring Design for Buildings', aliases: ['Electrical System & Illumination Design'] },
        { name: 'Power Electronics', aliases: [] },
        { name: 'Industrial Electronics', aliases: [] },
        { name: 'Illumination', aliases: [] },
        { name: 'Telecommunications', aliases: ['Fundamentals of Electronic Communications'] },
        { name: 'Computer Application in Electrical Power Industry', aliases: [] },
    ],
};

module.exports = { PRC_TAXONOMY };
