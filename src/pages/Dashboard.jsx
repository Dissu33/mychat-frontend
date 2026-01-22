import { useState, useEffect, useRef } from 'react';
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
    const [isTyping, setIsTyping] = useState(false);
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

                // Update chat list with last message
                fetchChats(); // Refresh list to bubble up

                // Add to current view if matches
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
                if (selectedUser && senderId === selectedUser._id) {
                    setIsTyping(typing);
                }
            });

            return () => {
                socket.off('userStatusChange');
                socket.off('newMessage');
                socket.off('messageStatusUpdate');
                socket.off('typing');
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
                        {chats.map(chat => {
                            const other = getOtherParticipant(chat);
                            const isSelected = selectedUser?._id === other._id;

                            return (
                                <div
                                    key={chat._id || chat.tempId}
                                    className={`chat-item ${isSelected ? 'active' : ''}`}
                                    onClick={() => handleSelectUser(other)}
                                >
                                    <div
                                        className="chat-avatar"
                                        style={{ backgroundImage: other.profilePicture ? `url(${import.meta.env.VITE_API_URL}${other.profilePicture})` : 'none' }}
                                    >
                                        {!other.profilePicture && (other.displayName?.[0] || other.phoneNumber?.[0] || '?')}
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
                                                {isTyping && isSelected ?
                                                    <span style={{ color: 'var(--primary)' }}>typing...</span> :
                                                    (chat.lastMessage ? (chat.lastMessage.text || 'Media') : 'New Chat')
                                                }
                                            </span>
                                            {chat.unreadCount > 0 && (
                                                <span className="unread-badge">{chat.unreadCount}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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
                                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                        {selectedUser.isOnline ? 'Online' : (selectedUser.lastSeen ? `Last seen ${formatLastSeen(selectedUser.lastSeen)}` : 'Offline')}
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
                                {messages.map((msg, index) => {
                                    const isMe = msg.senderId === user._id || (typeof msg.senderId === 'object' && msg.senderId._id === user._id);
                                    return (
                                        <div key={msg._id || index} className={`message ${isMe ? 'sent' : 'received'} fade-in`}>
                                            <div className="message-text">{msg.text}</div>
                                            <div className="message-time">
                                                {formatTimestamp(msg.createdAt)}
                                                {isMe && (
                                                    <span>
                                                        {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            <form className="input-area" onSubmit={handleSend}>
                                {/* Wrapper for input and attachments */}
                                <div className="chat-input-wrapper">
                                    <button type="button" className="action-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😊</button>
                                    <input
                                        className="chat-input"
                                        placeholder="Type a message..."
                                        value={newMessage}
                                        onChange={handleTyping}
                                    />
                                    {/* Could add attachment btn here */}
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
                        <div className="empty-state">
                            <div className="empty-icon">💬</div>
                            <h3>Welcome to Chat App</h3>
                            <p>Select a chat or start a new conversation.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showNewChatModal && (
                <div className="modal-overlay" onClick={() => setShowNewChatModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0 }}>Start New Conversation</h3>
                        <form onSubmit={handleNewChat}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-scnd)' }}>Phone Number</label>
                                <input
                                    className="input-field"
                                    autoFocus
                                    placeholder="+1234567890"
                                    value={searchPhone}
                                    onChange={e => setSearchPhone(e.target.value)}
                                />
                                {searchError && <p style={{ color: 'var(--error)', marginTop: '0.5rem', fontSize: '0.9rem' }}>{searchError}</p>}
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="btn" style={{ background: 'transparent', border: '1px solid var(--glass-border)' }} onClick={() => setShowNewChatModal(false)}>Cancel</button>
                                <button type="submit" className="btn" style={{ flex: 1 }} disabled={isSearching}>
                                    {isSearching ? 'Search...' : 'Start Chat'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showProfile && profileUserId && (
                <Profile userId={profileUserId} onClose={() => setShowProfile(false)} />
            )}
        </div>
    );
};

export default Dashboard;
