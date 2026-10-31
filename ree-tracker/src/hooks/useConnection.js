// src/hooks/useConnection.js
// The backend's state from services/connection: { backendUp, epoch }.
// `epoch` goes up when the server answers again after an outage, when the
// browser comes back online, and when the app returns after a long time
// away; a screen that fetches once puts it in its effect's dependencies
// (useReconnectKey) to fetch again by itself instead of needing a reload.
import { useSyncExternalStore } from 'react';
import { subscribeConnection, getConnection } from '../services/connection';

export function useConnection() {
    return useSyncExternalStore(subscribeConnection, getConnection, getConnection);
}

/** A number that changes whenever screens should fetch again. */
export function useReconnectKey() {
    return useConnection().epoch;
}
