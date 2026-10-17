'use client';

import { useState, useEffect } from 'react';
import { Users, Check, Plus, Sparkles, MessageSquare, Heart, ArrowLeft, Send } from 'lucide-react';

const INITIAL_COMMUNITIES_DATA = [
  {
    id: 'design-circle',
    name: 'Design Circle',
    icon: '✳',
    color: 'community-purple',
    banner: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    membersCount: 4320,
    description: 'A community for product designers, UI/UX crafters, typographers, and design systems lovers.',
    posts: [
      {
        id: 'c-post-1',
        author: 'Maya Chen',
        username: 'mayacreates',
        content: 'Quick poll: Do you prefer 4px or 8px baseline grids when drafting mobile typography? Sharing my latest token set below! 📐',
        likes: 89,
        comments: 24,
        time: '2h ago',
      },
      {
        id: 'c-post-2',
        author: 'Aarav Mehta',
        username: 'aaravdesigns',
        content: 'Design systems tip: always document micro-interactions before handing off to engineers. Saves hours of back-and-forth.',
        likes: 142,
        comments: 31,
        time: '5h ago',
      },
    ],
  },
  {
    id: 'build-in-public',
    name: 'Build In Public',
    icon: '⌘',
    color: 'community-orange',
    banner: 'linear-gradient(135deg, #ff9966 0%, #ff5e62 100%)',
    membersCount: 8910,
    description: 'Founders, builders, and indie makers sharing raw numbers, launch milestones, and lessons learned.',
    posts: [
      {
        id: 'c-post-3',
        author: 'Arjun Rao',
        username: 'arjunbuilds',
        content: 'Day 14 of shipping ConnectHub features: just wrapped video streaming and instant messaging. Consistency beats intensity every single time! 🚀',
        likes: 215,
        comments: 44,
        time: '1h ago',
      },
      {
        id: 'c-post-3b',
        author: 'Chloe Martin',
        username: 'chloedesigns',
        content: 'Passed $15k MRR today! Keeping our feature roadmap completely transparent to our users has been our highest leverage growth lever. 📈',
        likes: 178,
        comments: 29,
        time: '3h ago',
      },
    ],
  },
  {
    id: 'slow-living',
    name: 'Slow Living',
    icon: '♧',
    color: 'community-green',
    banner: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    membersCount: 3150,
    description: 'Unplugging from the noise. Mindful productivity, analog hobbies, tea, nature walks, and slow crafts.',
    posts: [
      {
        id: 'c-post-4',
        author: 'Nina Patel',
        username: 'ninainmotion',
        content: 'Reminder that you do not have to optimize every spare hour of your weekend. Take a walk without headphones today ☁️',
        likes: 310,
        comments: 19,
        time: '4h ago',
      },
      {
        id: 'c-post-4b',
        author: 'David Park',
        username: 'davidlens',
        content: 'Brewing loose leaf oolong and reading paper books before looking at screens. A morning ritual that changed my focus entirely. 🍵',
        likes: 194,
        comments: 16,
        time: '7h ago',
      },
    ],
  },
  {
    id: 'ai-creators',
    name: 'AI Creators',
    icon: '⚡',
    color: 'community-purple',
    banner: 'linear-gradient(135deg, #8a2387, #e94057, #f27121)',
    membersCount: 6540,
    description: 'Exploring generative art, autonomous agents, LLM toolkits, and human-AI collaborative workflows.',
    posts: [
      {
        id: 'c-post-5',
        author: 'Sofia Williams',
        username: 'sofia.codes',
        content: 'Experimenting with client-side inference vs edge API streaming. The speed difference on modern devices is remarkable.',
        likes: 156,
        comments: 32,
        time: '2h ago',
      },
      {
        id: 'c-post-5b',
        author: 'Elena Rostova',
        username: 'elenashoots',
        content: 'Testing generative UI layouts that dynamically adapt to the user’s conversational context in real-time. The UX possibilities are endless! 🤖',
        likes: 224,
        comments: 41,
        time: '5h ago',
      },
    ],
  },
  {
    id: 'react-ecosystem',
    name: 'React Ecosystem',
    icon: '⚛',
    color: 'community-blue',
    banner: 'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)',
    membersCount: 9420,
    description: 'Deep dives into Next.js, Server Components, React 19 compiler, state machines, and web performance.',
    posts: [
      {
        id: 'c-post-6',
        author: 'Arjun Rao',
        username: 'arjunbuilds',
        content: 'The React 19 compiler is truly magical. Removing hundreds of lines of boilerplate dependency arrays makes codebases so much cleaner. ⚛️',
        likes: 289,
        comments: 48,
        time: '3h ago',
      },
    ],
  },
  {
    id: 'tech-founders',
    name: 'Tech & Startups',
    icon: '🚀',
    color: 'community-orange',
    banner: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)',
    membersCount: 5180,
    description: 'Seed stage to Series A, product-market fit, angel investing, and scaling technical teams.',
    posts: [
      {
        id: 'c-post-7',
        author: 'Nathan Drake',
        username: 'nathancyber',
        content: 'Before fundraising, talk to 50 prospective users. The clarity you get on pricing and actual pain points is 100x better than any pitch deck advice.',
        likes: 184,
        comments: 26,
        time: '4h ago',
      },
    ],
  },
];

export default function CommunitiesView({
  selectedCommunityId = null,
  onClearSelectedCommunity,
  showToast,
  user,
}) {
  const [communities, setCommunities] = useState(INITIAL_COMMUNITIES_DATA);
  const [currentId, setCurrentId] = useState(selectedCommunityId);
  const [newDiscussion, setNewDiscussion] = useState('');
  const [likedPosts, setLikedPosts] = useState({});
  const [joinedCommunities, setJoinedCommunities] = useState({
    'design-circle': true,
    'build-in-public': true,
    'ai-creators': true,
  });

  // Sync when prop changes
  useEffect(() => {
    if (selectedCommunityId) {
      setCurrentId(selectedCommunityId);
    }
  }, [selectedCommunityId]);

  const selectedCommunity = communities.find((c) => c.id === currentId) || null;

  const toggleJoin = (commId, commName, e) => {
    e?.stopPropagation();
    setJoinedCommunities((prev) => {
      const next = !prev[commId];
      showToast?.(next ? `Joined ${commName}! 🎉` : `Left ${commName}`);
      return { ...prev, [commId]: next };
    });
  };

  const handlePostDiscussion = (e) => {
    e.preventDefault();
    if (!newDiscussion.trim() || !selectedCommunity) return;

    const newPost = {
      id: `comm-user-${Date.now()}`,
      author: user?.display_name || user?.username || 'You',
      username: user?.username || 'you',
      content: newDiscussion.trim(),
      likes: 0,
      comments: 0,
      time: 'Just now',
    };

    setCommunities((prev) =>
      prev.map((c) => {
        if (c.id === selectedCommunity.id) {
          return {
            ...c,
            posts: [newPost, ...c.posts],
          };
        }
        return c;
      })
    );

    setNewDiscussion('');
    showToast?.(`Posted in ${selectedCommunity.name}! ✨`);
  };

  const togglePostLike = (postId) => {
    setLikedPosts((prev) => {
      const isLiked = !prev[postId];
      return { ...prev, [postId]: isLiked };
    });
  };

  const handleBackToAll = () => {
    setCurrentId(null);
    onClearSelectedCommunity?.();
  };

  // Detailed view of an opened community
  if (selectedCommunity) {
    const isJoined = joinedCommunities[selectedCommunity.id];
    return (
      <div className="community-detail-view">
        <button
          className="back-nav-btn text-btn"
          onClick={handleBackToAll}
          style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
        >
          <ArrowLeft size={16} /> Back to All Communities
        </button>

        <div
          className="community-banner-card card-surface"
          style={{ background: selectedCommunity.banner }}
        >
          <div className="community-banner-content">
            <span className={`community-icon ${selectedCommunity.color} large-icon`}>
              {selectedCommunity.icon}
            </span>
            <div className="community-banner-info">
              <h1>{selectedCommunity.name}</h1>
              <p>{selectedCommunity.description}</p>
              <div className="community-banner-meta">
                <span>{selectedCommunity.membersCount.toLocaleString()} members</span>
                <i>·</i>
                <span>Active discussions</span>
              </div>
            </div>
            <button
              className={`follow-btn large-join-btn ${isJoined ? 'followed' : ''}`}
              onClick={(e) => toggleJoin(selectedCommunity.id, selectedCommunity.name, e)}
            >
              {isJoined ? (
                <>
                  <Check size={16} /> Joined
                </>
              ) : (
                <>
                  <Plus size={16} /> Join Community
                </>
              )}
            </button>
          </div>
        </div>

        {/* Start Discussion Composer */}
        <form className="community-composer-card card-surface" onSubmit={handlePostDiscussion}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} className="icon-accent" />
            <b style={{ fontSize: '13.5px' }}>Start a discussion in {selectedCommunity.name}</b>
          </div>
          <textarea
            rows={2}
            placeholder={`Share thoughts, ask questions, or post updates with ${selectedCommunity.name}...`}
            value={newDiscussion}
            onChange={(e) => setNewDiscussion(e.target.value)}
          />
          <div className="community-composer-bottom">
            <small>Be kind, constructive, and helpful to community peers.</small>
            <button
              type="submit"
              className="primary-btn"
              disabled={!newDiscussion.trim()}
              style={{ padding: '6px 16px', fontSize: '13px' }}
            >
              Post to Community <Send size={13} />
            </button>
          </div>
        </form>

        <div className="feed-heading" style={{ marginTop: '24px' }}>
          <div>
            <div className="eyebrow">COMMUNITY FEED</div>
            <h2>Discussions & Posts ({selectedCommunity.posts.length})</h2>
          </div>
        </div>

        <div className="posts-list">
          {selectedCommunity.posts.map((post) => {
            const hasLiked = likedPosts[post.id];
            return (
              <article className="post-card card-surface" key={post.id}>
                <div className="post-head">
                  <div className="avatar avatar-lavender avatar-md">
                    {post.author[0].toUpperCase()}
                  </div>
                  <div className="post-byline">
                    <b>{post.author}</b>
                    <span>@{post.username} · {post.time}</span>
                  </div>
                </div>
                <div className="post-content">{post.content}</div>
                <div className="post-actions">
                  <button
                    className={hasLiked ? 'action-liked' : ''}
                    onClick={() => togglePostLike(post.id)}
                    title="Like post"
                  >
                    <Heart
                      size={17}
                      fill={hasLiked ? '#f91880' : 'none'}
                      color={hasLiked ? '#f91880' : 'currentColor'}
                    />
                    <span>{post.likes + (hasLiked ? 1 : 0)}</span>
                  </button>
                  <button title="Comments">
                    <MessageSquare size={17} /> <span>{post.comments}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  // Grid view of all communities
  return (
    <div className="communities-container">
      <div className="feed-heading">
        <div>
          <div className="eyebrow">FIND YOUR TRIBE</div>
          <h1>Communities</h1>
          <p>Join spaces centered around your craft, hobbies, and ideas. Click any community to enter.</p>
        </div>
      </div>

      <div className="communities-grid">
        {communities.map((comm) => {
          const isJoined = joinedCommunities[comm.id];
          return (
            <div
              key={comm.id}
              className="community-card card-surface"
              onClick={() => setCurrentId(comm.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className="community-card-top">
                <span className={`community-icon ${comm.color}`}>{comm.icon}</span>
                <button
                  className={`follow-btn ${isJoined ? 'followed' : ''}`}
                  onClick={(e) => toggleJoin(comm.id, comm.name, e)}
                  title={isJoined ? 'Leave community' : 'Join community'}
                >
                  {isJoined ? <Check size={14} /> : 'Join'}
                </button>
              </div>

              <div className="community-card-body">
                <h3>{comm.name}</h3>
                <p>{comm.description}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="comm-member-count">
                    <Users size={14} />
                    {comm.membersCount.toLocaleString()} members
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>
                    Enter ↗
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
