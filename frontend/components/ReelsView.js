'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Heart, MessageSquare, Share2, Volume2, VolumeX, Play, Pause,
  Sparkles, Check, Bookmark, RefreshCw, Flame
} from 'lucide-react';
import { fetchLiveReels } from '../lib/api';
import ReelPlayer from './ReelPlayer';

const FALLBACK_REELS = [
  {
    id: 'reel-1',
    title: 'Macro craftsmanship: Tourbillon balance wheel in high frequency motion ⏱️',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80',
    author: 'Horology Studio',
    username: 'timepieces',
    avatarColor: 'lavender',
    likes: 3840,
    comments: 142,
    music: 'Original Audio · Mechanical Symphony',
    source: 'peertube',
    playerType: 'video'
  },
  {
    id: 'reel-2',
    title: 'Golden hour coastal waves captured with 120fps slow-motion cinematic drone 🌊',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    author: 'Elena Rostova',
    username: 'elenashoots',
    avatarColor: 'mint',
    likes: 6120,
    comments: 284,
    music: 'Pacific Vibes · Cinematic Lofi',
    source: 'peertube',
    playerType: 'video'
  },
  {
    id: 'reel-3',
    title: 'Building ConnectHub live: Instant websockets and peer-to-peer reels feed in action 🚀',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80',
    author: 'Arjun Rao',
    username: 'arjunbuilds',
    avatarColor: 'peach',
    likes: 4290,
    comments: 198,
    music: 'ConnectHub · Ambient Beats',
    source: 'instagram',
    playerType: 'video'
  }
];

export default function ReelsView({ showToast }) {
  const [reels, setReels] = useState(FALLBACK_REELS);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [likedMap, setLikedMap] = useState({});
  const [bookmarkedMap, setBookmarkedMap] = useState({});
  const [activeCommentsReel, setActiveCommentsReel] = useState(null);
  const [commentsList, setCommentsList] = useState({});
  const [commentText, setCommentText] = useState('');

  const videoRef = useRef(null);

  // Load live external reels from PeerTube / Instagram endpoint
  const loadLiveReels = async () => {
    setLoading(true);
    try {
      const data = await fetchLiveReels();
      if (Array.isArray(data) && data.length > 0) {
        // Keep all live video streams that have videoUrl or embedUrl
        const valid = data.filter((item) => item.videoUrl || item.embedUrl);
        if (valid.length > 0) {
          setReels(valid);
          setCurrentIndex(0);
          setVideoError(false);
        }
      }
    } catch (e) {
      console.log('Using local fallback reels:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveReels();
  }, []);

  const currentReel = reels[currentIndex] || reels[0];

  useEffect(() => {
    setVideoError(false);
    setIsPlaying(true);
  }, [currentIndex]);

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleToggleMute = (e) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const toggleLike = (reelId) => {
    setLikedMap((prev) => {
      const isLiked = !prev[reelId];
      if (isLiked) showToast?.('Liked reel! ❤️');
      return { ...prev, [reelId]: isLiked };
    });
  };

  const toggleBookmark = (reelId) => {
    setBookmarkedMap((prev) => {
      const isBookmarked = !prev[reelId];
      showToast?.(isBookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks');
      return { ...prev, [reelId]: isBookmarked };
    });
  };

  const handleShare = (reel) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(reel.videoUrl || window.location.href);
      showToast?.('Reel link copied to clipboard! 🔗');
    } else {
      showToast?.('Reel shared!');
    }
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!commentText.trim() || !activeCommentsReel) return;

    const newComment = {
      id: `comm-${Date.now()}`,
      author: 'You',
      text: commentText.trim(),
      time: 'Just now'
    };

    setCommentsList((prev) => ({
      ...prev,
      [activeCommentsReel.id]: [newComment, ...(prev[activeCommentsReel.id] || [])]
    }));

    setCommentText('');
    showToast?.('Comment added!');
  };

  const handleNext = () => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsPlaying(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsPlaying(true);
    }
  };

  return (
    <div className="reels-container">
      {/* Top Header */}
      <div className="reels-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Flame size={20} color="var(--accent)" />
          <h2>Reels</h2>
          <span className="source-chip">Live Video Feed</span>
        </div>
        <button
          className="text-btn icon-label-btn"
          onClick={loadLiveReels}
          disabled={loading}
          title="Refresh live video streams"
        >
          <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
        </button>
      </div>

      {/* Main Vertical Reel Player Stage */}
      <div className="reels-stage-wrap">
        <div className="reel-card card-surface">
          {/* Unified Reel Player */}
          <ReelPlayer reel={currentReel} />

          {/* Right Floating Actions Column (Like, Comment, Bookmark, Share) */}
          <div className="reel-actions-column" onClick={(e) => e.stopPropagation()}>
            <button
              className={`reel-action-btn ${likedMap[currentReel?.id] ? 'active-liked' : ''}`}
              onClick={() => toggleLike(currentReel?.id)}
              title="Like"
            >
              <Heart
                size={24}
                fill={likedMap[currentReel?.id] ? '#f91880' : 'none'}
                color={likedMap[currentReel?.id] ? '#f91880' : '#ffffff'}
              />
              <span>{(currentReel?.likes || 120) + (likedMap[currentReel?.id] ? 1 : 0)}</span>
            </button>

            <button
              className="reel-action-btn"
              onClick={() => setActiveCommentsReel(currentReel)}
              title="Comments"
            >
              <MessageSquare size={24} color="#ffffff" />
              <span>{(currentReel?.comments || 24) + ((commentsList[currentReel?.id] || []).length)}</span>
            </button>

            <button
              className={`reel-action-btn ${bookmarkedMap[currentReel?.id] ? 'active-bookmarked' : ''}`}
              onClick={() => toggleBookmark(currentReel?.id)}
              title="Save to bookmarks"
            >
              <Bookmark
                size={24}
                fill={bookmarkedMap[currentReel?.id] ? 'var(--accent)' : 'none'}
                color={bookmarkedMap[currentReel?.id] ? 'var(--accent)' : '#ffffff'}
              />
            </button>

            <button
              className="reel-action-btn"
              onClick={() => handleShare(currentReel)}
              title="Share reel"
            >
              <Share2 size={24} color="#ffffff" />
            </button>
          </div>

          {/* Bottom Info Overlay */}
          <div className="reel-bottom-meta" onClick={(e) => e.stopPropagation()}>
            <div className="reel-author-row">
              <div className="avatar avatar-lavender avatar-sm">
                {(currentReel?.author || 'C')[0].toUpperCase()}
              </div>
              <b>{currentReel?.author}</b>
              <small>@{currentReel?.username}</small>
            </div>
            <p className="reel-caption">{currentReel?.title}</p>
            <div className="reel-audio-track">
              <Sparkles size={12} color="var(--accent)" />
              <span>{currentReel?.music || 'Live Creator Audio · ConnectHub'}</span>
            </div>
          </div>
        </div>

        {/* Up / Down Navigation Controls */}
        <div className="reels-nav-pills">
          <button
            type="button"
            className="reel-nav-btn"
            disabled={currentIndex === 0}
            onClick={handlePrev}
            title="Previous Reel"
          >
            ↑ Previous
          </button>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            {currentIndex + 1} / {reels.length}
          </span>
          <button
            type="button"
            className="reel-nav-btn"
            disabled={currentIndex === reels.length - 1}
            onClick={handleNext}
            title="Next Reel"
          >
            ↓ Next
          </button>
        </div>
      </div>

      {/* Slide-out Comments Drawer */}
      {activeCommentsReel && (
        <div className="modal-overlay" onClick={() => setActiveCommentsReel(null)}>
          <div className="modal-card small-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Comments ({((commentsList[activeCommentsReel.id] || []).length) + (activeCommentsReel.comments || 0)})</h3>
              <button className="icon-btn" onClick={() => setActiveCommentsReel(null)}>✕</button>
            </div>
            <div className="reels-comments-list" style={{ maxHeight: '320px', overflowY: 'auto', padding: '16px' }}>
              <div className="comment-item" style={{ marginBottom: '12px' }}>
                <b>@sarahcodes</b>
                <p style={{ margin: '2px 0 0', fontSize: '13px' }}>The frame rate on this clip is super smooth! 👏</p>
              </div>
              {(commentsList[activeCommentsReel.id] || []).map((c) => (
                <div key={c.id} className="comment-item" style={{ marginBottom: '12px' }}>
                  <b>@{c.author}</b>
                  <p style={{ margin: '2px 0 0', fontSize: '13px' }}>{c.text}</p>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderTop: '1px solid var(--line)' }}>
              <input
                type="text"
                placeholder="Add a comment…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '20px', border: '1px solid var(--line)', background: 'var(--bg-secondary)', color: 'var(--text)' }}
              />
              <button type="submit" className="primary-btn" disabled={!commentText.trim()} style={{ padding: '6px 14px' }}>
                Post
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
