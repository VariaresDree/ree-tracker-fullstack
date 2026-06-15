// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Initialize Firebase
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const app = express();

// 1. Middleware (Must be first)
app.use(cors()); 
app.use(express.json()); 

// 2. Route Mounts (Must be immediately after middleware)
const examRoutes = require('./src/routes/examRoutes');
app.use('/api/exams', examRoutes);

// THIS IS THE LINE THAT FIXES YOUR ISSUE
const analyticsRoutes = require('./src/routes/analyticsRoutes'); 
app.use('/api/analytics', analyticsRoutes); 

const aiRoutes = require('./src/routes/aiRoutes');
app.use('/api/ai', aiRoutes);                    

// 3. Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'Assessment Core is Online' });
});

// 4. Global Error Handler (Must be absolutely last)
app.use((err, req, res, next) => {
    console.error("Critical Matrix Error:", err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

// 5. Server Boot
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`[SYSTEM] Assessment Engine initialized and listening on port ${PORT}`);
});