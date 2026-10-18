import os
import re
import time
import html
import hashlib
import logging
import asyncio
import urllib.parse
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from typing import List, Dict, Any, Optional, Tuple
import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("connecthub.live_feed")

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ConnectHub/1.0"}

# ----------------------------------------------------------------------------
# Cache: fresh entries are served directly; if every live source fails we serve
# the last good (stale) result. No hard-coded or invented content anywhere.
# ----------------------------------------------------------------------------
_CACHE: Dict[str, Dict[str, Any]] = {}


def get_from_cache(key: str) -> Optional[Any]:
    entry = _CACHE.get(key)
    if entry and entry["expires"] > time.time():
        return entry["data"]
    return None


def get_stale(key: str) -> Optional[Any]:
    entry = _CACHE.get(key)
    return entry["data"] if entry else None


def set_to_cache(key: str, data: Any, ttl: int = 300):
    _CACHE[key] = {"expires": time.time() + ttl, "data": data}


def _env(name: str) -> str:
    return os.getenv(name, "").strip()


def _hid(s: str) -> str:
    """Stable id (Python's built-in hash() changes on every process start)."""
    return hashlib.md5((s or "").encode("utf-8")).hexdigest()[:12]


def _iso(pub_date: str) -> str:
    try:
        return parsedate_to_datetime(pub_date).isoformat()
    except Exception:
        return pub_date or ""


def _strip_html(s: str) -> str:
    s = re.sub(r"<br\s*/?>|</p>", "\n", s or "")
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()


async def _get_json(client: httpx.AsyncClient, url: str, **kw) -> Optional[Any]:
    try:
        r = await client.get(url, **kw)
        if r.status_code == 200:
            return r.json()
        logger.warning("GET %s -> %s", url.split("?")[0], r.status_code)
    except Exception as e:
        logger.warning("GET %s failed: %s", url.split("?")[0], e)
    return None


async def _get_xml(client: httpx.AsyncClient, url: str) -> Optional[ET.Element]:
    try:
        r = await client.get(url, headers=UA)
        if r.status_code == 200:
            return ET.fromstring(r.content)
        logger.warning("GET %s -> %s", url, r.status_code)
    except Exception as e:
        logger.warning("GET %s failed: %s", url, e)
    return None


def _gnews_rss(query: str, hl="en-IN", gl="IN", ceid="IN:en") -> str:
    return f"https://news.google.com/rss/search?q={urllib.parse.quote(query)}&hl={hl}&gl={gl}&ceid={ceid}"


# ============================================================================
# 1. LIVE NEWS
# ============================================================================

async def fetch_live_news(region: str = "both", limit: int = 20) -> List[Dict[str, Any]]:
    cache_key = f"news_{region}_{limit}"
    cached = get_from_cache(cache_key)
    if cached is not None:
        return cached

    articles: List[Dict[str, Any]] = []
    gnews_key = _env("GNEWS_API_KEY")

    async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
        if gnews_key:
            countries = []
            if region in ("both", "in"):
                countries.append("in")
            if region in ("both", "world", "us"):
                countries.append("us")
            for c in countries:
                data = await _get_json(
                    client,
                    f"https://gnews.io/api/v4/top-headlines?category=general&lang=en&country={c}&max=10&apikey={gnews_key}",
                )
                for art in (data or {}).get("articles", []):
                    articles.append({
                        "id": f"gnews-{_hid(art.get('url', ''))}",
                        "title": art.get("title", ""),
                        "description": art.get("description", ""),
                        "url": art.get("url", ""),
                        "image": art.get("image") or "",
                        "publishedAt": art.get("publishedAt", ""),
                        "source": {"name": (art.get("source") or {}).get("name", "News"),
                                   "url": (art.get("source") or {}).get("url", "")},
                        "region": "India" if c == "in" else "Worldwide",
                        "category": "Headlines",
                    })

        feeds: List[Tuple[str, str, str]] = []
        if region in ("both", "in"):
            feeds += [
                ("India", "Headlines", "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en"),
                ("India", "Tollywood", _gnews_rss("Tollywood OR Telugu cinema when:2d")),
                ("India", "Kollywood", _gnews_rss("Kollywood OR Tamil cinema when:2d")),
                ("India", "Cricket", _gnews_rss("Virat Kohli OR India cricket when:2d")),
            ]
        if region in ("both", "world", "us"):
            feeds.append(("Worldwide", "Headlines", "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en"))

        roots = await asyncio.gather(*[_get_xml(client, u) for _, _, u in feeds])
        for (reg, cat, _), root in zip(feeds, roots):
            if root is None:
                continue
            for it in root.findall("./channel/item")[:8]:
                src = it.find("source")
                src_name = src.text if src is not None else "Google News"
                articles.append({
                    "id": f"rss-{_hid(it.findtext('link', ''))}",
                    "title": it.findtext("title", "Breaking News"),
                    "description": f"Latest from {src_name}.",
                    "url": it.findtext("link", ""),
                    "image": "",
                    "publishedAt": it.findtext("pubDate", ""),
                    "source": {"name": src_name, "url": src.attrib.get("url", "") if src is not None else ""},
                    "region": reg,
                    "category": cat,
                })

    seen, unique = set(), []
    for a in articles:
        if a["title"] and a["title"] not in seen:
            seen.add(a["title"])
            unique.append(a)

    if not unique:
        return (get_stale(cache_key) or [])[:limit]
    result = unique[:limit]
    set_to_cache(cache_key, result, ttl=300)
    return result


# ============================================================================
# 2. LIVE GOOGLE TRENDS
# ============================================================================

async def fetch_live_trends(geo: str = "both") -> List[Dict[str, Any]]:
    cache_key = f"trends_{geo}"
    cached = get_from_cache(cache_key)
    if cached is not None:
        return cached

    geos = []
    if geo.upper() in ("BOTH", "IN"):
        geos.append(("IN", "India"))
    if geo.upper() in ("BOTH", "US", "WORLD"):
        geos.append(("US", "Worldwide"))

    ns = "{https://trends.google.com/trending/rss}"
    trends: List[Dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
        roots = await asyncio.gather(*[
            _get_xml(client, f"https://trends.google.com/trending/rss?geo={c}") for c, _ in geos
        ])
        for (_, label), root in zip(geos, roots):
            if root is None:
                continue
            for it in root.findall("./channel/item")[:8]:
                title = it.findtext("title", "")
                if not title:
                    continue
                approx = it.findtext(f"{ns}approx_traffic", "") or ""
                news_item = it.find(f"{ns}news_item")
                headline = news_item.findtext(f"{ns}news_item_title", "") if news_item is not None else ""
                tag = "#" + "".join(w.capitalize() for w in re.findall(r"\w+", title))[:24]
                trends.append({
                    "tag": tag,
                    "query": title,
                    "count": f"{approx} searches" if approx else "Trending now",
                    "topic": f"{label} · Trending",
                    "headline": _strip_html(headline),
                    "geo": label,
                    "publishedAt": it.findtext("pubDate", ""),
                })

    if not trends:
        return get_stale(cache_key) or []
    set_to_cache(cache_key, trends, ttl=600)
    return trends


# ============================================================================
# 3. PEOPLE REGISTRY  (handles + labels only, no invented content)
# ============================================================================
# Verify handles; people change them. Edit freely.
VIP_REGISTRY: Dict[str, List[Dict[str, str]]] = {
    "sports": [
        {"handle": "imVkohli", "name": "Virat Kohli", "badge": "🏏 Indian Cricket Icon"},
        {"handle": "ImRo45", "name": "Rohit Sharma", "badge": "🏏 Indian Captain & Opener"},
        {"handle": "msdhoni", "name": "MS Dhoni", "badge": "🏏 Legend · Former Captain"},
        {"handle": "sachin_rt", "name": "Sachin Tendulkar", "badge": "🏏 Master Blaster"},
        {"handle": "hardikpandya7", "name": "Hardik Pandya", "badge": "🏏 All-Rounder · Team India"},
        {"handle": "Jaspritbumrah93", "name": "Jasprit Bumrah", "badge": "🏏 Fast Bowler"},
        {"handle": "klrahul", "name": "KL Rahul", "badge": "🏏 Indian Batter & Keeper"},
        {"handle": "Neeraj_chopra1", "name": "Neeraj Chopra", "badge": "🥇 Olympic Javelin Champion"},
        {"handle": "Cristiano", "name": "Cristiano Ronaldo", "badge": "⚽ Global Football Icon"},
        {"handle": "leomessi", "name": "Lionel Messi", "badge": "⚽ World Cup Champion"},
    ],
    "actors": [
        {"handle": "iamsrk", "name": "Shah Rukh Khan", "badge": "🎬 King of Bollywood"},
        {"handle": "alluarjun", "name": "Allu Arjun", "badge": "🎬 Icon Star · Tollywood"},
        {"handle": "urstrulyMahesh", "name": "Mahesh Babu", "badge": "🎬 Superstar · Tollywood"},
        {"handle": "tarak9999", "name": "Jr NTR", "badge": "🎬 Man of Masses · Tollywood"},
        {"handle": "AlwaysRamCharan", "name": "Ram Charan", "badge": "🎬 Global Star · Tollywood"},
        {"handle": "actorprabhas", "name": "Prabhas", "badge": "🎬 Rebel Star · Tollywood"},
        {"handle": "actorvijay", "name": "Thalapathy Vijay", "badge": "🎬 Thalapathy · Kollywood"},
        {"handle": "Suriya_offl", "name": "Suriya", "badge": "🎬 National Award Winner · Kollywood"},
        {"handle": "rajinikanth", "name": "Rajinikanth", "badge": "👑 Thalaivar · Kollywood"},
        {"handle": "dhanushkraja", "name": "Dhanush", "badge": "🎬 Actor · Kollywood"},
        {"handle": "deepikapadukone", "name": "Deepika Padukone", "badge": "🎬 Global Actor & Producer"},
        {"handle": "SrBachchan", "name": "Amitabh Bachchan", "badge": "🎬 Megastar"},
        {"handle": "BeingSalmanKhan", "name": "Salman Khan", "badge": "🎬 Megastar · Bollywood"},
    ],
    "politicians": [
        {"handle": "narendramodi", "name": "Narendra Modi", "badge": "🏛️ Prime Minister of India"},
        {"handle": "RahulGandhi", "name": "Rahul Gandhi", "badge": "🏛️ Leader of Opposition · MP"},
        {"handle": "AmitShah", "name": "Amit Shah", "badge": "🏛️ Union Home Minister"},
        {"handle": "myogiadityanath", "name": "Yogi Adityanath", "badge": "🏛️ Chief Minister of UP"},
        {"handle": "ShashiTharoor", "name": "Shashi Tharoor", "badge": "🏛️ Member of Parliament"},
        {"handle": "ArvindKejriwal", "name": "Arvind Kejriwal", "badge": "🏛️ AAP National Convener"},
        {"handle": "BarackObama", "name": "Barack Obama", "badge": "🏛️ 44th U.S. President"},
        {"handle": "RishiSunak", "name": "Rishi Sunak", "badge": "🏛️ Former UK Prime Minister"},
    ],
    "entrepreneurs": [
        {"handle": "elonmusk", "name": "Elon Musk", "badge": "⚡ Tesla · SpaceX · xAI"},
        {"handle": "sundarpichai", "name": "Sundar Pichai", "badge": "⚡ CEO, Alphabet & Google"},
        {"handle": "satyanadella", "name": "Satya Nadella", "badge": "⚡ CEO, Microsoft"},
        {"handle": "sama", "name": "Sam Altman", "badge": "⚡ CEO, OpenAI"},
        {"handle": "BillGates", "name": "Bill Gates", "badge": "⚡ Gates Foundation"},
        {"handle": "tim_cook", "name": "Tim Cook", "badge": "⚡ CEO, Apple"},
        {"handle": "anandmahindra", "name": "Anand Mahindra", "badge": "⚡ Chairman, Mahindra Group"},
        {"handle": "gautam_adani", "name": "Gautam Adani", "badge": "⚡ Chairman, Adani Group"},
    ],
}

BSKY_ACCOUNTS: Dict[str, List[Tuple[str, str]]] = {
    "actors": [("realgdt.bsky.social", "🎬 Filmmaker"), ("georgetakei.bsky.social", "🎬 Actor")],
    "politicians": [("gavinnewsom.bsky.social", "🏛️ California Governor"), ("aoc.bsky.social", "🏛️ U.S. Representative")],
    "entrepreneurs": [("techcrunch.com", "⚡ TechCrunch"), ("wired.com", "⚡ WIRED")],
    "sports": [("espn.com", "🏏 ESPN")],
}

MASTODON_TAGS: Dict[str, List[str]] = {
    "actors": ["tollywood", "kollywood", "cinema"],
    "politicians": ["india", "politics"],
    "entrepreneurs": ["technology", "ai", "startups"],
    "sports": ["cricket", "football"],
}
MASTODON_INSTANCE = os.getenv("MASTODON_INSTANCE", "https://mastodon.social")


def _categories(category: str) -> List[str]:
    c = (category or "all").lower().strip()
    if c in ("sports", "cricketers", "cricket"):
        return ["sports"]
    if c in ("actors", "cinema", "movies", "bollywood", "tollywood"):
        return ["actors"]
    if c in ("politicians", "politics", "leaders"):
        return ["politicians"]
    if c in ("entrepreneurs", "tech", "business", "startups"):
        return ["entrepreneurs"]
    return ["sports", "actors", "politicians", "entrepreneurs"]


def _avatar(handle: str) -> str:
    return f"https://unavatar.io/x/{handle}"


# ----------------------------------------------------------------------------
# Source A: official X API (real tweets, only if X_BEARER_TOKEN is set)
# ----------------------------------------------------------------------------
async def _fetch_x(client: httpx.AsyncClient, cats: List[str], per_user: int) -> List[Dict[str, Any]]:
    token = _env("X_BEARER_TOKEN")
    if not token:
        return []
    auth = {"Authorization": f"Bearer {token}"}
    wanted = [(cat, v) for cat in cats for v in VIP_REGISTRY.get(cat, [])]
    if not wanted:
        return []

    users = await _get_json(
        client, "https://api.x.com/2/users/by",
        params={"usernames": ",".join(v["handle"] for _, v in wanted[:100]),
                "user.fields": "profile_image_url,name,verified"},
        headers=auth,
    )
    by_name = {u["username"].lower(): u for u in (users or {}).get("data", [])}

    async def one(cat: str, vip: Dict[str, str]) -> List[Dict[str, Any]]:
        u = by_name.get(vip["handle"].lower())
        if not u:
            return []
        data = await _get_json(
            client, f"https://api.x.com/2/users/{u['id']}/tweets",
            params={"max_results": max(5, per_user), "exclude": "retweets,replies",
                    "tweet.fields": "created_at,public_metrics",
                    "expansions": "attachments.media_keys",
                    "media.fields": "url,preview_image_url,type"},
            headers=auth,
        )
        if not data:
            return []
        media = {m["media_key"]: m for m in data.get("includes", {}).get("media", [])}
        out = []
        for t in data.get("data", [])[:per_user]:
            img = None
            for k in (t.get("attachments") or {}).get("media_keys", []):
                m = media.get(k, {})
                img = m.get("url") or m.get("preview_image_url")
                if img:
                    break
            text = t.get("text", "")
            pm = t.get("public_metrics", {})
            out.append({
                "id": f"x-{t['id']}",
                "author": u.get("name", vip["name"]), "username": u["username"],
                "display_name": u.get("name", vip["name"]),
                "avatar": (u.get("profile_image_url") or _avatar(vip["handle"])).replace("_normal", "_400x400"),
                "role_badge": vip["badge"], "content": text, "image": img,
                "created_at": t.get("created_at", ""),
                "likes_count": pm.get("like_count", 0),
                "comments_count": pm.get("reply_count", 0),
                "reposts_count": pm.get("retweet_count", 0),
                "tags": [w for w in text.split() if w.startswith("#") and len(w) > 1][:4],
                "source": "x", "category": cat,
                "url": f"https://x.com/{u['username']}/status/{t['id']}",
            })
        return out

    results = await asyncio.gather(*[one(c, v) for c, v in wanted], return_exceptions=True)
    return [p for r in results if isinstance(r, list) for p in r]


# ----------------------------------------------------------------------------
# Source B: latest real news about each person (clearly labelled as news)
# ----------------------------------------------------------------------------
def _clean_headline(title: str) -> str:
    clean = re.sub(r"\s+-\s+[^-]+$", "", title or "").strip()
    return re.sub(r"^\[.*?\]\s*", "", clean)


async def _fetch_vip_news(client: httpx.AsyncClient, vip: Dict[str, str], cat: str, n: int) -> List[Dict[str, Any]]:
    root = await _get_xml(client, _gnews_rss(f'"{vip["name"]}" when:3d'))
    if root is None:
        return []
    out = []
    for it in root.findall("./channel/item")[:n]:
        title = it.findtext("title", "")
        link = it.findtext("link", "")
        src = it.findtext("source", "News")
        content = _clean_headline(title)
        if not content:
            continue
        out.append({
            "id": f"news-{vip['handle']}-{_hid(link or content)}",
            "author": vip["name"], "username": vip["handle"], "display_name": vip["name"],
            "avatar": _avatar(vip["handle"]), "role_badge": vip["badge"],
            "content": content, "image": None,
            "created_at": _iso(it.findtext("pubDate", "")),
            "likes_count": 0, "comments_count": 0, "reposts_count": 0,   # no real metrics for news
            "tags": [f"#{vip['name'].replace(' ', '')}", f"#{src.replace(' ', '')}"],
            "source": "news", "newsSource": src, "category": cat,
            "url": link,   # the real article, not a fake tweet link
        })
    return out


# ----------------------------------------------------------------------------
# Source C/D: Bluesky + Mastodon (real posts, real counts)
# ----------------------------------------------------------------------------
async def _fetch_bluesky(client: httpx.AsyncClient, cats: List[str], per_user: int) -> List[Dict[str, Any]]:
    wanted = [(cat, h, b) for cat in cats for h, b in BSKY_ACCOUNTS.get(cat, [])]

    async def one(cat, handle, badge):
        data = await _get_json(
            client, "https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed",
            params={"actor": handle, "limit": per_user, "filter": "posts_no_replies"}, headers=UA)
        out = []
        for item in (data or {}).get("feed", []):
            post = item.get("post", {})
            if item.get("reason"):
                continue
            a, rec = post.get("author", {}), post.get("record", {})
            text = rec.get("text", "")
            imgs = (post.get("embed") or {}).get("images") or []
            out.append({
                "id": f"bsky-{post.get('cid')}",
                "author": a.get("displayName") or a.get("handle", ""), "username": a.get("handle", ""),
                "display_name": a.get("displayName") or a.get("handle", ""),
                "avatar": a.get("avatar") or "", "role_badge": badge, "content": text,
                "image": (imgs[0].get("fullsize") or imgs[0].get("thumb")) if imgs else None,
                "created_at": rec.get("createdAt", ""),
                "likes_count": post.get("likeCount", 0), "comments_count": post.get("replyCount", 0),
                "reposts_count": post.get("repostCount", 0),
                "tags": [w for w in text.split() if w.startswith("#") and len(w) > 1][:4],
                "source": "bluesky", "category": cat,
                "url": f"https://bsky.app/profile/{a.get('handle')}/post/{post.get('uri', '').split('/')[-1]}",
            })
        return out

    results = await asyncio.gather(*[one(*w) for w in wanted], return_exceptions=True)
    return [p for r in results if isinstance(r, list) for p in r]


def _mastodon_post(s: Dict[str, Any], tag: str, cat: str, badge: str) -> Optional[Dict[str, Any]]:
    if s.get("reblog") or s.get("sensitive"):
        return None
    acc = s.get("account", {})
    text = _strip_html(s.get("content", ""))
    if not text:
        return None
    media = [m for m in s.get("media_attachments", []) if m.get("type") == "image"]
    return {
        "id": f"masto-{s['id']}",
        "author": acc.get("display_name") or acc.get("username", ""),
        "username": acc.get("acct", ""),
        "display_name": acc.get("display_name") or acc.get("username", ""),
        "avatar": acc.get("avatar", ""), "role_badge": badge, "content": text,
        "image": (media[0].get("url") or media[0].get("preview_url")) if media else None,
        "created_at": s.get("created_at", ""),
        "likes_count": s.get("favourites_count", 0), "comments_count": s.get("replies_count", 0),
        "reposts_count": s.get("reblogs_count", 0),
        "tags": [f"#{t['name']}" for t in s.get("tags", [])][:4] or [f"#{tag}"],
        "source": "mastodon", "category": cat, "url": s.get("url", ""),
    }


async def _fetch_mastodon(client: httpx.AsyncClient, cats: List[str], per_tag: int) -> List[Dict[str, Any]]:
    wanted = [(cat, t) for cat in cats for t in MASTODON_TAGS.get(cat, [])]

    async def one(cat, tag):
        data = await _get_json(client, f"{MASTODON_INSTANCE}/api/v1/timelines/tag/{tag}",
                               params={"limit": per_tag}, headers=UA)
        posts = [_mastodon_post(s, tag, cat, f"#{tag}") for s in (data or [])]
        return [p for p in posts if p]

    results = await asyncio.gather(*[one(*w) for w in wanted], return_exceptions=True)
    return [p for r in results if isinstance(r, list) for p in r]


# ----------------------------------------------------------------------------
# Topic search (for trending tags): real Mastodon + real Google News only
# ----------------------------------------------------------------------------
async def fetch_live_topic_posts(query: str, limit: int = 15) -> List[Dict[str, Any]]:
    clean_q = (query or "").strip().replace("#", "")
    if not clean_q:
        return []
    cache_key = f"topic_{clean_q.lower()}_{limit}"
    cached = get_from_cache(cache_key)
    if cached is not None:
        return cached

    clean_tag = "".join(re.findall(r"\w+", clean_q)).lower()
    out: List[Dict[str, Any]] = []

    async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
        root, masto = await asyncio.gather(
            _get_xml(client, _gnews_rss(clean_q)),
            _get_json(client, f"{MASTODON_INSTANCE}/api/v1/timelines/tag/{clean_tag}",
                      params={"limit": 8}, headers=UA),
            return_exceptions=True,
        )

        if isinstance(masto, list):
            for s in masto[:6]:
                p = _mastodon_post(s, clean_tag, "topic", f"🔥 #{clean_tag}")
                if p:
                    out.append(p)

        if root is not None and not isinstance(root, Exception):
            for it in root.findall("./channel/item")[:8]:
                title = it.findtext("title", "")
                if not title:
                    continue
                link = it.findtext("link", "")
                src = it.findtext("source", "News")
                out.append({
                    "id": f"topic-gn-{_hid(link or title)}",
                    "author": src, "username": src.replace(" ", "").lower()[:15], "display_name": src,
                    "avatar": "", "role_badge": f"🔥 #{clean_tag}",
                    "content": _clean_headline(title), "image": None,
                    "created_at": _iso(it.findtext("pubDate", "")),
                    "likes_count": 0, "comments_count": 0, "reposts_count": 0,
                    "tags": [f"#{clean_tag}"], "source": "news", "newsSource": src, "url": link,
                })

    if not out:
        return get_stale(cache_key) or []   # empty list rather than invented posts
    out.sort(key=lambda p: p.get("created_at", ""), reverse=True)
    result = out[:limit]
    set_to_cache(cache_key, result, ttl=180)
    return result


# ----------------------------------------------------------------------------
# Main social feed
# ----------------------------------------------------------------------------
async def fetch_live_social(category: str = "all", limit: int = 40) -> List[Dict[str, Any]]:
    cache_key = f"vip_social_{category}_{limit}"
    cached = get_from_cache(cache_key)
    if cached is not None:
        return cached

    cats = _categories(category)
    multi = len(cats) > 1

    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        x_posts = await _fetch_x(client, cats, 2 if multi else 4)   # [] unless X_BEARER_TOKEN is set
        have_x = {p["username"].lower() for p in x_posts}

        vips = [(c, v) for c in cats for v in VIP_REGISTRY.get(c, []) if v["handle"].lower() not in have_x]
        news_lists, bsky_posts, masto_posts = await asyncio.gather(
            asyncio.gather(*[_fetch_vip_news(client, v, c, 2 if multi else 4) for c, v in vips],
                           return_exceptions=True),
            _fetch_bluesky(client, cats, 2 if multi else 4),
            _fetch_mastodon(client, cats, 4 if multi else 6),
        )

    news_posts = [p for r in news_lists if isinstance(r, list) for p in r]
    posts = x_posts + news_posts + bsky_posts + masto_posts

    seen, unique = set(), []
    for p in posts:
        if p["id"] not in seen and p.get("content"):
            seen.add(p["id"])
            unique.append(p)

    # newest first inside each category, then interleave categories for a balanced feed
    by_cat: Dict[str, List[Dict[str, Any]]] = {}
    for p in sorted(unique, key=lambda p: p.get("created_at", ""), reverse=True):
        by_cat.setdefault(p.get("category", "sports"), []).append(p)

    interleaved: List[Dict[str, Any]] = []
    for idx in range(max([len(v) for v in by_cat.values()] or [0])):
        for c in cats:
            if idx < len(by_cat.get(c, [])):
                interleaved.append(by_cat[c][idx])

    if not interleaved:
        return (get_stale(cache_key) or [])[:limit]
    result = interleaved[:limit]
    set_to_cache(cache_key, result, ttl=180)
    return result


# ============================================================================
# 4. LIVE REELS / SHORTS  (Instagram Graph API + YouTube Shorts + PeerTube)
# ============================================================================
IG_DISCOVERY_USERNAMES = [u for u in os.getenv("IG_DISCOVERY_USERNAMES", "virat.kohli,alluarjunonline,urstrulymahesh").split(",") if u]

YT_QUERIES = ["Telugu movie shorts", "Tamil movie shorts", "Virat Kohli shorts", "trending India shorts"]


async def _fetch_instagram(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    token, ig_id = _env("INSTAGRAM_ACCESS_TOKEN"), _env("INSTAGRAM_USER_ID")
    if not token:
        return []
    reels: List[Dict[str, Any]] = []
    fields = "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count"

    data = await _get_json(client, "https://graph.instagram.com/me/media",
                           params={"fields": fields, "access_token": token})
    for it in (data or {}).get("data", []):
        if it.get("media_type") == "VIDEO":
            reels.append({
                "id": f"ig-{it['id']}", "title": (it.get("caption") or "Instagram Reel")[:90],
                "videoUrl": it.get("media_url"), "embedUrl": it.get("permalink"),
                "thumbnailUrl": it.get("thumbnail_url") or "", "author": "You", "username": "me",
                "likes": it.get("like_count", 0), "views": 0, "source": "instagram",
                "permalink": it.get("permalink"), "publishedAt": it.get("timestamp", ""),
            })

    if ig_id:
        async def one(username: str):
            d = await _get_json(
                client, f"https://graph.facebook.com/v21.0/{ig_id}",
                params={"fields": f"business_discovery.username({username}){{username,name,media.limit(8){{{fields}}}}}",
                        "access_token": token})
            bd = (d or {}).get("business_discovery") or {}
            out = []
            for it in (bd.get("media") or {}).get("data", []):
                if it.get("media_type") == "VIDEO":
                    out.append({
                        "id": f"ig-{it['id']}", "title": (it.get("caption") or "Instagram Reel")[:90],
                        "videoUrl": it.get("media_url"), "embedUrl": it.get("permalink"),
                        "thumbnailUrl": it.get("thumbnail_url") or "",
                        "author": bd.get("name") or username, "username": bd.get("username", username),
                        "likes": it.get("like_count", 0), "views": 0, "source": "instagram",
                        "permalink": it.get("permalink"), "publishedAt": it.get("timestamp", ""),
                    })
            return out
        res = await asyncio.gather(*[one(u) for u in IG_DISCOVERY_USERNAMES], return_exceptions=True)
        reels += [r for lst in res if isinstance(lst, list) for r in lst]
    return reels


async def _fetch_youtube_shorts(client: httpx.AsyncClient, per_query: int = 6) -> List[Dict[str, Any]]:
    key = _env("YOUTUBE_API_KEY")
    if not key:
        return []

    async def one(q: str):
        s = await _get_json(client, "https://www.googleapis.com/youtube/v3/search", params={
            "part": "snippet", "q": f"{q} #shorts", "type": "video", "videoDuration": "short",
            "order": "date", "maxResults": per_query, "regionCode": "IN",
            "relevanceLanguage": "en", "key": key})
        ids = [i["id"]["videoId"] for i in (s or {}).get("items", [])]
        if not ids:
            return []
        v = await _get_json(client, "https://www.googleapis.com/youtube/v3/videos", params={
            "part": "snippet,statistics,contentDetails", "id": ",".join(ids), "key": key})
        out = []
        for it in (v or {}).get("items", []):
            sn, st = it["snippet"], it.get("statistics", {})
            th = sn.get("thumbnails", {})
            thumb = (th.get("high") or th.get("medium") or th.get("default") or {}).get("url", "")
            out.append({
                "id": f"yt-{it['id']}", "title": sn.get("title", "")[:90],
                "videoUrl": "", "embedUrl": f"https://www.youtube.com/embed/{it['id']}?playsinline=1&loop=1",
                "thumbnailUrl": thumb, "author": sn.get("channelTitle", ""),
                "username": sn.get("channelTitle", ""),
                "likes": int(st.get("likeCount", 0)), "views": int(st.get("viewCount", 0)),
                "source": "youtube", "publishedAt": sn.get("publishedAt", ""),
                "permalink": f"https://www.youtube.com/shorts/{it['id']}",
            })
        return out

    res = await asyncio.gather(*[one(q) for q in YT_QUERIES], return_exceptions=True)
    return [r for lst in res if isinstance(lst, list) for r in lst]


async def _fetch_single_peertube_detail(client: httpx.AsyncClient, instance: str, meta: Dict[str, Any]) -> Dict[str, Any]:
    uuid = meta.get("uuid", "")
    account = meta.get("account", {})
    thumb_path = meta.get("thumbnailPath", "")
    video_url = ""
    det = await _get_json(client, f"{instance}/api/v1/videos/{uuid}", timeout=5.0)
    if det:
        files = [f for p in det.get("streamingPlaylists", []) for f in p.get("files", [])] + det.get("files", [])
        for f in files:
            u = f.get("fileUrl", "")
            if u.endswith(".mp4"):
                video_url = u
                break
    return {
        "id": f"pt-{meta.get('id', uuid)}", "title": meta.get("name", "Trending Video"),
        "videoUrl": video_url, "embedUrl": f"{instance}/videos/embed/{uuid}",
        "thumbnailUrl": f"{instance}{thumb_path}" if thumb_path.startswith("/") else thumb_path,
        "author": account.get("displayName") or account.get("name") or "Video Creator",
        "username": account.get("name", "creator"),
        "likes": meta.get("likes", 0), "views": meta.get("views", 0),
        "duration": meta.get("duration", 0), "source": "peertube", "instance": instance,
        "publishedAt": meta.get("publishedAt", ""),
    }


async def _fetch_peertube(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    inst = "https://peertube.tv"
    data = await _get_json(client, f"{inst}/api/v1/videos",
                           params={"count": 12, "sort": "-trending", "isLive": "false"}, headers=UA)
    raw = (data or {}).get("data", [])[:12]
    res = await asyncio.gather(*[_fetch_single_peertube_detail(client, inst, v) for v in raw],
                               return_exceptions=True)
    return [r for r in res if isinstance(r, dict)]


def _finalize_reel(r: Dict[str, Any]) -> Dict[str, Any]:
    embed = r.get("embedUrl") or ""
    if r.get("source") == "instagram" and r.get("permalink"):
        embed = r["permalink"].rstrip("/") + "/embed"
    r["embedUrl"] = embed
    r["playerType"] = "video" if r.get("videoUrl") and r.get("source") != "youtube" else "iframe"
    return r


async def fetch_live_reels(limit: int = 15) -> List[Dict[str, Any]]:
    cache_key = f"reels_{limit}"
    cached = get_from_cache(cache_key)
    if cached is not None:
        return cached

    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        ig, yt, pt = await asyncio.gather(
            _fetch_instagram(client), _fetch_youtube_shorts(client), _fetch_peertube(client))

    pools = [sorted(p, key=lambda r: r.get("publishedAt", ""), reverse=True) for p in (ig, yt, pt)]
    reels: List[Dict[str, Any]] = []
    while any(pools) and len(reels) < limit:
        for p in pools:
            if p:
                reels.append(p.pop(0))

    if not reels:
        return [_finalize_reel(r) for r in (get_stale(cache_key) or [])[:limit]]
    result = [_finalize_reel(r) for r in reels[:limit]]
    set_to_cache(cache_key, result, ttl=300)
    return result
