import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { formatTimestamp, formatLastSeen } from '../utils/timestamp';
import EmojiPicker from '../components/EmojiPicker';
import Profile from '../components/Profile';
import '../styles/global.css';

const Dashboard = () => {
    const [chats, setChats] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [typingUsers, setTypingUsers] = useState(new Set());
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [recordingUsers, setRecordingUsers] = useState(new Set());
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingIntervalRef = useRef(null);




    const [showProfile, setShowProfile] = useState(false);
    const [profileUserId, setProfileUserId] = useState(null);
    const [searchPhone, setSearchPhone] = useState('');
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [typingTimeout, setTypingTimeout] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showChatMenu, setShowChatMenu] = useState(false);
    const chatMenuRef = useRef(null);

    const { user } = useAuth();
    const socket = useSocket();
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const emojiPickerRef = useRef(null);

    // Initial Fetch
    useEffect(() => {
        fetchChats();
    }, []);

    // Scroll to bottom
    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (chatMenuRef.current && !chatMenuRef.current.contains(event.target)) {
                setShowChatMenu(false);
            }
        };

        if (showChatMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showChatMenu]);

    // Socket Listeners
    useEffect(() => {
        if (socket) {
            socket.on('userStatusChange', ({ userId, isOnline }) => {
                // ... (existing logic)
                setChats(prev => prev.map(chat => {
                    const otherParticipant = chat.otherParticipant || {};
                    if ((otherParticipant._id || otherParticipant) === userId) {
                        return {
                            ...chat,
                            otherParticipant: {
                                ...otherParticipant,
                                isOnline,
                                lastSeen: isOnline ? new Date() : new Date()
                            }
                        };
                    }
                    return chat;
                }));
            });

            socket.on('newMessage', (message) => {
                const senderId = typeof message.senderId === 'object' ? message.senderId._id : message.senderId;

                // Remove from typing list when message received
                setTypingUsers(prev => {
                    const next = new Set(prev);
                    next.delete(senderId);
                    return next;
                });

                fetchChats();

                if (selectedUser && (senderId === selectedUser._id || senderId === user._id)) {
                    setMessages(prev => {
                        if (prev.some(m => m._id === message._id)) return prev;
                        return [...prev, message];
                    });
                }
            });

            socket.on('messageStatusUpdate', ({ messageId, status }) => {
                setMessages(prev => prev.map(msg => msg._id === messageId ? { ...msg, status } : msg));
            });

            socket.on('typing', ({ senderId, isTyping: typing }) => {
                setTypingUsers(prev => {
                    const next = new Set(prev);
                    if (typing) {
                        next.add(senderId);
                    } else {
                        next.delete(senderId);
                    }
                    return next;
                });
            });

            socket.on('recording', ({ senderId, isRecording: recording }) => {
                setRecordingUsers(prev => {
                    const next = new Set(prev);
                    if (recording) {
                        next.add(senderId);
                    } else {
                        next.delete(senderId);
                    }
                    return next;
                });
            });

            socket.on('profileUpdated', ({ userId, profilePicture, about, name }) => {
                if (userId === user._id) return;

                setChats(prev => prev.map(chat => {
                    const other = chat.otherParticipant || {};
                    if ((other._id || other) === userId) {
                        return {
                            ...chat,
                            otherParticipant: {
                                ...other,
                                profilePicture: profilePicture !== undefined ? profilePicture : other.profilePicture,
                                about: about !== undefined ? about : other.about,
                                displayName: name || other.phoneNumber
                            }
                        };
                    }
                    return chat;
                }));

                if (selectedUser && selectedUser._id === userId) {
                    setSelectedUser(prev => ({
                        ...prev,
                        profilePicture: profilePicture !== undefined ? profilePicture : prev.profilePicture,
                        name: name !== undefined ? name : prev.name,
                        displayName: name || prev.phoneNumber
                    }));
                }
            });

            return () => {
                socket.off('userStatusChange');
                socket.off('newMessage');
                socket.off('messageStatusUpdate');
                socket.off('typing');
                socket.off('recording');
                socket.off('profileUpdated');
            };
        }
    }, [socket, selectedUser, user]);

    // Fetch Chats
    const fetchChats = async () => {
        try {
            const res = await api.get('/chat');
            setChats(res.data);
        } catch (err) {
            console.error('Failed to fetch chats', err);
        }
    };

    // Fetch History
    const fetchHistory = async (userId) => {
        try {
            const res = await api.get(`/chat/${userId}`);
            setMessages(res.data);
        } catch (err) {
            setMessages([]);
        }
    };

    // Selection
    const handleSelectUser = (participant) => {
        setSelectedUser(participant);
        setMessages([]);
        setIsTyping(false); // Reset typing status
        fetchHistory(participant._id);
        // On mobile, this would need to toggle a view state
    };

    // Send Message
    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser) return;

        const text = newMessage;
        setNewMessage('');

        try {
            const res = await api.post('/chat/send', {
                recipientId: selectedUser._id,
                text,
                type: 'text'
            });
            setMessages(prev => [...prev, { ...res.data, status: 'sent', senderId: user._id }]);
            fetchChats(); // Move chat to top
        } catch (err) {
            console.error(err);
        }
    };

    const getActiveChatId = () => {
        if (!selectedUser) return null;
        // Find chat where other participant matches active user
        // Note: selectedUser in my state is the 'otherParticipant' object usually
        const chat = chats.find(c => {
            const otherId = c.otherParticipant?._id ||
                c.participants?.find(p => p._id !== user._id)?._id;
            return otherId === selectedUser._id;
        });
        return chat?._id;
    };

    const handleChatAction = async (action) => {
        const chatId = getActiveChatId();
        if (!chatId) return;

        try {
            switch (action) {
                case 'archive':
                    await api.post('/chat/archive', { chatId });
                    setChats(prev => prev.filter(c => c._id !== chatId));
                    setSelectedUser(null);
                    break;
                case 'delete':
                    if (window.confirm('Delete this chat? It will be hidden until a new message is sent.')) {
                        await api.post('/chat/delete', { chatId });
                        setChats(prev => prev.filter(c => c._id !== chatId));
                        setSelectedUser(null);
                    }
                    break;
                case 'clear':
                    if (window.confirm('Clear all messages in this chat?')) {
                        await api.post('/chat/clear', { chatId });
                        setMessages([]);
                    }
                    break;
            }
            setShowChatMenu(false);
        } catch (err) {
            console.error('Action failed:', err);
            alert('Action failed');
        }
    };

    // Start New Chat
    const handleNewChat = async (e) => {
        e.preventDefault();
        setSearchError('');
        setIsSearching(true);
        try {
            const res = await api.post('/chat/search', { phoneNumber: searchPhone });
            const { user: foundUser, chatId } = res.data;

            // Just select the user immediately
            const participant = {
                ...foundUser,
                displayName: foundUser.name || foundUser.phoneNumber // fallback
            };

            // Force visual update or simply select
            if (!chatId) {
                // Pre-emptively add to chat list or just select
            }
            // Explicitly start
            const startRes = await api.post('/chat/start', { userId: foundUser._id });
            const newChat = startRes.data;

            // Add to list and select
            setChats(prev => {
                const existing = prev.find(c => c._id === newChat._id);
                if (existing) return prev;
                return [newChat, ...prev];
            });
            handleSelectUser(newChat.otherParticipant);
            setShowNewChatModal(false);
            setSearchPhone('');
        } catch (err) {
            setSearchError(err.response?.data?.error || 'User not found');
        } finally {
            setIsSearching(false);
        }
    };

    // Typing Handler
    const handleTyping = (e) => {
        const val = e.target.value;
        setNewMessage(val);

        if (!socket || !selectedUser) return;

        if (typingTimeout) clearTimeout(typingTimeout);

        if (val.trim().length > 0) {
            socket.emit('typing', { recipientId: selectedUser._id, isTyping: true });
            const timeout = setTimeout(() => {
                socket.emit('stopTyping', { recipientId: selectedUser._id });
            }, 2000);
            setTypingTimeout(timeout);
        } else {
            socket.emit('stopTyping', { recipientId: selectedUser._id });
        }
    };

    // Recording Helpers
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
                const audioFile = new File([audioBlob], 'voice_message.mp3', { type: 'audio/mp3' });

                try {
                    const formData = new FormData();
                    formData.append('file', audioFile);
                    formData.append('type', 'audio');

                    const uploadRes = await api.post('/chat/upload-media', formData);
                    const { type: msgType } = uploadRes.data;

                    const res = await api.post('/chat/send', {
                        recipientId: selectedUser._id,
                        type: msgType,
                        media: uploadRes.data,
                        text: ''
                    });

                    setMessages(prev => [...prev, { ...res.data, status: 'sent', senderId: user._id }]);
                    fetchChats();
                } catch (err) {
                    console.error('Failed to send audio:', err);
                }
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingDuration(0);

            socket.emit('recording', { recipientId: selectedUser._id, isRecording: true });

            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Could not access microphone');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(recordingIntervalRef.current);
            socket.emit('stopRecording', { recipientId: selectedUser._id });
        }
    };

    const formatDuration = (sec) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Render Helpers
    const getOtherParticipant = (chat) => {
        return chat.otherParticipant || chat.participants?.find(p => p._id !== user._id) || {};
    };

    return (
        <div className="app-container">
            <div className={`chat-layout ${selectedUser ? 'chat-active' : ''}`}>

                {/* Sidebar */}
                <div className="sidebar">
                    <div className="sidebar-header">
                        <div
                            className="user-profile-thumb"
                            style={{ backgroundImage: user?.profilePicture ? `url(${import.meta.env.VITE_API_URL}${user.profilePicture})` : 'none' }}
                            onClick={() => { setProfileUserId(user._id); setShowProfile(true); }}
                        >
                            {!user?.profilePicture && (user?.name?.[0] || user?.phoneNumber?.[0] || '?')}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="action-btn" onClick={() => setShowNewChatModal(true)} title="New Chat">
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>
                            </button>
                        </div>
                    </div>

                    <div className="chat-list">
                        <AnimatePresence>
                            {chats.map(chat => {
                                const other = getOtherParticipant(chat);
                                const isSelected = selectedUser?._id === other._id;

                                return (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        whileHover={{ scale: 1.02, backgroundColor: 'hsla(var(--bg-hover), 0.8)' }}
                                        whileTap={{ scale: 0.98 }}
                                        key={chat._id || chat.tempId}
                                        className={`chat-item ${isSelected ? 'active' : ''}`}
                                        onClick={() => handleSelectUser(other)}
                                    >
                                        <div className="chat-avatar" style={{ overflow: 'hidden', backgroundColor: 'hsl(var(--bg-input))' }}>
                                            {other.profilePicture ? (
                                                <img
                                                    src={`${import.meta.env.VITE_API_URL}${other.profilePicture}`}
                                                    alt={other.displayName}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.parentElement.innerText = (other.displayName?.[0] || other.phoneNumber?.[0] || '?');
                                                        e.target.parentElement.style.display = 'flex';
                                                        e.target.parentElement.style.alignItems = 'center';
                                                        e.target.parentElement.style.justifyContent = 'center';
                                                        e.target.parentElement.style.fontWeight = 'bold';
                                                    }}
                                                />
                                            ) : (
                                                (other.displayName?.[0] || other.phoneNumber?.[0] || '?')
                                            )}
                                            {other.isOnline && (
                                                <div style={{
                                                    position: 'absolute', bottom: '2px', right: '2px',
                                                    width: '10px', height: '10px', borderRadius: '50%',
                                                    backgroundColor: '#4ade80', border: '2px solid var(--bg-card)'
                                                }} />
                                            )}
                                        </div>
                                        <div className="chat-info">
                                            <div className="chat-name-row">
                                                <span className="chat-name">{other.displayName || other.phoneNumber}</span>
                                                <span className="chat-time">
                                                    {chat.lastMessage ? formatTimestamp(chat.lastMessage.createdAt) : ''}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span className="chat-last-msg">
                                                    {typingUsers.has(other._id) ?
                                                        <span style={{ color: 'var(--primary)' }}>typing...</span> :
                                                        (chat.lastMessage ? (chat.lastMessage.text || 'Media') : 'New Chat')
                                                    }
                                                </span>
                                                {chat.unreadCount > 0 && (
                                                    <span className="unread-badge">{chat.unreadCount}</span>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Chat Window */}
                <div className="chat-window">
                    {selectedUser ? (
                        <>
                            <div className="chat-header">
                                <button className="back-btn" onClick={() => setSelectedUser(null)}>←</button>
                                <div
                                    className="chat-avatar"
                                    style={{ width: '40px', height: '40px', marginRight: '1rem', backgroundImage: selectedUser.profilePicture ? `url(${import.meta.env.VITE_API_URL}${selectedUser.profilePicture})` : 'none' }}
                                >
                                    {!selectedUser.profilePicture && (selectedUser.displayName?.[0] || selectedUser.phoneNumber?.[0] || '?')}
                                </div>
                                <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => { setProfileUserId(selectedUser._id); setShowProfile(true); }}>
                                    <div style={{ fontWeight: '600' }}>{selectedUser.displayName || selectedUser.phoneNumber}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.7, color: (typingUsers.has(selectedUser._id) || recordingUsers.has(selectedUser._id)) ? 'hsl(var(--primary))' : 'inherit' }}>
                                        {recordingUsers.has(selectedUser._id) ? 'recording audio...' : (typingUsers.has(selectedUser._id) ? 'typing...' : (selectedUser.isOnline ? 'Online' : (selectedUser.lastSeen ? `Last seen ${formatLastSeen(selectedUser.lastSeen)}` : 'Offline')))}
                                    </div>
                                </div>

                                {/* Chat Menu */}
                                <div style={{ position: 'relative' }} ref={chatMenuRef}>
                                    <button
                                        className="action-btn"
                                        onClick={() => setShowChatMenu(!showChatMenu)}
                                        style={{ fontSize: '1.2rem', padding: '0.5rem' }}
                                    >
                                        ⋮
                                    </button>
                                    {showChatMenu && (
                                        <div className="glass-panel" style={{
                                            position: 'absolute',
                                            right: 0,
                                            top: '100%',
                                            marginTop: '0.5rem',
                                            padding: '0.5rem',
                                            background: 'hsl(var(--bg-card))',
                                            minWidth: '150px',
                                            zIndex: 100,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.25rem'
                                        }}>
                                            <button
                                                className="btn"
                                                style={{ background: 'transparent', textAlign: 'left', padding: '0.5rem', fontSize: '0.9rem', justifyContent: 'flex-start' }}
                                                onClick={() => handleChatAction('archive')}
                                            >
                                                📁 Archive
                                            </button>
                                            <button
                                                className="btn"
                                                style={{ background: 'transparent', textAlign: 'left', padding: '0.5rem', fontSize: '0.9rem', justifyContent: 'flex-start' }}
                                                onClick={() => handleChatAction('clear')}
                                            >
                                                🧹 Clear Chat
                                            </button>
                                            <button
                                                className="btn"
                                                style={{ background: 'transparent', textAlign: 'left', padding: '0.5rem', fontSize: '0.9rem', color: 'var(--error)', justifyContent: 'flex-start' }}
                                                onClick={() => handleChatAction('delete')}
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="messages-area">
                                <AnimatePresence>
                                    {messages.map((msg, index) => {
                                        const isMe = msg.senderId === user._id || (typeof msg.senderId === 'object' && msg.senderId._id === user._id);
                                        return (
                                            <motion.div
                                                layout
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                                key={msg._id || index}
                                                className={`message ${isMe ? 'sent' : 'received'}`}
                                            >
                                                {msg.type === 'audio' ? (
                                                    <div className="audio-message" style={{ width: '200px', padding: '0.5rem 0' }}>
                                                        <audio
                                                            controls
                                                            src={`${import.meta.env.VITE_API_URL}${typeof msg.media === 'object' ? msg.media.url : msg.media}`}
                                                            style={{ width: '100%', borderRadius: '20px' }}
                                                        />
                                                    </div>
                                                ) : msg.type === 'image' || msg.type === 'image/jpeg' || msg.type === 'image/png' ? (
                                                    <div style={{ marginBottom: msg.text ? '0.5rem' : 0 }}>
                                                        <img
                                                            src={`${import.meta.env.VITE_API_URL}${typeof msg.media === 'object' ? msg.media.url : msg.media}`}
                                                            alt=""
                                                            style={{
                                                                maxWidth: '100%',
                                                                borderRadius: '8px',
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={() => window.open(`${import.meta.env.VITE_API_URL}${typeof msg.media === 'object' ? msg.media.url : msg.media}`, '_blank')}
                                                        />
                                                        {msg.text && <div className="message-text" style={{ marginTop: '0.5rem' }}>{msg.text}</div>}
                                                    </div>
                                                ) : (
                                                    <div className="message-text">{msg.text}</div>
                                                )}
                                                <div className="message-time">
                                                    {formatTimestamp(msg.createdAt)}
                                                    {isMe && (
                                                        <span>
                                                            {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                                                        </span>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                    {(typingUsers.has(selectedUser._id) || recordingUsers.has(selectedUser._id)) && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="typing-indicator"
                                        >
                                            {recordingUsers.has(selectedUser._id) ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-scnd)', fontSize: '0.9rem' }}>
                                                    🎤 Recording audio...
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="typing-dot"></div>
                                                    <div className="typing-dot"></div>
                                                    <div className="typing-dot"></div>
                                                </>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <div ref={messagesEndRef} />
                            </div>

                            <form className="input-area" onSubmit={handleSend}>
                                {/* Wrapper for input and attachments */}
                                <div className="chat-input-wrapper">
                                    <button
                                        type="button"
                                        className="action-btn"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        style={{ marginRight: '0.5rem' }}
                                    >
                                        😊
                                    </button>
                                    <button
                                        type="button"
                                        className="action-btn"
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{ marginRight: '0.5rem' }}
                                        title="Send Photo"
                                    >
                                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                            <circle cx="12" cy="13" r="4"></circle>
                                        </svg>
                                    </button>
                                    <input
                                        className="chat-input"
                                        placeholder={`Message ${selectedUser.displayName || selectedUser.phoneNumber}...`}
                                        value={newMessage}
                                        onChange={handleTyping}
                                        disabled={isRecording}
                                    />
                                    {/* Mic Button */}
                                    <button
                                        type="button"
                                        className={`action-btn ${isRecording ? 'recording' : ''}`}
                                        onMouseDown={startRecording}
                                        onMouseUp={stopRecording}
                                        onTouchStart={startRecording}
                                        onTouchEnd={stopRecording}
                                        style={{
                                            color: isRecording ? '#ef4444' : 'inherit',
                                            transform: isRecording ? 'scale(1.1)' : 'none',
                                            marginLeft: '0.5rem'
                                        }}
                                        title="Hold to Record"
                                    >
                                        <svg width="24" height="24" fill={isRecording ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                            <line x1="12" y1="19" x2="12" y2="23"></line>
                                            <line x1="8" y1="23" x2="16" y2="23"></line>
                                        </svg>
                                    </button>
                                    {isRecording && (
                                        <div style={{
                                            position: 'absolute',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            background: '#ef4444',
                                            color: 'white',
                                            padding: '4px 12px',
                                            borderRadius: '12px',
                                            fontSize: '0.8rem',
                                            pointerEvents: 'none'
                                        }}>
                                            {formatDuration(recordingDuration)}
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        style={{ display: 'none' }}
                                        ref={fileInputRef}
                                        onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;

                                            try {
                                                const formData = new FormData();
                                                formData.append('file', file);
                                                formData.append('type', 'image'); // Explicit type for middleware

                                                // 1. Upload Media
                                                const uploadRes = await api.post('/chat/upload-media', formData);
                                                const { type: msgType } = uploadRes.data;

                                                // 2. Send Message with Media
                                                const res = await api.post('/chat/send', {
                                                    recipientId: selectedUser._id,
                                                    type: msgType,
                                                    media: uploadRes.data, // Pass full object with url, mimeType, size
                                                    text: ''
                                                });

                                                setMessages(prev => [...prev, { ...res.data, status: 'sent', senderId: user._id }]);
                                                fetchChats();
                                            } catch (err) {
                                                console.error('Failed to send image:', err);
                                                alert('Failed to send image');
                                            }
                                        }}
                                    />
                                </div>
                                <button type="submit" className="send-btn">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                </button>

                                {showEmojiPicker && (
                                    <div style={{ position: 'absolute', bottom: '80px', left: '20px', zIndex: 100 }}>
                                        <EmojiPicker onSelect={(emoji) => { setNewMessage(prev => prev + emoji); setShowEmojiPicker(false); }} />
                                    </div>
                                )}
                            </form>
                        </>
                    ) : (
                        <div className="empty-state animate-fade-in">
                            <div className="empty-icon" style={{ fontSize: '6rem', marginBottom: '1.5rem', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))' }}>💬</div>
                            <h2 style={{ marginBottom: '0.5rem', background: 'linear-gradient(to right, #fff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Welcome to Chat App</h2>
                            <p style={{ maxWidth: '300px', lineHeight: '1.6' }}>Select a conversation from the sidebar or start a new chat to begin messaging.</p>
                            <button
                                className="btn"
                                style={{ marginTop: '2rem', padding: '0.8rem 2rem' }}
                                onClick={() => setShowNewChatModal(true)}
                            >
                                Start New Chat
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showNewChatModal && (
                    <div className="modal-overlay" onClick={() => setShowNewChatModal(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.2 }}
                            className="glass-panel"
                            style={{
                                width: '100%',
                                maxWidth: '400px',
                                padding: '2rem',
                                margin: '1rem',
                                position: 'relative'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h2 style={{
                                marginTop: 0,
                                marginBottom: '1.5rem',
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                textAlign: 'center'
                            }}>
                                New Conversation
                            </h2>
                            <form onSubmit={handleNewChat}>
                                <div style={{ marginBottom: '2rem' }} className="input-group">
                                    <label className="input-label">Phone Number</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            className="input-field"
                                            autoFocus
                                            placeholder="+1234567890"
                                            value={searchPhone}
                                            onChange={e => setSearchPhone(e.target.value)}
                                            style={{ paddingLeft: '1rem' }}
                                        />
                                    </div>
                                    {searchError && (
                                        <div style={{
                                            color: '#f87171',
                                            marginTop: '0.5rem',
                                            fontSize: '0.85rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem'
                                        }}>
                                            ⚠️ {searchError}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        type="button"
                                        className="btn"
                                        style={{
                                            flex: 1,
                                            background: 'transparent',
                                            border: '1px solid var(--glass-border)',
                                            boxShadow: 'none'
                                        }}
                                        onClick={() => setShowNewChatModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn"
                                        style={{ flex: 1 }}
                                        disabled={isSearching}
                                    >
                                        {isSearching ? 'Searching...' : 'Start Chat'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {showProfile && profileUserId && (
                <Profile userId={profileUserId} onClose={() => setShowProfile(false)} />
            )}
        </div>
    );
};

export default Dashboard;
