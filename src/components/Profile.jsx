import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Profile = ({ onClose, userId = null }) => {
    const { user: currentUser, updateUser } = useAuth();
    const [profileUser, setProfileUser] = useState(null);
    const [isEditingAbout, setIsEditingAbout] = useState(false);
    const [aboutText, setAboutText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showImagePreview, setShowImagePreview] = useState(false);
    const [savedName, setSavedName] = useState(null);
    const fileInputRef = useRef(null);
    const aboutInputRef = useRef(null);
    const isOwnProfile = !userId || userId === currentUser._id;

    useEffect(() => {
        fetchProfile();
    }, [userId]);

    useEffect(() => {
        if (profileUser) {
            setAboutText(profileUser.about || '');
        }
    }, [profileUser]);

    useEffect(() => {
        if (!isOwnProfile && userId) {
            // Fetch saved contact name
            api.get('/chat/users')
                .then(res => {
                    const contact = res.data.find(c => c._id === userId);
                    if (contact?.savedName) {
                        setSavedName(contact.savedName);
                    }
                })
                .catch(() => {});
        }
    }, [userId, isOwnProfile]);

    const fetchProfile = async () => {
        try {
            if (isOwnProfile) {
                const res = await api.get('/auth/profile');
                setProfileUser(res.data);
            } else {
                const res = await api.get(`/auth/profile/${userId}`);
                setProfileUser(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch profile:', err);
        }
    };

    const handleAboutSave = async () => {
        if (aboutText.length > 139) {
            alert('About text cannot exceed 139 characters');
            return;
        }

        // Check if there are actual changes
        if (aboutText === (profileUser.about || '')) {
            setIsEditingAbout(false);
            return;
        }

        setIsSaving(true);
        try {
            const res = await api.put('/auth/profile', { about: aboutText });
            setProfileUser(res.data.user);
            if (updateUser) {
                updateUser(res.data.user);
            }
            setIsEditingAbout(false);
        } catch (err) {
            console.error('Failed to update about:', err);
            alert('Failed to update about text');
        } finally {
            setIsSaving(false);
        }
    };

    const hasAboutChanges = aboutText !== (profileUser?.about || '');

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file
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

            setProfileUser(prev => ({ ...prev, profilePicture: res.data.profilePicture }));
            if (updateUser) {
                updateUser({ ...currentUser, profilePicture: res.data.profilePicture });
            }
        } catch (err) {
            console.error('Failed to upload profile picture:', err);
            alert('Failed to upload profile picture');
        }
    };

    if (!profileUser) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000
            }}>
                <div style={{ color: 'var(--text-primary)' }}>Loading...</div>
            </div>
        );
    }

    const displayName = isOwnProfile 
        ? (profileUser.displayName || profileUser.phoneNumber || 'Unknown')
        : (savedName || profileUser.displayName || profileUser.phoneNumber || 'Unknown');
    const profilePicUrl = profileUser.profilePicture 
        ? `http://localhost:5000${profileUser.profilePicture}` 
        : null;

    return (
        <>
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem'
            }}
            onClick={onClose}
            >
                <div style={{
                    background: 'var(--bg-primary)',
                    borderRadius: '12px',
                    width: '100%',
                    maxWidth: '500px',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                }}
                onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div style={{
                        padding: '1rem',
                        borderBottom: '1px solid var(--glass-border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        background: 'var(--bg-primary)',
                        position: 'sticky',
                        top: 0,
                        zIndex: 10
                    }}>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                fontSize: '1.5rem',
                                padding: '0.5rem'
                            }}
                        >
                            ←
                        </button>
                        <div style={{ flex: 1, fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {isOwnProfile ? 'Profile' : displayName}
                        </div>
                        {isOwnProfile && (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    fontSize: '1.2rem',
                                    padding: '0.5rem'
                                }}
                                title="Edit profile picture"
                            >
                                ✏️
                            </button>
                        )}
                    </div>

                    {/* Profile Picture */}
                    <div style={{
                        padding: '2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1rem'
                    }}>
                        <div
                            onClick={() => isOwnProfile && setShowImagePreview(true)}
                            style={{
                                width: '150px',
                                height: '150px',
                                borderRadius: '50%',
                                background: profilePicUrl
                                    ? `url(${profilePicUrl})`
                                    : 'linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--primary)))',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '4rem',
                                fontWeight: 'bold',
                                cursor: isOwnProfile ? 'pointer' : 'default',
                                border: '4px solid var(--glass-border)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                            }}
                        >
                            {!profilePicUrl && (displayName[0] || '?').toUpperCase()}
                        </div>
                        {isOwnProfile && (
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleImageUpload}
                            />
                        )}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                {displayName}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-scnd)' }}>
                                {profileUser.phoneNumber}
                            </div>
                        </div>
                    </div>

                    {/* About Section */}
                    <div style={{
                        borderTop: '1px solid var(--glass-border)',
                        borderBottom: '1px solid var(--glass-border)',
                        padding: '1rem'
                    }}>
                        <div style={{
                            fontSize: '0.85rem',
                            color: 'var(--text-scnd)',
                            marginBottom: '0.5rem',
                            paddingLeft: '1rem'
                        }}>
                            About
                        </div>
                        {isOwnProfile ? (
                            isEditingAbout ? (
                                <div style={{ padding: '0 1rem' }}>
                                    <textarea
                                        ref={aboutInputRef}
                                        value={aboutText}
                                        onChange={(e) => setAboutText(e.target.value)}
                                        placeholder="Tell us about yourself"
                                        maxLength={139}
                                        style={{
                                            width: '100%',
                                            minHeight: '80px',
                                            padding: '0.75rem',
                                            background: 'var(--bg-input)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '8px',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.95rem',
                                            resize: 'vertical',
                                            fontFamily: 'inherit'
                                        }}
                                        autoFocus
                                    />
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginTop: '0.5rem'
                                    }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-scnd)' }}>
                                            {aboutText.length}/139
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => {
                                                    setAboutText(profileUser.about || '');
                                                    setIsEditingAbout(false);
                                                }}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    background: 'transparent',
                                                    border: '1px solid var(--glass-border)',
                                                    borderRadius: '8px',
                                                    color: 'var(--text-primary)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleAboutSave}
                                                disabled={isSaving || !hasAboutChanges}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    background: hasAboutChanges ? 'hsl(var(--primary))' : 'var(--bg-input)',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    color: hasAboutChanges ? 'white' : 'var(--text-scnd)',
                                                    cursor: (isSaving || !hasAboutChanges) ? 'not-allowed' : 'pointer',
                                                    opacity: (isSaving || !hasAboutChanges) ? 0.6 : 1,
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {isSaving ? 'Saving...' : 'Save'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={() => setIsEditingAbout(true)}
                                    style={{
                                        padding: '1rem',
                                        cursor: 'pointer',
                                        borderRadius: '8px',
                                        transition: 'background 0.2s',
                                        minHeight: '60px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(0,0%,100%,0.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    {profileUser.about || (
                                        <span style={{ color: 'var(--text-scnd)', fontStyle: 'italic' }}>
                                            Tap to add about text
                                        </span>
                                    )}
                                </div>
                            )
                        ) : (
                            <div style={{ padding: '1rem', color: profileUser.about ? 'var(--text-primary)' : 'var(--text-scnd)' }}>
                                {profileUser.about || 'No status available'}
                            </div>
                        )}
                    </div>

                    {/* Additional Info */}
                    <div style={{ padding: '1rem' }}>
                        <div style={{
                            fontSize: '0.85rem',
                            color: 'var(--text-scnd)',
                            marginBottom: '0.5rem',
                            paddingLeft: '1rem'
                        }}>
                            Phone number
                        </div>
                        <div style={{
                            padding: '1rem',
                            color: 'var(--text-primary)'
                        }}>
                            {profileUser.phoneNumber}
                        </div>
                    </div>
                </div>
            </div>

            {/* Full-screen image preview */}
            {showImagePreview && profilePicUrl && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.95)',
                        zIndex: 10001,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2rem'
                    }}
                    onClick={() => setShowImagePreview(false)}
                >
                    <img
                        src={profilePicUrl}
                        alt="Profile"
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            borderRadius: '8px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
};

export default Profile;

