import { useState } from 'react';

const EMOJI_CATEGORIES = {
    '😀': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔'],
    '😢': ['😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤐', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😶‍🌫️', '😵', '😵‍💫', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'],
    '❤️': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
    '👍': ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '🤙', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤲', '🤝', '🙏', '✍️'],
    '🎉': ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥅', '🏒', '🏑', '🏏', '🥃', '🏹', '🎣', '🥊', '🥋', '🎽', '🛹', '🛷'],
    '🌍': ['🌍', '🌎', '🌏', '🌐', '🗺️', '🧭', '🏔️', '⛰️', '🌋', '🗻', '🏕️', '🏖️', '🏜️', '🏝️', '🏞️', '🏟️', '🏛️', '🏗️', '🧱', '🏘️', '🏚️', '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩'],
    '🍕': ['🍕', '🍔', '🍟', '🌭', '🍿', '🧂', '🥓', '🥚', '🍳', '🥞', '🥐', '🥨', '🧀', '🥖', '🥯', '🥙', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍤', '🍙'],
    '⚡': ['⚡', '🔥', '💧', '🌊', '☄️', '💫', '⭐', '🌟', '✨', '💥', '💢', '💦', '💨', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '❄️', '☃️', '⛄', '🌨️', '💨', '💧', '☔', '☂️']
};

const EmojiPicker = ({ onSelectEmoji, onClose }) => {
    const [activeCategory, setActiveCategory] = useState(Object.keys(EMOJI_CATEGORIES)[0]);

    const handleEmojiClick = (emoji) => {
        onSelectEmoji(emoji);
    };

    return (
        <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '0',
            marginBottom: '0.5rem',
            background: 'var(--bg-primary)',
            border: '1px solid var(--glass-border)',
            borderRadius: '12px',
            padding: '1rem',
            width: '320px',
            maxHeight: '400px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Category tabs */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1rem',
                borderBottom: '1px solid var(--glass-border)',
                paddingBottom: '0.5rem',
                overflowX: 'auto'
            }}>
                {Object.keys(EMOJI_CATEGORIES).map(category => (
                    <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        style={{
                            padding: '0.5rem',
                            background: activeCategory === category ? 'hsla(0,0%,100%,0.1)' : 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            transition: 'background 0.2s'
                        }}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {/* Emoji grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(8, 1fr)',
                gap: '0.5rem',
                overflowY: 'auto',
                maxHeight: '300px'
            }}>
                {EMOJI_CATEGORIES[activeCategory].map((emoji, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleEmojiClick(emoji)}
                        style={{
                            padding: '0.5rem',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '1.5rem',
                            transition: 'background 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(0,0%,100%,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        {emoji}
                    </button>
                ))}
            </div>

            {/* Close button */}
            <button
                onClick={onClose}
                style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem',
                    background: 'transparent',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                }}
            >
                Close
            </button>
        </div>
    );
};

export default EmojiPicker;

