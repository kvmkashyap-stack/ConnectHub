'use client';

import { useState, useRef, useEffect } from 'react';
import { Smile, Heart, Flame, ThumbsUp, Sparkles, X } from 'lucide-react';

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    icon: Smile,
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥹', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😋', '😛', '😜', '🤪', '😎', '🤩', '🥳', '😏', '🤔', '🤫', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🙄', '😴', '🤤', '😷', '🤯', '🥵', '🥶']
  },
  {
    name: 'Gestures',
    icon: ThumbsUp,
    emojis: ['👍', '👎', '👏', '🙌', '🫶', '🤝', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '👊', '✊', '🤛', '🤜', '💪', '🙏', '✍️', '💅']
  },
  {
    name: 'Hearts & Love',
    icon: Heart,
    emojis: ['❤️', '🩷', '🧡', '💛', '💚', '💙', '🩵', '💜', '🤎', '🖤', '🩶', '🤍', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '✨', '⭐', '🌟', '💫', '💥']
  },
  {
    name: 'Vibes & Fire',
    icon: Flame,
    emojis: ['🔥', '⚡', '💯', '🚀', '💎', '👑', '🌈', '☀️', '🌤️', '🌙', '☁️', '🌊', '☕', '🍕', '🍔', '🍦', '🥂', '🍻', '🎉', '🎊', '🎈', '🏆', '🎯', '🎮', '🎧', '📸', '🎨', '🎬']
  },
  {
    name: 'Nature & Pets',
    icon: Sparkles,
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐣', '🦋', '🌸', '🌺', '🌻', '🌹', '🍀', '🌿', '🌱', '🪴', '🌴', '🍁']
  }
];

export default function EmojiPicker({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');
  const pickerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose?.();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const currentCategory = EMOJI_CATEGORIES[activeCategory];
  const filteredEmojis = search
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((emoji) => emoji.includes(search))
    : currentCategory.emojis;

  return (
    <div className="emoji-picker-popover" ref={pickerRef}>
      <div className="emoji-picker-header">
        <input
          type="text"
          className="emoji-search-input"
          placeholder="Search emojis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        {onClose && (
          <button type="button" className="emoji-close-btn" onClick={onClose} aria-label="Close emoji picker">
            <X size={15} />
          </button>
        )}
      </div>

      {!search && (
        <div className="emoji-category-tabs">
          {EMOJI_CATEGORIES.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.name}
                type="button"
                className={`emoji-cat-btn ${activeCategory === idx ? 'active' : ''}`}
                onClick={() => setActiveCategory(idx)}
                title={cat.name}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
      )}

      <div className="emoji-grid">
        {filteredEmojis.map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            type="button"
            className="emoji-item"
            onClick={() => {
              onSelect(emoji);
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
