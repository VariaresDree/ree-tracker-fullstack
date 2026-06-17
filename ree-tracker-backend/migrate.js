// ree-tracker-backend/migrate.js
require('dotenv').config();

// 1. MODERN MODULAR FIREBASE IMPORTS
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

// 2. INITIALIZE FIREBASE 
const serviceAccount = require('./firebase-service-account.json');
initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();

// 3. INITIALIZE POSTGRESQL
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 4. YOUR FIREBASE UID GOES HERE
const MY_ADMIN_UID = "Z15Y1ngRysXID2GjCl2ya8Jr4QG2"; 

async function runMigration() {
    console.log("🚀 Starting ETL Migration: Firebase -> PostgreSQL...");

    try {
        // --- STEP A: MIGRATE USERS ---
        console.log("📦 Pulling Users...");
        const usersSnap = await db.collection('users').get();
        for (const doc of usersSnap.docs) {
            const data = doc.data();
            await prisma.user.upsert({
                where: { id: doc.id },
                update: { role: doc.id === MY_ADMIN_UID ? 'ADMIN' : 'USER' },
                create: {
                    id: doc.id,
                    role: doc.id === MY_ADMIN_UID ? 'ADMIN' : 'USER',
                    createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
                }
            });
        }
        console.log(`✅ Users successfully migrated.`);

        // --- STEP B: MIGRATE QUESTIONS ---
        console.log("📦 Pulling Question Bank...");
        const qSnap = await db.collection('questions').get();
        let questionCount = 0;
        for (const doc of qSnap.docs) {
            const data = doc.data();
            if (data.status === 'quarantined') continue; // Skip unverified items

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
                    cachedExplanation: data.cachedExplanation || null,
                    isFlagged: data.isFlagged || false
                }
            });
            questionCount++;
        }
        console.log(`✅ ${questionCount} Questions successfully migrated.`);

        // --- STEP C: MIGRATE FOLDERS ---
        console.log("📦 Pulling Folders...");
        const fSnap = await db.collection('folders').get();
        for (const doc of fSnap.docs) {
            const data = doc.data();
            await prisma.folder.upsert({
                where: { id: doc.id },
                update: {},
                create: {
                    id: doc.id,
                    name: data.name || 'Untitled Folder',
                    parentId: data.parentId || 'root',
                }
            });
        }
        console.log(`✅ Folders successfully migrated.`);

        // --- STEP D: MIGRATE MATERIALS ---
        console.log("📦 Pulling Materials & PDFs...");
        const mSnap = await db.collection('materials').get();
        for (const doc of mSnap.docs) {
            const data = doc.data();
            
            // Check if the parent folder actually ported over successfully
            const folderExists = await prisma.folder.findUnique({ where: { id: data.folderId }});
            
            if (folderExists) {
                await prisma.material.upsert({
                    where: { id: doc.id },
                    update: {},
                    create: {
                        id: doc.id,
                        name: data.name || 'Untitled Document',
                        url: data.url || '',
                        type: data.type || 'pdf',
                        folderId: data.folderId,
                        createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
                    }
                });
            }
        }
        console.log(`✅ Materials successfully migrated.`);

        console.log("🎉 SUCCESS! All legacy data is now running on PostgreSQL.");

    } catch (error) {
        console.error("❌ Migration Failed:", error);
    } finally {
        // Disconnect gracefully
        await prisma.$disconnect();
        process.exit(0);
    }
}

runMigration();