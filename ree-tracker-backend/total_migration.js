// ree-tracker-backend/total_migration.js
require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const serviceAccount = require('./firebase-service-account.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// REPLACE WITH YOUR UID TO GET YOUR ADMIN POWERS BACK
const MY_ADMIN_UID = "Z15Y1ngRysXID2GjCl2ya8Jr4QG2"; 

async function runTotalMigration() {
    console.log("🚀 INITIATING TOTAL MIGRATION PUMP...");

    try {
        // --- 1. USERS & USERDATA ---
        console.log("📦 1/6: Pumping Users & Analytics Matrices...");
        const usersSnap = await db.collection('users').get();
        let userCount = 0;
        for (const doc of usersSnap.docs) {
            try {
                const baseData = doc.data();
                const userDataDoc = await db.collection('userData').doc(doc.id).get();
                const userData = userDataDoc.exists ? userDataDoc.data() : {};

                await prisma.user.upsert({
                    where: { id: doc.id },
                    update: {}, 
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
                userCount++;
            } catch (e) { console.log(`⚠️ Skipped User ${doc.id}: ${e.message}`); }
        }
        console.log(`✅ ${userCount} Users Migrated.`);

        // --- 2. QUESTIONS (Mapping fixedExplanation exactly) ---
        console.log("📦 2/6: Pumping Question Vault...");
        const qSnap = await db.collection('questions').get();
        let qCount = 0;
        for (const doc of qSnap.docs) {
            try {
                const data = doc.data();
                if (data.status === 'quarantined') continue; 

                await prisma.question.upsert({
                    where: { id: doc.id },
                    update: {},
                    create: {
                        id: doc.id,
                        subject: data.subject === 'Mathematics' ? 'Math' : data.subject || 'Blended',
                        subtopic: data.subtopic || 'General',
                        text: data.question || data.text || '[Missing Text]',
                        options: data.options || [],
                        answer: data.answer || data.correctAnswer || '',
                        difficulty: parseFloat(data.difficulty) || data.difficultyTheta || 0.0,
                        fixedExplanation: data.fixedExplanation || data.cachedExplanation || null,
                        source: data.source || 'legacy',
                        type: data.type || 'conceptual',
                        isFlagged: data.isFlagged || false
                    }
                });
                qCount++;
            } catch (e) { console.log(`⚠️ Skipped Question ${doc.id}: ${e.message}`); }
        }
        console.log(`✅ ${qCount} Questions Migrated.`);

        // --- 3. FOLDERS ---
        console.log("📦 3/6: Pumping Cloud Vault Folders...");
        const fSnap = await db.collection('folders').get();
        for (const doc of fSnap.docs) {
            try {
                const data = doc.data();
                await prisma.folder.upsert({
                    where: { id: doc.id },
                    update: {},
                    create: { id: doc.id, name: data.name || 'Untitled', parentId: data.parentId || 'root' }
                });
            } catch (e) { console.log(`⚠️ Skipped Folder ${doc.id}`); }
        }
        console.log(`✅ Folders Migrated.`);

        // --- 4. MATERIALS ---
        console.log("📦 4/6: Pumping Cloud Vault Materials...");
        const mSnap = await db.collection('materials').get();
        for (const doc of mSnap.docs) {
            try {
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
            } catch (e) { console.log(`⚠️ Skipped Material ${doc.id}`); }
        }
        console.log(`✅ Materials Migrated.`);

        // --- 5. SIMULATION HISTORY ---
        console.log("📦 5/6: Pumping Simulation Ledgers...");
        const histSnap = await db.collection('simulationHistory').get();
        let histCount = 0;
        for (const doc of histSnap.docs) {
            try {
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
                            mode: data.config?.mode || 'custom',
                            targetSubject: data.config?.subject || 'Blended',
                            score: data.score || 0,
                            totalQuestions: data.totalQs || 0,
                            timeTakenSecs: data.timeTaken || 0,
                            verdict: data.verdict || 'UNKNOWN',
                            config: data.config || {},
                            createdAt: data.date ? new Date(data.date) : new Date()
                        }
                    });
                    histCount++;
                }
            } catch (e) { console.log(`⚠️ Skipped History ${doc.id}`); }
        }
        console.log(`✅ ${histCount} Simulation Ledgers Migrated.`);

        // --- 6. SYSTEM CONFIG & METADATA ---
        console.log("📦 6/6: Pumping Core Configurations...");
        const confSnap = await db.collection('systemConfig').doc('dynamicTOS').get();
        const metaSnap = await db.collection('metadata').doc('vaultStats').get();
        
        await prisma.systemConfig.upsert({
            where: { id: 'global_config' },
            update: {
                tos: confSnap.exists ? confSnap.data() : null,
                metadata: metaSnap.exists ? metaSnap.data() : null
            },
            create: {
                id: 'global_config',
                tos: confSnap.exists ? confSnap.data() : null,
                metadata: metaSnap.exists ? metaSnap.data() : null
            }
        });
        console.log(`✅ Configurations Migrated.`);

        console.log("\n🎉 TOTAL MIGRATION 100% COMPLETE. YOU MAY RESTART YOUR SERVER.");

    } catch (error) {
        console.error("❌ Fatal Migration Exception:", error);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

runTotalMigration();