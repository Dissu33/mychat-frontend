import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

        // Default country code logic
        let phoneToSend = phoneNumber.trim();
        if (!phoneToSend.startsWith('+')) {
            phoneToSend = `+91${phoneToSend}`;
        }

        try {
            await api.post('/auth/send-otp', { phoneNumber: phoneToSend });
            // Update local state to show the user what was sent (optional, but good for UX)
            // setPhoneNumber(phoneToSend); 
            // actually better to keep user input but send modified, 
            // OR update it so they know. Let's send the modified one and keep state as is for now 
            // unless we want to show it in the next step.
            // valid point: verify-otp needs the same phone number. 
            // So we MUST update the state or store the formatted one.
            setPhoneNumber(phoneToSend);
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
            background: 'radial-gradient(circle at 50% 10%, hsl(var(--primary) / 0.15), transparent 50%), radial-gradient(circle at 90% 90%, hsl(var(--secondary) / 0.1), transparent 50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative'
        }}>
            {/* Background Glow */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100%',
                height: '100%',
                maxWidth: '600px',
                maxHeight: '600px',
                background: 'radial-gradient(circle, hsla(var(--primary), 0.15) 0%, transparent 70%)',
                filter: 'blur(60px)',
                zIndex: 0,
                pointerEvents: 'none'
            }} />
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="glass-panel"
                style={{
                    padding: '3rem 2.5rem',
                    width: '100%',
                    maxWidth: '440px',
                    margin: '1rem' // Mobile spacing
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                        style={{
                            width: '72px',
                            height: '72px',
                            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))',
                            borderRadius: '20px',
                            margin: '0 auto 1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 10px 25px -5px hsl(var(--primary) / 0.5)'
                        }}
                    >
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </motion.div>
                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: '800',
                        letterSpacing: '-0.02em',
                        background: 'linear-gradient(to right, #fff, #a5b4fc)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '0.75rem'
                    }}>
                        {step === 1 ? 'Welcome Back' : 'Verify Identity'}
                    </h1>
                    <p style={{ color: 'var(--text-scnd)', fontSize: '1rem', lineHeight: '1.5' }}>
                        {step === 1 ? 'Enter your phone number to continue' : `We sent a code to ${phoneNumber}`}
                    </p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="error-message"
                        style={{
                            background: 'hsla(0, 84%, 60%, 0.1)',
                            border: '1px solid hsla(0, 84%, 60%, 0.2)',
                            color: '#f87171',
                            padding: '0.75rem',
                            borderRadius: '12px',
                            marginBottom: '1.5rem',
                            textAlign: 'center',
                            fontSize: '0.9rem'
                        }}
                    >
                        {error}
                    </motion.div>
                )}

                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.form
                            key="step1"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} // "Smooth" ease
                            onSubmit={handleSendOtp}
                        >
                            <div style={{ marginBottom: '2rem' }} className="input-group">
                                <label className="input-label">
                                    Phone Number
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="tel" // optimized keyboard
                                        className="input-field"
                                        placeholder="+91 99999 99999"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                className="btn"
                                disabled={loading}
                            >
                                {loading ? 'Sending Code...' : 'Continue'}
                            </motion.button>
                        </motion.form>
                    ) : (
                        <motion.form
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                            onSubmit={handleVerifyOtp}
                        >
                            <div style={{ marginBottom: '2rem' }} className="input-group">
                                <label className="input-label">
                                    Verification Code
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    className="input-field otp-input"
                                    placeholder="• • • • • •"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    required
                                />

                            </div>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                className="btn"
                                disabled={loading}
                            >
                                {loading ? 'Verifying...' : 'Verify Entry'}
                            </motion.button>
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
                        </motion.form>
                    )}
                </AnimatePresence>
            </motion.div>

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
