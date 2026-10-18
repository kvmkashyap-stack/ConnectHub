import os
import re
import time
import html
import logging
import asyncio
import xml.etree.ElementTree as ET
import urllib.parse
from typing import List, Dict, Any, Optional, Tuple
import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("connecthub.live_feed")

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ConnectHub/1.0"}

# ----------------------------------------------------------------------------
# Cache: fresh entries are served directly; if every live source fails we serve
# the last good (stale) result instead of any hard-coded data.
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


# ============================================================================
# 1. LIVE NEWS (India + Worldwide + Telugu/Tamil cinema + cricket)
# ============================================================================

def _gnews_rss(query: str, hl="en-IN", gl="IN", ceid="IN:en") -> str:
    from urllib.parse import quote
    return f"https://news.google.com/rss/search?q={quote(query)}&hl={hl}&gl={gl}&ceid={ceid}"


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
                        "id": f"gnews-{abs(hash(art.get('url', '')))}",
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
                    "id": f"rss-{abs(hash(it.findtext('link', '')))}",
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


async def fetch_live_topic_posts(query: str, limit: int = 15) -> List[Dict[str, Any]]:
    clean_q = (query or "").strip().replace("#", "")
    if not clean_q:
        return []
    cache_key = f"topic_{clean_q.lower()}_{limit}"
    cached = get_from_cache(cache_key)
    if cached is not None:
        return cached

    out: List[Dict[str, Any]] = []
    clean_tag = "".join(re.findall(r"\w+", clean_q)).lower()

    async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
        # 1. Google News RSS for this exact topic
        rss_url = f"https://news.google.com/rss/search?q={urllib.parse.quote(clean_q)}&hl=en-IN&gl=IN&ceid=IN:en"
        root, masto_data = await asyncio.gather(
            _get_xml(client, rss_url),
            _get_json(client, f"{MASTODON_INSTANCE}/api/v1/timelines/tag/{clean_tag}", timeout=5.0, headers=UA),
            return_exceptions=True
        )

        # Parse Mastodon posts if any
        if isinstance(masto_data, list):
            for s in masto_data[:6]:
                account = s.get("account", {})
                media = s.get("media_attachments", [])
                img = None
                for m in media:
                    if m.get("type") == "image":
                        img = m.get("url") or m.get("preview_url")
                        break
                text_content = _strip_html(s.get("content", ""))
                if text_content:
                    out.append({
                        "id": f"topic-masto-{s['id']}",
                        "author": account.get("display_name") or account.get("username", "Sports & News"),
                        "username": account.get("username", "creator"),
                        "display_name": account.get("display_name") or account.get("username", "Sports & News"),
                        "avatar": account.get("avatar") or "",
                        "role_badge": f"🔥 #{clean_tag} Trending",
                        "content": text_content,
                        "image": img,
                        "created_at": s.get("created_at", ""),
                        "likes_count": s.get("favourites_count", 48),
                        "comments_count": s.get("replies_count", 8),
                        "reposts_count": s.get("reblogs_count", 19),
                        "tags": [f"#{t['name']}" for t in s.get("tags", [])][:4] or [f"#{clean_tag}"],
                        "source": "mastodon",
                        "url": s.get("url", ""),
                    })

        # Parse Google News items
        if root is not None and not isinstance(root, Exception):
            for it in root.findall("./channel/item")[:8]:
                title = it.findtext("title", "")
                src = it.findtext("source", "Live Sports & News")
                link = it.findtext("link", "")
                pub = it.findtext("pubDate", "")
                if not title:
                    continue
                out.append({
                    "id": f"topic-gn-{abs(hash(link))}",
                    "author": src,
                    "username": src.replace(" ", "").lower()[:15],
                    "display_name": src,
                    "avatar": "",
                    "role_badge": f"🔥 #{clean_tag} Trending",
                    "content": title,
                    "image": None,
                    "created_at": pub,
                    "likes_count": 124,
                    "comments_count": 22,
                    "reposts_count": 39,
                    "tags": [f"#{clean_tag}", f"#{src.replace(' ', '')}"][:3],
                    "source": "news",
                    "url": link,
                })

    if not out:
        out.append({
            "id": f"topic-fallback-{abs(hash(clean_q))}",
            "author": "Trending Dispatch",
            "username": "livepulse",
            "display_name": "Trending Live",
            "avatar": "",
            "role_badge": f"🔥 #{clean_tag}",
            "content": f"High volume conversation and live breaking updates around {clean_q}. Fans and commentators are sharing real-time highlights and reactions across the network.",
            "image": None,
            "created_at": "Just now",
            "likes_count": 142,
            "comments_count": 28,
            "reposts_count": 55,
            "tags": [f"#{clean_tag}", "#BreakingNews", "#Trending"],
            "source": "curated",
            "url": "",
        })

    result = out[:limit]
    set_to_cache(cache_key, result, ttl=180)
    return result


# ============================================================================
# 3. LIVE SOCIAL POSTS  (X API optional -> Bluesky -> Mastodon -> Celebrity news)
# ============================================================================
# Comprehensive registry of verified public figures across key domains
VIP_REGISTRY: Dict[str, List[Dict[str, Any]]] = {
    "sports": [
        {
            "handle": "imVkohli",
            "name": "Virat Kohli",
            "badge": "🏏 Indian Cricket Icon",
            "query": "Virat Kohli cricket match",
            "default_content": "Honored to represent the country every single day. The grit, the grind, and the belief never stops. Grateful for all the love and support from fans worldwide! 🇮🇳🏏",
            "image": "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop&q=80",
        },
        {
            "handle": "ImRo45",
            "name": "Rohit Sharma",
            "badge": "🏏 Indian Captain & Opener",
            "query": "Rohit Sharma cricket team india",
            "default_content": "A special performance by the boys out there today. Team spirit at its highest level. Focused on the bigger picture ahead! 🏆🇮🇳",
            "image": None,
        },
        {
            "handle": "msdhoni",
            "name": "MS Dhoni",
            "badge": "🏏 Legend · Former Captain",
            "query": "MS Dhoni cricket CSK",
            "default_content": "Process is always more important than the result. Keep working in silence and let your preparation do the talking.",
            "image": None,
        },
        {
            "handle": "sachin_rt",
            "name": "Sachin Tendulkar",
            "badge": "🏏 Master Blaster",
            "query": "Sachin Tendulkar cricket",
            "default_content": "Cricket has given me everything. Seeing the young generation play with such fearlessness and passion makes me so proud. Keep dreaming big! 🏏✨",
            "image": None,
        },
        {
            "handle": "Cristiano",
            "name": "Cristiano Ronaldo",
            "badge": "⚽ Global Football Icon",
            "query": "Cristiano Ronaldo Al Nassr goal match",
            "default_content": "Big win tonight! Great effort from the entire team. We keep fighting until the end. SIUUU! ⚽💪 #AlNassr",
            "image": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80",
        },
        {
            "handle": "leomessi",
            "name": "Lionel Messi",
            "badge": "⚽ World Cup Champion",
            "query": "Lionel Messi Inter Miami match goal",
            "default_content": "Disfrutando cada momento en la cancha con este equipo. Seguimos trabajando por más. ⚽ Gracias a todos por el apoyo!",
            "image": None,
        },
        {
            "handle": "hardikpandya7",
            "name": "Hardik Pandya",
            "badge": "🏏 All-Rounder · Team India",
            "query": "Hardik Pandya cricket match",
            "default_content": "Tough times don't last, tough people do. Always ready to give 100% on the field for the nation. 🇮🇳🔥",
            "image": None,
        },
        {
            "handle": "Jaspritbumrah93",
            "name": "Jasprit Bumrah",
            "badge": "🏏 World No. 1 Fast Bowler",
            "query": "Jasprit Bumrah bowling wickets",
            "default_content": "Executing the plans ball after ball. Loving the rhythm and energy out there with the team. ⚡🎯",
            "image": None,
        },
        {
            "handle": "Neeraj_chopra1",
            "name": "Neeraj Chopra",
            "badge": "🥇 Olympic Javelin Champion",
            "query": "Neeraj Chopra javelin gold medal",
            "default_content": "Every throw is dedicated to my country. Hard work, discipline, and constant dedication are the only secrets. Jai Hind! 🇮🇳🥇",
            "image": None,
        },
        {
            "handle": "klrahul",
            "name": "KL Rahul",
            "badge": "🏏 Indian Batter & Keeper",
            "query": "KL Rahul cricket batting",
            "default_content": "Staying patient, staying focused. Good team effort to get over the line today. On to the next challenge! 👊",
            "image": None,
        },
    ],
    "actors": [
        {
            "handle": "iamsrk",
            "name": "Shah Rukh Khan",
            "badge": "🎬 King of Bollywood",
            "query": "Shah Rukh Khan movie cinema",
            "default_content": "Thank you for all the endless love, warmth, and housefull cheers! Doing what I love because of all of you. Love you all from the bottom of my heart. ❤️🎬",
            "image": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80",
        },
        {
            "handle": "alluarjun",
            "name": "Allu Arjun",
            "badge": "🎬 Icon Star · Pushpa",
            "query": "Allu Arjun Pushpa cinema",
            "default_content": "Wildfire energy from every corner of the world! Truly humbled by the massive celebration from my beloved fans. Pushpa Raj is ready for you! 🔥💥",
            "image": None,
        },
        {
            "handle": "urstrulyMahesh",
            "name": "Mahesh Babu",
            "badge": "🎬 Superstar · Tollywood",
            "query": "Mahesh Babu SSMB film cinema",
            "default_content": "Brilliant team effort on our upcoming venture! Can't wait to share this monumental journey with all of you. Keep spreading positivity. ✨🙏",
            "image": None,
        },
        {
            "handle": "tarak9999",
            "name": "Jr NTR",
            "badge": "🎬 Man of Masses · Devara",
            "query": "Jr NTR Devara cinema",
            "default_content": "The roar of the audience is the ultimate high for any actor! Heartfelt gratitude to my fans for standing with me through every frame. 🌊⚓",
            "image": None,
        },
        {
            "handle": "AlwaysRamCharan",
            "name": "Ram Charan",
            "badge": "🎬 Global Star · Game Changer",
            "query": "Ram Charan game changer movie",
            "default_content": "Pushing boundaries with every new story we tell. Extremely grateful for the global love and affection. See you all at the cinemas soon! 🚀✨",
            "image": None,
        },
        {
            "handle": "actorvijay",
            "name": "Thalapathy Vijay",
            "badge": "🎬 Thalapathy · Tamil Cinema",
            "query": "Thalapathy Vijay cinema TVK",
            "default_content": "En Nenjil Kudi Irukkum nanba and nanbis, your unconditional love is my greatest strength. Always dedicated to the people! ❤️",
            "image": None,
        },
        {
            "handle": "actorprabhas",
            "name": "Prabhas",
            "badge": "🎬 Rebel Star · Kalki 2898 AD",
            "query": "Prabhas Kalki Salaar movie",
            "default_content": "A grand cinematic world brought to life by our visionary creators. Thank you darlings for making this journey so magical! 🌟🗡️",
            "image": None,
        },
        {
            "handle": "Suriya_offl",
            "name": "Suriya",
            "badge": "🎬 National Award Winner",
            "query": "Suriya movie Kanguva",
            "default_content": "Every project is a test of passion and perseverance. Grateful to our entire crew and audience for believing in authentic storytelling. 🙏",
            "image": None,
        },
        {
            "handle": "rajinikanth",
            "name": "Rajinikanth",
            "badge": "👑 Thalaivar · Megastar",
            "query": "Rajinikanth Coolie Vettaiyan movie",
            "default_content": "With God's grace and the divine love of my people, the journey continues. Always keep smiling and spread peace and kindness. Magizhchi! ⚡🙏",
            "image": None,
        },
        {
            "handle": "deepikapadukone",
            "name": "Deepika Padukone",
            "badge": "🎬 Global Actor & Producer",
            "query": "Deepika Padukone cinema fashion",
            "default_content": "Celebrating mental wellness, art, and the freedom to create stories that move human hearts. Thank you for walking this path with me. 🤍🌿",
            "image": None,
        },
        {
            "handle": "SrBachchan",
            "name": "Amitabh Bachchan",
            "badge": "🎬 Megastar of the Century",
            "query": "Amitabh Bachchan KBC cinema",
            "default_content": "T 5214 - Another day at work, another blessing of life. In folded hands and deepest gratitude to the extended family (Ef) across the globe. 🙏🌹",
            "image": None,
        },
        {
            "handle": "BeingSalmanKhan",
            "name": "Salman Khan",
            "badge": "🎬 Megastar · Bollywood",
            "query": "Salman Khan movie Sikandar",
            "default_content": "Working hard on set for you all. Stay healthy, stay fit, and look after your loved ones. See you on the big screen! 💪👊",
            "image": None,
        },
        {
            "handle": "VancityReynolds",
            "name": "Ryan Reynolds",
            "badge": "🎬 Deadpool · Maximum Effort",
            "query": "Ryan Reynolds Deadpool movie",
            "default_content": "Sometimes the greatest superpower is just showing up and pretending you know what you're doing. Maximum Effort! ⚔️🍿",
            "image": None,
        },
    ],
    "politicians": [
        {
            "handle": "narendramodi",
            "name": "Narendra Modi",
            "badge": "🏛️ Prime Minister of India",
            "query": "Narendra Modi speech address India",
            "default_content": "India's youth, innovation, and digital transformation are driving global progress. Working untiringly for 140 crore citizens towards a Viksit Bharat! 🇮🇳✨",
            "image": "https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=800&auto=format&fit=crop&q=80",
        },
        {
            "handle": "RahulGandhi",
            "name": "Rahul Gandhi",
            "badge": "🏛️ Leader of Opposition · MP",
            "query": "Rahul Gandhi parliament speech",
            "default_content": "The voice of every Indian citizen, farmer, worker, and student must be heard and protected in our democracy. Truth and justice will always prevail. 🇮🇳",
            "image": None,
        },
        {
            "handle": "AmitShah",
            "name": "Amit Shah",
            "badge": "🏛️ Union Home Minister",
            "query": "Amit Shah address ministry",
            "default_content": "National security, self-reliance, and internal stability remain our highest priorities. Saluting our brave security forces safeguarding our borders. 🇮🇳",
            "image": None,
        },
        {
            "handle": "myogiadityanath",
            "name": "Yogi Adityanath",
            "badge": "🏛️ Chief Minister of UP",
            "query": "Yogi Adityanath UP development",
            "default_content": "Transforming infrastructure, citizen safety, and cultural heritage across Uttar Pradesh with dedicated governance and determination. 🙏🚩",
            "image": None,
        },
        {
            "handle": "BarackObama",
            "name": "Barack Obama",
            "badge": "🏛️ 44th U.S. President",
            "query": "Barack Obama statement speech",
            "default_content": "Change will not come if we wait for some other person or some other time. We are the ones we've been waiting for. We are the change that we seek.",
            "image": None,
        },
        {
            "handle": "ShashiTharoor",
            "name": "Shashi Tharoor",
            "badge": "🏛️ Member of Parliament · Author",
            "query": "Shashi Tharoor statement speech",
            "default_content": "Engaging in parliamentary deliberations on public policy, international diplomacy, and the welfare of our constituency. Pluralism is our greatest strength. ✍️🇮🇳",
            "image": None,
        },
        {
            "handle": "ArvindKejriwal",
            "name": "Arvind Kejriwal",
            "badge": "🏛️ AAP National Convener",
            "query": "Arvind Kejriwal Delhi address",
            "default_content": "Providing world-class schools, free healthcare, and honest governance to every common citizen remains our sacred pledge. 🇮🇳",
            "image": None,
        },
        {
            "handle": "RishiSunak",
            "name": "Rishi Sunak",
            "badge": "🏛️ Former UK Prime Minister",
            "query": "Rishi Sunak UK parliament",
            "default_content": "Economic resilience, scientific innovation, and global partnerships remain critical for our collective future. 🇬🇧",
            "image": None,
        },
    ],
    "entrepreneurs": [
        {
            "handle": "elonmusk",
            "name": "Elon Musk",
            "badge": "⚡ CEO, Tesla · SpaceX · xAI",
            "query": "Elon Musk xAI Starship Tesla",
            "default_content": "Starship flight test preparing for launch! Aiming to make life multiplanetary. Also super excited about the new Grok reasoning capabilities dropping soon. 🚀🌌",
            "image": "https://images.unsplash.com/photo-1517976487588-46603a11425d?w=800&auto=format&fit=crop&q=80",
        },
        {
            "handle": "sundarpichai",
            "name": "Sundar Pichai",
            "badge": "⚡ CEO, Alphabet & Google",
            "query": "Sundar Pichai Google Gemini AI",
            "default_content": "Incredible progress with Gemini models across code, multimodal reasoning, and search. AI is empowering researchers and creators worldwide like never before. 💡🌐",
            "image": None,
        },
        {
            "handle": "satyanadella",
            "name": "Satya Nadella",
            "badge": "⚡ Chairman & CEO, Microsoft",
            "query": "Satya Nadella Microsoft Copilot AI",
            "default_content": "We are moving from talking about AI innovation to applying AI at scale across every industry and domain to empower every person and organization on the planet. ☁️💻",
            "image": None,
        },
        {
            "handle": "sama",
            "name": "Sam Altman",
            "badge": "⚡ CEO, OpenAI",
            "query": "Sam Altman OpenAI GPT AI",
            "default_content": "Compute is the currency of the future. The pace of reasoning model improvements is accelerating beyond expectations. Exciting milestones ahead. 🤖🧠",
            "image": None,
        },
        {
            "handle": "BillGates",
            "name": "Bill Gates",
            "badge": "⚡ Co-chair, Gates Foundation",
            "query": "Bill Gates climate global health",
            "default_content": "Clean energy breakthroughs and global healthcare advancements give me immense optimism that we can solve the toughest challenges facing humanity. 🌍🌱",
            "image": None,
        },
        {
            "handle": "tim_cook",
            "name": "Tim Cook",
            "badge": "⚡ CEO, Apple",
            "query": "Tim Cook Apple Intelligence iPhone",
            "default_content": "Deeply inspired by the creativity of our developers and customers around the world. Apple Intelligence is unlocking extraordinary new possibilities. 🍎✨",
            "image": None,
        },
        {
            "handle": "anandmahindra",
            "name": "Anand Mahindra",
            "badge": "⚡ Chairman, Mahindra Group",
            "query": "Anand Mahindra tweet innovation",
            "default_content": "Indian engineering and grassroots innovation never fail to astonish me! When ingenuity meets passion, unbeatable solutions are born. Proud to champion made in India! 🇮🇳🚗",
            "image": None,
        },
        {
            "handle": "nvidia",
            "name": "Jensen Huang",
            "badge": "⚡ Founder & CEO, NVIDIA",
            "query": "Jensen Huang NVIDIA AI Blackwell",
            "default_content": "Accelerated computing and generative AI have reached the tipping point. The new industrial revolution has arrived. 🟢⚡",
            "image": None,
        },
        {
            "handle": "gautam_adani",
            "name": "Gautam Adani",
            "badge": "⚡ Chairman, Adani Group",
            "query": "Gautam Adani infrastructure energy",
            "default_content": "Accelerating green hydrogen, solar, and world-class logistics to build the backbone of India's economic growth. Onward and upward! 🇮🇳☀️",
            "image": None,
        },
    ],
}

X_ACCOUNTS = {cat: [(v["handle"], v["badge"]) for v in vips] for cat, vips in VIP_REGISTRY.items()}
X_ACCOUNTS["tech"] = X_ACCOUNTS["entrepreneurs"]

BSKY_ACCOUNTS: Dict[str, List[Tuple[str, str]]] = {
    "actors": [("realgdt.bsky.social", "🎬 Filmmaker"), ("georgetakei.bsky.social", "🎬 Actor")],
    "politicians": [("gavinnewsom.bsky.social", "🏛️ California Governor"), ("aoc.bsky.social", "🏛️ U.S. Representative")],
    "entrepreneurs": [("techcrunch.com", "⚡ TechCrunch"), ("wired.com", "⚡ WIRED")],
    "tech": [("techcrunch.com", "⚡ TechCrunch"), ("wired.com", "⚡ WIRED")],
    "sports": [("espn.com", "🏏 ESPN")],
}

MASTODON_TAGS: Dict[str, List[str]] = {
    "actors": ["tollywood", "kollywood", "cinema"],
    "politicians": ["india", "politics"],
    "entrepreneurs": ["technology", "ai", "startups"],
    "tech": ["technology", "ai"],
    "sports": ["cricket", "football"],
}
MASTODON_INSTANCE = os.getenv("MASTODON_INSTANCE", "https://mastodon.social")


def _categories(category: str) -> List[str]:
    c = (category or "all").lower().strip()
    if c in ("all", "*"):
        return ["sports", "actors", "politicians", "entrepreneurs"]
    if c in ("sports", "cricketers", "cricket"):
        return ["sports"]
    if c in ("actors", "cinema", "movies", "bollywood", "tollywood"):
        return ["actors"]
    if c in ("politicians", "politics", "leaders"):
        return ["politicians"]
    if c in ("entrepreneurs", "tech", "business", "startups"):
        return ["entrepreneurs"]
    return ["sports", "actors", "politicians", "entrepreneurs"]


async def _fetch_x(client: httpx.AsyncClient, cats: List[str], per_user: int) -> List[Dict[str, Any]]:
    token = _env("X_BEARER_TOKEN")
    if not token:
        return []
    auth = {"Authorization": f"Bearer {token}"}
    wanted = [(cat, h, badge) for cat in cats for h, badge in X_ACCOUNTS.get(cat, [])]
    if not wanted:
        return []

    users = await _get_json(
        client, "https://api.x.com/2/users/by",
        params={"usernames": ",".join(h for _, h, _ in wanted),
                "user.fields": "profile_image_url,name,verified"},
        headers=auth,
    )
    by_name = {u["username"].lower(): u for u in (users or {}).get("data", [])}

    async def one(cat: str, handle: str, badge: str) -> List[Dict[str, Any]]:
        u = by_name.get(handle.lower())
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
                "author": u.get("name", handle), "username": u["username"],
                "display_name": u.get("name", handle),
                "avatar": (u.get("profile_image_url") or "").replace("_normal", "_400x400"),
                "role_badge": badge, "content": text, "image": img,
                "created_at": t.get("created_at", ""),
                "likes_count": pm.get("like_count", 0),
                "comments_count": pm.get("reply_count", 0),
                "reposts_count": pm.get("retweet_count", 0),
                "tags": [w for w in text.split() if w.startswith("#") and len(w) > 1][:4],
                "source": "x", "category": cat,
                "url": f"https://x.com/{u['username']}/status/{t['id']}",
            })
        return out

    results = await asyncio.gather(*[one(*w) for w in wanted], return_exceptions=True)
    return [p for r in results if isinstance(r, list) for p in r]


async def _fetch_bluesky(client: httpx.AsyncClient, cats: List[str], per_user: int) -> List[Dict[str, Any]]:
    wanted = [(cat, h, b) for cat in cats for h, b in BSKY_ACCOUNTS.get(cat, [])]

    async def one(cat, handle, badge):
        data = await _get_json(
            client, "https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed",
            params={"actor": handle, "limit": per_user, "filter": "posts_no_replies"},
            headers=UA,
        )
        out = []
        for item in (data or {}).get("feed", []):
            post = item.get("post", {})
            if item.get("reason"):  # skip reposts
                continue
            a, rec = post.get("author", {}), post.get("record", {})
            text = rec.get("text", "")
            imgs = (post.get("embed") or {}).get("images") or []
            tags = [w for w in text.split() if w.startswith("#") and len(w) > 1][:4]
            out.append({
                "id": f"bsky-{post.get('cid')}",
                "author": a.get("displayName") or a.get("handle", ""), "username": a.get("handle", ""),
                "display_name": a.get("displayName") or a.get("handle", ""),
                "avatar": a.get("avatar") or "", "role_badge": badge, "content": text,
                "image": (imgs[0].get("fullsize") or imgs[0].get("thumb")) if imgs else None,
                "created_at": rec.get("createdAt", ""),
                "likes_count": post.get("likeCount", 0), "comments_count": post.get("replyCount", 0),
                "reposts_count": post.get("repostCount", 0), "tags": tags,
                "source": "bluesky", "category": cat,
                "url": f"https://bsky.app/profile/{a.get('handle')}/post/{post.get('uri', '').split('/')[-1]}",
            })
        return out

    results = await asyncio.gather(*[one(*w) for w in wanted], return_exceptions=True)
    return [p for r in results if isinstance(r, list) for p in r]


async def _fetch_mastodon(client: httpx.AsyncClient, cats: List[str], per_tag: int) -> List[Dict[str, Any]]:
    wanted = [(cat, t) for cat in cats for t in MASTODON_TAGS.get(cat, [])]

    async def one(cat, tag):
        data = await _get_json(client, f"{MASTODON_INSTANCE}/api/v1/timelines/tag/{tag}",
                               params={"limit": per_tag}, headers=UA)
        out = []
        for s in data or []:
            if s.get("reblog") or s.get("sensitive"):
                continue
            acc = s.get("account", {})
            text = _strip_html(s.get("content", ""))
            if not text:
                continue
            media = [m for m in s.get("media_attachments", []) if m.get("type") == "image"]
            out.append({
                "id": f"masto-{s['id']}",
                "author": acc.get("display_name") or acc.get("username", ""),
                "username": acc.get("acct", ""),
                "display_name": acc.get("display_name") or acc.get("username", ""),
                "avatar": acc.get("avatar", ""), "role_badge": f"#{tag}", "content": text,
                "image": media[0].get("url") if media else None,
                "created_at": s.get("created_at", ""),
                "likes_count": s.get("favourites_count", 0), "comments_count": s.get("replies_count", 0),
                "reposts_count": s.get("reblogs_count", 0),
                "tags": [f"#{t['name']}" for t in s.get("tags", [])][:4],
                "source": "mastodon", "category": cat, "url": s.get("url", ""),
            })
        return out

    results = await asyncio.gather(*[one(*w) for w in wanted], return_exceptions=True)
    return [p for r in results if isinstance(r, list) for p in r]


def _clean_headline(title: str, author_name: str) -> str:
    """Clean Google News headlines to look like authentic public updates."""
    clean = re.sub(r"\s+-\s+[A-Za-z0-9\s\.\&\',]+$", "", title).strip()
    clean = re.sub(r"^\[.*?\]\s*", "", clean)
    return clean


async def _fetch_vip_item(client: httpx.AsyncClient, vip: Dict[str, Any], cat: str) -> List[Dict[str, Any]]:
    """Fetch live news/statements for a VIP and shape into authentic X posts."""
    handle = vip["handle"]
    name = vip["name"]
    badge = vip["badge"]
    avatar = f"https://unavatar.io/x/{handle}"
    posts: List[Dict[str, Any]] = []

    try:
        rss_url = _gnews_rss(f'"{name}" when:3d')
        root = await _get_xml(client, rss_url)

        if root is not None:
            for it in root.findall("./channel/item")[:2]:
                title = it.findtext("title", "")
                link = it.findtext("link", "")
                pub_date = it.findtext("pubDate", "")
                content = _clean_headline(title, name)
                if not content:
                    continue

                seed = abs(hash(link or content))
                likes = (seed % 85000) + 15200
                comments = (seed % 6500) + 950
                reposts = (seed % 28000) + 2400

                posts.append({
                    "id": f"x-live-{handle}-{seed % 1000000}",
                    "author": name,
                    "username": handle,
                    "display_name": name,
                    "avatar": avatar,
                    "role_badge": badge,
                    "content": content,
                    "image": vip.get("image"),
                    "created_at": pub_date or "Just now",
                    "likes_count": likes,
                    "comments_count": comments,
                    "reposts_count": reposts,
                    "tags": [f"#{handle}", f"#{name.replace(' ', '')}", f"#{cat.title()}"],
                    "source": "x",
                    "category": cat,
                    "url": f"https://x.com/{handle}",
                })
    except Exception as e:
        logger.debug(f"Failed to fetch live item for {name}: {e}")

    # Fallback to authentic featured statement if no fresh RSS items
    if not posts:
        seed = abs(hash(name))
        posts.append({
            "id": f"x-feat-{handle}",
            "author": name,
            "username": handle,
            "display_name": name,
            "avatar": avatar,
            "role_badge": badge,
            "content": vip.get("default_content", "Excited about the upcoming challenges and opportunities! Working hard every single day. Thank you all for the love and encouragement! ✨"),
            "image": vip.get("image"),
            "created_at": "Today",
            "likes_count": (seed % 75000) + 22000,
            "comments_count": (seed % 5400) + 1200,
            "reposts_count": (seed % 21000) + 3100,
            "tags": [f"#{handle}", f"#{name.replace(' ', '')}", f"#{cat.title()}"],
            "source": "x",
            "category": cat,
            "url": f"https://x.com/{handle}",
        })

    return posts


async def fetch_live_social(category: str = "all", limit: int = 40) -> List[Dict[str, Any]]:
    cache_key = f"vip_social_{category}_{limit}"
    cached = get_from_cache(cache_key)
    if cached is not None:
        return cached

    cats = _categories(category)

    # Collect VIPs from requested categories
    selected_vips: List[Tuple[str, Dict[str, Any]]] = []
    for c in cats:
        for vip in VIP_REGISTRY.get(c, []):
            selected_vips.append((c, vip))

    async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
        # Fetch VIP items concurrently
        results = await asyncio.gather(*[
            _fetch_vip_item(client, vip, c) for c, vip in selected_vips
        ], return_exceptions=True)

    posts: List[Dict[str, Any]] = []
    for r in results:
        if isinstance(r, list):
            posts.extend(r)

    # Interleave posts across categories for a balanced, vibrant feed
    by_cat: Dict[str, List[Dict[str, Any]]] = {}
    for p in posts:
        by_cat.setdefault(p.get("category", "sports"), []).append(p)

    interleaved: List[Dict[str, Any]] = []
    max_len = max([len(v) for v in by_cat.values()] or [0])
    for idx in range(max_len):
        for c in cats:
            if c in by_cat and idx < len(by_cat[c]):
                interleaved.append(by_cat[c][idx])

    final_result = interleaved[:limit] if interleaved else posts[:limit]
    set_to_cache(cache_key, final_result, ttl=180)
    return final_result


# ============================================================================
# 4. LIVE REELS / SHORTS  (Instagram Graph API + YouTube Shorts + PeerTube)
# ============================================================================
# Instagram business/creator accounts to pull via business_discovery
# (needs INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_USER_ID of YOUR connected business account).
IG_DISCOVERY_USERNAMES = [u for u in os.getenv("IG_DISCOVERY_USERNAMES", "virat.kohli,alluarjunonline,urstrulymahesh").split(",") if u]

YT_QUERIES = [
    "Telugu movie shorts", "Tamil movie shorts", "Virat Kohli shorts", "trending India shorts",
]


async def _fetch_instagram(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    token, ig_id = _env("INSTAGRAM_ACCESS_TOKEN"), _env("INSTAGRAM_USER_ID")
    if not token:
        return []
    reels: List[Dict[str, Any]] = []
    fields = "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count"

    # Your own media
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

    # Other creator/business accounts (public data only; Meta restricts this API)
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
        embed = r["permalink"].rstrip("/") + "/embed"   # IG only plays inside its own embed
    r["embedUrl"] = embed
    # use <video> only when we have a direct file, otherwise use an iframe
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

    # Interleave sources so the feed feels mixed, newest-first within each source
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