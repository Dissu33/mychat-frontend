import { createContext, useEffect, useState, useContext } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            console.log('Initializing socket for user:', user._id);
            const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const newSocket = io(socketUrl, {
                transports: ['websocket'], // Force websocket
                reconnection: true
            });

            newSocket.on('connect', () => {
                console.log('Socket connected with ID:', newSocket.id);
                newSocket.emit('join', user._id);
            });

            newSocket.on('connect_error', (err) => {
                console.error('Socket Connection Error:', err);
            });

            setSocket(newSocket);

            return () => newSocket.close();
        } else {
            setSocket(null);
        }
    }, [user?._id]); // Only re-run if ID changes, not object reference

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
