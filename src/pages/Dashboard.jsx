import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { formatTimestamp, formatLastSeen } from '../utils/timestamp';
import EmojiPicker from '../components/EmojiPicker';
import Profile from '../components/Profile';
import '../styles/global.css';

const UserList = ({ onSelectUser, selectedUserId, refreshTrigger }) => {
    const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'contacts'
    const [chats, setChats] = useState([]);
    const [contacts, setContacts] = useState([]);
    const { user } = useAuth();
    const socket = useSocket();

    useEffect(() => {
        fetchChats();
        fetchContacts();
    }, [refreshTrigger]);

    // Listen for online status changes
    useEffect(() => {
        if (socket) {
            socket.on('userStatusChange', ({ userId, isOnline }) => {
                setContacts(prev => prev.map(contact => 
                    contact._id === userId 
                        ? { ...contact, isOnline, lastSeen: isOnline ? new Date() : contact.lastSeen }
                        : contact
                ));
                setChats(prev => prev.map(chat => {
                    const otherParticipant = chat.otherParticipant || chat.participants?.find(p => p._id === userId);
                    if (otherParticipant?._id === userId) {
                        return {
                            ...chat,
                            otherParticipant: { ...otherParticipant, isOnline, lastSeen: isOnline ? new Date() : otherParticipant.lastSeen }
                        };
                    }
                    return chat;
                }));
            });

            return () => {
                socket.off('userStatusChange');
            };
        }
    }, [socket]);

    const fetchChats = async () => {
        try {
            const res = await api.get('/chat');
            setChats(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchContacts = async () => {
        try {
            const res = await api.get('/chat/users');
            setContacts(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const getOtherParticipant = (chat) => {
        const participant = chat.otherParticipant || chat.participants?.find(p => p._id !== user._id) || {};
        return {
            ...participant,
            displayName: participant.displayName || participant.phoneNumber
        };
    };

    return (
        <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)' }}>
                <div
                    onClick={() => setActiveTab('chats')}
                    style={{ flex: 1, padding: '1rem', textAlign: 'center', cursor: 'pointer', background: activeTab === 'chats' ? 'hsla(0,0%,100%,0.1)' : 'transparent', fontWeight: 'bold' }}
                >
                    Chats
                </div>
                <div
                    onClick={() => setActiveTab('contacts')}
                    style={{ flex: 1, padding: '1rem', textAlign: 'center', cursor: 'pointer', background: activeTab === 'contacts' ? 'hsla(0,0%,100%,0.1)' : 'transparent', fontWeight: 'bold' }}
                >
                    Contacts
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                {activeTab === 'chats' ? (
                    chats.length === 0 ? (
                        <p style={{ color: 'var(--text-scnd)', padding: '0.5rem' }}>No recent chats.</p>
                    ) : (
                        chats.map(chat => {
                            const otherWrapper = getOtherParticipant(chat);
                            return (
                                <div
                                    key={chat._id}
                                    onClick={() => onSelectUser(otherWrapper)}
                                    style={{
                                        padding: '1rem',
                                        marginBottom: '0.5rem',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        background: 'hsla(0, 0%, 100%, 0.03)',
                                        transition: 'background 0.2s',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.08)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.03)'}
                                >
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        background: otherWrapper.profilePicture
                                            ? `url(http://localhost:5000${otherWrapper.profilePicture})`
                                            : 'linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--primary)))',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        marginRight: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold'
                                    }}>
                                        {!otherWrapper.profilePicture && ((otherWrapper.displayName || otherWrapper.phoneNumber || '?')[0].toUpperCase())}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ fontWeight: '600' }}>{otherWrapper.displayName || otherWrapper.phoneNumber}</div>
                                            {otherWrapper.isOnline && (
                                                <div style={{
                                                    width: '8px',
                                                    height: '8px',
                                                    borderRadius: '50%',
                                                    background: '#4ade80',
                                                    marginLeft: 'auto'
                                                }} />
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-scnd)' }}>
                                            {chat.lastMessage ? (chat.lastMessage.text || chat.lastMessage.type || 'Media') : 'No messages'}
                                        </div>
                                        {chat.unreadCount > 0 && (
                                            <div style={{
                                                marginTop: '0.25rem',
                                                display: 'inline-block',
                                                background: 'hsl(var(--primary))',
                                                color: 'white',
                                                borderRadius: '10px',
                                                padding: '2px 6px',
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold'
                                            }}>
                                                {chat.unreadCount}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )
                ) : (
                    contacts.length === 0 ? (
                        <p style={{ color: 'var(--text-scnd)', padding: '0.5rem' }}>No contacts found.</p>
                    ) : (
                        contacts.map(contact => (
                            <div
                                key={contact._id}
                                onClick={() => onSelectUser(contact)}
                                style={{
                                    padding: '1rem',
                                    marginBottom: '0.5rem',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    background: 'hsla(0, 0%, 100%, 0.03)',
                                    transition: 'background 0.2s',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.08)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.03)'}
                            >
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: contact.profilePicture
                                        ? `url(http://localhost:5000${contact.profilePicture})`
                                        : 'hsla(0, 0%, 50%, 0.5)',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    marginRight: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold'
                                }}>
                                    {!contact.profilePicture && ((contact.displayName || contact.phoneNumber || '?')[0].toUpperCase())}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ fontWeight: '600' }}>{contact.displayName || contact.phoneNumber}</div>
                                        {contact.isOnline && (
                                            <div style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: '#4ade80'
                                            }} />
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-scnd)' }}>
                                        {contact.isOnline 
                                            ? 'Online' 
                                            : contact.lastSeen 
                                                ? formatLastSeen(contact.lastSeen) 
                                                : 'Offline'}
                                    </div>
                                </div>
                            </div>
                        ))
                    )
                )}
            </div>
        </div>
    );
};

const ChatWindow = ({ selectedUser, onUpdateContact, onOpenProfile }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [typingTimeout, setTypingTimeout] = useState(null);
    const [showMessageMenu, setShowMessageMenu] = useState(null);
    const [showEditName, setShowEditName] = useState(false);
    const [editName, setEditName] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [uploading, setUploading] = useState(false);
    const messagesEndRef = useRef(null);
    const menuRef = useRef(null);
    const fileInputRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const { user } = useAuth();
    const socket = useSocket();

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Close message menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                // Also check if click is not on a message bubble
                if (!event.target.closest('[data-message-id]')) {
                    setShowMessageMenu(null);
                }
            }
        };

        if (showMessageMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [showMessageMenu]);

    useEffect(() => {
        if (selectedUser) {
            fetchHistory();
            setMessages([]);
            setEditName(selectedUser.savedName || '');
        }
    }, [selectedUser]);

    useEffect(() => {
        if (socket && selectedUser) {
            // Handle incoming new messages
            socket.on('newMessage', (message) => {
                if (selectedUser) {
                    const senderId = typeof message.senderId === 'object' 
                        ? (message.senderId._id || message.senderId).toString()
                        : message.senderId.toString();
                    const currentUserId = user._id.toString();
                    const selectedUserId = selectedUser._id.toString();
                    
                    if (senderId === selectedUserId || senderId === currentUserId) {
                        setMessages(prev => {
                            if (prev.some(m => m._id === message._id)) return prev;
                            return [...prev, message];
                        });

                        // Mark as read if from other user
                        if (senderId !== currentUserId) {
                            socket.emit('messageRead', { 
                                messageId: message._id, 
                                senderId: senderId 
                            });
                        }
                    }
                }
            });

            // Handle status updates
            socket.on('messageStatusUpdate', ({ messageId, status }) => {
                setMessages(prev => prev.map(msg =>
                    msg._id === messageId ? { ...msg, status } : msg
                ));
            });

            // Handle typing indicators
            socket.on('typing', ({ senderId, isTyping: typing }) => {
                if (senderId === selectedUser._id) {
                    setIsTyping(typing);
                }
            });

            // Handle message reactions
            socket.on('messageReaction', ({ messageId, userId, emoji }) => {
                setMessages(prev => prev.map(msg => {
                    if (msg._id === messageId) {
                        const reactions = msg.reactions || [];
                        const existingIndex = reactions.findIndex(r => 
                            (typeof r.userId === 'object' ? r.userId._id : r.userId) === userId
                        );
                        if (existingIndex >= 0) {
                            reactions[existingIndex].emoji = emoji;
                        } else {
                            reactions.push({ userId, emoji });
                        }
                        return { ...msg, reactions: [...reactions] };
                    }
                    return msg;
                }));
            });

            socket.on('messageReactionRemoved', ({ messageId, userId }) => {
                setMessages(prev => prev.map(msg => {
                    if (msg._id === messageId) {
                        return {
                            ...msg,
                            reactions: (msg.reactions || []).filter(r => 
                                (typeof r.userId === 'object' ? r.userId._id : r.userId) !== userId
                            )
                        };
                    }
                    return msg;
                }));
            });

            // Handle message deletion
            socket.on('messageDeleted', ({ messageId, deleteForEveryone }) => {
                setMessages(prev => prev.map(msg => {
                    if (msg._id === messageId) {
                        if (deleteForEveryone) {
                            return { ...msg, isDeleted: true, text: 'This message was deleted', media: null };
                        }
                        return { ...msg, deletedFor: [...(msg.deletedFor || []), user._id] };
                    }
                    return msg;
                }));
            });

            return () => {
                socket.off('newMessage');
                socket.off('messageStatusUpdate');
                socket.off('typing');
                socket.off('messageReaction');
                socket.off('messageReactionRemoved');
                socket.off('messageDeleted');
            };
        }
    }, [socket, selectedUser, user]);

    // Cleanup typing timeout when component unmounts or selectedUser changes
    useEffect(() => {
        return () => {
            if (typingTimeout) {
                clearTimeout(typingTimeout);
            }
        };
    }, [typingTimeout, selectedUser]);

    const fetchHistory = async () => {
        if (!selectedUser) return;
        try {
            const res = await api.get(`/chat/${selectedUser._id}`);
            setMessages(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser) return;

        // Clear typing timeout and stop typing indicator immediately
        if (typingTimeout) {
            clearTimeout(typingTimeout);
            setTypingTimeout(null);
        }
        if (socket && selectedUser) {
            socket.emit('stopTyping', { recipientId: selectedUser._id });
        }

        try {
            const res = await api.post('/chat/send', {
                recipientId: selectedUser._id,
                text: newMessage,
                type: 'text'
            });
            setMessages(prev => [...prev, { ...res.data, status: 'sent' }]);
            setNewMessage('');
        } catch (err) {
            console.error(err);
        }
    };

    const handleTyping = (e) => {
        const value = e.target.value;
        setNewMessage(value);
        
        if (!socket || !selectedUser) return;

        // Clear existing timeout
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }

        // Only emit typing if there's text
        if (value.trim().length > 0) {
            // Emit typing indicator
            socket.emit('typing', { 
                recipientId: selectedUser._id, 
                isTyping: true 
            });

            // Set timeout to stop typing indicator after 2 seconds of no typing
            const timeout = setTimeout(() => {
                if (socket && selectedUser) {
                    socket.emit('stopTyping', { recipientId: selectedUser._id });
                }
            }, 2000);

            setTypingTimeout(timeout);
        } else {
            // If input is empty, stop typing immediately
            socket.emit('stopTyping', { recipientId: selectedUser._id });
            setTypingTimeout(null);
        }
    };

    const handleReaction = async (messageId, emoji) => {
        try {
            await api.post('/chat/reaction', { messageId, emoji });
        } catch (err) {
            console.error('Failed to add reaction:', err);
        }
    };

    const handleDeleteMessage = async (messageId, deleteForEveryone = false) => {
        try {
            await api.post('/chat/message/delete', { messageId, deleteForEveryone });
            setShowMessageMenu(null);
        } catch (err) {
            console.error('Failed to delete message:', err);
        }
    };

    const handleForwardMessage = async (messageId) => {
        // In a real app, show a modal to select recipients
        // For now, just log
        console.log('Forward message:', messageId);
        setShowMessageMenu(null);
    };

    const handleSaveContactName = async () => {
        if (!selectedUser) return;
        try {
            await api.post('/chat/contact/save', {
                contactUserId: selectedUser._id,
                savedName: editName.trim()
            });
            setShowEditName(false);
            if (onUpdateContact) {
                onUpdateContact(selectedUser._id, editName.trim());
            }
        } catch (err) {
            console.error('Failed to save contact name:', err);
        }
    };

    const handleDeleteContactName = async () => {
        if (!selectedUser) return;
        try {
            await api.post('/chat/contact/delete', {
                contactUserId: selectedUser._id
            });
            setEditName('');
            setShowEditName(false);
            if (onUpdateContact) {
                onUpdateContact(selectedUser._id, null);
            }
        } catch (err) {
            console.error('Failed to delete contact name:', err);
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedUser) return;

        setUploading(true);
        try {
            // Determine file type
            let fileType = 'image';
            if (file.type.startsWith('video/')) fileType = 'video';
            if (file.type.startsWith('audio/')) fileType = 'audio';

            // Upload file
            const formData = new FormData();
            formData.append('file', file);
            formData.append('fileType', fileType);

            const uploadRes = await api.post('/chat/upload-media', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Send message with media
            const res = await api.post('/chat/send', {
                recipientId: selectedUser._id,
                type: uploadRes.data.type,
                media: {
                    url: `http://localhost:5000${uploadRes.data.url}`,
                    mimeType: uploadRes.data.mimeType,
                    size: uploadRes.data.size
                }
            });

            setMessages(prev => [...prev, { ...res.data, status: 'sent' }]);
        } catch (err) {
            console.error('Failed to upload and send media:', err);
            alert('Failed to upload file. Please try again.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleEmojiSelect = (emoji) => {
        setNewMessage(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    // Close emoji picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };

        if (showEmojiPicker) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [showEmojiPicker]);

    const getStatusIcon = (status) => {
        if (status === 'read') return <span style={{ color: '#53bdeb' }}>✓✓</span>; // Blue Double Tick
        if (status === 'delivered') return <span style={{ color: 'gray' }}>✓✓</span>;
        return <span style={{ color: 'gray' }}>✓</span>; // Sent
    };

    if (!selectedUser) {
        return (
            <div className="glass-panel" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-scnd)' }}>
                Select a chat to start messaging
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                    <div
                        onClick={() => onOpenProfile && onOpenProfile(selectedUser._id)}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: selectedUser.profilePicture 
                                ? `url(http://localhost:5000${selectedUser.profilePicture})` 
                                : 'linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--primary)))',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            marginRight: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        {!selectedUser.profilePicture && ((selectedUser.displayName || selectedUser.phoneNumber || '?')[0].toUpperCase())}
                    </div>
                    {selectedUser.isOnline && (
                        <div style={{
                            position: 'absolute',
                            bottom: '2px',
                            right: '12px',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: '#4ade80',
                            border: '2px solid var(--bg-primary)'
                        }} />
                    )}
                </div>
                <div style={{ flex: 1 }}>
                    {showEditName ? (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                                type="text"
                                className="input-field"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Contact name"
                                style={{ flex: 1, padding: '0.5rem', fontSize: '0.9rem' }}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveContactName();
                                    if (e.key === 'Escape') setShowEditName(false);
                                }}
                            />
                            <button
                                onClick={handleSaveContactName}
                                className="btn"
                                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                            >
                                Save
                            </button>
                            <button
                                onClick={() => setShowEditName(false)}
                                style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-scnd)', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>
                    ) : (
                        <>
                            <div 
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.5rem',
                                    cursor: 'pointer'
                                }}
                                onClick={() => onOpenProfile && onOpenProfile(selectedUser._id)}
                            >
                                <div style={{ fontWeight: 'bold' }}>{selectedUser.displayName || selectedUser.phoneNumber}</div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowEditName(true);
                                    }}
                                    style={{
                                        padding: '0.25rem 0.5rem',
                                        background: 'transparent',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '4px',
                                        color: 'var(--text-scnd)',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem'
                                    }}
                                    title="Edit contact name"
                                >
                                    ✏️
                                </button>
                                {selectedUser.savedName && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteContactName();
                                        }}
                                        style={{
                                            padding: '0.25rem 0.5rem',
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--error)',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem'
                                        }}
                                        title="Remove saved name"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-scnd)' }}>
                                {selectedUser.about ? (
                                    <div style={{ marginBottom: '0.25rem' }}>{selectedUser.about}</div>
                                ) : null}
                                {selectedUser.isOnline 
                                    ? 'Online' 
                                    : selectedUser.lastSeen 
                                        ? `Last seen ${formatLastSeen(selectedUser.lastSeen)}` 
                                        : 'Offline'}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {messages.map((msg) => {
                    const senderId = typeof msg.senderId === 'object' 
                        ? (msg.senderId._id || msg.senderId).toString()
                        : msg.senderId.toString();
                    const isMe = senderId === user._id.toString();
                    const isDeleted = msg.isDeleted || (msg.deletedFor || []).some(id => 
                        (typeof id === 'object' ? id.toString() : id.toString()) === user._id.toString()
                    );
                    
                    return (
                        <div 
                            key={msg._id}
                            data-message-id={msg._id}
                            style={{ 
                                alignSelf: isMe ? 'flex-end' : 'flex-start', 
                                maxWidth: '70%',
                                position: 'relative',
                                cursor: 'pointer'
                            }}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                setShowMessageMenu(showMessageMenu === msg._id ? null : msg._id);
                            }}
                            onClick={(e) => {
                                // Toggle menu on click (alternative to right-click)
                                if (e.target.closest('[data-message-id]') && !e.target.closest('button') && !e.target.closest('video') && !e.target.closest('audio') && !e.target.closest('img')) {
                                    setShowMessageMenu(showMessageMenu === msg._id ? null : msg._id);
                                }
                            }}
                        >
                            <div style={{
                                background: isMe ? 'hsl(var(--primary))' : 'hsl(var(--bg-input))',
                                padding: '0.8rem 1.2rem',
                                borderRadius: isMe ? '16px 16px 0 16px' : '16px 16px 16px 0',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                position: 'relative',
                                opacity: isDeleted ? 0.6 : 1,
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                transform: 'scale(1)'
                            }}
                            onMouseEnter={(e) => {
                                if (!isDeleted) {
                                    e.currentTarget.style.transform = 'scale(1.02)';
                                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
                            }}
                            >
                                {isDeleted ? (
                                    <span style={{ fontStyle: 'italic', color: 'var(--text-scnd)' }}>
                                        {msg.text || 'This message was deleted'}
                                    </span>
                                ) : (
                                    <>
                                        {msg.forwardedFrom && (
                                            <div style={{ 
                                                fontSize: '0.75rem', 
                                                color: 'var(--text-scnd)', 
                                                marginBottom: '0.5rem',
                                                borderLeft: '3px solid var(--text-scnd)',
                                                paddingLeft: '0.5rem'
                                            }}>
                                                Forwarded
                                            </div>
                                        )}
                                        {msg.type === 'image' && msg.media?.url && (
                                            <img 
                                                src={msg.media.url} 
                                                alt="Shared" 
                                                style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: msg.text ? '0.5rem' : 0 }}
                                            />
                                        )}
                                        {msg.type === 'video' && msg.media?.url && (
                                            <video 
                                                src={msg.media.url} 
                                                controls 
                                                style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: msg.text ? '0.5rem' : 0 }}
                                            />
                                        )}
                                        {msg.type === 'audio' && msg.media?.url && (
                                            <audio 
                                                src={msg.media.url} 
                                                controls 
                                                style={{ width: '100%', marginBottom: msg.text ? '0.5rem' : 0 }}
                                            />
                                        )}
                                        {msg.text && <div>{msg.text}</div>}
                                        {msg.reactions && msg.reactions.length > 0 && (
                                            <div style={{ 
                                                marginTop: '0.5rem', 
                                                display: 'flex', 
                                                gap: '0.25rem',
                                                flexWrap: 'wrap'
                                            }}>
                                                {msg.reactions.map((reaction, idx) => (
                                                    <span 
                                                        key={idx}
                                                        style={{
                                                            background: isMe ? 'hsla(0,0%,100%,0.3)' : 'hsla(0,0%,0%,0.2)',
                                                            padding: '4px 8px',
                                                            borderRadius: '12px',
                                                            fontSize: '0.75rem',
                                                            cursor: 'pointer',
                                                            transition: 'transform 0.2s',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleReaction(msg._id, reaction.emoji);
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                    >
                                                        {reaction.emoji}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            <div style={{ 
                                fontSize: '0.7rem', 
                                marginTop: '0.3rem', 
                                color: 'var(--text-scnd)', 
                                textAlign: isMe ? 'right' : 'left', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: isMe ? 'flex-end' : 'flex-start', 
                                gap: '4px' 
                            }}>
                                {formatTimestamp(msg.createdAt)}
                                {isMe && getStatusIcon(msg.status)}
                            </div>
                            {showMessageMenu === msg._id && !isDeleted && (
                                <div 
                                    ref={menuRef}
                                    style={{
                                        position: 'absolute',
                                        top: '0',
                                        [isMe ? 'right' : 'left']: '0',
                                        background: 'var(--bg-primary)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '8px',
                                        padding: '0.5rem',
                                        zIndex: 1000,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.25rem',
                                        minWidth: '150px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleReaction(msg._id, '👍');
                                        }}
                                        style={{ 
                                            padding: '0.5rem', 
                                            textAlign: 'left', 
                                            background: 'transparent', 
                                            border: 'none', 
                                            color: 'var(--text-primary)', 
                                            cursor: 'pointer',
                                            borderRadius: '4px',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(0,0%,100%,0.1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        👍 Add Reaction
                                    </button>
                                    {isMe && (
                                        <>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteMessage(msg._id, false);
                                                }}
                                                style={{ 
                                                    padding: '0.5rem', 
                                                    textAlign: 'left', 
                                                    background: 'transparent', 
                                                    border: 'none', 
                                                    color: 'var(--text-primary)', 
                                                    cursor: 'pointer',
                                                    borderRadius: '4px',
                                                    transition: 'background 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(0,0%,100%,0.1)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                🗑️ Delete for me
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteMessage(msg._id, true);
                                                }}
                                                style={{ 
                                                    padding: '0.5rem', 
                                                    textAlign: 'left', 
                                                    background: 'transparent', 
                                                    border: 'none', 
                                                    color: 'var(--error)', 
                                                    cursor: 'pointer',
                                                    borderRadius: '4px',
                                                    transition: 'background 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(0,0%,100%,0.1)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                🗑️ Delete for everyone
                                            </button>
                                        </>
                                    )}
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleForwardMessage(msg._id);
                                        }}
                                        style={{ 
                                            padding: '0.5rem', 
                                            textAlign: 'left', 
                                            background: 'transparent', 
                                            border: 'none', 
                                            color: 'var(--text-primary)', 
                                            cursor: 'pointer',
                                            borderRadius: '4px',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(0,0%,100%,0.1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        ➡️ Forward
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
                {isTyping && selectedUser && (
                    <div style={{ alignSelf: 'flex-start', maxWidth: '70%', marginBottom: '0.5rem' }}>
                        <div style={{
                            background: 'hsl(var(--bg-input))',
                            padding: '0.8rem 1.2rem',
                            borderRadius: '16px 16px 16px 4px',
                            display: 'inline-flex',
                            gap: '4px',
                            alignItems: 'center'
                        }}>
                            <span style={{ 
                                fontSize: '0.6rem',
                                color: 'var(--text-scnd)',
                                animation: 'typing 1.4s infinite'
                            }}>●</span>
                            <span style={{ 
                                fontSize: '0.6rem',
                                color: 'var(--text-scnd)',
                                animation: 'typing 1.4s infinite 0.2s'
                            }}>●</span>
                            <span style={{ 
                                fontSize: '0.6rem',
                                color: 'var(--text-scnd)',
                                animation: 'typing 1.4s infinite 0.4s'
                            }}>●</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} style={{ padding: '1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '0.5rem', alignItems: 'center', position: 'relative' }}>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                        padding: '0.5rem',
                        background: 'transparent',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '8px',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    title="Attach file"
                >
                    {uploading ? '⏳' : '📎'}
                </button>
                <div style={{ position: 'relative', flex: 1 }}>
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={handleTyping}
                        onBlur={() => {
                            if (socket && selectedUser) {
                                socket.emit('stopTyping', { recipientId: selectedUser._id });
                            }
                            if (typingTimeout) {
                                clearTimeout(typingTimeout);
                                setTypingTimeout(null);
                            }
                        }}
                        onKeyDown={(e) => {
                            // Stop typing when Enter is pressed (before message is sent)
                            if (e.key === 'Enter' && socket && selectedUser) {
                                socket.emit('stopTyping', { recipientId: selectedUser._id });
                                if (typingTimeout) {
                                    clearTimeout(typingTimeout);
                                    setTypingTimeout(null);
                                }
                            }
                        }}
                    />
                    {showEmojiPicker && (
                        <div ref={emojiPickerRef}>
                            <EmojiPicker
                                onSelectEmoji={handleEmojiSelect}
                                onClose={() => setShowEmojiPicker(false)}
                            />
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    style={{
                        padding: '0.5rem',
                        background: 'transparent',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '1.2rem'
                    }}
                    title="Emoji"
                >
                    😊
                </button>
                <button type="submit" className="btn" style={{ padding: '0 1.5rem' }} disabled={!newMessage.trim() && !uploading}>
                    Send
                </button>
            </form>
            <style>{`
                @keyframes typing {
                    0%, 60%, 100% { opacity: 0.3; }
                    30% { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

const Dashboard = () => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [chats, setChats] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showThemeMenu, setShowThemeMenu] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [profileUserId, setProfileUserId] = useState(null);
    const profilePicInputRef = useRef(null);
    const { logout, user, updateUser } = useAuth();
    const { theme, changeTheme } = useTheme();
    const socket = useSocket();

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleProfilePictureUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Basic validation: image only, max 10MB
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('Image size must be less than 10MB');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'profile');

            const res = await api.post('/auth/profile/picture', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Update user in auth context so header/avatar refresh immediately
            if (updateUser) {
                updateUser({ ...user, profilePicture: res.data.profilePicture });
            }
        } catch (err) {
            console.error('Failed to upload profile picture:', err);
            alert('Failed to upload profile picture');
        } finally {
            // Reset input so the same file can be selected again if needed
            if (profilePicInputRef.current) {
                profilePicInputRef.current.value = '';
            }
        }
    };

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setShowProfileMenu(false);
            setShowThemeMenu(false);
        };
        if (showProfileMenu || showThemeMenu) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [showProfileMenu, showThemeMenu]);

    // Listen for profile updates
    useEffect(() => {
        if (socket) {
            socket.on('profileUpdated', ({ userId, profilePicture, about, name }) => {
                // Update current user if it's their profile
                if (userId === user?._id) {
                    const updatedUser = { ...user, profilePicture, about, name };
                    updateUser(updatedUser);
                }

                // Update in chats
                setChats(prev => prev.map(chat => {
                    const otherParticipant = chat.otherParticipant || chat.participants?.find(p => p._id === userId);
                    if (otherParticipant?._id === userId) {
                        return {
                            ...chat,
                            otherParticipant: { ...otherParticipant, profilePicture, about, name }
                        };
                    }
                    return chat;
                }));

                // Update in contacts
                setContacts(prev => prev.map(contact => 
                    contact._id === userId 
                        ? { ...contact, profilePicture, about, name }
                        : contact
                ));

                // Update selected user if it's the same
                if (selectedUser?._id === userId) {
                    setSelectedUser(prev => ({ ...prev, profilePicture, about, name }));
                }
            });

            return () => {
                socket.off('profileUpdated');
            };
        }
    }, [socket, user, selectedUser, updateUser]);

    const handleUpdateContact = (contactUserId, savedName) => {
        // Update selected user if it's the same
        if (selectedUser?._id === contactUserId) {
            setSelectedUser(prev => ({ ...prev, savedName, displayName: savedName || prev.phoneNumber }));
        }
        // Trigger refresh of chats and contacts
        setRefreshTrigger(prev => prev + 1);
    };

    const handleOpenProfile = (userId = null) => {
        setProfileUserId(userId);
        setShowProfile(true);
        setShowProfileMenu(false);
    };

    // Temporary for demo: Manual add user to chat
    const [newUserPhone, setNewUserPhone] = useState('');

    // NOTE: In a real app we'd have a 'New Chat' modal. 
    // For now, assume users exist or we just click on history.
    // To make it usable immediately, I will add a small "Start Chat" input.

    return (
        <div className="container" style={{ height: 'calc(100vh - 2rem)', margin: '1rem auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', position: 'relative' }}>
                <h2>WhatsApp Clone</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input
                        ref={profilePicInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleProfilePictureUpload}
                    />
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: user.profilePicture 
                                    ? `url(http://localhost:5000${user.profilePicture})` 
                                    : 'linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--primary)))',
                                backgroundSize: 'cover',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            {!user.profilePicture && (user.phoneNumber?.[0] || 'U')}
                        </button>
                        {showProfileMenu && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: '0',
                                marginTop: '0.5rem',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '8px',
                                padding: '0.5rem',
                                minWidth: '180px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                zIndex: 1000
                            }}>
                                <button
                                    onClick={() => handleOpenProfile(null)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(0,0%,100%,0.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    👤 Profile
                                </button>
                                <div style={{
                                    height: '1px',
                                    background: 'var(--glass-border)',
                                    margin: '0.25rem 0'
                                }} />
                                <button
                                    onClick={() => {
                                        profilePicInputRef.current?.click();
                                        setShowProfileMenu(false);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(0,0%,100%,0.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    📷 Change Photo
                                </button>
                            </div>
                        )}
                    </div>
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowThemeMenu(!showThemeMenu)}
                            style={{
                                padding: '0.5rem',
                                background: 'transparent',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '1.2rem'
                            }}
                            title="Change theme"
                        >
                            {theme === 'light' ? '🌞' : '🌙'}
                        </button>
                        {showThemeMenu && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: '0',
                                marginTop: '0.5rem',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '8px',
                                padding: '0.5rem',
                                minWidth: '120px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                zIndex: 1000
                            }}>
                                <button
                                    onClick={() => {
                                        changeTheme('light');
                                        setShowThemeMenu(false);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        background: theme === 'light' ? 'hsla(0,0%,100%,0.2)' : 'transparent',
                                        border: 'none',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        borderRadius: '4px'
                                    }}
                                >
                                    🌞 Light
                                </button>
                                <button
                                    onClick={() => {
                                        changeTheme('dark');
                                        setShowThemeMenu(false);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        background: theme === 'dark' ? 'hsla(0,0%,100%,0.2)' : 'transparent',
                                        border: 'none',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        borderRadius: '4px'
                                    }}
                                >
                                    🌙 Dark
                                </button>
                            </div>
                        )}
                    </div>
                    <span>{user.phoneNumber}</span>
                    <button onClick={logout} className="btn" style={{ padding: '8px 16px', fontSize: '0.9rem', background: 'transparent', border: '1px solid var(--error)' }}>Logout</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1rem', height: 'calc(100% - 60px)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Quick "New Chat" hack for demo */}
                    <div className="glass-panel" style={{ padding: '1rem' }}>
                        <input
                            placeholder="Phone to chat..."
                            className="input-field"
                            style={{ fontSize: '0.9rem', padding: '8px' }}
                            value={newUserPhone}
                            onChange={e => setNewUserPhone(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    // In a real app we search for user. 
                                    // Here we just mock selection object assuming backend handles it or we fail gracefully
                                    // Actually, we can't get ID easily without search API.
                                    // Let's Skip this and rely on existing chats or manual DB entry for learning,
                                    // OR add a quick search endpoint.
                                    // I'll leave it as visual placeholder or list all users query if asked.
                                    alert("Use Postman to create users/chats first or implement global search!");
                                }
                            }}
                        />
                    </div>
                    <UserList onSelectUser={setSelectedUser} selectedUserId={selectedUser?._id} refreshTrigger={refreshTrigger} />
                </div>
                <ChatWindow selectedUser={selectedUser} onUpdateContact={handleUpdateContact} onOpenProfile={handleOpenProfile} />
            </div>

            {/* Profile Modal */}
            {showProfile && (
                <Profile
                    userId={profileUserId}
                    onClose={() => {
                        setShowProfile(false);
                        setProfileUserId(null);
                    }}
                />
            )}
        </div>
    );
};

export default Dashboard;
