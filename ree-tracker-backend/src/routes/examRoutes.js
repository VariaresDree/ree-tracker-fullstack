// src/routes/examRoutes.js
const express = require('express');
const router = express.Router();
const { getFirestore } = require('firebase-admin/firestore');
const { calculateUpdatedStats } = require('../utils/irtMath');

const db = getFirestore();

router.post('/submit', async (req, res) => {
    const { uid, attempts, config, timeRemaining, totalExamTime } = req.body;

    if (!uid || !attempts) {
        return res.status(400).json({ error: 'Missing required payload data' });
    }

    try {
        // 1. Fetch current user stats securely
        const userRef = db.collection('userData').doc(uid);
        const userDoc = await userRef.get();
        let bulkStats = userDoc.exists ? userDoc.data() : {};

        let correctOverall = 0;
        const totalQs = attempts.length;
        let subjTracker = { Mathematics: { total: 0, correct: 0 }, ESAS: { total: 0, correct: 0 }, EE: { total: 0, correct: 0 } };
        const timeSinks = [];
        const highYield = [];
        const blindSpots = [];

        // 2. Process each attempt securely against the database
        for (const attempt of attempts) {
            // SECURITY: Do not trust the client's version of the correct answer!
            const qDoc = await db.collection('questions').doc(attempt.questionId).get();
            if (!qDoc.exists) continue;
            
            const trueQuestion = qDoc.data();
            const isCorrect = attempt.userAnswer === trueQuestion.answer;
            const timeSecs = attempt.timeSpentSecs || 0;
            const conf = attempt.confidence || 'low';

            if (subjTracker[trueQuestion.subject]) {
                subjTracker[trueQuestion.subject].total += 1;
                if (isCorrect) subjTracker[trueQuestion.subject].correct += 1;
            }
            
            if (isCorrect) correctOverall++;

            if (timeSecs > 180) {
                if (isCorrect) highYield.push({ idx: attempt.idx, time: timeSecs });
                else timeSinks.push({ idx: attempt.idx, time: timeSecs });
            }

            if ((!isCorrect && conf === 'high') || attempt.isBookmarked) {
                blindSpots.push(attempt.questionId);
            }

            // Run IRT Math
            bulkStats = calculateUpdatedStats(
                bulkStats, isCorrect, conf, 
                trueQuestion.subtopic || 'Uncategorized', 
                trueQuestion.subject, attempt.questionId, timeSecs
            );
        }

        const overallPercent = Math.round((correctOverall / totalQs) * 100);
        const timeTakenSecs = Math.max(0, totalExamTime - timeRemaining);

        // 3. Determine Verdict
        let passedOverall = overallPercent >= 70;
        let isConditional = false;
        Object.keys(subjTracker).forEach(s => {
            const trk = subjTracker[s];
            if (trk.total > 0 && (trk.correct / trk.total) * 100 < 50) passedOverall = false;
            else if (trk.total > 0 && (trk.correct / trk.total) * 100 < 70 && overallPercent >= 70) isConditional = true;
        });

        let verdict = passedOverall && !isConditional ? "PASSED" : passedOverall && isConditional ? "CONDITIONAL PASS" : "FAILED";

        // 4. Save telemetry and update user stats in one atomic batch write
        const batch = db.batch();
        batch.set(userRef, bulkStats, { merge: true });
        
        const historyRef = db.collection('simulationHistory').doc();
        batch.set(historyRef, {
            userId: uid,
            date: new Date().toISOString(),
            score: overallPercent,
            verdict,
            timeTaken: timeTakenSecs,
            totalQs,
            config
        });

        await batch.commit();

        // 5. Send diagnostics back to the React frontend
        res.status(200).json({
            success: true,
            diagnostics: {
                overallScore: overallPercent,
                correctCount: correctOverall,
                totalCount: totalQs,
                verdict,
                subjTracker,
                timeSinks,
                highYield,
                blindSpots,
                timeTaken: timeTakenSecs
            },
            newStats: bulkStats
        });

    } catch (error) {
        console.error("Simulation Processing Error:", error);
        res.status(500).json({ error: 'Telemetry compilation failed' });
    }
});

module.exports = router;