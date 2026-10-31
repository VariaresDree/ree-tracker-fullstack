// src/services/referenceCardView.js
//
// The fields a formula card is served with, wherever a learner sees one: the
// formula-cards list (routes/referenceCardRoutes) and Today's loop
// (services/todayLoop). One copy, so the loop's card renders exactly like the
// Library's.
'use strict';

const CARD_SELECT = {
    id: true, kind: true, symbol: true, name: true, formulaLatex: true,
    valueUnit: true, description: true, variables: true, purposeExamTip: true,
    subject: true, subtopicTag: true, dimensionless: true, status: true,
    sourceId: true, createdAt: true, updatedAt: true,
    topic: { select: { id: true, name: true } },
    source: { select: { id: true, title: true, edition: true, section: true } },
};

// Formula cards are formulas and constants only (2026-10-31). Concept cards
// stay in the table, and in Admin, but learners never see or review them.
const LEARNER_CARD_KINDS = ['formula', 'constant'];
/** The cards a learner sees: live, and a formula or a constant. */
const LEARNER_CARD_WHERE = { status: 'LIVE', kind: { in: LEARNER_CARD_KINDS } };

module.exports = { CARD_SELECT, LEARNER_CARD_KINDS, LEARNER_CARD_WHERE };
