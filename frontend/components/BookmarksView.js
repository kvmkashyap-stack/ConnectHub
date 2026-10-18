'use client';

import { Bookmark, Heart, MessageSquare, Send, Trash2, Check } from 'lucide-react';

export default function BookmarksView({
  bookmarkedPosts = [],
  onRemoveBookmark,
  onToggleLike,
  likedMap = {},
  onOpenComments,
  commentsMap = {},
  showToast,
}) {
  return (
    <div className="bookmarks-container">
      <div className="feed-heading">
        <div>
          <div className="eyebrow">YOUR SAVED COLLECTION</div>
          <h1>Bookmarks</h1>
          <p>Posts you saved to revisit later. Accessible only to you.</p>
        </div>
        <div className="bookmarks-count-badge">
          <Bookmark size={15} />
          <span>{bookmarkedPosts.length} saved</span>
        </div>
      </div>

      <div className="posts-list">
        {bookmarkedPosts.length > 0 ? (
          bookmarkedPosts.map((post) => (
            <article className="post-card card-surface" key={post.id}>
              <div className="post-head">
                <div className="avatar avatar-lavender avatar-lg" style={{ position: 'relative' }}>
                  {post.avatar ? (
                    <img
                      src={post.avatar}
                      alt={post.display_name || post.author}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextElementSibling) {
                          e.currentTarget.nextElementSibling.style.display = 'inline';
                        }
                      }}
                    />
                  ) : null}
                  <span style={{ display: post.avatar ? 'none' : 'inline' }}>
                    {(post.display_name || post.author || 'M')[0].toUpperCase()}
                  </span>
                </div>
                <div className="post-byline">
                  <b>{post.display_name || post.author || `Member ${post.author_id}`}</b>
                  <span>@{post.username || `member${post.author_id}`}</span>
                </div>
                <button
                  className="icon-btn remove-bookmark-btn"
                  onClick={() => {
                    onRemoveBookmark(post.id);
                    showToast('Removed from bookmarks');
                  }}
                  title="Remove from bookmarks"
                  aria-label="Remove bookmark"
                >
                  <Bookmark size={18} fill="currentColor" color="#1d9bf0" />
                </button>
              </div>

              <div className="post-content">{post.content}</div>

              {post.image && (
                <div className="post-image-container">
                  <img src={post.image} alt="Post attachment" className="post-media-full" />
                </div>
              )}

              {post.video && (
                <div className="post-video-container">
                  <video src={post.video} controls className="post-media-full" />
                </div>
              )}

              <div className="post-actions">
                <button
                  className={likedMap[post.id] ? 'action-liked' : ''}
                  onClick={() => onToggleLike(post)}
                >
                  <Heart size={18} fill={likedMap[post.id] ? 'currentColor' : 'none'} />
                  <span>{(post.likes_count || 12) + (likedMap[post.id] ? 1 : 0)}</span>
                </button>

                <button onClick={() => onOpenComments(post.id)}>
                  <MessageSquare size={18} />
                  <span>{post.comments_count || (commentsMap[post.id]?.length || 0)}</span>
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    showToast('Post link copied to clipboard.');
                  }}
                >
                  <Send size={17} />
                  <span>Share</span>
                </button>

                <button
                  className="text-btn danger-text action-save"
                  onClick={() => {
                    onRemoveBookmark(post.id);
                    showToast('Removed bookmark');
                  }}
                >
                  Remove
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state card-surface">
            <div className="empty-icon">
              <Bookmark size={28} />
            </div>
            <h3>Save posts for later</h3>
            <p>Don’t let the good ones fly away! Tap the bookmark icon on any post to store it here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
