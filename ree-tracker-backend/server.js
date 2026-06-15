// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('./firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const app = express();

app.use(cors()); 
app.use(express.json()); 

// --- ADD THESE TWO LINES HERE ---
const examRoutes = require('./src/routes/examRoutes');
app.use('/api/exams', examRoutes);
// --------------------------------

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'Assessment Core is Online' });
});

app.use((err, req, res, next) => {
    console.error("Critical Matrix Error:", err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`[SYSTEM] Assessment Engine initialized and listening on port ${PORT}`);
});