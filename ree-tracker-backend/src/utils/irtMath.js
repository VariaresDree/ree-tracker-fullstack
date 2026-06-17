// src/utils/irtMath.js

/**
 * Calculates the updated user capability (Theta) based on the Rasch Model (1PL IRT).
 * @param {number} currentTheta - The user's current ability level
 * @param {Array} gradedAttempts - Array of objects: { isCorrect (boolean), questionDifficulty (number) }
 * @returns {number} The new calculated Theta
 */
exports.calculateUpdatedTheta = (currentTheta, gradedAttempts) => {
    // If no attempts or a blank payload, return the current baseline
    if (!gradedAttempts || gradedAttempts.length === 0) return currentTheta || 0.0;

    // Learning Rate (Step size for maximum likelihood estimation adjustment)
    const alpha = 0.15; 
    let thetaAdjust = 0;

    gradedAttempts.forEach(attempt => {
        // Rasch Model Probability: P(Correct) = e^(Theta - Difficulty) / (1 + e^(Theta - Difficulty))
        const difficulty = attempt.questionDifficulty || 0.0;
        const exponent = currentTheta - difficulty;
        const probabilityOfCorrect = Math.exp(exponent) / (1 + Math.exp(exponent));
        
        // Actual score: 1 for correct, 0 for incorrect
        const actualScore = attempt.isCorrect ? 1 : 0;

        // Mathematical Adjustment = Learning Rate * (Actual - Expected)
        // If they get a hard question right, Theta jumps up significantly.
        // If they get an easy question right, Theta moves up slightly.
        thetaAdjust += alpha * (actualScore - probabilityOfCorrect);
    });

    // Calculate new Theta and cap the limits between -3.0 (Beginner) and +3.0 (Mastery)
    let newTheta = currentTheta + thetaAdjust;
    newTheta = Math.max(-3.0, Math.min(3.0, newTheta));

    return parseFloat(newTheta.toFixed(3));
};