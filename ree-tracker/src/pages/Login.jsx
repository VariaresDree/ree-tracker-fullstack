// src/pages/Login.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
    const { login, register } = useAuth();
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegistering) {
                await register(email, password, name);
                toast.success("Profile Initialized.");
            } else {
                await login(email, password);
                toast.success("Access Granted.");
            }
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''));
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg p-4 relative overflow-hidden page-fade-in">
            {/* Ambient Glow Effects */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-reeBlue/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-reePurple/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="w-full max-w-md p-8 bg-surface border border-border2 rounded-2xl shadow-2xl relative z-10">
                <div className="text-center mb-8">
                    <div className="text-3xl font-black text-textMain tracking-tight mb-2">
                        REE<span className="text-reeBlue">.ai</span> Core
                    </div>
                    <p className="text-sm text-muted2 leading-relaxed">
                        {isRegistering
                            ? "Initialize your profile and begin your journey toward topnotcher status."
                            : "Authenticate to access your personalized board exam telemetry."}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-reeRed/10 border border-reeRed/30 text-reeRed text-xs font-bold rounded-lg text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {isRegistering && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-[0.65rem] font-bold text-muted uppercase tracking-wider mb-1.5">Agent Alias (Display Name)</label>
                            <input required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Engr. Cruz" className="w-full bg-bg border border-border2 text-textMain p-3 rounded-lg text-sm outline-none focus:border-reeBlue transition-colors" />
                        </div>
                    )}
                    <div>
                        <label className="block text-[0.65rem] font-bold text-muted uppercase tracking-wider mb-1.5">Email Address</label>
                        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="agent@matrix.com" className="w-full bg-bg border border-border2 text-textMain p-3 rounded-lg text-sm outline-none focus:border-reeBlue transition-colors" />
                    </div>
                    <div>
                        <label className="block text-[0.65rem] font-bold text-muted uppercase tracking-wider mb-1.5">Password</label>
                        <div className="relative">
                            <input 
                                required 
                                type={showPassword ? "text" : "password"} 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                placeholder="••••••••"
                                className="w-full bg-bg border border-border2 text-textMain p-3 pr-10 rounded-lg text-sm outline-none focus:border-reeBlue transition-colors" 
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-textMain transition-colors focus:outline-none cursor-pointer"
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <button disabled={loading} type="submit" className="w-full py-3.5 mt-2 bg-reeBlue hover:bg-reeBlue2 text-white font-black rounded-lg transition-colors disabled:opacity-50 uppercase tracking-widest text-xs cursor-pointer shadow-md flex items-center justify-center">
                        {loading ? <span className="telemetry-spinner !w-4 !h-4 border-white border-t-transparent"></span> : (isRegistering ? 'Initialize Profile' : 'Access Dashboard')}
                    </button>
                </form>

                <div className="mt-6 pt-6 border-t border-border2 text-center">
                    <button onClick={() => setIsRegistering(!isRegistering)} className="text-xs font-bold text-muted hover:text-reeBlue transition-colors cursor-pointer uppercase tracking-wider">
                        {isRegistering ? 'Already have an access matrix? Sign In.' : 'New recruit? Create a Profile.'}
                    </button>
                </div>
            </div>
        </div>
    );
}