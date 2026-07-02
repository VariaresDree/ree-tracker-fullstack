// src/pages/Login.jsx
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button, FormField, Input } from '../components/ui';
import { Eye, EyeOff } from '../components/ui/icons';
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
                toast.success("Account created.");
            } else {
                await login(email, password);
                toast.success("Signed in.");
            }
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''));
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg p-4 relative overflow-hidden page-fade-in">
            {/* Ambient glow */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: 'color-mix(in srgb, var(--accent-signal) 10%, transparent)' }}></div>

            <div className="w-full max-w-md p-8 bg-surface border border-border rounded-[var(--radius-xl)] elevate-3 relative z-10">
                <div className="text-center mb-8">
                    <div className="text-display text-3xl text-textMain tracking-tight mb-2">
                        REE<span className="text-[var(--accent)]">.ai</span> Core
                    </div>
                    <p className="text-sm text-muted2 leading-relaxed">
                        {isRegistering
                            ? "Create your profile to start tracking your board-exam readiness."
                            : "Sign in to continue your board-exam prep."}
                    </p>
                </div>

                {error && (
                    <div
                        role="alert"
                        className="mb-6 p-3 border text-xs font-bold rounded-[var(--radius-default)] text-center"
                        style={{
                            background: 'color-mix(in srgb, var(--accent-danger) 10%, transparent)',
                            borderColor: 'color-mix(in srgb, var(--accent-danger) 30%, transparent)',
                            color: 'var(--accent-danger)',
                        }}
                    >
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {isRegistering && (
                        <FormField label="Display name" className="animate-in fade-in slide-in-from-top-2">
                            <Input required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Engr. Cruz" autoComplete="name" />
                        </FormField>
                    )}
                    <FormField label="Email address">
                        <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
                    </FormField>
                    <FormField label="Password">
                        {({ id, ...a11y }) => (
                            <div className="relative">
                                <Input
                                    id={id}
                                    {...a11y}
                                    required
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete={isRegistering ? 'new-password' : 'current-password'}
                                    className="pr-11"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-[var(--radius-sm)] text-muted hover:text-textMain transition-colors cursor-pointer"
                                >
                                    {showPassword
                                        ? <EyeOff size={18} strokeWidth={1.75} aria-hidden="true" />
                                        : <Eye size={18} strokeWidth={1.75} aria-hidden="true" />}
                                </button>
                            </div>
                        )}
                    </FormField>

                    <Button type="submit" size="lg" fullWidth loading={loading} disabled={loading} className="mt-2">
                        {isRegistering ? 'Create account' : 'Sign in'}
                    </Button>
                </form>

                <div className="mt-6 pt-6 border-t border-border text-center">
                    <Button variant="ghost" size="sm" onClick={() => setIsRegistering(!isRegistering)} className="text-muted hover:text-textMain">
                        {isRegistering ? 'Already have an account? Sign in' : 'New here? Create an account'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
