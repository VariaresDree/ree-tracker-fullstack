// src/routes/examRoutes.js
const express = require('express');
const router = express.Router();
const { getFirestore } = require('firebase-admin/firestore');
const { calculateUpdatedStats } = require('../utils/irtMath');

// Initialize Prisma v7 with PostgreSQL Driver Adapter
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

// REQUIRED FIX: Supabase completely drops connections that do not use strict SSL.
// We must enforce ssl: { rejectUnauthorized: false } in the connection pool.
const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } 
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const db = getFirestore();

router.post('/submit', async (req, res) => {
    const { uid, attempts, config, timeRemaining, totalExamTime } = req.body;

    if (!uid || !attempts) {
        return res.status(400).json({ error: 'Missing required payload data' });
    }

    try {
        // --- 1. FIREBASE PROCESSING (Legacy Support) ---
        const userRef = db.collection('userData').doc(uid);
        const userDoc = await userRef.get();
        let bulkStats = userDoc.exists ? userDoc.data() : {};

        let correctOverall = 0;
        const totalQs = attempts.length;
        let subjTracker = { Mathematics: { total: 0, correct: 0 }, ESAS: { total: 0, correct: 0 }, EE: { total: 0, correct: 0 } };
        const timeSinks = [];
        const highYield = [];
        const blindSpots = [];
        
        // Array to hold the pristine data for PostgreSQL
        const sqlAttemptsPayload = []; 

        for (const attempt of attempts) {
            const qDoc = await db.collection('questions').doc(attempt.questionId).get();
            if (!qDoc.exists) continue;
            
            const trueQuestion = qDoc.data();
            const isCorrect = attempt.userAnswer === trueQuestion.answer;
            const timeSecs = attempt.timeSpentSecs || 0;
            const conf = attempt.confidence || 'low';
            const subtopic = trueQuestion.subtopic || 'Uncategorized';
            const subject = trueQuestion.subject;

            if (subjTracker[subject]) {
                subjTracker[subject].total += 1;
                if (isCorrect) subjTracker[subject].correct += 1;
            }
            if (isCorrect) correctOverall++;

            if (timeSecs > 180) {
                if (isCorrect) highYield.push({ idx: attempt.idx, time: timeSecs });
                else timeSinks.push({ idx: attempt.idx, time: timeSecs });
            }

            if ((!isCorrect && conf === 'high') || attempt.isBookmarked) {
                blindSpots.push(attempt.questionId);
            }

            bulkStats = calculateUpdatedStats(bulkStats, isCorrect, conf, subtopic, subject, attempt.questionId, timeSecs);

            // Prep data for PostgreSQL
            sqlAttemptsPayload.push({
                questionId: attempt.questionId,
                subject: subject,
                subtopic: subtopic,
                isCorrect: isCorrect,
                confidenceLevel: conf,
                timeSpentSecs: timeSecs,
                userId: uid
            });
        }

        const overallPercent = Math.round((correctOverall / totalQs) * 100);
        const timeTakenSecs = Math.max(0, totalExamTime - timeRemaining);

        let passedOverall = overallPercent >= 70;
        let isConditional = false;
        Object.keys(subjTracker).forEach(s => {
            const trk = subjTracker[s];
            if (trk.total > 0 && (trk.correct / trk.total) * 100 < 50) passedOverall = false;
            else if (trk.total > 0 && (trk.correct / trk.total) * 100 < 70 && overallPercent >= 70) isConditional = true;
        });

        let verdict = passedOverall && !isConditional ? "PASSED" : passedOverall && isConditional ? "CONDITIONAL PASS" : "FAILED";

        // Commit to Firebase
        const batch = db.batch();
        batch.set(userRef, bulkStats, { merge: true });
        const historyRef = db.collection('simulationHistory').doc();
        batch.set(historyRef, {
            userId: uid, date: new Date().toISOString(), score: overallPercent,
            verdict, timeTaken: timeTakenSecs, totalQs, config
        });
        await batch.commit();

        // --- 2. POSTGRESQL TELEMETRY INGESTION (New Architecture) ---
        try {
            // Ensure the user exists in PostgreSQL (Upsert)
            await prisma.user.upsert({
                where: { id: uid },
                update: { lastActive: new Date() },
                create: { id: uid }
            });

            // Create the Exam Session and nested Attempts in one transaction
            await prisma.examSession.create({
                data: {
                    userId: uid,
                    mode: config.mode || 'unknown',
                    targetSubject: config.subject || 'blended',
                    score: overallPercent,
                    verdict: verdict,
                    timeTakenSecs: timeTakenSecs,
                    totalQs: totalQs,
                    attempts: {
                        create: sqlAttemptsPayload.map(att => ({
                            userId: uid,
                            questionId: att.questionId,
                            subject: att.subject,
                            subtopic: att.subtopic,
                            isCorrect: att.isCorrect,
                            confidenceLevel: att.confidenceLevel,
                            timeSpentSecs: att.timeSpentSecs
                        }))
                    }
                }
            });
            console.log(`[SQL-SYNC] Telemetry saved to Postgres for UID: ${uid}`);
        } catch (sqlError) {
            console.error("[SQL-SYNC ERROR] Failed to save to Postgres:", sqlError);
        }

        // 3. Return results to React UI
        res.status(200).json({
            success: true,
            diagnostics: {
                overallScore: overallPercent, correctCount: correctOverall, totalCount: totalQs,
                verdict, subjTracker, timeSinks, highYield, blindSpots, timeTaken: timeTakenSecs
            },
            newStats: bulkStats
        });

    } catch (error) {
        console.error("Simulation Processing Error:", error);
        res.status(500).json({ error: 'Telemetry compilation failed' });
    }
});

module.exports = router;