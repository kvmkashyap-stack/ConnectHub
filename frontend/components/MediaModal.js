'use client';

import { X, Heart, MessageSquare, Send, Bookmark } from 'lucide-react';

export default function MediaModal({ media, onClose, onLike, isLiked, showToast }) {
  if (!media) return null;

  return (
    <div className="modal-overlay media-lightbox-overlay" onClick={onClose}>
      <button className="icon-btn media-close-top" onClick={onClose} aria-label="Close">
        <X size={24} />
      </button>

      <div className="media-lightbox-container" onClick={(e) => e.stopPropagation()}>
        <div className="media-lightbox-left">
          {media.video || media.type === 'video' ? (
            <video src={media.video || media.mediaUrl} controls autoPlay className="lightbox-media" />
          ) : (
            <img src={media.image || media.mediaUrl} alt={media.caption || 'Media view'} className="lightbox-media" />
          )}
        </div>

        <div className="media-lightbox-right">
          <div className="lightbox-header">
            <div className="avatar avatar-lavender avatar-md">
              {(media.author || 'M')[0].toUpperCase()}
            </div>
            <div>
              <b>{media.author || media.display_name || 'Member'}</b>
              <small>@{media.username || 'member'}</small>
            </div>
          </div>

          <div className="lightbox-caption">
            <p>{media.content || media.caption}</p>
          </div>

          <div className="lightbox-footer">
            <div className="post-actions">
              <button
                className={isLiked ? 'action-liked' : ''}
                onClick={() => onLike?.(media)}
              >
                <Heart size={20} fill={isLiked ? '#ff3b5c' : 'none'} color={isLiked ? '#ff3b5c' : 'currentColor'} />
                <span>{(media.likes || media.likes_count || 128) + (isLiked ? 1 : 0)}</span>
              </button>
              <button onClick={() => showToast('Write a comment below!')}>
                <MessageSquare size={20} />
                <span>{media.comments || media.comments_count || 18}</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  showToast('Link copied to clipboard!');
                }}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
