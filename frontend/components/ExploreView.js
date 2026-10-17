'use client';

import { useState } from 'react';
import { Search, Hash, Heart, MessageSquare, TrendingUp, Sparkles, UserPlus, Check } from 'lucide-react';

const EXPLORE_POSTS = [
  {
    id: 'exp-1',
    author: 'Elena Rostova',
    username: 'elenashoots',
    type: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
    caption: 'Circuit patterns & hardware design under the macro lens. Silicon art. ⚡',
    likes: 412,
    comments: 38,
    category: 'Technology',
  },
  {
    id: 'exp-2',
    author: 'Studio Velo',
    username: 'studiovelo',
    type: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    caption: 'Early morning sea mist on the Atlantic coast. Peaceful moments. 🌊',
    likes: 890,
    comments: 64,
    category: 'Photography',
  },
  {
    id: 'exp-3',
    author: 'Kaelen Miller',
    username: 'kaelen.design',
    type: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80',
    caption: 'Minimalist dashboard layout exploration. Clean typography & grid lines.',
    likes: 620,
    comments: 42,
    category: 'Design',
  },
  {
    id: 'exp-4',
    author: 'Aria Tanaka',
    username: 'ariacrafts',
    type: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80',
    caption: 'Late night code sprint. Nothing beats shipping that one tricky feature. 💻',
    likes: 1240,
    comments: 95,
    category: 'Tech & Code',
  },
  {
    id: 'exp-5',
    author: 'Mateo Rossi',
    username: 'mateorossi',
    type: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
    caption: 'Golden hour portrait session in Milan. Lighting was unreal today.',
    likes: 742,
    comments: 51,
    category: 'Photography',
  },
  {
    id: 'exp-6',
    author: 'Nordic Living',
    username: 'nordicliving',
    type: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=600&q=80',
    caption: 'Coffee, clean notebook, and quiet morning light. Ready for the day. ☕',
    likes: 531,
    comments: 29,
    category: 'Lifestyle',
  },
];

const TRENDING_TOPICS = [
  { tag: '#AIRevolution', count: '142.8K posts', category: 'Technology · Trending' },
  { tag: '#React19', count: '94.2K posts', category: 'Coding · Trending' },
  { tag: '#SpaceX', count: '124.6K posts', category: 'Aerospace · Trending' },
  { tag: '#CyberSecurity', count: '67.1K posts', category: 'Tech & Security · Trending' },
  { tag: '#DigitalArt', count: '78.3K posts', category: 'Design & Art · Trending' },
  { tag: '#IndieHacker', count: '53.9K posts', category: 'Startups · Trending' },
];

const DISCOVERY_USERS = [
  { name: 'Sarah Lin', handle: 'sarahcodes', role: 'Full-stack AI developer', avatarColor: 'mint' },
  { name: 'David Park', handle: 'davidlens', role: 'Cinematographer & visual artist', avatarColor: 'lavender' },
  { name: 'Chloe Martin', handle: 'chloedesigns', role: 'Design systems lead', avatarColor: 'peach' },
];

export default function ExploreView({ onSelectPost, onSelectTag, showToast }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [followingMap, setFollowingMap] = useState({});

  const categories = ['All', 'Technology', 'Photography', 'Design', 'Tech & Code', 'Lifestyle'];

  const filteredPosts = EXPLORE_POSTS.filter((post) => {
    const matchesCategory = activeCategory === 'All' || post.category === activeCategory;
    const matchesSearch =
      post.caption.toLowerCase().includes(search.toLowerCase()) ||
      post.author.toLowerCase().includes(search.toLowerCase()) ||
      post.username.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleFollow = (handle) => {
    setFollowingMap((prev) => {
      const next = !prev[handle];
      showToast(next ? `Followed @${handle}` : `Unfollowed @${handle}`);
      return { ...prev, [handle]: next };
    });
  };

  return (
    <div className="explore-container">
      {/* Search Header */}
      <div className="explore-search-wrap">
        <div className="explore-search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search creators, hashtags, or topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="category-scroll-pills">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`cat-pill ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="explore-grid-layout">
        {/* Left/Main Column: Instagram Photo/Video Grid */}
        <div className="explore-media-section">
          <div className="section-title-row">
            <Sparkles size={16} className="icon-accent" />
            <h3>Discover Posts</h3>
          </div>

          <div className="insta-explore-grid">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="insta-grid-item"
                onClick={() => onSelectPost?.(post)}
              >
                <img src={post.mediaUrl} alt={post.caption} className="grid-media" />
                <div className="grid-overlay">
                  <div className="grid-overlay-stat">
                    <Heart size={18} fill="#ffffff" color="#ffffff" />
                    <span>{post.likes}</span>
                  </div>
                  <div className="grid-overlay-stat">
                    <MessageSquare size={18} fill="#ffffff" color="#ffffff" />
                    <span>{post.comments}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredPosts.length === 0 && (
            <div className="empty-state card-surface" style={{ marginTop: '20px' }}>
              <Search size={28} className="muted-icon" />
              <h3>No matching posts</h3>
              <p>Try searching for a different creator, keyword, or hashtag.</p>
            </div>
          )}
        </div>

        {/* Right Column: Twitter Trending Topics & Who to follow */}
        <div className="explore-trends-sidebar">
          <div className="card-surface explore-card">
            <div className="section-title-row">
              <TrendingUp size={16} className="icon-accent" />
              <h3>Trending for you</h3>
            </div>

            <div className="trending-list">
              {TRENDING_TOPICS.map((trend) => (
                <button
                  key={trend.tag}
                  className="trend-row"
                  onClick={() => onSelectTag?.(trend.tag)}
                >
                  <div className="trend-info">
                    <small>{trend.category}</small>
                    <b>{trend.tag}</b>
                    <span>{trend.count}</span>
                  </div>
                  <span className="trend-arrow">↗</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card-surface explore-card" style={{ marginTop: '20px' }}>
            <div className="section-title-row">
              <UserPlus size={16} className="icon-accent" />
              <h3>Creators to explore</h3>
            </div>

            <div className="creators-list">
              {DISCOVERY_USERS.map((user) => (
                <div key={user.handle} className="creator-row">
                  <div className={`avatar avatar-${user.avatarColor} avatar-md`}>
                    {user.name[0].toUpperCase()}
                  </div>
                  <div className="creator-info">
                    <b>{user.name}</b>
                    <small>@{user.handle}</small>
                    <span>{user.role}</span>
                  </div>
                  <button
                    className={`follow-btn ${followingMap[user.handle] ? 'followed' : ''}`}
                    onClick={() => toggleFollow(user.handle)}
                  >
                    {followingMap[user.handle] ? <Check size={14} /> : 'Follow'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
