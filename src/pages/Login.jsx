import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../styles/global.css';

const Login = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1); // 1: Phone, 2: OTP
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/auth/send-otp', { phoneNumber });
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/auth/verify-otp', { phoneNumber, otp });
            login(res.data.user, res.data.token);
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-container" style={{
            background: 'radial-gradient(circle at 50% 10%, hsl(var(--primary) / 0.2), transparent 40%), radial-gradient(circle at 90% 90%, hsl(var(--secondary) / 0.1), transparent 40%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div className="glass-panel animate-fade-in" style={{
                padding: '3rem 2rem',
                width: '100%',
                maxWidth: '420px',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))',
                        borderRadius: '16px',
                        margin: '0 auto 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 10px 25px -5px hsl(var(--primary) / 0.5)'
                    }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: '700',
                        background: 'linear-gradient(to right, white, #a5b4fc)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '0.5rem'
                    }}>
                        {step === 1 ? 'Welcome Back' : 'Verify Identity'}
                    </h1>
                    <p style={{ color: 'var(--text-scnd)', fontSize: '0.95rem' }}>
                        {step === 1 ? 'Enter your phone to get started' : `Code sent to ${phoneNumber}`}
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: 'hsla(0, 84%, 60%, 0.1)',
                        border: '1px solid hsla(0, 84%, 60%, 0.2)',
                        color: '#f87171',
                        padding: '0.75rem',
                        borderRadius: '12px',
                        marginBottom: '1.5rem',
                        textAlign: 'center',
                        fontSize: '0.9rem'
                    }}>
                        {error}
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleSendOtp}>
                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.75rem',
                                color: 'var(--text-primary)',
                                fontWeight: '500',
                                fontSize: '0.9rem'
                            }}>
                                Phone Number
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="+91 12345 67890"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    required
                                    style={{
                                        height: '50px',
                                        fontSize: '1rem',
                                        paddingLeft: '1rem',
                                        background: 'rgba(0,0,0,0.2)',
                                        borderColor: 'var(--glass-border)'
                                    }}
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn" style={{
                            width: '100%',
                            height: '50px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))',
                            boxShadow: '0 4px 15px -3px hsl(var(--primary) / 0.3)'
                        }} disabled={loading}>
                            {loading ? 'Sending Code...' : 'Continue'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp}>
                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.75rem',
                                color: 'var(--text-primary)',
                                fontWeight: '500',
                                fontSize: '0.9rem'
                            }}>
                                Verification Code
                            </label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="• • • • • •"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                style={{
                                    height: '50px',
                                    fontSize: '1.25rem',
                                    textAlign: 'center',
                                    letterSpacing: '0.5rem',
                                    background: 'rgba(0,0,0,0.2)',
                                    borderColor: 'var(--glass-border)'
                                }}
                            />
                            <div style={{
                                marginTop: '1rem',
                                padding: '0.75rem',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                color: 'var(--text-scnd)',
                                textAlign: 'center'
                            }}>
                                <span style={{ opacity: 0.7 }}>DEV MODE:</span> Use <strong style={{ color: 'hsl(var(--primary))' }}>000000</strong> or <strong style={{ color: 'hsl(var(--primary))' }}>123456</strong>
                            </div>
                        </div>
                        <button type="submit" className="btn" style={{
                            width: '100%',
                            height: '50px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))',
                            boxShadow: '0 4px 15px -3px hsl(var(--primary) / 0.3)'
                        }} disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify Entry'}
                        </button>
                        <div
                            onClick={() => setStep(1)}
                            style={{
                                textAlign: 'center',
                                marginTop: '1.5rem',
                                cursor: 'pointer',
                                color: 'var(--text-scnd)',
                                fontSize: '0.9rem',
                                transition: 'color 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'}
                            onMouseLeave={(e) => e.target.style.color = 'var(--text-scnd)'}
                        >
                            ← Use different number
                        </div>
                    </form>
                )}
            </div>

            {/* Footer */}
            <div style={{
                position: 'absolute',
                bottom: '2rem',
                color: 'var(--text-scnd)',
                fontSize: '0.8rem',
                opacity: 0.5
            }}>
                Secure Encrypted Messaging
            </div>
        </div>
    );
};

export default Login;
