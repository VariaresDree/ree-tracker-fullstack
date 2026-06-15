// src/hooks/useNetworkStatus.js
import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';

export function useNetworkStatus() {
    // Initialize with the current browser state
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const { retrySync } = useStore();

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            retrySync(); // 🔥 Instantly flush the offline queue to Firebase
        };
        
        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [retrySync]);

    return isOnline;
}