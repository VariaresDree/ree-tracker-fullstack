// src/hooks/useTimer.js
import { useState, useEffect, useRef } from 'react';

export const useTimer = (initialTime) => {
    const [time, setTime] = useState(initialTime);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState('focus'); // 'focus' or 'break'
    
    // 🚀 FIXED: Absolute end-time reference survives browser throttling
    const endTimeRef = useRef(null);

    useEffect(() => {
        let interval;
        if (isActive && time > 0) {
            if (!endTimeRef.current) {
                endTimeRef.current = Date.now() + time * 1000;
            }
            
            interval = setInterval(() => {
                const now = Date.now();
                const timeLeft = Math.max(0, Math.round((endTimeRef.current - now) / 1000));
                setTime(timeLeft);
                
                if (timeLeft <= 0) {
                    setIsActive(false);
                    endTimeRef.current = null;
                }
            }, 1000);
        } else {
            // When paused, we clear the end time so it recalculates correctly on resume
            endTimeRef.current = null;
        }
        return () => clearInterval(interval);
    }, [isActive, time]);

    const toggle = () => setIsActive(!isActive);

    const reset = (newTime) => {
        setIsActive(false);
        setTime(newTime);
        endTimeRef.current = null;
    };

    return { time, isActive, toggle, reset, mode, setMode };
};