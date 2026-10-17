'use client';

import { useState, useRef } from 'react';
import { X, ImagePlus, Sparkles, Send, Camera } from 'lucide-react';

export default function StoryCreator({ user, onAddStory, onClose }) {
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!imagePreview) return;

    setUploading(true);
    const newStory = {
      id: `story-${Date.now()}`,
      author: user?.display_name || user?.username || 'You',
      username: user?.username || 'you',
      avatarColor: 'lavender',
      image: imagePreview,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    setTimeout(() => {
      onAddStory(newStory);
      setUploading(false);
      onClose();
    }, 400);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card story-creator-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Camera size={18} className="icon-accent" />
            <h3>Add Photo to Story</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="story-creator-body">
          {/* Story Preview Frame */}
          <div
            className="story-preview-frame"
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: imagePreview ? '#000' : 'var(--panel2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Story preview" className="story-preview-image" />
            ) : (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                <ImagePlus size={44} style={{ margin: '0 auto 12px', opacity: 0.7 }} />
                <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>Choose a photo</p>
                <small style={{ fontSize: '12px', opacity: 0.8 }}>JPEG, PNG, or WebP</small>
              </div>
            )}

            <div className="story-preview-overlay">
              <div className="story-preview-author">
                <div className="avatar avatar-lavender avatar-sm">
                  {(user?.display_name || user?.username || 'Y')[0].toUpperCase()}
                </div>
                <span>{user?.display_name || user?.username || 'Your Story'}</span>
                <small>Preview</small>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="story-creator-controls">
            <div className="story-media-picker">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="outline-btn"
                onClick={() => fileInputRef.current?.click()}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <ImagePlus size={16} />
                <span>{imagePreview ? 'Change Photo' : 'Select Photo from Device'}</span>
              </button>
              {imagePreview && (
                <button
                  type="button"
                  className="text-btn danger-text"
                  onClick={() => setImagePreview(null)}
                  style={{ alignSelf: 'center', fontSize: '12px' }}
                >
                  Remove photo
                </button>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: 'auto' }}>
              <button type="button" className="secondary-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleSubmit}
                disabled={uploading || !imagePreview}
              >
                {uploading ? 'Publishing...' : 'Share Story'}
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
