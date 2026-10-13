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

module.exports = { CARD_SELECT };
