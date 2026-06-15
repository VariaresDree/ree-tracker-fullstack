import React from 'react';

export default function ExamLayout({ children }) {
    return (
        <div className="exam-environment" style={{ 
            minHeight: '100vh', 
            display: 'flex', 
            flexDirection: 'column', 
            backgroundColor: 'var(--bg-color)' 
        }}>
            {/* Minimalist High-Contrast Warning Header */}
            <header style={{ 
                backgroundColor: 'var(--danger)', 
                color: 'white', 
                padding: '0.5rem 1rem', 
                textAlign: 'center', 
                fontWeight: 'bold', 
                letterSpacing: '2px', 
                fontSize: '0.85rem',
                textTransform: 'uppercase',
                boxShadow: '0 2px 10px rgba(239, 68, 68, 0.2)'
            }}>
                ⚠️ Distraction-Free Board Simulation Active — Real-Time Penalties Apply
            </header>
            
            {/* Centered Exam Viewport */}
            <main style={{ 
                flex: 1, 
                padding: '2rem 1rem', 
                overflowY: 'auto',
                display: 'flex',
                justifyContent: 'center'
            }}>
                <div style={{ 
                    width: '100%', 
                    maxWidth: '1000px', // Slightly wider than standard to accommodate complex circuits/derivations
                    margin: '0 auto' 
                }}>
                    {children}
                </div>
            </main>
        </div>
    );
}