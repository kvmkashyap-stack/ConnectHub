'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  Activity, Bell, Bookmark, Check, CircleHelp, Compass, Flame, Heart,
  Home, ImagePlus, LogOut, Menu, MessageCircle, MessageSquare, MoreHorizontal,
  PenLine, Repeat, Search, Send, Settings, Smile, Sparkles, UserRound, Users,
  Video, X, Zap, Hash, Sun, Moon, Plus, Eye, Share2, Newspaper, Globe, Clapperboard, RefreshCw
} from 'lucide-react';
import { api, getToken, login, register, fetchLiveSocial, fetchLiveTrends, fetchLiveNews, fetchLiveTopicPosts } from '../lib/api';
import { useTheme } from '../components/ThemeContext';
import EmojiPicker from '../components/EmojiPicker';
import StoryCreator from '../components/StoryCreator';
import StoryViewer from '../components/StoryViewer';
import SettingsView from '../components/SettingsView';
import MessagesView from '../components/MessagesView';
import ExploreView from '../components/ExploreView';
import NotificationsView from '../components/NotificationsView';
import BookmarksView from '../components/BookmarksView';
import CommunitiesView from '../components/CommunitiesView';
import MediaModal from '../components/MediaModal';
import FollowsModal from '../components/FollowsModal';
import ProfileView from '../components/ProfileView';
import ReelsView from '../components/ReelsView';
import LiveNewsView from '../components/LiveNewsView';
import ComposeModal from '../components/ComposeModal';

const INITIAL_POSTS = [
  {
    id: 'p-ai-1',
    author_id: 11,
    author: 'Elena Rostova',
    username: 'elenashoots',
    display_name: 'Elena Rostova',
    content: 'Frontier AI models are evolving faster than ever. Multimodal agents running locally in the browser with WebGPU are finally a reality! The future of human-AI collaboration is unfolding right now. 🤖✨',
    image: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=1000&q=80',
    created_at: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    likes_count: 582,
    comments_count: 49,
    reposts_count: 88,
    tags: ['#AIRevolution', '#TechTrends'],
  },
  {
    id: 'p-ai-2',
    author_id: 4,
    author: 'Sofia Williams',
    username: 'sofia.codes',
    display_name: 'Sofia Williams',
    content: 'Autonomous agent swarms for code refactoring and local vector retrieval just passed our stress tests. Sub-second latency with zero data leaks is pure superpower. ⚡',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    likes_count: 341,
    comments_count: 28,
    reposts_count: 45,
    tags: ['#AIRevolution', '#WebDev'],
  },
  {
    id: 'p-react-1',
    author_id: 2,
    author: 'Arjun Rao',
    username: 'arjunbuilds',
    display_name: 'Arjun Rao',
    content: 'Upgraded ConnectHub to the React 19 compiler and Next.js 14! Server Actions, optimistic UI mutations, and instant transitions make every feed click feel instantaneous. 🚀',
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1000&q=80',
    created_at: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    likes_count: 492,
    comments_count: 56,
    reposts_count: 73,
    tags: ['#React19', '#NextJS14', '#WebDev'],
  },
  {
    id: 'p-react-2',
    author_id: 1,
    author: 'Maya Chen',
    username: 'mayacreates',
    display_name: 'Maya Chen',
    content: 'Clean code reminder: The React 19 compiler eliminates the need for manual useMemo & useCallback in almost every component. Writing declarative UI finally feels effortless again! ⚛️',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    likes_count: 278,
    comments_count: 31,
    reposts_count: 42,
    tags: ['#React19', '#Frontend'],
  },
  {
    id: 'p-space-1',
    author_id: 12,
    author: 'Marcus Vance',
    username: 'marcusvance',
    display_name: 'Marcus Vance',
    content: 'Starship catch by the Mechazilla launch tower chopstick arms was absolute sci-fi turned reality. What an engineering milestone for humanity’s multiplanetary future! 🚀🌌',
    image: 'https://images.unsplash.com/photo-1517976487504-59a1a08420e7?auto=format&fit=crop&w=1000&q=80',
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    likes_count: 894,
    comments_count: 112,
    reposts_count: 204,
    tags: ['#SpaceX', '#Starship', '#Cosmos'],
  },
  {
    id: 'p-space-2',
    author_id: 5,
    author: 'David Park',
    username: 'davidlens',
    display_name: 'David Park',
    content: 'Witnessed the rocket booster stage separation from 20 miles out. The supersonic sonic booms shook the sand under our feet. Unbelievable night sky capture! 📸🪐',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1000&q=80',
    created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    likes_count: 615,
    comments_count: 43,
    reposts_count: 91,
    tags: ['#SpaceX', '#Photography'],
  },
  {
    id: 'p-sec-1',
    author_id: 14,
    author: 'Nathan Drake',
    username: 'nathancyber',
    display_name: 'Nathan Drake',
    content: 'Friendly PSA for all developers: Migrate your auth flows to Passkeys and WebAuthn. Passwords are an artifact of the 90s; zero-trust biometric encryption is the gold standard for web apps in 2026. 🔐🛡️',
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1000&q=80',
    created_at: new Date(Date.now() - 1000 * 60 * 310).toISOString(),
    likes_count: 418,
    comments_count: 39,
    reposts_count: 65,
    tags: ['#CyberSecurity', '#ZeroTrust'],
  },
  {
    id: 'p-art-1',
    author_id: 3,
    author: 'Nina Patel',
    username: 'ninainmotion',
    display_name: 'Nina Patel',
    content: 'Golden hour reflections and generative shader textures. Crafted with procedural noise, depth buffers, and volumetric glow. Swipe through for the light progression! 🎨✨',
    image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1000&q=80',
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    likes_count: 732,
    comments_count: 58,
    reposts_count: 94,
    tags: ['#DigitalArt', '#CreativeCoding'],
  },
  {
    id: 'p-art-2',
    author_id: 1,
    author: 'Maya Chen',
    username: 'mayacreates',
    display_name: 'Maya Chen',
    content: 'Exploring minimalist vector illustration sets for high-contrast dark themes. Sometimes the simplest lines evoke the deepest feeling. 🖌️☁️',
    image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1000&q=80',
    created_at: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
    likes_count: 362,
    comments_count: 25,
    reposts_count: 41,
    tags: ['#DigitalArt', '#Design'],
  },
  {
    id: 'p-indie-1',
    author_id: 15,
    author: 'Chloe Martin',
    username: 'chloedesigns',
    display_name: 'Chloe Martin',
    content: 'Bootstrapped our micro-SaaS to $15,000 MRR this month! 3 key takeaways: 1. Ship before you’re fully ready. 2. Talk to 5 customers weekly. 3. Focus obsessively on retention over vanity metrics. 📈💡',
    created_at: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
    likes_count: 520,
    comments_count: 47,
    reposts_count: 82,
    tags: ['#IndieHacker', '#Startups'],
  },
  {
    id: 'p-indie-2',
    author_id: 2,
    author: 'Arjun Rao',
    username: 'arjunbuilds',
    display_name: 'Arjun Rao',
    content: 'Building ConnectHub in public has been the best decision ever. Getting feedback directly from early testers helps prioritize what really matters over bloat. 🛠️',
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1000&q=80',
    created_at: new Date(Date.now() - 1000 * 60 * 540).toISOString(),
    likes_count: 395,
    comments_count: 34,
    reposts_count: 62,
    tags: ['#IndieHacker', '#Tech'],
  },
  {
    id: 'p-welcome',
    author_id: 1,
    author: 'Maya Chen',
    username: 'mayacreates',
    display_name: 'Maya Chen',
    content: 'A little reminder for your timeline: you don’t have to have everything figured out to take the next step. 🌱 What are you working on this week?',
    created_at: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
    likes_count: 142,
    comments_count: 18,
    reposts_count: 24,
    tags: ['#community', '#mindset'],
  },
];

const INITIAL_STORIES = [
  {
    id: 'story-1',
    author: 'Maya Chen',
    username: 'mayacreates',
    avatarColor: 'lavender',
    image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'story-2',
    author: 'Arjun Rao',
    username: 'arjunbuilds',
    avatarColor: 'peach',
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'story-3',
    author: 'Nina Patel',
    username: 'ninainmotion',
    avatarColor: 'mint',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'story-4',
    author: 'Sofia Williams',
    username: 'sofia.codes',
    avatarColor: 'blue',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'story-5',
    author: 'Elena Rostova',
    username: 'elenashoots',
    avatarColor: 'lavender',
    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80',
  },
];

const SUGGESTIONS = [
  { name: 'Aarav Mehta', handle: 'aaravdesigns', color: 'lavender', note: 'Product designer' },
  { name: 'Chloe Martin', handle: 'chloedesigns', color: 'peach', note: 'Design systems lead' },
  { name: 'David Park', handle: 'davidlens', color: 'mint', note: 'Visual storyteller' },
];

const INITIAL_CONVERSATIONS = [
  {
    id: 1,
    user: { id: 101, name: 'Maya Chen', username: 'mayacreates', avatarColor: 'lavender', online: true, lastSeen: 'Active now' },
    lastMessage: 'Love the new interface updates! Really clean 🌱',
    lastMessageTime: '10m',
    unread: 1,
    messages: [
      { id: 'm1', senderId: 101, text: 'Hey! Did you check out the new design system update?', time: '10:42 AM' },
      { id: 'm2', senderId: 'me', text: 'Yes, just saw it! The contrast and palette look super polished.', time: '10:45 AM' },
      { id: 'm3', senderId: 101, text: 'Love the new interface updates! Really clean 🌱', time: '10:48 AM' },
    ],
  },
  {
    id: 2,
    user: { id: 102, name: 'Arjun Rao', username: 'arjunbuilds', avatarColor: 'peach', online: true, lastSeen: 'Active now' },
    lastMessage: 'Are we launching the beta on Friday? 🚀',
    lastMessageTime: '1h',
    unread: 1,
    messages: [
      { id: 'm4', senderId: 102, text: 'The video upload encoding is super fast now.', time: '09:15 AM' },
      { id: 'm5', senderId: 'me', text: 'Awesome, tested on mobile and tablet too!', time: '09:20 AM' },
      { id: 'm6', senderId: 102, text: 'Are we launching the beta on Friday? 🚀', time: '09:22 AM' },
    ],
  },
  {
    id: 3,
    user: { id: 103, name: 'Nina Patel', username: 'ninainmotion', avatarColor: 'mint', online: false, lastSeen: 'Active 2h ago' },
    lastMessage: 'Shared your post in the design circle 🎨',
    lastMessageTime: '3h',
    unread: 0,
    messages: [
      { id: 'm7', senderId: 103, text: 'Shared your post in the design circle 🎨', time: '07:30 AM' },
    ],
  },
];

const INITIAL_NOTIFICATIONS = [
  {
    id: 'n1',
    type: 'like',
    actor: { name: 'Maya Chen', username: 'mayacreates', avatarColor: 'lavender' },
    content: 'liked your post: "A little reminder for your timeline: you don’t have to have everything figured out..."',
    time: '5m ago',
    unread: true,
  },
  {
    id: 'n2',
    type: 'comment',
    actor: { name: 'Arjun Rao', username: 'arjunbuilds', avatarColor: 'peach' },
    content: 'replied: "Super excited to test the video player updates! Clean implementation."',
    time: '24m ago',
    unread: true,
  },
  {
    id: 'n3',
    type: 'follow',
    actor: { name: 'Sofia Williams', username: 'sofia.codes', avatarColor: 'blue' },
    content: 'started following you.',
    time: '1h ago',
    unread: false,
  },
];

const INITIAL_FOLLOWERS = [
  { id: 'f-1', name: 'Sofia Williams', username: 'sofia.codes', avatarColor: 'blue', bio: 'Frontend engineer & UI builder', verified: true },
  { id: 'f-2', name: 'Aarav Mehta', username: 'aaravdesigns', avatarColor: 'lavender', bio: 'Product designer & design systems nerd' },
  { id: 'f-3', name: 'Nina Patel', username: 'ninainmotion', avatarColor: 'mint', bio: 'Photographer & minimalist explorer' },
  { id: 'f-4', name: 'David Park', username: 'davidlens', avatarColor: 'peach', bio: 'Visual artist and filmmaker' },
  { id: 'f-5', name: 'Chloe Martin', username: 'chloedesigns', avatarColor: 'blue', bio: 'Design systems lead at Studio' },
  { id: 'f-6', name: 'Elena Rostova', username: 'elenashoots', avatarColor: 'mint', bio: 'Macro lens enthusiast & engineer' },
];

const INITIAL_FOLLOWING_LIST = [
  { id: 'fl-1', name: 'Maya Chen', username: 'mayacreates', avatarColor: 'lavender', bio: 'Creator & thinker 🌱', verified: true },
  { id: 'fl-2', name: 'Arjun Rao', username: 'arjunbuilds', avatarColor: 'peach', bio: 'Building in public & shipping code 🚀', verified: true },
];

function timeAgo(date) {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [fields, setFields] = useState({ username: '', email: '', password: '', display_name: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'register') {
        await register(fields);
        await login(fields.username, fields.password);
      } else {
        await login(fields.username, fields.password);
      }
      onAuth();
    } catch (err) {
      // If backend is not available, allow instant demo sign-in
      console.warn('Backend sign-in fallback to demo mode:', err);
      localStorage.setItem('connecthub_token', 'demo_token_' + Date.now());
      onAuth();
    } finally {
      setBusy(false);
    }
  }

  const handleDemoSignIn = () => {
    localStorage.setItem('connecthub_token', 'demo_token_123');
    onAuth();
  };

  return (
    <main className="auth-wrap">
      <section className="auth-art">
        <div className="brand">
          <span className="brand-mark brand-mark-lg"><img src="/logo.png" alt="ConnectHub" className="brand-logo-img" /></span>
          connect<span>hub</span>
        </div>
        <div className="auth-art-copy">
          <div className="eyebrow"><Sparkles size={14} /> THE MODERN SOCIAL EXPERIENCE</div>
          <h1>Good things<br />happen <em>together.</em></h1>
          <p>The speed and conversation of Twitter meet the rich visual stories of Instagram. Connect with creators, share moments, and explore communities.</p>
        </div>
        <div className="auth-foot">
          <span>A human-centered social network</span>
          <span>© 2026 ConnectHub</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="brand mobile-brand" style={{ marginBottom: '24px' }}>
            <span className="brand-mark"><img src="/logo.png" alt="ConnectHub" className="brand-logo-img" /></span>
            connect<span>hub</span>
          </div>
          <div className="eyebrow">WELCOME {mode === 'login' ? 'BACK' : 'ABOARD'}</div>
          <h2>{mode === 'login' ? 'Sign in to ConnectHub' : 'Create your account'}</h2>
          <p className="muted" style={{ marginBottom: '20px' }}>
            {mode === 'login' ? 'Pick up right where you left off.' : 'Join the community and share your story.'}
          </p>

          <form onSubmit={submit} className="auth-form">
            {mode === 'register' && (
              <label>
                Display name
                <input
                  required
                  maxLength={100}
                  placeholder="e.g. Alex Rivera"
                  value={fields.display_name}
                  onChange={(e) => setFields({ ...fields, display_name: e.target.value })}
                />
              </label>
            )}

            <label>
              Username
              <input
                required
                minLength={3}
                autoComplete="username"
                placeholder="yourusername"
                value={fields.username}
                onChange={(e) => setFields({ ...fields, username: e.target.value })}
              />
            </label>

            {mode === 'register' && (
              <label>
                Email address
                <input
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={fields.email}
                  onChange={(e) => setFields({ ...fields, email: e.target.value })}
                />
              </label>
            )}

            <label>
              Password
              <input
                required
                minLength={mode === 'register' ? 8 : 1}
                type="password"
                placeholder="••••••••••"
                value={fields.password}
                onChange={(e) => setFields({ ...fields, password: e.target.value })}
              />
            </label>

            {error && <div className="error-message">{error}</div>}

            <button className="primary-btn auth-submit" disabled={busy} type="submit">
              {busy ? 'One sec…' : mode === 'login' ? 'Sign in' : 'Create account'} <span>↗</span>
            </button>
          </form>

          <div style={{ marginTop: '14px', textAlign: 'center' }}>
            <button
              type="button"
              className="outline-btn w-full"
              style={{ width: '100%', borderRadius: '10px' }}
              onClick={handleDemoSignIn}
            >
              Continue as Guest / Demo Mode ✦
            </button>
          </div>

          <p className="auth-switch">
            {mode === 'login' ? 'New around here?' : 'Already have an account?'}{' '}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}

export default function Page() {
  const { theme, toggleTheme } = useTheme();

  // Authentication & user state
  const [authenticated, setAuthenticated] = useState(false);
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState({
    id: 99,
    username: 'alex',
    display_name: 'Alex Rivera',
    email: 'alex@example.com',
    bio: 'Building things and connecting with curious minds ✨',
  });

  // Navigation & active views
  const [activeNav, setActiveNav] = useState('Home'); // 'Home' | 'Explore' | 'Notifications' | 'Messages' | 'Bookmarks' | 'Communities' | 'Settings'
  const [feedTab, setFeedTab] = useState('For you'); // 'For you' | 'Following'
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [search, setSearch] = useState('');

  // Default to closed sidebar on mobile screens
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarVisible(false);
    }
  }, []);
  const [notice, setNotice] = useState('');

  // Feed & posts state
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [draft, setDraft] = useState('');
  const [draftImage, setDraftImage] = useState(null);
  const [draftVideo, setDraftVideo] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [posting, setPosting] = useState(false);

  // Social interactions state
  const [likedMap, setLikedMap] = useState({});
  const [repostedMap, setRepostedMap] = useState({});
  const [bookmarkedMap, setBookmarkedMap] = useState({ 'p-2': true });
  const [followingMap, setFollowingMap] = useState({ mayacreates: true, arjunbuilds: true });
  const [followers, setFollowers] = useState(INITIAL_FOLLOWERS);
  const [followsModalState, setFollowsModalState] = useState(null); // null | 'followers' | 'following'
  const [commentsMap, setCommentsMap] = useState({});
  const [openCommentsId, setOpenCommentsId] = useState(null);
  const [commentDraft, setCommentDraft] = useState('');

  const [showComposeModal, setShowComposeModal] = useState(false);
  const [isComposerHighlighted, setIsComposerHighlighted] = useState(false);
  const [liveSocialPosts, setLiveSocialPosts] = useState([]);
  const [liveSocialCategory, setLiveSocialCategory] = useState('all'); // 'all' | 'actors' | 'politicians' | 'tech'
  const [liveTrends, setLiveTrends] = useState([]);
  const [trendsGeo, setTrendsGeo] = useState('both'); // 'both' | 'IN' | 'US'
  const [loadingLive, setLoadingLive] = useState(false);
  const [liveTopicPosts, setLiveTopicPosts] = useState({});
  const [loadingTopicPosts, setLoadingTopicPosts] = useState(false);

  // Dynamic notifications & conversations state with persistence
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);

  useEffect(() => {
    try {
      const savedNotifs = localStorage.getItem('connecthub_notifications');
      if (savedNotifs) {
        const parsed = JSON.parse(savedNotifs);
        if (Array.isArray(parsed) && parsed.length > 0) setNotifications(parsed);
      }
      const savedConvs = localStorage.getItem('connecthub_conversations');
      if (savedConvs) {
        const parsed = JSON.parse(savedConvs);
        if (Array.isArray(parsed) && parsed.length > 0) setConversations(parsed);
      }
      const savedFollowing = localStorage.getItem('connecthub_following_map');
      if (savedFollowing) {
        setFollowingMap(JSON.parse(savedFollowing));
      }
      const savedFollowers = localStorage.getItem('connecthub_followers');
      if (savedFollowers) {
        setFollowers(JSON.parse(savedFollowers));
      }
    } catch (e) {
      console.warn('Could not load stored state', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('connecthub_notifications', JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem('connecthub_conversations', JSON.stringify(conversations));
    } catch {}
  }, [conversations]);

  useEffect(() => {
    try {
      localStorage.setItem('connecthub_following_map', JSON.stringify(followingMap));
    } catch {}
  }, [followingMap]);

  useEffect(() => {
    try {
      localStorage.setItem('connecthub_followers', JSON.stringify(followers));
    } catch {}
  }, [followers]);

  // Derive dynamic list of all known users to compute followingList accurately
  const allKnownUsers = useMemo(() => {
    const map = new Map();
    [...INITIAL_FOLLOWING_LIST, ...followers, ...SUGGESTIONS].forEach((u) => {
      const handle = u.username || u.handle;
      if (!map.has(handle)) {
        map.set(handle, {
          id: u.id || handle,
          name: u.name,
          username: handle,
          avatarColor: u.color || u.avatarColor || 'lavender',
          bio: u.note || u.bio || '',
          verified: !!u.verified,
        });
      }
    });
    return Array.from(map.values());
  }, [followers]);

  // Real-time following list and counts
  const followingList = useMemo(() => {
    return allKnownUsers.filter((u) => followingMap[u.username]);
  }, [allKnownUsers, followingMap]);

  const followingCount = followingList.length;
  const followersCount = followers.length;

  const unreadNotifsCount = useMemo(() => {
    return notifications.filter((n) => n.unread).length;
  }, [notifications]);

  const unreadMessagesCount = useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.unread || 0), 0);
  }, [conversations]);

  const [activeCommunityId, setActiveCommunityId] = useState(null);

  const openCommunity = (commId) => {
    setActiveCommunityId(commId);
    setActiveNav('Communities');
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarVisible(false);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (label) => {
    setActiveNav(label);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (window.innerWidth < 768) {
        setIsSidebarVisible(false);
      }
    }

    if (label === 'Communities') {
      setActiveCommunityId(null);
    }

    // If opening Notifications, clear unread notifications count so it becomes 0
    if (label === 'Notifications') {
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    }

    // If opening Messages, clear unread messages count so it becomes 0
    if (label === 'Messages') {
      setConversations((prev) => prev.map((c) => ({ ...c, unread: 0 })));
    }
  };

  const handleModalPostCreated = (postData) => {
    const newPost = {
      id: `p-user-${Date.now()}`,
      author_id: me.id,
      author: me.display_name || me.username,
      username: me.username,
      display_name: me.display_name,
      content: postData.content,
      image: postData.image || null,
      video: postData.video || null,
      created_at: new Date().toISOString(),
      likes_count: 0,
      comments_count: 0,
      reposts_count: 0,
      tags: [],
    };
    setPosts((prev) => [newPost, ...prev]);
    showToast('Post published to ConnectHub timeline! ✨');
  };

  const handleEditHomeClick = () => {
    setShowComposeModal(true);
    setIsComposerHighlighted(true);
    setTimeout(() => setIsComposerHighlighted(false), 2400);
    const composerEl = document.getElementById('post-composer');
    if (composerEl) {
      composerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      composerEl.focus();
    }
  };

  // Load live external content (Google Trends & Bluesky feed)
  const loadLiveSocial = useCallback(async (cat = liveSocialCategory) => {
    setLoadingLive(true);
    try {
      const social = await fetchLiveSocial(cat);
      if (Array.isArray(social) && social.length > 0) {
        setLiveSocialPosts(social);
      }
    } catch (e) {
      console.log('Social feed fallback:', e.message);
    } finally {
      setLoadingLive(false);
    }
  }, [liveSocialCategory]);

  useEffect(() => {
    async function loadTrends() {
      try {
        const trends = await fetchLiveTrends(trendsGeo);
        if (Array.isArray(trends) && trends.length > 0) {
          setLiveTrends(trends);
        }
      } catch (e) {
        console.log('Trends fallback:', e.message);
      }
    }
    loadTrends();
  }, [trendsGeo]);

  useEffect(() => {
    loadLiveSocial(liveSocialCategory);
  }, [liveSocialCategory, loadLiveSocial]);

  // Stories state
  const [storiesList, setStoriesList] = useState(INITIAL_STORIES);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [viewingStoryIndex, setViewingStoryIndex] = useState(null);

  // Lightbox media modal state
  const [activeMediaModal, setActiveMediaModal] = useState(null);

  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Load User profile
  const loadMe = useCallback(async () => {
    try {
      const user = await api('/users/me');
      if (user) {
        setMe(user);
        setAuthenticated(true);
      }
    } catch {
      // Local fallback
      const token = getToken();
      if (token) setAuthenticated(true);
    } finally {
      setReady(true);
    }
  }, []);

  // Load Live Posts
  const loadPosts = useCallback(async () => {
    try {
      const data = await api('/posts?limit=20&offset=0');
      if (Array.isArray(data) && data.length > 0) {
        setPosts((prev) => {
          const apiIds = new Set(data.map((p) => p.id));
          const localOnly = prev.filter((p) => !apiIds.has(p.id) && String(p.id).startsWith('p-user-'));
          return [...localOnly, ...data.map((p) => ({
            ...p,
            author: p.author_name || p.username || `Member ${p.author_id}`,
            display_name: p.author_name || p.username || `Member ${p.author_id}`,
          }))];
        });
      }
    } catch (e) {
      console.log('Using local posts feed:', e.message);
    }
  }, []);

  useEffect(() => {
    if (getToken()) {
      loadMe();
    } else {
      setReady(true);
    }
  }, [loadMe]);

  useEffect(() => {
    if (authenticated) {
      loadPosts();
    }
  }, [authenticated, loadPosts]);

  // Handle toast notifications
  const showToast = useCallback((msg) => {
    setNotice(msg);
    setTimeout(() => {
      setNotice((current) => (current === msg ? '' : current));
    }, 3500);
  }, []);

  // Handle clicking on any trending topic
  const handleTrendClick = useCallback(async (trend) => {
    const tag = typeof trend === 'string' ? trend : (trend?.tag || '');
    const query = typeof trend === 'object' && trend?.query ? trend.query : tag.replace(/^#/, '');
    const cleanTag = tag.replace(/^#/, '').trim();
    const cleanKey = cleanTag.toLowerCase();

    // Immediately create an instant headline post so the user sees results without delay
    if (typeof trend === 'object' && (trend?.headline || trend?.query)) {
      const instantPost = {
        id: `trend-instant-${cleanKey}-${Date.now()}`,
        author: trend.topic ? trend.topic.split('·')[0].trim() : 'Live Sports & News',
        username: cleanKey.slice(0, 15),
        display_name: trend.query || cleanTag,
        avatar: '',
        role_badge: `🔥 #${cleanTag} Trending`,
        content: trend.headline || `Breaking updates and live highlights on ${trend.query || cleanTag}. Matches, stats, and real-time commentary trending across the network.`,
        image: null,
        created_at: 'Just now',
        likes_count: 240,
        comments_count: 38,
        reposts_count: 75,
        tags: [`#${cleanTag}`, '#Trending', '#LiveUpdates'],
        source: 'trends'
      };
      setLiveTopicPosts((prev) => ({
        ...prev,
        [cleanKey]: [instantPost, ...(prev[cleanKey] || [])]
      }));
    }

    setSearch(cleanTag);
    setFeedTab('For you');
    setActiveNav('Home');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    setLoadingTopicPosts(true);
    try {
      const topicPosts = await fetchLiveTopicPosts(query);
      if (Array.isArray(topicPosts) && topicPosts.length > 0) {
        setLiveTopicPosts((prev) => ({
          ...prev,
          [cleanKey]: topicPosts
        }));
      }
    } catch (e) {
      console.log('Topic posts fetch fallback:', e.message);
    } finally {
      setLoadingTopicPosts(false);
    }
  }, []);

  // Automatically fetch live posts when search term changes
  useEffect(() => {
    if (!search.trim()) return;
    const cleanKey = search.trim().toLowerCase().replace(/^#/, '');
    if (cleanKey.length >= 2 && !liveTopicPosts[cleanKey]) {
      fetchLiveTopicPosts(cleanKey).then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setLiveTopicPosts((prev) => ({ ...prev, [cleanKey]: data }));
        }
      }).catch(() => {});
    }
  }, [search, liveTopicPosts]);

  // Filtered posts based on search & feed tab
  const shownPosts = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase().replace(/^#/, '');
    const topicPosts = cleanSearch ? (liveTopicPosts[cleanSearch] || []) : [];

    const basePool = feedTab === 'Live X / Bluesky'
      ? (liveSocialPosts.length > 0 ? liveSocialPosts : posts)
      : posts;

    // Place matching live topic posts directly at the top of the feed
    const sourcePool = topicPosts.length > 0
      ? [...topicPosts, ...basePool.filter((p) => !topicPosts.some((tp) => tp.id === p.id))]
      : basePool;

    return sourcePool.filter((p) => {
      // Check following tab filter (only applies when NOT searching)
      if (!search.trim() && feedTab === 'Following' && p.username && !followingMap[p.username] && p.author_id !== me.id) {
        return false;
      }
      // Check search filter
      if (!search.trim()) return true;
      const q = cleanSearch;
      const contentMatch = (p.content || '').toLowerCase().includes(q);
      const authorMatch = (p.author || p.display_name || '').toLowerCase().includes(q);
      const userMatch = (p.username || '').toLowerCase().includes(q);
      const roleMatch = (p.role_badge || '').toLowerCase().includes(q);
      const tagMatch = (p.tags || []).some((t) => {
        const cleanT = t.toLowerCase().replace(/^#/, '');
        return cleanT.includes(q) || q.includes(cleanT);
      });
      // Word match for multi-word queries (e.g. "Man City", "Union Berlin vs Dortmund")
      const words = q.split(/\s+/).filter((w) => w.length > 2);
      const wordMatch = words.length > 1 && words.some((w) =>
        (p.content || '').toLowerCase().includes(w) ||
        (p.tags || []).some((t) => t.toLowerCase().includes(w))
      );

      return contentMatch || authorMatch || userMatch || roleMatch || tagMatch || wordMatch;
    });
  }, [posts, feedTab, followingMap, me.id, search, liveSocialPosts, liveTopicPosts]);

  // Bookmarked posts list
  const bookmarkedPosts = useMemo(() => {
    return posts.filter((p) => bookmarkedMap[p.id]);
  }, [posts, bookmarkedMap]);

  // Handle Image Selection
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setDraftVideo(null);
      setUploadProgress(20);
      const reader = new FileReader();
      reader.onprogress = (pe) => {
        if (pe.lengthComputable) {
          setUploadProgress(Math.round((pe.loaded / pe.total) * 100));
        }
      };
      reader.onload = () => {
        setUploadProgress(100);
        setDraftImage(reader.result);
        setTimeout(() => setUploadProgress(0), 400);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Video Selection
  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setDraftImage(null);
      setUploadProgress(25);
      const reader = new FileReader();
      reader.onload = () => {
        setUploadProgress(100);
        setDraftVideo(reader.result);
        setTimeout(() => setUploadProgress(0), 400);
      };
      reader.readAsDataURL(file);
    }
  };

  // Create Post
  async function createPost(e) {
    e.preventDefault();
    if (!draft.trim() && !draftImage && !draftVideo) return;

    setPosting(true);
    const postPayload = {
      id: `p-user-${Date.now()}`,
      author_id: me.id,
      author: me.display_name || me.username || 'You',
      display_name: me.display_name || me.username || 'You',
      username: me.username || 'you',
      content: draft.trim(),
      image: draftImage,
      video: draftVideo,
      created_at: new Date().toISOString(),
      likes_count: 0,
      comments_count: 0,
      reposts_count: 0,
    };

    // Attempt to persist to backend
    try {
      await api('/posts', {
        method: 'POST',
        body: JSON.stringify({ content: draft.trim() }),
      });
    } catch (err) {
      console.log('Saved post locally:', err);
    }

    setPosts([postPayload, ...posts]);
    setDraft('');
    setDraftImage(null);
    setDraftVideo(null);
    setShowEmojiPicker(false);
    setPosting(false);
    showToast('Post published to ConnectHub! 🚀');

    // Dynamically generate a fresh engagement notification
    setTimeout(() => {
      const creators = [
        { name: 'Sofia Williams', username: 'sofia.codes', color: 'blue' },
        { name: 'Arjun Rao', username: 'arjunbuilds', color: 'peach' },
        { name: 'Maya Chen', username: 'mayacreates', color: 'lavender' },
        { name: 'David Park', username: 'davidlens', color: 'mint' },
      ];
      const actor = creators[Math.floor(Math.random() * creators.length)];
      const dynamicNotif = {
        id: `notif-${Date.now()}`,
        type: Math.random() > 0.4 ? 'like' : 'comment',
        actor: { name: actor.name, username: actor.username, avatarColor: actor.color },
        content: `liked your post: "${postPayload.content.slice(0, 45) || 'photo update'}..."`,
        time: 'Just now',
        unread: true,
      };
      setNotifications((prev) => [dynamicNotif, ...prev]);
    }, 3500);
  }

  // Toggle Like
  const toggleLike = async (post) => {
    const isLiked = !!likedMap[post.id];
    setLikedMap((prev) => ({ ...prev, [post.id]: !isLiked }));

    try {
      await api(`/posts/${post.id}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
      });
    } catch {
      // Local state already updated
    }
  };

  // Toggle Repost
  const toggleRepost = (postId) => {
    const isReposted = !!repostedMap[postId];
    setRepostedMap((prev) => ({ ...prev, [postId]: !isReposted }));
    showToast(isReposted ? 'Undo repost' : 'Reposted to your profile 🔁');
  };

  // Toggle Bookmark
  const toggleBookmark = (postId) => {
    const isBookmarked = !!bookmarkedMap[postId];
    setBookmarkedMap((prev) => ({ ...prev, [postId]: !isBookmarked }));
    showToast(isBookmarked ? 'Removed from Bookmarks' : 'Saved to Bookmarks! 🔖');
  };

  // Toggle Follow
  const toggleFollow = (username) => {
    setFollowingMap((prev) => {
      const next = !prev[username];
      showToast(next ? `Following @${username}` : `Unfollowed @${username}`);
      if (next) {
        const newNotif = {
          id: `notif-follow-${Date.now()}`,
          type: 'follow',
          actor: { name: username, username: username, avatarColor: 'mint' },
          content: 'is now following you back on ConnectHub.',
          time: 'Just now',
          unread: true,
        };
        setNotifications((prevNotifs) => [newNotif, ...prevNotifs]);
      }
      return { ...prev, [username]: next };
    });
  };

  // Submit Comment
  const submitComment = (post) => {
    if (!commentDraft.trim()) return;

    const newComment = {
      id: `c-${Date.now()}`,
      author: me.display_name || me.username || 'You',
      content: commentDraft.trim(),
      created_at: new Date().toISOString(),
    };

    setCommentsMap((prev) => ({
      ...prev,
      [post.id]: [...(prev[post.id] || []), newComment],
    }));

    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p))
    );

    setCommentDraft('');
    showToast('Reply sent! 💬');
  };

  // Log Out
  const handleLogout = () => {
    localStorage.removeItem('connecthub_token');
    setAuthenticated(false);
    showToast('Signed out of ConnectHub.');
  };

  if (!ready) {
    return (
      <div className="boot-screen">
        <div className="brand">
          <span className="brand-mark brand-mark-lg"><img src="/logo.png" alt="ConnectHub" className="brand-logo-img" /></span>
          connect<span>hub</span>
        </div>
        <div className="loader" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <>
        <AuthScreen onAuth={() => { setAuthenticated(true); loadMe(); }} />
        {notice && <div className="toast"><span>{notice}</span><button onClick={() => setNotice('')}><X size={15} /></button></div>}
      </>
    );
  }

  const navItems = [
    { label: 'Home', icon: Home },
    { label: 'Reels', icon: Flame },
    { label: 'Explore', icon: Compass },
    { label: 'Notifications', icon: Bell, badge: unreadNotifsCount > 0 ? String(unreadNotifsCount) : null },
    { label: 'Messages', icon: MessageCircle, badge: unreadMessagesCount > 0 ? String(unreadMessagesCount) : null },
    { label: 'Bookmarks', icon: Bookmark },
    { label: 'Communities', icon: Users },
    { label: 'Profile', icon: UserRound },
    { label: 'Settings', icon: Settings },
  ];

  return (
    <main className="app-shell">
      {/* Top Bar */}
      <header className="topbar">
        {/* Toggle button on the left of ConnectHub with 3 lines */}
        <button
          className={`icon-btn sidebar-toggle-btn ${!isSidebarVisible ? 'collapsed' : ''}`}
          onClick={() => setIsSidebarVisible((prev) => !prev)}
          title={isSidebarVisible ? "Hide sidebar navigation" : "Show sidebar navigation"}
          aria-label={isSidebarVisible ? "Hide sidebar navigation" : "Show sidebar navigation"}
        >
          <Menu size={20} />
        </button>

        <a className="brand top-brand" href="#top" onClick={() => handleNavClick('Home')}>
          <span className="brand-mark"><img src="/logo.png" alt="ConnectHub" className="brand-logo-img" /></span>
          connect<span>hub</span>
        </a>

        {/* Global Search */}
        <div className="top-search">
          <Search size={16} />
          <input
            placeholder="Search ConnectHub (topics, posts, creators)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X size={14} />
            </button>
          )}
          <kbd>⌘ K</kbd>
        </div>

        {/* Quick Theme Switcher & Actions */}
        <div className="top-actions">
          <button
            className="icon-btn theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          <button
            className={`icon-btn ${activeNav === 'Settings' ? 'active' : ''}`}
            onClick={() => handleNavClick('Settings')}
            title="Settings"
            aria-label="Open settings"
          >
            <Settings size={19} />
          </button>

          <button
            className="profile-trigger"
            onClick={() => handleNavClick('Profile')}
            title="View Profile & Connections"
          >
            <div className="avatar avatar-lavender avatar-sm">
              {(me?.display_name || me?.username || 'A')[0].toUpperCase()}
            </div>
            <span className="profile-trigger-name">
              {me?.display_name || me?.username || 'Alex Rivera'}
              <small>@{me?.username || 'alex'}</small>
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Backdrop when sidebar is toggled open on mobile */}
      {isSidebarVisible && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={() => setIsSidebarVisible(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Responsive Grid */}
      <div className={`layout-grid ${!isSidebarVisible ? 'sidebar-hidden' : ''}`} id="top">
        {/* Left Sidebar */}
        <aside className={`left-sidebar ${!isSidebarVisible ? 'sidebar-collapsed' : 'sidebar-mobile-open'}`}>
          <div className="sidebar-mobile-header">
            <div className="brand" style={{ fontSize: '17px' }}>
              <span className="brand-mark" style={{ width: '28px', height: '28px' }}><img src="/logo.png" alt="ConnectHub" className="brand-logo-img" /></span>
              connect<span>hub</span>
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setIsSidebarVisible(false)}
              title="Close sidebar"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>
          <div className="sidebar-label">CONNECT & EXPLORE</div>

          <nav className="main-nav">
            {navItems.map(({ label, icon: Icon, badge }) => (
              <button
                key={label}
                className={`nav-item ${activeNav === label ? 'nav-active' : ''}`}
                onClick={() => handleNavClick(label)}
              >
                <Icon size={20} strokeWidth={activeNav === label ? 2.4 : 1.8} />
                <span>{label}</span>
                {badge && <span className="nav-badge">{badge}</span>}
              </button>
            ))}
          </nav>

          <button
            className="primary-btn sidebar-post-btn"
            onClick={() => {
              setActiveNav('Home');
              document.getElementById('post-composer')?.focus();
            }}
          >
            <PenLine size={16} /> Post
          </button>

          {/* Mini Profile & Clickable Stats Card */}
          <div className="sidebar-user-card card-surface">
            <div
              className="sidebar-user-top"
              onClick={() => handleNavClick('Profile')}
              style={{ cursor: 'pointer' }}
            >
              <div className="avatar avatar-lavender avatar-md">
                {(me?.display_name || 'A')[0].toUpperCase()}
              </div>
              <div className="sidebar-user-details">
                <b>{me?.display_name || 'Alex Rivera'}</b>
                <small>@{me?.username || 'alex'}</small>
              </div>
            </div>

            <div className="sidebar-stats-row">
              <button
                type="button"
                className="stat-interactive-pill"
                onClick={() => setFollowsModalState('following')}
                title="View who you are following"
              >
                <b>{followingCount}</b> <span>Following</span>
              </button>
              <button
                type="button"
                className="stat-interactive-pill"
                onClick={() => setFollowsModalState('followers')}
                title="View your followers"
              >
                <b>{followersCount}</b> <span>Followers</span>
              </button>
            </div>
          </div>

          <div className="sidebar-divider" />
          <div className="sidebar-label">YOUR COMMUNITIES</div>
          <button className="community-item" onClick={() => openCommunity('design-circle')}>
            <span className="community-icon community-purple">✳</span>
            <span>Design circle</span>
            <span className="community-dot" />
          </button>
          <button className="community-item" onClick={() => openCommunity('build-in-public')}>
            <span className="community-icon community-orange">⌘</span>
            <span>Build in public</span>
          </button>
          <button className="community-item" onClick={() => openCommunity('slow-living')}>
            <span className="community-icon community-green">♧</span>
            <span>Slow living</span>
          </button>
          <button className="community-item" onClick={() => openCommunity('ai-creators')}>
            <span className="community-icon community-purple">⚡</span>
            <span>AI creators</span>
          </button>
          <button className="community-item" onClick={() => openCommunity('react-ecosystem')}>
            <span className="community-icon community-blue">⚛</span>
            <span>React ecosystem</span>
          </button>
        </aside>

        {/* Center Main View Column */}
        <section className="feed-column">
          {/* ================= VIEW: HOME FEED ================= */}
          {activeNav === 'Home' && (
            <>
              {/* Instagram Stories Carousel */}
              <div className="stories-bar-card card-surface">
                <div className="stories-strip">
                  {/* + Your Story */}
                  <button
                    className="story-circle-item"
                    onClick={() => setShowStoryCreator(true)}
                  >
                    <div className="story-ring-gradient story-ring-add">
                      <div className="story-circle-inner">
                        <Plus size={20} color="var(--accent)" />
                      </div>
                    </div>
                    <span className="story-label">Your story</span>
                  </button>

                  {/* Other Stories */}
                  {storiesList.map((story, idx) => (
                    <button
                      key={story.id}
                      className="story-circle-item"
                      onClick={() => setViewingStoryIndex(idx)}
                    >
                      <div className="story-ring-gradient">
                        <div className="story-circle-inner">
                          <div className={`avatar avatar-${story.avatarColor || 'lavender'} avatar-story`}>
                            {story.author[0].toUpperCase()}
                          </div>
                        </div>
                      </div>
                      <span className="story-label">{story.author.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Feed Header */}
              <div className="feed-heading">
                <div>
                  <div className="eyebrow">YOUR COMMUNITY IN MOTION</div>
                  <h1>Home</h1>
                  <p>Catch up on what creators and friends are sharing.</p>
                </div>
                <button
                  className="icon-btn edit-home-btn"
                  onClick={handleEditHomeClick}
                  title="Compose New Post (Active)"
                  aria-label="Compose post"
                  style={{
                    background: 'var(--accent)',
                    color: '#ffffff',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <PenLine size={18} />
                </button>
              </div>

              {/* Search Active Filter Banner */}
              {search && (
                <div className="search-active-banner">
                  <div className="search-active-info">
                    <Hash size={18} className="icon-accent" />
                    <div>
                      <span>Filtered by</span>
                      <b>#{search.replace(/^#/, '')}</b>
                      {loadingTopicPosts ? (
                        <small style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <RefreshCw size={11} className="spinning" /> Loading live posts…
                        </small>
                      ) : (
                        <small>({shownPosts.length} {shownPosts.length === 1 ? 'post' : 'posts'})</small>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="clear-search-pill"
                    onClick={() => setSearch('')}
                  >
                    Clear filter <X size={13} />
                  </button>
                </div>
              )}

              {/* Feed Tabs: For You, Following, Live X, Live News */}
              <div className="feed-tabs">
                <button
                  className={feedTab === 'For you' ? 'tab-active' : ''}
                  onClick={() => setFeedTab('For you')}
                >
                  For you
                </button>
                <button
                  className={feedTab === 'Following' ? 'tab-active' : ''}
                  onClick={() => setFeedTab('Following')}
                >
                  Following
                </button>
                <button
                  className={feedTab === 'Live X / Bluesky' ? 'tab-active' : ''}
                  onClick={() => setFeedTab('Live X / Bluesky')}
                  title="Live public posts from Bluesky & X"
                >
                  <Zap size={13} style={{ display: 'inline', marginRight: '4px' }} /> Live X
                </button>
                <button
                  className={feedTab === 'Live News' ? 'tab-active' : ''}
                  onClick={() => setFeedTab('Live News')}
                  title="Live news from India and Worldwide"
                >
                  <Newspaper size={13} style={{ display: 'inline', marginRight: '4px' }} /> Live News
                </button>

                {feedTab === 'Live X / Bluesky' && (
                  <button
                    type="button"
                    onClick={async () => {
                      await loadLiveSocial('all');
                      showToast('Fetched latest live X posts!');
                    }}
                    disabled={loadingLive}
                    title="Refresh latest Live X posts"
                    style={{
                      marginLeft: 'auto',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--accent)',
                      background: 'var(--accent-light)',
                      border: '1px solid var(--accent-border)',
                      borderRadius: '20px',
                      padding: '4px 12px',
                      cursor: loadingLive ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <RefreshCw size={12} className={loadingLive ? 'spinning' : ''} />
                    <span>{loadingLive ? 'Updating…' : 'Refresh X'}</span>
                  </button>
                )}
              </div>

              {/* Post Composer */}
              <form className={`composer card-surface ${isComposerHighlighted ? 'composer-active-glow' : ''}`} onSubmit={createPost}>
                <div className="avatar avatar-lavender avatar-md">
                  {(me?.display_name || me?.username || 'A')[0].toUpperCase()}
                </div>

                <div className="composer-main">
                  <textarea
                    id="post-composer"
                    rows={2}
                    maxLength={3000}
                    placeholder="What’s happening? Share a thought, photo, or project update…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />

                  {/* Media Previews in Composer */}
                  {draftImage && (
                    <div className="composer-media-preview-box">
                      <img src={draftImage} alt="Draft attachment" />
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
                    <div className="composer-media-preview-box">
                      <video src={draftVideo} controls />
                      <button
                        type="button"
                        className="composer-remove-media-btn"
                        onClick={() => setDraftVideo(null)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  {/* Upload Progress Bar */}
                  {uploadProgress > 0 && (
                    <div className="upload-progress-bar">
                      <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}

                  <div className="composer-bottom">
                    <div className="composer-tools">
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
                        aria-label="Add photo"
                      >
                        <ImagePlus size={18} />
                      </button>

                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => videoInputRef.current?.click()}
                        title="Add Video"
                        aria-label="Add video"
                      >
                        <Video size={18} />
                      </button>

                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        title="Add Emoji"
                        aria-label="Add emoji"
                      >
                        <Smile size={18} />
                      </button>

                      {/* Emoji Picker Popover */}
                      {showEmojiPicker && (
                        <EmojiPicker
                          onSelect={(emoji) => setDraft((prev) => prev + emoji)}
                          onClose={() => setShowEmojiPicker(false)}
                        />
                      )}
                    </div>

                    <button
                      className="primary-btn"
                      disabled={(!draft.trim() && !draftImage && !draftVideo) || posting}
                      type="submit"
                    >
                      {posting ? 'Posting…' : 'Post'} <Send size={14} />
                    </button>
                  </div>
                </div>
              </form>

              {/* Posts Feed or Live News */}
              {feedTab === 'Live News' ? (
                <LiveNewsView
                  onShareToFeed={(newsText) => {
                    setDraft(newsText);
                    document.getElementById('post-composer')?.focus();
                  }}
                  showToast={showToast}
                />
              ) : (
                <>
                  {feedTab === 'Live X / Bluesky' && (
                    <div
                      className="live-x-header-bar card-surface"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 16px',
                        borderRadius: '12px',
                        marginBottom: '16px',
                        border: '1px solid var(--line)',
                        background: 'var(--surface)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="online-indicator" style={{ position: 'static', display: 'inline-block' }} />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                          Live X Stream
                        </span>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          • Real-time updates
                        </span>
                      </div>
                      <button
                        type="button"
                        className="primary-btn icon-label-btn"
                        onClick={async () => {
                          await loadLiveSocial('all');
                          showToast('Fetched latest live X posts!');
                        }}
                        disabled={loadingLive}
                        title="Fetch latest posts from live network"
                        style={{
                          fontSize: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                      >
                        <RefreshCw size={13} className={loadingLive ? 'spinning' : ''} />
                        <span>{loadingLive ? 'Refreshing…' : 'Refresh Feed'}</span>
                      </button>
                    </div>
                  )}

                  <div className="posts-list">
                    {shownPosts.length > 0 ? (
                      shownPosts.map((post) => (
                        <article className="post-card card-surface" key={post.id}>
                          <div className="post-head">
                            <div className="avatar avatar-lavender avatar-lg">
                              {(post.display_name || post.author || 'M')[0].toUpperCase()}
                            </div>
                            <div className="post-byline">
                              <b>
                                {post.display_name || post.author || `Member ${post.author_id}`}
                                <span className="verified"><Check size={9} /></span>
                                {post.role_badge && (
                                  <span
                                    className="source-chip"
                                    style={{
                                      fontSize: '11px',
                                      padding: '2px 8px',
                                      marginLeft: '6px',
                                      background: 'var(--accent-light, rgba(29, 155, 240, 0.12))',
                                      color: 'var(--accent)',
                                      fontWeight: 600
                                    }}
                                  >
                                    {post.role_badge}
                                  </span>
                                )}
                                {post.source === 'bluesky' && !post.role_badge && (
                                  <span className="source-chip" style={{ fontSize: '10px', padding: '1px 6px', marginLeft: '6px' }}>
                                    Live Bluesky
                                  </span>
                                )}
                              </b>
                              <span>
                                @{post.username || `member${post.author_id}`} · {timeAgo(post.created_at)}
                              </span>
                            </div>
                        <button
                          className="icon-btn post-more"
                          aria-label="Post options"
                          onClick={() => showToast('Post options saved')}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                      </div>

                      <div className="post-content">{post.content}</div>

                      {/* Image Media with Lightbox Zoom */}
                      {post.image && (
                        <div
                          className="post-media-container"
                          onClick={() => setActiveMediaModal(post)}
                          style={{ cursor: 'pointer' }}
                        >
                          <img src={post.image} alt="Attachment" className="post-media-full" />
                        </div>
                      )}

                      {/* Video Media with Controls */}
                      {post.video && (
                        <div className="post-media-container">
                          <video src={post.video} controls className="post-media-full" />
                        </div>
                      )}

                      {/* Post Tags */}
                      {post.tags && (
                        <div className="post-tags" style={{ display: 'flex', gap: '8px', margin: '8px 0' }}>
                          {post.tags.map((t) => (
                            <button
                              key={t}
                              className="text-btn"
                              style={{ fontSize: '12px' }}
                              onClick={() => handleTrendClick(t)}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Action Bar (Like, Comment, Repost, Share, Bookmark) */}
                      <div className="post-actions">
                        <button
                          className={likedMap[post.id] ? 'action-liked' : ''}
                          onClick={() => toggleLike(post)}
                          title="Like"
                        >
                          <Heart
                            size={18}
                            fill={likedMap[post.id] ? '#f91880' : 'none'}
                            color={likedMap[post.id] ? '#f91880' : 'currentColor'}
                          />
                          <span>{(post.likes_count || 12) + (likedMap[post.id] ? 1 : 0)}</span>
                        </button>

                        <button
                          onClick={() => setOpenCommentsId(openCommentsId === post.id ? null : post.id)}
                          title="Reply"
                        >
                          <MessageSquare size={18} />
                          <span>{post.comments_count || (commentsMap[post.id]?.length || 0)}</span>
                        </button>

                        <button
                          className={repostedMap[post.id] ? 'action-reposted' : ''}
                          onClick={() => toggleRepost(post.id)}
                          title="Repost"
                        >
                          <Repeat size={18} />
                          <span>{(post.reposts_count || 5) + (repostedMap[post.id] ? 1 : 0)}</span>
                        </button>

                        <button
                          onClick={() => {
                            navigator.clipboard?.writeText(window.location.href);
                            showToast('Post link copied to clipboard.');
                          }}
                          title="Share"
                        >
                          <Share2 size={17} />
                        </button>

                        <button
                          className={`action-save ${bookmarkedMap[post.id] ? 'action-saved' : ''}`}
                          onClick={() => toggleBookmark(post.id)}
                          title="Bookmark"
                        >
                          <Bookmark size={18} fill={bookmarkedMap[post.id] ? 'currentColor' : 'none'} />
                        </button>
                      </div>

                      {/* Comments Drawer */}
                      {openCommentsId === post.id && (
                        <div className="comments-panel">
                          {(commentsMap[post.id] || []).map((c) => (
                            <div className="comment-row" key={c.id}>
                              <div className="avatar avatar-mint avatar-sm">
                                {c.author[0].toUpperCase()}
                              </div>
                              <div>
                                <b>{c.author}</b>
                                <p>{c.content}</p>
                              </div>
                            </div>
                          ))}

                          <form
                            className="comment-form"
                            onSubmit={(e) => {
                              e.preventDefault();
                              submitComment(post);
                            }}
                          >
                            <input
                              placeholder="Write a thoughtful reply..."
                              value={commentDraft}
                              onChange={(e) => setCommentDraft(e.target.value)}
                            />
                            <button type="submit" className="icon-btn" aria-label="Send comment">
                              <Send size={15} />
                            </button>
                          </form>
                        </div>
                      )}
                    </article>
                  ))
                ) : (
                  <div className="empty-state card-surface">
                    <Search size={32} className="muted-icon" />
                    <h3>{search ? `No posts found for "${search}"` : 'No posts found'}</h3>
                    <p>
                      {search
                        ? 'Try searching for another topic or clear the filter to see all posts.'
                        : 'Follow more creators or check the "For you" feed to populate your timeline.'}
                    </p>
                    {search && (
                      <button
                        type="button"
                        className="primary-btn"
                        style={{ marginTop: '14px' }}
                        onClick={() => setSearch('')}
                      >
                        Clear search filter
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

          {/* ================= VIEW: REELS ================= */}
          {activeNav === 'Reels' && (
            <ReelsView showToast={showToast} />
          )}

          {/* ================= VIEW: EXPLORE ================= */}
          {activeNav === 'Explore' && (
            <ExploreView
              onSelectPost={(post) => setActiveMediaModal(post)}
              onSelectTag={(tag) => handleTrendClick(tag)}
              showToast={showToast}
            />
          )}

          {/* ================= VIEW: NOTIFICATIONS ================= */}
          {activeNav === 'Notifications' && (
            <NotificationsView
              notifications={notifications}
              onMarkAllAsRead={(withToast) => {
                setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
                if (withToast) showToast('All notifications marked as read.');
              }}
              onToggleNotificationRead={(id) => {
                setNotifications((prev) =>
                  prev.map((n) => (n.id === id ? { ...n, unread: !n.unread } : n))
                );
              }}
              showToast={showToast}
            />
          )}

          {/* ================= VIEW: MESSAGES ================= */}
          {activeNav === 'Messages' && (
            <MessagesView
              currentUser={me}
              conversations={conversations}
              setConversations={setConversations}
              onClearUnreadMessages={() => {
                setConversations((prev) => prev.map((c) => ({ ...c, unread: 0 })));
              }}
              showToast={showToast}
            />
          )}

          {/* ================= VIEW: BOOKMARKS ================= */}
          {activeNav === 'Bookmarks' && (
            <BookmarksView
              bookmarkedPosts={bookmarkedPosts}
              onRemoveBookmark={toggleBookmark}
              onToggleLike={toggleLike}
              likedMap={likedMap}
              onOpenComments={(id) => setOpenCommentsId(id)}
              commentsMap={commentsMap}
              showToast={showToast}
            />
          )}

          {/* ================= VIEW: COMMUNITIES ================= */}
          {activeNav === 'Communities' && (
            <CommunitiesView
              selectedCommunityId={activeCommunityId}
              onClearSelectedCommunity={() => setActiveCommunityId(null)}
              showToast={showToast}
              user={me}
            />
          )}

          {/* ================= VIEW: PROFILE ================= */}
          {activeNav === 'Profile' && (
            <ProfileView
              user={me}
              userPosts={posts.filter((p) => p.author_id === me.id || p.username === me.username)}
              followersCount={followersCount}
              followingCount={followingCount}
              onOpenFollowers={() => setFollowsModalState('followers')}
              onOpenFollowing={() => setFollowsModalState('following')}
              onEditProfile={() => handleNavClick('Settings')}
              onToggleLike={toggleLike}
              likedMap={likedMap}
              showToast={showToast}
            />
          )}

          {/* ================= VIEW: SETTINGS ================= */}
          {activeNav === 'Settings' && (
            <SettingsView
              user={me}
              onUpdateUser={(updated) => setMe(updated)}
              onLogout={handleLogout}
              showToast={showToast}
            />
          )}
        </section>

        {/* Right Sidebar (Trends & Suggestions) */}
        {activeNav !== 'Settings' && activeNav !== 'Messages' && activeNav !== 'Profile' && activeNav !== 'Reels' && (
          <aside className="right-sidebar">
            {/* Trending Topics (Live Google Trends & Curated) */}
            <section className="right-section card-surface">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">WHAT’S HAPPENING · LIVE</span>
                  <h3>Trending topics</h3>
                </div>
                <Flame size={16} color="var(--orange)" />
              </div>

              {/* Geo Selector for Trends */}
              <div style={{ display: 'flex', gap: '6px', margin: '6px 0 12px' }}>
                <button
                  type="button"
                  className={`cat-pill ${trendsGeo === 'both' ? 'active' : ''}`}
                  style={{ fontSize: '11px', padding: '3px 10px' }}
                  onClick={() => setTrendsGeo('both')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`cat-pill ${trendsGeo === 'IN' ? 'active' : ''}`}
                  style={{ fontSize: '11px', padding: '3px 10px' }}
                  onClick={() => setTrendsGeo('IN')}
                >
                  India 🇮🇳
                </button>
                <button
                  type="button"
                  className={`cat-pill ${trendsGeo === 'US' ? 'active' : ''}`}
                  style={{ fontSize: '11px', padding: '3px 10px' }}
                  onClick={() => setTrendsGeo('US')}
                >
                  Global 🌍
                </button>
              </div>

              {(liveTrends.length > 0 ? liveTrends : [
                { tag: '#AIRevolution', count: '142.8K searches', topic: 'Technology · Trending' },
                { tag: '#React19', count: '94.2K searches', topic: 'Coding · Trending' },
                { tag: '#SpaceX', count: '124.6K searches', topic: 'Aerospace · Trending' },
                { tag: '#CyberSecurity', count: '67.1K searches', topic: 'Tech & Security' },
                { tag: '#DigitalArt', count: '78.3K searches', topic: 'Design & Art' },
                { tag: '#IndieHacker', count: '53.9K searches', topic: 'Startups' },
              ]).slice(0, 6).map((t) => (
                <button
                  className="trend-row"
                  key={t.tag}
                  onClick={() => handleTrendClick(t)}
                >
                  <div className="trend-info">
                    <small>{t.topic} · Live Search</small>
                    <b>{t.tag}</b>
                    <span>{t.count}</span>
                  </div>
                  <span className="trend-arrow">↗</span>
                </button>
              ))}
            </section>

            {/* Who to Follow */}
            <section className="right-section card-surface">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">GOOD ENERGY</span>
                  <h3>Who to follow</h3>
                </div>
              </div>

              {SUGGESTIONS.map((person) => (
                <div className="suggestion" key={person.handle}>
                  <div className={`avatar avatar-${person.color} avatar-md`}>
                    {person.name[0].toUpperCase()}
                  </div>
                  <div className="suggestion-info">
                    <b>{person.name}</b>
                    <small>@{person.handle}</small>
                    <span>{person.note}</span>
                  </div>
                  <button
                    className={`follow-btn ${followingMap[person.handle] ? 'followed' : ''}`}
                    onClick={() => toggleFollow(person.handle)}
                  >
                    {followingMap[person.handle] ? <Check size={14} /> : 'Follow'}
                  </button>
                </div>
              ))}
            </section>
          </aside>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <button
          className={`mobile-nav-btn ${activeNav === 'Home' ? 'active' : ''}`}
          onClick={() => handleNavClick('Home')}
          aria-label="Home"
        >
          <Home size={22} />
        </button>

        <button
          className={`mobile-nav-btn ${activeNav === 'Explore' ? 'active' : ''}`}
          onClick={() => handleNavClick('Explore')}
          aria-label="Explore"
        >
          <Compass size={22} />
        </button>

        <button
          className={`mobile-nav-btn ${activeNav === 'Reels' ? 'active' : ''}`}
          onClick={() => handleNavClick('Reels')}
          aria-label="Reels"
        >
          <Flame size={22} color={activeNav === 'Reels' ? 'var(--accent)' : 'currentColor'} />
        </button>

        <button
          className="mobile-nav-btn"
          onClick={() => setShowComposeModal(true)}
          aria-label="New Post"
        >
          <Plus size={26} color="var(--accent)" />
        </button>

        <button
          className={`mobile-nav-btn ${activeNav === 'Notifications' ? 'active' : ''}`}
          onClick={() => handleNavClick('Notifications')}
          aria-label="Notifications"
        >
          <Bell size={22} />
          {unreadNotifsCount > 0 && <span className="mobile-nav-badge">{unreadNotifsCount}</span>}
        </button>

        <button
          className={`mobile-nav-btn ${activeNav === 'Messages' ? 'active' : ''}`}
          onClick={() => handleNavClick('Messages')}
          aria-label="Messages"
        >
          <MessageCircle size={22} />
          {unreadMessagesCount > 0 && <span className="mobile-nav-badge">{unreadMessagesCount}</span>}
        </button>
      </nav>

      {/* Quick Compose Modal */}
      {showComposeModal && (
        <ComposeModal
          user={me}
          onClose={() => setShowComposeModal(false)}
          onPostCreated={handleModalPostCreated}
          showToast={showToast}
        />
      )}

      {/* Story Creator Modal */}
      {showStoryCreator && (
        <StoryCreator
          user={me}
          onAddStory={(newStory) => {
            setStoriesList([newStory, ...storiesList]);
            showToast('Story posted successfully! 📸');
          }}
          onClose={() => setShowStoryCreator(false)}
        />
      )}

      {/* Instagram Story Viewer Modal */}
      {viewingStoryIndex !== null && (
        <StoryViewer
          stories={storiesList}
          initialIndex={viewingStoryIndex}
          onClose={() => setViewingStoryIndex(null)}
          onReply={(story, msg) => {
            showToast(`Replied to ${story.author}'s story!`);
          }}
        />
      )}

      {/* Lightbox Media Modal */}
      {activeMediaModal && (
        <MediaModal
          media={activeMediaModal}
          isLiked={likedMap[activeMediaModal.id]}
          onLike={toggleLike}
          onClose={() => setActiveMediaModal(null)}
          showToast={showToast}
        />
      )}

      {/* Followers & Following Modal */}
      {followsModalState && (
        <FollowsModal
          initialTab={followsModalState}
          followers={followers}
          following={followingList}
          followingMap={followingMap}
          onToggleFollow={toggleFollow}
          onClose={() => setFollowsModalState(null)}
        />
      )}

      {/* Toast Notification */}
      {notice && (
        <div className="toast">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss toast">
            <X size={15} />
          </button>
        </div>
      )}
    </main>
  );
}
