'use client';

import { useState, useRef } from 'react';
import { X, ImagePlus, Video, Smile, Send, Sparkles } from 'lucide-react';
import EmojiPicker from './EmojiPicker';

export default function ComposeModal({ user, onClose, onPostCreated, showToast }) {
  const [draft, setDraft] = useState('');
  const [draftImage, setDraftImage] = useState(null);
  const [draftVideo, setDraftVideo] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setDraftVideo(null);
      const reader = new FileReader();
      reader.onload = () => setDraftImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setDraftImage(null);
      const reader = new FileReader();
      reader.onload = () => setDraftVideo(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!draft.trim() && !draftImage && !draftVideo) return;

    setSubmitting(true);
    const postData = {
      content: draft.trim(),
      image: draftImage,
      video: draftVideo,
    };

    onPostCreated(postData);
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card compose-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} className="icon-accent" />
            <h3 style={{ margin: 0, fontSize: '17px' }}>Compose New Post</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close compose modal">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div className="avatar avatar-lavender avatar-md">
              {(user?.display_name || user?.username || 'A')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: '8px' }}>
                <b style={{ fontSize: '14px' }}>{user?.display_name || 'You'}</b>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                  @{user?.username || 'you'}
                </span>
              </div>
              <textarea
                autoFocus
                rows={4}
                maxLength={3000}
                placeholder="What’s happening? Share a thought, project milestone, or breaking news…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text)',
                  fontSize: '15px',
                  resize: 'none',
                  fontFamily: 'inherit',
                  lineHeight: '1.5'
                }}
              />
            </div>
          </div>

          {/* Media Previews */}
          {draftImage && (
            <div className="composer-media-preview-box" style={{ marginTop: '12px', position: 'relative' }}>
              <img src={draftImage} alt="Attachment" style={{ maxHeight: '240px', width: '100%', objectFit: 'cover', borderRadius: '12px' }} />
              <button
                type="button"
                className="composer-remove-media-btn"
                onClick={() => setDraftImage(null)}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {draftVideo && (
            <div className="composer-media-preview-box" style={{ marginTop: '12px', position: 'relative' }}>
              <video src={draftVideo} controls style={{ maxHeight: '240px', width: '100%', borderRadius: '12px' }} />
              <button
                type="button"
                className="composer-remove-media-btn"
                onClick={() => setDraftVideo(null)}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Toolbar & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
              <input
                type="file"
                ref={imageInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageSelect}
              />
              <input
                type="file"
                ref={videoInputRef}
                accept="video/*"
                style={{ display: 'none' }}
                onChange={handleVideoSelect}
              />

              <button
                type="button"
                className="icon-btn"
                onClick={() => imageInputRef.current?.click()}
                title="Add Photo"
              >
                <ImagePlus size={18} />
              </button>

              <button
                type="button"
                className="icon-btn"
                onClick={() => videoInputRef.current?.click()}
                title="Add Video"
              >
                <Video size={18} />
              </button>

              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowEmoji(!showEmoji)}
                title="Add Emoji"
              >
                <Smile size={18} />
              </button>

              {showEmoji && (
                <div style={{ position: 'absolute', bottom: '44px', left: 0, zIndex: 100 }}>
                  <EmojiPicker
                    onSelect={(emoji) => setDraft((prev) => prev + emoji)}
                    onClose={() => setShowEmoji(false)}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                {draft.length} / 3000
              </span>
              <button
                type="submit"
                className="primary-btn"
                disabled={(!draft.trim() && !draftImage && !draftVideo) || submitting}
                style={{ padding: '8px 20px', borderRadius: 'var(--radius-full)' }}
              >
                {submitting ? 'Posting…' : 'Post'} <Send size={14} />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
