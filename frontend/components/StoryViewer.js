'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Send, Heart, Flame } from 'lucide-react';

export default function StoryViewer({ stories = [], initialIndex = 0, onClose, onReply }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [liked, setLiked] = useState(false);
  const timerRef = useRef(null);

  const currentStory = stories[currentIndex];
  const DURATION = 5000; // 5 seconds per story

  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
      setLiked(false);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
      setLiked(false);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (!currentStory || isPaused) return;

    const interval = 50; // update every 50ms
    const step = (interval / DURATION) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentStory, isPaused, handleNext]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  if (!currentStory) return null;

  const handleQuickReaction = (emoji) => {
    onReply?.(currentStory, emoji);
    setReplyText(`Sent ${emoji}`);
    setTimeout(() => setReplyText(''), 1500);
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onReply?.(currentStory, replyText.trim());
    setReplyText('Sent reply!');
    setTimeout(() => setReplyText(''), 1500);
  };

  return (
    <div className="story-viewer-backdrop" onClick={onClose}>
      <button className="story-nav-btn story-nav-prev" onClick={(e) => { e.stopPropagation(); handlePrev(); }} disabled={currentIndex === 0}>
        <ChevronLeft size={28} />
      </button>

      <div
        className="story-viewer-card"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        style={{
          background: currentStory.image ? '#000000' : currentStory.gradient || 'linear-gradient(135deg, #8a2387, #e94057, #f27121)',
        }}
      >
        {/* Progress Bars */}
        <div className="story-progress-container">
          {stories.map((s, idx) => (
            <div key={s.id || idx} className="story-progress-bar-bg">
              <div
                className="story-progress-bar-fill"
                style={{
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Story Header */}
        <div className="story-header-bar">
          <div className="story-user-info">
            <div className={`avatar avatar-${currentStory.avatarColor || 'lavender'} avatar-sm`}>
              {(currentStory.author || 'M')[0].toUpperCase()}
            </div>
            <div>
              <b>{currentStory.author}</b>
              <small>@{currentStory.username || 'user'} · Active</small>
            </div>
          </div>
          <button className="icon-btn story-close-btn" onClick={onClose} aria-label="Close story">
            <X size={20} />
          </button>
        </div>

        {/* Story Content - Pure Images */}
        <div className="story-main-content">
          {currentStory.image ? (
            <img src={currentStory.image} alt="Story" className="story-full-media" />
          ) : null}
        </div>

        {/* Tap areas for next/prev */}
        <div className="story-tap-left" onClick={handlePrev} />
        <div className="story-tap-right" onClick={handleNext} />

        {/* Story Footer / Quick Reply */}
        <div className="story-footer-bar">
          <form className="story-reply-form" onSubmit={handleSendReply}>
            <input
              type="text"
              placeholder={`Reply to ${currentStory.author}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
            />
            <button type="submit" aria-label="Send reply">
              <Send size={15} />
            </button>
          </form>

          <div className="story-quick-reactions">
            <button
              type="button"
              className={`story-reaction-btn ${liked ? 'liked' : ''}`}
              onClick={() => { setLiked(!liked); handleQuickReaction('❤️'); }}
            >
              <Heart size={18} fill={liked ? '#ff3b5c' : 'none'} color={liked ? '#ff3b5c' : 'currentColor'} />
            </button>
            <button type="button" className="story-reaction-btn" onClick={() => handleQuickReaction('🔥')}>
              <Flame size={18} />
            </button>
          </div>
        </div>
      </div>

      <button className="story-nav-btn story-nav-next" onClick={(e) => { e.stopPropagation(); handleNext(); }}>
        <ChevronRight size={28} />
      </button>
    </div>
  );
}
