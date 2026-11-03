// How many of a paper's 100 items PRC gives each topic, from its table of
// specifications for the REE board (file "2024-40 Annex A"; 25/30/45 by subject).
//
// PRC counts some topics together, so a count belongs to a group. PRC doesn't
// itemize every topic the app keeps. Four of those are placed with the nearest
// group, which is our call and not PRC's: Plane and Solid Geometry with Analytic
// Geometry, Engineering Mechanics with Physics, Electrical Transient Analysis
// with Electric Circuits 1, Power System Protection with Power System Analysis.
// The rest (`UNITEMIZED`) have no count.
//
// Keyed by Topic.name. A topic Admin renames falls out to "no count", which is
// harmless: it shows no figure until this file catches up.

'use strict';

const BOARD_GROUPS = Object.freeze({
    Mathematics: [
        { items: 5, topics: ['Algebra', 'Complex Numbers'] },
        { items: 5, topics: ['Trigonometry'] },
        { items: 5, topics: ['Analytic Geometry', 'Plane Geometry', 'Solid Geometry'] },
        { items: 5, topics: ['Probability & Statistics'] },
        { items: 15, topics: ['Calculus 1'] },
        { items: 15, topics: ['Calculus 2'] },
        { items: 20, topics: ['Engineering Data Analytics'] },
        { items: 15, topics: ['Differential Equations'] },
        { items: 15, topics: ['Numerical Methods & Analysis'] },
    ],
    ESAS: [
        { items: 5, topics: ['Chemistry for Engineers'] },
        { items: 15, topics: ['Physics for Engineers', 'Engineering Mechanics'] },
        { items: 15, topics: ['Computer Programming', 'Microprocessor Systems and Logic Circuits'] },
        { items: 5, topics: ['Material Science', 'Environmental Science & Engineering'] },
        { items: 5, topics: ['Fluid Mechanics'] },
        { items: 5, topics: ['Fundamentals of Deformable Bodies'] },
        { items: 5, topics: ['Basic Thermodynamics'] },
        { items: 20, topics: ['EE Laws, Codes, & Professional Ethics', 'Basic Occupational Safety & Health', 'Electrical Standards & Practices'] },
        { items: 15, topics: ['Engineering Economics'] },
        { items: 10, topics: ['Technopreneurship & Project Management'] },
    ],
    EE: [
        { items: 10, topics: ['Electromagnetism'] },
        { items: 10, topics: ['Electric Circuits 1', 'Electrical Transient Analysis'] },
        { items: 10, topics: ['Electric Circuits 2'] },
        { items: 5, topics: ['Fundamentals of Electronic Communications', 'Electronics 1 and 2'] },
        { items: 5, topics: ['Electrical Apparatus & Devices', 'Industrial Electronics'] },
        { items: 5, topics: ['Electrical Machinery 1'] },
        { items: 10, topics: ['Electrical Machinery 2'] },
        { items: 10, topics: ['Instrumentation & Control', 'Feedback Control Systems'] },
        { items: 10, topics: ['Electrical System & Illumination Design'] },
        { items: 5, topics: ['Power Plant Engineering', 'Distribution Systems & Substation Design'] },
        { items: 20, topics: ['Power System Analysis', 'Power System Protection'] },
    ],
});

const UNITEMIZED = Object.freeze({
    Mathematics: ['Advanced Engineering Mathematics', 'Math in the Modern World', 'Vector Analysis'],
    ESAS: ['Quantities/units/constants (ESAS)', 'Research Methods'],
    EE: ['Quantities/units/constants (EE)'],
});

/**
 * A topic's board count, or null when PRC doesn't itemize it.
 * @returns {{ items: number, sharedWith: string[] } | null} sharedWith: the other topics in its count
 */
function boardItemsFor(subject, topicName) {
    const group = (BOARD_GROUPS[subject] || []).find((g) => g.topics.includes(topicName));
    if (!group) return null;
    return { items: group.items, sharedWith: group.topics.filter((t) => t !== topicName) };
}

module.exports = { BOARD_GROUPS, UNITEMIZED, boardItemsFor };
