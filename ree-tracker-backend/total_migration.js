// ree-tracker-backend/total_migration.js
require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

// 1. Init Firebase
const serviceAccount = require('./firebase-service-account.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// 2. Init PostgreSQL
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 3. YOUR FIREBASE UID GOES HERE
const MY_ADMIN_UID = "PASTE_YOUR_UID_HERE"; 

async function runTotalMigration() {
    console.log("🚀 INITIATING TOTAL MIGRATION PROTOCOL...");

    try {
        // --- 1. USERS & USER DATA (Merged) ---
        console.log("📦 Pulling Users & Analytics Matrices...");
        const usersSnap = await db.collection('users').get();
        for (const doc of usersSnap.docs) {
            const baseData = doc.data();
            
            // Fetch associated userData
            const userDataDoc = await db.collection('userData').doc(doc.id).get();
            const userData = userDataDoc.exists ? userDataDoc.data() : {};

            await prisma.user.upsert({
                where: { id: doc.id },
                update: {
                    role: doc.id === MY_ADMIN_UID ? 'ADMIN' : 'USER',
                    globalStreak: userData.globalStreak || 0,
                    thetaRating: userData.irt?.theta || 0.0,
                    activityCalendar: userData.activityCalendar || {},
                    thetaHistory: userData.thetaHistory || [],
                    matrix: userData.matrix || {},
                    microTopics: userData.microTopics || {},
                    blindSpots: userData.blindSpots || [],
                    examDate: userData.examDate || null,
                    dailyTarget: userData.dailyTarget || 50
                },
                create: {
                    id: doc.id,
                    role: doc.id === MY_ADMIN_UID ? 'ADMIN' : 'USER',
                    globalStreak: userData.globalStreak || 0,
                    thetaRating: userData.irt?.theta || 0.0,
                    activityCalendar: userData.activityCalendar || {},
                    thetaHistory: userData.thetaHistory || [],
                    matrix: userData.matrix || {},
                    microTopics: userData.microTopics || {},
                    blindSpots: userData.blindSpots || [],
                    examDate: userData.examDate || null,
                    dailyTarget: userData.dailyTarget || 50,
                    createdAt: baseData.createdAt ? new Date(baseData.createdAt) : new Date()
                }
            });
        }

        // --- 2. QUESTIONS ---
        console.log("📦 Pulling Question Vault...");
        const qSnap = await db.collection('questions').get();
        for (const doc of qSnap.docs) {
            const data = doc.data();
            if (data.status === 'quarantined') continue; 

            await prisma.question.upsert({
                where: { id: doc.id },
                update: {},
                create: {
                    id: doc.id,
                    subject: data.subject === 'Mathematics' ? 'Math' : data.subject || 'Blended',
                    subtopic: data.subtopic || 'General',
                    questionText: data.question || data.text || 'No text provided',
                    options: data.options || [],
                    correctAnswer: data.answer || data.correctAnswer || '',
                    difficultyTheta: data.difficultyTheta || 0.0,
                    cachedExplanation: data.cachedExplanation || data.fixedExplanation || null,
                    isFlagged: data.isFlagged || false
                }
            });
        }

        // --- 3. SIMULATION HISTORY ---
        console.log("📦 Pulling Simulation Ledgers...");
        const histSnap = await db.collection('simulationHistory').get();
        for (const doc of histSnap.docs) {
            const data = doc.data();
            if (!data.userId) continue;

            const userExists = await prisma.user.findUnique({ where: { id: data.userId }});
            if (userExists) {
                await prisma.examSession.upsert({
                    where: { id: doc.id },
                    update: {},
                    create: {
                        id: doc.id,
                        userId: data.userId,
                        mode: data.config?.mode || 'unknown',
                        targetSubject: data.config?.subject || 'Blended',
                        score: data.score || 0,
                        totalQuestions: data.totalQs || 0,
                        timeTakenSecs: data.timeTaken || 0,
                        verdict: data.verdict || 'UNKNOWN',
                        createdAt: data.date ? new Date(data.date) : new Date()
                    }
                });
            }
        }

        // --- 4. FOLDERS & MATERIALS ---
        console.log("📦 Pulling Cloud Vault (Folders & Materials)...");
        const fSnap = await db.collection('folders').get();
        for (const doc of fSnap.docs) {
            const data = doc.data();
            await prisma.folder.upsert({
                where: { id: doc.id },
                update: {},
                create: { id: doc.id, name: data.name || 'Untitled', parentId: data.parentId || 'root' }
            });
        }

        const mSnap = await db.collection('materials').get();
        for (const doc of mSnap.docs) {
            const data = doc.data();
            const folderExists = await prisma.folder.findUnique({ where: { id: data.folderId }});
            if (folderExists) {
                await prisma.material.upsert({
                    where: { id: doc.id },
                    update: {},
                    create: {
                        id: doc.id,
                        name: data.name || 'Document',
                        url: data.url || '',
                        type: data.type || 'pdf',
                        folderId: data.folderId,
                        createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
                    }
                });
            }
        }

        console.log("🎉 SYSTEM OVERRIDE COMPLETE. ALL COLLECTIONS MIGRATED.");

    } catch (error) {
        console.error("❌ Migration Exception:", error);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

runTotalMigration();