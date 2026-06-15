// src/utils/irtMath.js

const calculateUpdatedStats = (currentStats = {}, isCorrect, confidence, topic, subject, questionId, timeSpent = 0) => {
    const todayStr = new Date().toLocaleDateString('en-CA'); 
    
    let globalStreak = currentStats?.globalStreak || 0;
    let lastActiveDate = currentStats?.lastActiveDate || null;
    let dailyMath = currentStats?.dailyMath || 0;
    let dailyESAS = currentStats?.dailyESAS || 0;
    let dailyEE = currentStats?.dailyEE || 0;

    if (lastActiveDate !== todayStr) {
        dailyMath = 0;
        dailyESAS = 0;
        dailyEE = 0;
        if (!lastActiveDate) {
            globalStreak = 1;
        } else {
            const lastDate = new Date(lastActiveDate + 'T00:00:00');
            const currentDate = new Date(todayStr + 'T00:00:00');
            const diffDays = Math.round((currentDate - lastDate) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) globalStreak += 1; 
            else if (diffDays > 1) globalStreak = 1; 
        }
    }

    if (subject === 'Mathematics' || subject === 'Math') dailyMath += 1;
    else if (subject === 'ESAS') dailyESAS += 1;
    else if (subject === 'EE') dailyEE += 1;

    let activityCalendar = JSON.parse(JSON.stringify(currentStats?.activityCalendar || {}));
    activityCalendar[todayStr] = (activityCalendar[todayStr] || 0) + 1;

    let matrix = { ...(currentStats?.matrix || { hc: 0, hw: 0, lc: 0, lw: 0 }) };
    const matrixConf = (confidence === 'high') ? 'high' : 'low';
    
    if (matrixConf === 'high') {
        if (isCorrect) matrix.hc += 1;
        else matrix.hw += 1;
    } else {
        if (isCorrect) matrix.lc += 1;
        else matrix.lw += 1;
    }

    let blindSpots = [...(currentStats?.blindSpots || [])];
    if (!isCorrect && confidence === 'high' && questionId) {
        if (!blindSpots.includes(questionId)) blindSpots.push(questionId);
    } else if (isCorrect && questionId) {
        blindSpots = blindSpots.filter(id => id !== questionId);
    }

    let microTopics = JSON.parse(JSON.stringify(currentStats?.microTopics || {}));
    if (!microTopics[topic]) {
        microTopics[topic] = { attempts: 0, correct: 0, totalTime: 0, subject: subject };
    }
    microTopics[topic].attempts += 1;
    if (isCorrect) microTopics[topic].correct += 1;
    microTopics[topic].totalTime = (microTopics[topic].totalTime || 0) + timeSpent;
    microTopics[topic].subject = subject;

    let newTheta = currentStats?.irt?.theta || 0;
    let thetaShift = isCorrect 
        ? (confidence === 'high' ? 0.05 : confidence === 'med' ? 0.03 : 0.01)
        : (confidence === 'high' ? -0.05 : confidence === 'med' ? -0.03 : -0.01);
    
    newTheta += thetaShift;
    if (newTheta > 3.0) newTheta = 3.0;
    if (newTheta < -3.0) newTheta = -3.0;
    newTheta = parseFloat(newTheta.toFixed(3));

    let history = [...(currentStats?.thetaHistory || [])];
    if (history.length > 0 && history[history.length - 1].date === todayStr) {
        history[history.length - 1] = { ...history[history.length - 1], theta: newTheta };
    } else {
        history.push({ date: todayStr, theta: newTheta });
    }
    if (history.length > 30) history = history.slice(history.length - 30);

    let consecutiveCorrect = currentStats?.irt?.consecutiveCorrect || 0;
    let consecutiveWrong = currentStats?.irt?.consecutiveWrong || 0;

    if (isCorrect) {
        consecutiveCorrect += 1;
        consecutiveWrong = 0;
    } else {
        consecutiveWrong += 1;
        consecutiveCorrect = 0;
    }

    const totalAnswered = (currentStats?.totalAnswered || 0) + 1;
    const totalCorrect = (currentStats?.totalCorrect || 0) + (isCorrect ? 1 : 0);

    return {
        ...currentStats,
        lastActiveDate: todayStr, 
        globalStreak, dailyMath, dailyESAS, dailyEE, activityCalendar, matrix, microTopics, blindSpots,
        thetaHistory: history, totalAnswered, totalCorrect,
        irt: { ...currentStats?.irt, theta: newTheta, consecutiveCorrect, consecutiveWrong }
    };
};

// Exporting for Node.js
module.exports = { calculateUpdatedStats };