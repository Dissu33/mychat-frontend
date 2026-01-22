import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState('dark');
    const { user } = useAuth();

    useEffect(() => {
        // Load theme from localStorage or user preference
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);
        applyTheme(savedTheme);
    }, []);

    useEffect(() => {
        // Sync with user's theme preference from backend
        if (user?.theme) {
            setTheme(user.theme);
            applyTheme(user.theme);
            localStorage.setItem('theme', user.theme);
        }
    }, [user?.theme]);

    const applyTheme = (themeName) => {
        const root = document.documentElement;
        if (themeName === 'light') {
            root.style.setProperty('--bg-primary', '255, 255, 255');
            root.style.setProperty('--text-primary', '0, 0, 0');
            root.style.setProperty('--text-scnd', '100, 100, 100');
            root.style.setProperty('--bg-input', '240, 240, 240');
        } else {
            root.style.setProperty('--bg-primary', '20, 20, 30');
            root.style.setProperty('--text-primary', '255, 255, 255');
            root.style.setProperty('--text-scnd', '180, 180, 180');
            root.style.setProperty('--bg-input', '40, 40, 50');
        }
    };

    const changeTheme = async (newTheme) => {
        setTheme(newTheme);
        applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);

        // Update theme on backend if user is logged in
        if (user) {
            try {
                await api.put('/auth/profile', { theme: newTheme });
            } catch (error) {
                console.error('Failed to update theme:', error);
            }
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, changeTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);

