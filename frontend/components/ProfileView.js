'use client';

import { useState } from 'react';
import { Calendar, Link2, MapPin, Grid, Heart, MessageSquare, Edit3, Check } from 'lucide-react';

export default function ProfileView({
  user,
  userPosts = [],
  followersCount = 0,
  followingCount = 0,
  onOpenFollowers,
  onOpenFollowing,
  onEditProfile,
  onToggleLike,
  likedMap = {},
  showToast,
}) {
  const [profileTab, setProfileTab] = useState('posts'); // 'posts' | 'media' | 'likes'

  const mediaPosts = userPosts.filter((p) => p.image || p.video);
  const likedPosts = userPosts.filter((p) => likedMap[p.id]);

  return (
    <div className="profile-page-container">
      {/* Profile Header Banner */}
      <div className="profile-banner card-surface">
        <div className="profile-banner-bg" />
        <div className="profile-header-details">
          <div className="profile-avatar-row">
            <div className="avatar avatar-lavender avatar-profile-lg">
              {(user?.display_name || user?.username || 'A')[0].toUpperCase()}
            </div>
            <button className="outline-btn edit-profile-btn" onClick={onEditProfile}>
              <Edit3 size={15} /> Edit Profile
            </button>
          </div>

          <div className="profile-names-block">
            <h2>
              {user?.display_name || user?.username || 'Alex Rivera'}
              <span className="verified"><Check size={10} /></span>
            </h2>
            <span className="profile-handle">@{user?.username || 'alex'}</span>
          </div>

          <p className="profile-bio-text">
            {user?.bio || 'Building things and connecting with curious minds ✨'}
          </p>

          <div className="profile-meta-row">
            <span className="profile-meta-item">
              <MapPin size={14} /> Global
            </span>
            <span className="profile-meta-item">
              <Link2 size={14} /> connecthub.app/{user?.username || 'alex'}
            </span>
            <span className="profile-meta-item">
              <Calendar size={14} /> Joined March 2026
            </span>
          </div>

          {/* Interactive Followers & Following Stats */}
          <div className="profile-stats-bar">
            <button
              type="button"
              className="stat-interactive-pill"
              onClick={onOpenFollowing}
              title="View Following List"
            >
              <b>{followingCount}</b> <span>Following</span>
            </button>

            <button
              type="button"
              className="stat-interactive-pill"
              onClick={onOpenFollowers}
              title="View Followers List"
            >
              <b>{followersCount}</b> <span>Followers</span>
            </button>

            <div className="stat-static-pill">
              <b>{userPosts.length}</b> <span>Posts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="feed-tabs" style={{ marginTop: '20px' }}>
        <button
          className={profileTab === 'posts' ? 'tab-active' : ''}
          onClick={() => setProfileTab('posts')}
        >
          Posts ({userPosts.length})
        </button>
        <button
          className={profileTab === 'media' ? 'tab-active' : ''}
          onClick={() => setProfileTab('media')}
        >
          Photos & Videos ({mediaPosts.length})
        </button>
        <button
          className={profileTab === 'likes' ? 'tab-active' : ''}
          onClick={() => setProfileTab('likes')}
        >
          Likes ({likedPosts.length})
        </button>
      </div>

      {/* Profile Content */}
      <div className="profile-tab-content">
        {profileTab === 'posts' && (
          <div className="posts-list">
            {userPosts.length > 0 ? (
              userPosts.map((post) => (
                <article className="post-card card-surface" key={post.id}>
                  <div className="post-head">
                    <div className="avatar avatar-lavender avatar-lg">
                      {(user?.display_name || 'A')[0].toUpperCase()}
                    </div>
                    <div className="post-byline">
                      <b>{user?.display_name || 'You'}</b>
                      <span>@{user?.username || 'you'}</span>
                    </div>
                  </div>
                  <div className="post-content">{post.content}</div>
                  {post.image && (
                    <div className="post-media-container">
                      <img src={post.image} alt="Attachment" className="post-media-full" />
                    </div>
                  )}
                  {post.video && (
                    <div className="post-media-container">
                      <video src={post.video} controls className="post-media-full" />
                    </div>
                  )}
                  <div className="post-actions">
                    <button
                      className={likedMap[post.id] ? 'action-liked' : ''}
                      onClick={() => onToggleLike(post)}
                    >
                      <Heart size={18} fill={likedMap[post.id] ? '#f91880' : 'none'} />
                      <span>{(post.likes_count || 0) + (likedMap[post.id] ? 1 : 0)}</span>
                    </button>
                    <button onClick={() => showToast('View post in Home feed')}>
                      <MessageSquare size={18} />
                      <span>{post.comments_count || 0}</span>
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state card-surface">
                <Grid size={30} className="muted-icon" />
                <h3>No posts yet</h3>
                <p>When you share thoughts, photos, or updates, they will appear on your profile.</p>
              </div>
            )}
          </div>
        )}

        {profileTab === 'media' && (
          <div className="insta-explore-grid">
            {mediaPosts.map((post) => (
              <div key={post.id} className="insta-grid-item">
                <img src={post.image || post.mediaUrl} alt="" className="grid-media" />
              </div>
            ))}
            {mediaPosts.length === 0 && (
              <div className="empty-state card-surface" style={{ gridColumn: '1 / -1' }}>
                <h3>No media uploaded yet</h3>
                <p>Photos and videos you attach to posts will appear in this gallery.</p>
              </div>
            )}
          </div>
        )}

        {profileTab === 'likes' && (
          <div className="posts-list">
            {likedPosts.length > 0 ? (
              likedPosts.map((post) => (
                <article className="post-card card-surface" key={post.id}>
                  <div className="post-content">{post.content}</div>
                </article>
              ))
            ) : (
              <div className="empty-state card-surface">
                <Heart size={30} className="muted-icon" />
                <h3>No liked posts yet</h3>
                <p>Posts you like will be collected here for quick reference.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
