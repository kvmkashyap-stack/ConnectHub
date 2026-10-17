'use client';

import { useState } from 'react';
import { X, Search, Check, UserPlus, Users } from 'lucide-react';

export default function FollowsModal({
  initialTab = 'followers',
  followers = [],
  following = [],
  followingMap = {},
  onToggleFollow,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'followers' | 'following'
  const [search, setSearch] = useState('');

  // Count of followed users dynamically
  const dynamicFollowingList = following;
  const dynamicFollowersList = followers;

  const currentList = activeTab === 'followers' ? dynamicFollowersList : dynamicFollowingList;

  const filteredList = currentList.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.bio && u.bio.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card follows-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <Users size={18} className="icon-accent" />
            <h3>Connections</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Tab switchers with live counts */}
        <div className="feed-tabs" style={{ margin: 0, borderBottom: '1px solid var(--line)' }}>
          <button
            className={activeTab === 'followers' ? 'tab-active' : ''}
            onClick={() => setActiveTab('followers')}
          >
            Followers ({dynamicFollowersList.length})
          </button>
          <button
            className={activeTab === 'following' ? 'tab-active' : ''}
            onClick={() => setActiveTab('following')}
          >
            Following ({dynamicFollowingList.length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="follows-search-wrap">
          <div className="follows-search-bar">
            <Search size={16} />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Users List */}
        <div className="follows-list-container">
          {filteredList.map((user) => {
            const isFollowingUser = !!followingMap[user.username];
            return (
              <div key={user.username} className="follows-user-row">
                <div className={`avatar avatar-${user.avatarColor || 'lavender'} avatar-md`}>
                  {(user.name || user.username)[0].toUpperCase()}
                </div>

                <div className="follows-user-info">
                  <div className="follows-user-name-line">
                    <b>{user.name}</b>
                    {user.verified && <span className="verified"><Check size={8} /></span>}
                  </div>
                  <span className="follows-handle">@{user.username}</span>
                  {user.bio && <p className="follows-bio">{user.bio}</p>}
                </div>

                <button
                  type="button"
                  className={`follow-btn ${isFollowingUser ? 'followed' : ''}`}
                  onClick={() => onToggleFollow(user.username, user.name)}
                >
                  {isFollowingUser ? (
                    <>
                      <Check size={13} /> Following
                    </>
                  ) : (
                    <>
                      <UserPlus size={13} /> Follow
                    </>
                  )}
                </button>
              </div>
            );
          })}

          {filteredList.length === 0 && (
            <div className="empty-state" style={{ padding: '30px 20px' }}>
              <Users size={28} className="muted-icon" />
              <h3>No {activeTab} found</h3>
              <p>
                {search
                  ? `No matching profiles for "${search}".`
                  : activeTab === 'following'
                  ? "You aren't following anyone yet. Discover creators in Explore!"
                  : 'No followers yet. Share posts to grow your audience!'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
