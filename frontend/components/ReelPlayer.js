'use client';

import { useRef, useState, useEffect } from 'react';

export default function ReelPlayer({ reel }) {
  const videoRef = useRef(null);
  const [started, setStarted] = useState(false);

  // Reset playback state when reel changes
  useEffect(() => {
    setStarted(false);
  }, [reel?.id, reel?.videoUrl, reel?.embedUrl]);

  const start = () => {
    setStarted(true);
    const v = videoRef.current;
    if (v) {
      v.muted = false;
      v.volume = 1;
      v.play().catch(() => {});
    }
  };

  const iframeSrc = (() => {
    const u = reel?.embedUrl || '';
    if (!u) return '';
    const sep = u.includes('?') ? '&' : '?';
    if (u.includes('youtube.com')) return `${u}${sep}autoplay=1&mute=0&playsinline=1`;
    if (u.includes('/videos/embed/')) return `${u}${sep}autoplay=1&mute=0`; // PeerTube
    return u;
  })();

  if (!reel) return null;

  const isVideo = (reel.playerType === 'video' || (!reel.playerType && reel.videoUrl)) && reel.videoUrl && reel.source !== 'youtube';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', aspectRatio: '9/16', background: '#000', overflow: 'hidden' }}>
      {isVideo ? (
        <video
          ref={videoRef}
          src={reel.videoUrl}
          poster={reel.thumbnailUrl}
          playsInline
          loop
          controls
          preload="metadata"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      ) : started ? (
        <iframe
          src={iframeSrc}
          title={reel.title || 'Reel video'}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          style={{ width: '100%', height: '100%', border: 0 }}
        />
      ) : (
        <img
          src={reel.thumbnailUrl}
          alt={reel.title || ''}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}

      {!started && (
        <button
          type="button"
          onClick={start}
          aria-label="Play Reel"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.25)',
            border: 0,
            color: '#fff',
            fontSize: 48,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3
          }}
        >
          <span style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            paddingLeft: '4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            transition: 'transform 0.15s ease'
          }}>
            ▶
          </span>
        </button>
      )}

      <a
        href={reel.permalink || reel.embedUrl || reel.videoUrl || '#'}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          color: '#fff',
          fontSize: 12,
          background: 'rgba(0, 0, 0, 0.6)',
          padding: '4px 8px',
          borderRadius: '6px',
          textDecoration: 'none',
          backdropFilter: 'blur(4px)',
          zIndex: 4
        }}
      >
        Open original ↗
      </a>
    </div>
  );
}
