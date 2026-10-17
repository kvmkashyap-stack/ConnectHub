'use client';

import { useState, useEffect } from 'react';
import { Heart, MessageSquare, UserPlus, Check, Bell, Sparkles } from 'lucide-react';

export default function NotificationsView({
  notifications = [],
  onMarkAllAsRead,
  onToggleNotificationRead,
  showToast,
}) {
  const [filter, setFilter] = useState('all');

  // When user opens/sees this view, automatically mark notifications as read so count becomes zero
  useEffect(() => {
    const hasUnread = notifications.some((n) => n.unread);
    if (hasUnread && onMarkAllAsRead) {
      onMarkAllAsRead(false); // mark without annoying toast
    }
  }, [notifications, onMarkAllAsRead]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'likes') return n.type === 'like';
    if (filter === 'mentions') return n.type === 'mention' || n.type === 'comment';
    if (filter === 'follows') return n.type === 'follow';
    return true;
  });

  const getIconForType = (type) => {
    switch (type) {
      case 'like':
        return <Heart size={16} fill="#ff3b5c" color="#ff3b5c" />;
      case 'comment':
      case 'mention':
        return <MessageSquare size={16} fill="#1d9bf0" color="#1d9bf0" />;
      case 'follow':
        return <UserPlus size={16} color="#10b981" />;
      default:
        return <Bell size={16} color="var(--accent)" />;
    }
  };

  return (
    <div className="notifications-container card-surface">
      <div className="notifications-header">
        <div>
          <h2>
            Notifications{' '}
            {unreadCount > 0 ? (
              <span className="notif-count-pill">{unreadCount} new</span>
            ) : (
              <span className="notif-all-read-pill">All caught up ✓</span>
            )}
          </h2>
          <p>Recent interactions with your posts, stories, and profile.</p>
        </div>

        {unreadCount > 0 && (
          <button className="text-btn" onClick={() => onMarkAllAsRead?.(true)}>
            Mark all as read
          </button>
        )}
      </div>

      <div className="feed-tabs">
        <button
          className={filter === 'all' ? 'tab-active' : ''}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={filter === 'mentions' ? 'tab-active' : ''}
          onClick={() => setFilter('mentions')}
        >
          Mentions & Replies
        </button>
        <button
          className={filter === 'likes' ? 'tab-active' : ''}
          onClick={() => setFilter('likes')}
        >
          Likes
        </button>
        <button
          className={filter === 'follows' ? 'tab-active' : ''}
          onClick={() => setFilter('follows')}
        >
          Follows
        </button>
      </div>

      <div className="notifications-list">
        {filteredNotifications.map((n) => (
          <div
            key={n.id}
            className={`notif-item ${n.unread ? 'notif-unread' : ''}`}
            onClick={() => onToggleNotificationRead?.(n.id)}
          >
            <div className="notif-icon-type">
              {getIconForType(n.type)}
            </div>

            <div className="notif-body">
              <div className="notif-avatar-row">
                <div className={`avatar avatar-${n.actor?.avatarColor || 'lavender'} avatar-md`}>
                  {(n.actor?.name || 'M')[0].toUpperCase()}
                </div>
                <div className="notif-actor-info">
                  <b>{n.actor?.name || 'Member'}</b>
                  <small>@{n.actor?.username || 'member'} · {n.time}</small>
                </div>
                {n.unread && <span className="unread-dot-badge" />}
              </div>

              <p className="notif-text">{n.content}</p>
            </div>
          </div>
        ))}

        {filteredNotifications.length === 0 && (
          <div className="empty-state">
            <Bell size={28} className="muted-icon" />
            <h3>No notifications here</h3>
            <p>You’re completely up to date. New interactions will appear here automatically.</p>
          </div>
        )}
      </div>
    </div>
  );
}
