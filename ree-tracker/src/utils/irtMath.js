// src/utils/irtMath.js
import { todayManila } from './manilaDate';

// Note: timeSpent defaults to 0 to prevent NaN errors on legacy data.
// timeSpent is in MILLISECONDS (matches the server's microTopics.totalTime).
export const calculateUpdatedStats = (currentStats = {}, isCorrect, confidence, topic, subject, questionId, timeSpent = 0) => {
    // ==========================================
    // 1. REAL-TIME STREAK & DAILY RESET ENGINE
    // ==========================================
    // Manila date, NOT browser-local — the backend keys every daily boundary
    // to Asia/Manila, and a mismatch reset the daily tallies mid-session for
    // users in other timezones.
    const todayStr = todayManila();
    
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

    // ==========================================
    // 2. ATOMIC QUOTA INCREMENTATION
    // ==========================================
    if (subject === 'Mathematics' || subject === 'Math') dailyMath += 1;
    else if (subject === 'ESAS') dailyESAS += 1;
    else if (subject === 'EE') dailyEE += 1;

    // ==========================================
    // 3. ATOMIC ACTIVITY CALENDAR (HEATMAP)
    // ==========================================
let activityCalendar = { ...(currentStats?.activityCalendar || {}) };
    activityCalendar[todayStr] = (activityCalendar[todayStr] || 0) + 1;

    // ==========================================
    // 4. MATRIX DEEP CLONE & BUCKETING
    // ==========================================
    let matrix = { ...(currentStats?.matrix || { hc: 0, hw: 0, lc: 0, lw: 0 }) };
    
    const matrixConf = (confidence === 'high') ? 'high' : 'low';
    
    if (matrixConf === 'high') {
        if (isCorrect) matrix.hc += 1;
        else matrix.hw += 1;
    } else {
        if (isCorrect) matrix.lc += 1;
        else matrix.lw += 1;
    }

    // ==========================================
    // 5. BLEEDING EDGE QUEUE INTERCEPTOR
    // ==========================================
    let blindSpots = [...(currentStats?.blindSpots || [])];
    if (!isCorrect && confidence === 'high' && questionId) {
        if (!blindSpots.includes(questionId)) blindSpots.push(questionId);
    } else if (isCorrect && questionId) {
        blindSpots = blindSpots.filter(id => id !== questionId);
    }

    // ==========================================
    // 6. TOPIC HEATMAP DEEP CLONE
    // ==========================================
let microTopics = { ...(currentStats?.microTopics || {}) };
    if (!microTopics[topic]) {
        microTopics[topic] = { attempts: 0, correct: 0, totalTime: 0, timedAttempts: 0, subject: subject };
    } else {
        // Spread the nested object to avoid mutating the frozen Zustand state
        microTopics[topic] = { ...microTopics[topic] };
    }
    microTopics[topic].attempts += 1;
    if (isCorrect) microTopics[topic].correct += 1;
    // Only count plausibly-timed answers toward the speed average (matches the
    // server's timeSpentMs bounds: 0.5s–30min). timeSpent is in ms.
    if (timeSpent >= 500 && timeSpent <= 1800000) {
        microTopics[topic].totalTime = (microTopics[topic].totalTime || 0) + timeSpent;
        microTopics[topic].timedAttempts = (microTopics[topic].timedAttempts || 0) + 1;
    }
    microTopics[topic].subject = subject;

    // ==========================================
    // 7. THETA VELOCITY & IRT CALCULATION (FIXED MUTATION BUG)
    // ==========================================
    let newTheta = currentStats?.irt?.theta || 0;
    
    let thetaShift = isCorrect 
        ? (confidence === 'high' ? 0.05 : confidence === 'med' ? 0.03 : 0.01)
        : (confidence === 'high' ? -0.05 : confidence === 'med' ? -0.03 : -0.01);
    
    // Clamp to the 3PL scale (±4) that the server now persists — this optimistic
    // value is a throwaway placeholder reconciled server-side on session end; only
    // its display scale needs to match so the chart doesn't briefly clip.
    newTheta += thetaShift;
    if (newTheta > 4.0) newTheta = 4.0;
    if (newTheta < -4.0) newTheta = -4.0;
    newTheta = parseFloat(newTheta.toFixed(3));

    let history = [...(currentStats?.thetaHistory || [])];
    if (history.length > 0 && history[history.length - 1].date === todayStr) {
        // CRITICAL FIX: Create a new object reference instead of mutating the frozen state
        history[history.length - 1] = { 
            ...history[history.length - 1], 
            theta: newTheta 
        };
    } else {
        history.push({ date: todayStr, theta: newTheta });
    }
    if (history.length > 30) history = history.slice(history.length - 30);

    // ==========================================
    // 8. COMBO TRACKING
    // ==========================================
    let consecutiveCorrect = currentStats?.irt?.consecutiveCorrect || 0;
    let consecutiveWrong = currentStats?.irt?.consecutiveWrong || 0;

    if (isCorrect) {
        consecutiveCorrect += 1;
        consecutiveWrong = 0;
    } else {
        consecutiveWrong += 1;
        consecutiveCorrect = 0;
    }

    // ==========================================
    // 9. LIFETIME TELEMETRY
    // ==========================================
    const totalAnswered = (currentStats?.totalAnswered || 0) + 1;
    const totalCorrect = (currentStats?.totalCorrect || 0) + (isCorrect ? 1 : 0);

    return {
        ...currentStats,
        lastActiveDate: todayStr, 
        globalStreak,
        dailyMath,
        dailyESAS,
        dailyEE,
        activityCalendar, 
        matrix,          
        microTopics,     
        blindSpots,
        thetaHistory: history,
        totalAnswered,   
        totalCorrect,
        irt: { 
            ...currentStats?.irt,
            theta: newTheta, 
            consecutiveCorrect, 
            consecutiveWrong 
        }
    };
};