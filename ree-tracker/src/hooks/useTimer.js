import { useState, useEffect, useRef, useCallback } from 'react';

export const useTimer = (initialSeconds = 0, isCountdown = true) => {
    const [timeLeft, setTimeLeft] = useState(initialSeconds);
    const [isRunning, setIsRunning] = useState(false);
    const endTimeRef = useRef(null);

    useEffect(() => {
        if (!isRunning) return;

        // Establish the absolute completion time in the future
        if (isCountdown && !endTimeRef.current) {
            endTimeRef.current = Date.now() + timeLeft * 1000;
        }

        const interval = setInterval(() => {
            const now = Date.now();
            
            if (isCountdown) {
                const remaining = Math.round((endTimeRef.current - now) / 1000);
                if (remaining <= 0) {
                    setIsRunning(false);
                    setTimeLeft(0);
                    clearInterval(interval);
                } else {
                    setTimeLeft(remaining);
                }
            } else {
                setTimeLeft(prev => prev + 1);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isRunning, isCountdown, timeLeft]);

    const start = useCallback(() => setIsRunning(true), []);
    const pause = useCallback(() => {
        setIsRunning(false);
        endTimeRef.current = null; // Clear absolute target on pause
    }, []);
    const reset = useCallback((newTime = initialSeconds) => {
        setIsRunning(false);
        endTimeRef.current = null;
        setTimeLeft(newTime);
    }, [initialSeconds]);

    const formattedTime = () => {
        const h = Math.floor(timeLeft / 3600).toString().padStart(2, '0');
        const m = Math.floor((timeLeft % 3600) / 60).toString().padStart(2, '0');
        const s = (timeLeft % 60).toString().padStart(2, '0');
        return h === "00" ? `${m}:${s}` : `${h}:${m}:${s}`;
    };

    return { timeLeft, isRunning, start, pause, reset, formattedTime };
};