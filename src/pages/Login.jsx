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
        <div className="center-screen">
            <div className="glass-panel animate-fade-in" style={{ padding: '2rem', width: '100%', maxWidth: '400px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    {step === 1 ? 'Welcome Back' : 'Verify Login'}
                </h2>

                {error && <div style={{ color: 'var(--error)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

                {step === 1 ? (
                    <form onSubmit={handleSendOtp}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-scnd)' }}>Phone Number</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="+1234567890"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
                            {loading ? 'Sending...' : 'Send OTP'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-scnd)' }}>Enter OTP</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="000000 (dev mode: any OTP works)"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                            />
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-scnd)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                                💡 Dev Mode: Use any OTP (e.g., 000000, 123456) to login
                            </p>
                        </div>
                        <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify & Login'}
                        </button>
                        <p
                            onClick={() => setStep(1)}
                            style={{ textAlign: 'center', marginTop: '1rem', cursor: 'pointer', color: 'var(--text-scnd)', fontSize: '0.9rem' }}
                        >
                            Change Phone Number
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Login;
