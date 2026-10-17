'use client';

import { useState, useEffect } from 'react';
import { Newspaper, Globe, RefreshCw, ExternalLink, Share2, Search, ArrowUpRight, Sparkles } from 'lucide-react';
import { fetchLiveNews } from '../lib/api';

const FALLBACK_NEWS = [
  {
    id: 'news-fb-1',
    title: 'India launches new digital public infrastructure initiatives for cross-border payments',
    description: 'UPI and real-time payment frameworks expand to additional global corridors, enabling instantaneous cross-border settlement for international merchants.',
    url: 'https://news.google.com',
    image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=800&q=80',
    publishedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    source: { name: 'The Hindu', url: 'https://thehindu.com' },
    region: 'India',
    category: 'Economy & Tech'
  },
  {
    id: 'news-fb-2',
    title: 'Frontier AI labs publish breakthroughs in browser-native multimodal reasoning runtimes',
    description: 'New model weights compiled directly to WebGPU allow laptops and smartphones to run 7B-parameter multimodal agents with sub-20ms first-token latency.',
    url: 'https://news.google.com',
    image: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=800&q=80',
    publishedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    source: { name: 'TechCrunch', url: 'https://techcrunch.com' },
    region: 'Worldwide',
    category: 'Technology'
  },
  {
    id: 'news-fb-3',
    title: 'ISRO and international space partners announce joint deep space exploration roadmap',
    description: 'Collaborative mission architecture outlines next-generation lunar polar orbital tracking and solar observation telescope arrays.',
    url: 'https://news.google.com',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    publishedAt: new Date(Date.now() - 1000 * 60 * 160).toISOString(),
    source: { name: 'Times of India', url: 'https://timesofindia.indiatimes.com' },
    region: 'India',
    category: 'Science'
  },
  {
    id: 'news-fb-4',
    title: 'Global markets react to new trade agreements and clean energy infrastructure investments',
    description: 'Renewable power grids and semiconductor manufacturing plants receive green financing commitments across Europe and North America.',
    url: 'https://news.google.com',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    publishedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    source: { name: 'Reuters', url: 'https://reuters.com' },
    region: 'Worldwide',
    category: 'World'
  }
];

export default function LiveNewsView({ onShareToFeed, showToast }) {
  const [regionFilter, setRegionFilter] = useState('both'); // 'both' | 'in' | 'world'
  const [news, setNews] = useState(FALLBACK_NEWS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const loadNews = async (reg = regionFilter) => {
    setLoading(true);
    try {
      const data = await fetchLiveNews(reg);
      if (Array.isArray(data) && data.length > 0) {
        setNews(data);
      }
    } catch (e) {
      console.log('Using fallback news:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews(regionFilter);
  }, [regionFilter]);

  const filteredNews = news.filter((item) => {
    if (regionFilter === 'in' && item.region !== 'India') return false;
    if (regionFilter === 'world' && item.region !== 'Worldwide') return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (item.title || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q) ||
      (item.source?.name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="live-news-view">
      {/* Top Header */}
      <div className="feed-heading">
        <div>
          <div className="eyebrow">REAL-TIME DISPATCHES</div>
          <h1>Live News</h1>
          <p>Verified headlines from India and Worldwide via GNews & official RSS feeds.</p>
        </div>
        <button
          type="button"
          className="primary-btn icon-label-btn"
          onClick={async () => {
            await loadNews(regionFilter);
            showToast?.('Refreshed latest live headlines!');
          }}
          disabled={loading}
          title="Refresh latest live news"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12.5px',
            fontWeight: 600,
            padding: '7px 16px',
            borderRadius: '20px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          <span>{loading ? 'Refreshing…' : 'Refresh News'}</span>
        </button>
      </div>

      {/* Region Filter & Search Bar */}
      <div className="news-control-bar">
        <div className="feed-tabs" style={{ margin: 0 }}>
          <button
            className={regionFilter === 'both' ? 'tab-active' : ''}
            onClick={() => setRegionFilter('both')}
          >
            All News
          </button>
          <button
            className={regionFilter === 'in' ? 'tab-active' : ''}
            onClick={() => setRegionFilter('in')}
          >
            India 🇮🇳
          </button>
          <button
            className={regionFilter === 'world' ? 'tab-active' : ''}
            onClick={() => setRegionFilter('world')}
          >
            Worldwide 🌍
          </button>
        </div>

        <div className="explore-search-bar" style={{ maxWidth: '280px', height: '38px' }}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search headlines…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* News Grid / Stream */}
      <div className="news-grid">
        {filteredNews.map((article) => (
          <article className="news-card card-surface" key={article.id}>
            {article.image && (
              <div className="news-card-image-wrap">
                <img src={article.image} alt={article.title} className="news-card-img" />
                <span className={`news-region-badge ${article.region === 'India' ? 'badge-india' : 'badge-world'}`}>
                  {article.region === 'India' ? '🇮🇳 India' : '🌍 World'}
                </span>
              </div>
            )}

            <div className="news-card-body">
              <div className="news-meta-row">
                <span className="news-source-pill">{article.source?.name || 'Live Source'}</span>
                <span className="news-date-text">
                  {article.publishedAt ? new Date(article.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                </span>
              </div>

              <h3 className="news-title">{article.title}</h3>
              <p className="news-desc">{article.description}</p>

              <div className="news-actions-row">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="news-read-link"
                >
                  Read full story <ArrowUpRight size={14} />
                </a>

                {onShareToFeed && (
                  <button
                    type="button"
                    className="text-btn icon-label-btn"
                    onClick={() => {
                      onShareToFeed(`Breaking News: "${article.title}" — ${article.url}`);
                      showToast?.('Added news headline to composer! ✍️');
                    }}
                    title="Share to your feed"
                  >
                    <Share2 size={13} />
                    <span>Share to Feed</span>
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {filteredNews.length === 0 && !loading && (
        <div className="empty-state card-surface" style={{ marginTop: '24px' }}>
          <Newspaper size={32} className="muted-icon" />
          <h3>No news found</h3>
          <p>Try switching regions or checking your search query.</p>
        </div>
      )}
    </div>
  );
}
