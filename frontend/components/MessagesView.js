'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Rocket, Send, Search, ImagePlus, Smile, Phone, Video, MoreVertical,
  CheckCheck, Check, Sparkles, UserPlus, X, ArrowLeft
} from 'lucide-react';
import EmojiPicker from './EmojiPicker';

const INITIAL_CONVERSATIONS = [
  {
    id: 1,
    user: {
      id: 101,
      name: 'Maya Chen',
      username: 'mayacreates',
      avatarColor: 'lavender',
      online: true,
      lastSeen: 'Active now',
    },
    lastMessage: 'Love the new interface updates! Really clean 🌱',
    lastMessageTime: '10m',
    unread: 2,
    messages: [
      { id: 'm1', senderId: 101, text: 'Hey! Did you check out the new design system update?', time: '10:42 AM' },
      { id: 'm2', senderId: 'me', text: 'Yes, just saw it! The contrast and dark mode palette looks super polished.', time: '10:45 AM' },
      { id: 'm3', senderId: 101, text: 'Love the new interface updates! Really clean 🌱', time: '10:48 AM' },
    ],
  },
  {
    id: 2,
    user: {
      id: 102,
      name: 'Arjun Rao',
      username: 'arjunbuilds',
      avatarColor: 'peach',
      online: true,
      lastSeen: 'Active now',
    },
    lastMessage: 'Are we launching the beta on Friday? 🚀',
    lastMessageTime: '1h',
    unread: 0,
    messages: [
      { id: 'm4', senderId: 102, text: 'The video upload encoding is super fast now.', time: '09:15 AM' },
      { id: 'm5', senderId: 'me', text: 'Awesome, tested on mobile and tablet too!', time: '09:20 AM' },
      { id: 'm6', senderId: 102, text: 'Are we launching the beta on Friday? 🚀', time: '09:22 AM' },
    ],
  },
  {
    id: 3,
    user: {
      id: 103,
      name: 'Nina Patel',
      username: 'ninainmotion',
      avatarColor: 'mint',
      online: false,
      lastSeen: 'Active 2h ago',
    },
    lastMessage: 'Shared your post in the design circle 🎨',
    lastMessageTime: '3h',
    unread: 0,
    messages: [
      { id: 'm7', senderId: 103, text: 'Shared your post in the design circle 🎨', time: '07:30 AM' },
    ],
  },
  {
    id: 4,
    user: {
      id: 104,
      name: 'Sofia Williams',
      username: 'sofia.codes',
      avatarColor: 'blue',
      online: false,
      lastSeen: 'Active yesterday',
    },
    lastMessage: 'Thanks for the follow! Glad to connect.',
    lastMessageTime: '1d',
    unread: 0,
    messages: [
      { id: 'm8', senderId: 104, text: 'Thanks for the follow! Glad to connect.', time: 'Yesterday' },
    ],
  },
];

export default function MessagesView({
  currentUser,
  conversations = [],
  setConversations,
  onClearUnreadMessages,
  showToast,
}) {
  const [activeConvId, setActiveConvId] = useState(conversations[0]?.id || 1);
  const [mobileScreen, setMobileScreen] = useState('chat'); // 'chat' | 'list' - default to chat so message bar is always open
  const [searchQuery, setSearchQuery] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [chatImagePreview, setChatImagePreview] = useState(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatUsername, setNewChatUsername] = useState('');

  const messagesContainerRef = useRef(null);
  const chatFileInputRef = useRef(null);
  const messageInputRef = useRef(null);

  // When user opens/views Messages, automatically clear unread badge count to zero
  useEffect(() => {
    if (onClearUnreadMessages) {
      onClearUnreadMessages();
    }
  }, [onClearUnreadMessages]);

  const activeConversation = conversations.find((c) => c.id === activeConvId) || conversations[0];

  // Auto-focus the input bar when switching or opening conversation
  useEffect(() => {
    messageInputRef.current?.focus();
  }, [activeConvId]);

  // Scroll ONLY the internal chat container to bottom, NEVER the browser window
  const scrollMessagesToBottom = (smooth = false) => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      if (smooth) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      } else {
        container.scrollTop = container.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollMessagesToBottom(false);
  }, [activeConvId]);

  useEffect(() => {
    scrollMessagesToBottom(true);
  }, [activeConversation?.messages?.length]);

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!messageDraft.trim() && !chatImagePreview) return;

    const newMsg = {
      id: `msg-${Date.now()}`,
      senderId: 'me',
      text: messageDraft.trim(),
      image: chatImagePreview,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConvId) {
          return {
            ...c,
            lastMessage: messageDraft.trim() || '📷 Photo',
            lastMessageTime: 'Just now',
            messages: [...c.messages, newMsg],
          };
        }
        return c;
      })
    );

    const sentText = messageDraft.trim();
    setMessageDraft('');
    setChatImagePreview(null);
    setShowEmojiPicker(false);

    // Auto-reply simulation from friend
    setTimeout(() => {
      const replies = [
        'That makes total sense!',
        'Got it! Looking forward to it 🙌',
        'Sounds good, let me check that out.',
        'Love this idea! 🔥',
        'Awesome, talk to you soon!',
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];

      const botMsg = {
        id: `msg-reply-${Date.now()}`,
        senderId: activeConversation.user.id,
        text: randomReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConvId) {
            return {
              ...c,
              lastMessage: randomReply,
              lastMessageTime: 'Just now',
              messages: [...c.messages, botMsg],
            };
          }
          return c;
        })
      );
    }, 1200);
  };

  const handleStartNewChat = (e) => {
    e.preventDefault();
    if (!newChatUsername.trim()) return;

    const existing = conversations.find(
      (c) => c.user.username.toLowerCase() === newChatUsername.trim().toLowerCase()
    );

    if (existing) {
      setActiveConvId(existing.id);
      setShowNewChatModal(false);
      setNewChatUsername('');
      return;
    }

    const newConv = {
      id: Date.now(),
      user: {
        id: Date.now(),
        name: newChatUsername.trim(),
        username: newChatUsername.trim().toLowerCase(),
        avatarColor: 'mint',
        online: true,
        lastSeen: 'Active now',
      },
      lastMessage: 'Conversation started',
      lastMessageTime: 'Just now',
      unread: 0,
      messages: [],
    };

    setConversations([newConv, ...conversations]);
    setActiveConvId(newConv.id);
    setShowNewChatModal(false);
    setNewChatUsername('');
    showToast(`Started conversation with @${newChatUsername.trim()}`);
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`messages-layout card-surface mobile-show-${mobileScreen}`}>
      {/* Left conversation list */}
      <div className="messages-sidebar">
        <div className="messages-sidebar-top">
          <div className="messages-header-row">
            <h3>Messages</h3>
            <button
              className="icon-btn"
              onClick={() => setShowNewChatModal(true)}
              aria-label="New Message"
              title="New message"
            >
              <UserPlus size={19} />
            </button>
          </div>

          <div className="messages-search-bar">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="conversations-list">
          {filteredConversations.map((conv) => (
            <button
              key={conv.id}
              className={`conversation-item ${conv.id === activeConvId ? 'active' : ''}`}
              onClick={() => {
                setActiveConvId(conv.id);
                setMobileScreen('chat');
                // Mark unread as 0
                setConversations((prev) =>
                  prev.map((c) => (c.id === conv.id ? { ...c, unread: 0 } : c))
                );
              }}
            >
              <div className="conv-avatar-wrap">
                <div className={`avatar avatar-${conv.user.avatarColor} avatar-md`}>
                  {conv.user.name[0].toUpperCase()}
                </div>
                {conv.user.online && <span className="online-indicator" />}
              </div>

              <div className="conv-details">
                <div className="conv-name-row">
                  <b>{conv.user.name}</b>
                  <span className="conv-time">{conv.lastMessageTime}</span>
                </div>
                <div className="conv-snippet-row">
                  <span className="conv-snippet">{conv.lastMessage}</span>
                  {conv.unread > 0 && <span className="unread-dot">{conv.unread}</span>}
                </div>
              </div>
            </button>
          ))}

          {filteredConversations.length === 0 && (
            <div className="empty-conv-list">
              <Search size={22} className="muted-icon" />
              <p>No conversations found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right chat thread */}
      <div className="chat-thread-container">
        {activeConversation ? (
          <>
            {/* Chat header */}
            <div className="chat-thread-header">
              <div className="chat-user-header-info">
                <button
                  type="button"
                  className="icon-btn mobile-chat-back-btn"
                  onClick={() => setMobileScreen('list')}
                  aria-label="Back to conversations"
                  title="Back to conversations"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className={`avatar avatar-${activeConversation.user.avatarColor} avatar-md`}>
                  {activeConversation.user.name[0].toUpperCase()}
                </div>
                <div>
                  <b>{activeConversation.user.name}</b>
                  <small>
                    @{activeConversation.user.username} · {activeConversation.user.lastSeen}
                  </small>
                </div>
              </div>

              <div className="chat-header-actions">
                <button
                  className="icon-btn"
                  onClick={() => showToast('Audio calling connected via WebRTC.')}
                  title="Audio call"
                  aria-label="Audio call"
                >
                  <Phone size={18} />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => showToast('Video calling connected via WebRTC.')}
                  title="Video call"
                  aria-label="Video call"
                >
                  <Video size={18} />
                </button>
              </div>
            </div>

            {/* Message list */}
            <div className="chat-messages-area" ref={messagesContainerRef}>
              <div className="chat-start-notice">
                <div className={`avatar avatar-${activeConversation.user.avatarColor} avatar-lg`}>
                  {activeConversation.user.name[0].toUpperCase()}
                </div>
                <b>{activeConversation.user.name}</b>
                <p>@{activeConversation.user.username}</p>
                <small>End-to-end encrypted direct messaging on ConnectHub</small>
              </div>

              {activeConversation.messages.map((msg) => {
                const isMe = msg.senderId === 'me';
                return (
                  <div key={msg.id} className={`message-bubble-row ${isMe ? 'sent' : 'received'}`}>
                    <div className="message-bubble">
                      {msg.image && (
                        <img src={msg.image} alt="Attached" className="chat-message-image" />
                      )}
                      {msg.text && <p className="message-text">{msg.text}</p>}
                      <div className="message-meta">
                        <span>{msg.time}</span>
                        {isMe && <CheckCheck size={14} className="delivered-icon" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chat image preview before send */}
            {chatImagePreview && (
              <div className="chat-preview-bar">
                <img src={chatImagePreview} alt="Preview" />
                <button
                  type="button"
                  className="chat-remove-preview-btn"
                  onClick={() => setChatImagePreview(null)}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Emoji popover */}
            {showEmojiPicker && (
              <div className="chat-emoji-container">
                <EmojiPicker
                  onSelect={(emoji) => setMessageDraft((prev) => prev + emoji)}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}

            {/* Chat input box */}
            <form className="chat-input-bar" onSubmit={handleSendMessage}>
              <input
                type="file"
                ref={chatFileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => setChatImagePreview(reader.result);
                    reader.readAsDataURL(file);
                  }
                }}
              />

              <button
                type="button"
                className="icon-btn"
                onClick={() => chatFileInputRef.current?.click()}
                title="Attach photo"
                aria-label="Attach photo"
              >
                <ImagePlus size={19} />
              </button>

              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Insert emoji"
                aria-label="Insert emoji"
              >
                <Smile size={19} />
              </button>

              <input
                type="text"
                ref={messageInputRef}
                className="chat-text-input"
                placeholder="Type a message to chat..."
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />

              <button
                type="submit"
                className="chat-send-btn"
                disabled={!messageDraft.trim() && !chatImagePreview}
                aria-label="Send message"
                title="Send message (Rocket)"
              >
                <Rocket size={18} className="rocket-send-icon" />
              </button>
            </form>
          </>
        ) : (
          <div className="chat-placeholder">
            <Sparkles size={32} className="muted-icon" />
            <h3>Select a conversation</h3>
            <p>Choose from your existing messages or start a new conversation.</p>
          </div>
        )}
      </div>

      {/* New chat modal */}
      {showNewChatModal && (
        <div className="modal-overlay" onClick={() => setShowNewChatModal(false)}>
          <div className="modal-card small-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <UserPlus size={18} />
                <h3>New Direct Message</h3>
              </div>
              <button className="icon-btn" onClick={() => setShowNewChatModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleStartNewChat}>
              <div className="form-group" style={{ padding: '16px 20px' }}>
                <label>Enter Username</label>
                <div className="input-prefix-wrap">
                  <span className="input-prefix">@</span>
                  <input
                    type="text"
                    placeholder="e.g. arjunbuilds"
                    value={newChatUsername}
                    onChange={(e) => setNewChatUsername(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowNewChatModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Start Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
