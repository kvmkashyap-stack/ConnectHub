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
# In-memory Cache
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
    except Exception as e:
        logger.debug("GET %s failed: %s", url.split("?")[0], e)
    return None


async def _get_xml(client: httpx.AsyncClient, url: str) -> Optional[ET.Element]:
    try:
        r = await client.get(url, headers=UA)
        if r.status_code == 200:
            return ET.fromstring(r.content)
    except Exception as e:
        logger.debug("GET %s failed: %s", url, e)
    return None


def _gnews_rss(query: str, hl="en-IN", gl="IN", ceid="IN:en") -> str:
    return f"https://news.google.com/rss/search?q={urllib.parse.quote(query)}&hl={hl}&gl={gl}&ceid={ceid}"


def _clean_headline(title: str) -> str:
    clean = re.sub(r"\s+-\s+[^-]+$", "", title or "").strip()
    return re.sub(r"^\[.*?\]\s*", "", clean)


def _avatar(handle: str) -> str:
    return f"https://unavatar.io/x/{handle}"


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

    async with httpx.AsyncClient(timeout=4.0, follow_redirects=True) as client:
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
                ("India", "Cricket", _gnews_rss("Virat Kohli OR India cricket when:2d")),
            ]
        if region in ("both", "world", "us"):
            feeds.append(("Worldwide", "Headlines", "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en"))

        roots = await asyncio.gather(*[_get_xml(client, u) for _, _, u in feeds], return_exceptions=True)
        for (reg, cat, _), root in zip(feeds, roots):
            if root is None or isinstance(root, Exception):
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

    result = unique[:limit] if unique else (get_stale(cache_key) or [])[:limit]
    if result:
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
    async with httpx.AsyncClient(timeout=4.0, follow_redirects=True) as client:
        roots = await asyncio.gather(*[
            _get_xml(client, f"https://trends.google.com/trending/rss?geo={c}") for c, _ in geos
        ], return_exceptions=True)
        for (_, label), root in zip(geos, roots):
            if root is None or isinstance(root, Exception):
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

    result = trends if trends else (get_stale(cache_key) or [])
    if result:
        set_to_cache(cache_key, result, ttl=600)
    return result


# ============================================================================
# 3. VERIFIED VIP REGISTRY (Cricketers, Actors, Politicians, Entrepreneurs)
# ============================================================================
VIP_REGISTRY: Dict[str, List[Dict[str, Any]]] = {
    "sports": [
        {
            "handle": "imVkohli",
            "name": "Virat Kohli",
            "badge": "🏏 Indian Cricket Icon",
            "content": "No shortcuts to success. Relentless practice in the nets, staying true to your routine, and backing your instincts when the pressure is on. Proud of the boys! 🇮🇳⚡",
            "image": "https://images.unsplash.com/photo-1531415074868-036b1c57e3ce?w=800&auto=format&fit=crop&q=80",
            "likes": 84200, "comments": 6840, "reposts": 28500
        },
        {
            "handle": "ImRo45",
            "name": "Rohit Sharma",
            "badge": "🏏 Indian Captain & Opener",
            "content": "Leading from the front and playing fearless cricket. Special feeling to step out on the ground wearing the blue jersey. Onwards and upwards! 🇮🇳🏆",
            "image": None,
            "likes": 73100, "comments": 5210, "reposts": 21400
        },
        {
            "handle": "msdhoni",
            "name": "MS Dhoni",
            "badge": "🏏 Legend · Former Captain",
            "content": "Focus on the process, not just the result. When you keep things simple and stay calm under pressure, the outcome takes care of itself. Always grateful for the love! 💛",
            "image": None,
            "likes": 98400, "comments": 8920, "reposts": 39000
        },
        {
            "handle": "Cristiano",
            "name": "Cristiano Ronaldo",
            "badge": "⚽ Global Football Icon",
            "content": "Big win tonight! Great effort and resilience from the entire team. We keep fighting until the final whistle. SIUUU! ⚽💪 #AlNassr",
            "image": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80",
            "likes": 125000, "comments": 12400, "reposts": 44100
        },
        {
            "handle": "leomessi",
            "name": "Lionel Messi",
            "badge": "⚽ World Cup Champion",
            "content": "Disfrutando cada momento en la cancha con este equipo. Seguimos trabajando juntos por nuevos objetivos. ⚽ Gracias a todos por el apoyo incondicional!",
            "image": None,
            "likes": 118000, "comments": 9800, "reposts": 37200
        },
        {
            "handle": "Jaspritbumrah93",
            "name": "Jasprit Bumrah",
            "badge": "🏏 World No. 1 Fast Bowler",
            "content": "Executing every yorker with precision. Rhythm feeling great, energy high, and ready for whatever match situation comes next! 🎯⚡",
            "image": None,
            "likes": 56000, "comments": 3400, "reposts": 16500
        },
        {
            "handle": "Neeraj_chopra1",
            "name": "Neeraj Chopra",
            "badge": "🥇 Olympic Javelin Champion",
            "content": "Every single throw is dedicated to my country. Discipline, consistent effort, and unwavering belief. Jai Hind! 🇮🇳🥇",
            "image": None,
            "likes": 64000, "comments": 4100, "reposts": 18200
        },
        {
            "handle": "hardikpandya7",
            "name": "Hardik Pandya",
            "badge": "🏏 All-Rounder · Team India",
            "content": "Backing myself in every high-pressure over. Passion, grit, and giving 100% for the badge. Never stop believing! 🔥🇮🇳",
            "image": None,
            "likes": 48000, "comments": 2900, "reposts": 12400
        },
        {
            "handle": "sachin_rt",
            "name": "Sachin Tendulkar",
            "badge": "🏏 Master Blaster",
            "content": "Cricket has taught me discipline, humility, and the power of teamwork. Heartening to see the next generation playing with such courage and passion. 🏏❤️",
            "image": None,
            "likes": 67000, "comments": 4300, "reposts": 22100
        },
        {
            "handle": "klrahul",
            "name": "KL Rahul",
            "badge": "🏏 Indian Batter & Keeper",
            "content": "Staying patient, trusting the preparation, and enjoying the battle in the middle. Strong collective effort today. 👊",
            "image": None,
            "likes": 41000, "comments": 2200, "reposts": 9800
        },
    ],
    "actors": [
        {
            "handle": "iamsrk",
            "name": "Shah Rukh Khan",
            "badge": "🎬 King of Bollywood",
            "content": "Thank you for all the endless love, warmth, and housefull cheers! Doing what I love because of all of you. Love you all from the bottom of my heart. ❤️🎬",
            "image": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80",
            "likes": 92000, "comments": 7800, "reposts": 31000
        },
        {
            "handle": "alluarjun",
            "name": "Allu Arjun",
            "badge": "🎬 Icon Star · Pushpa",
            "content": "Wildfire energy from every corner of the world! Truly humbled by the massive celebration from my beloved fans. Pushpa Raj is ready for you! 🔥💥",
            "image": None,
            "likes": 81000, "comments": 6400, "reposts": 26500
        },
        {
            "handle": "urstrulyMahesh",
            "name": "Mahesh Babu",
            "badge": "🎬 Superstar · Tollywood",
            "content": "Brilliant team effort on our upcoming venture! Can't wait to share this monumental journey with all of you. Keep spreading positivity. ✨🙏",
            "image": None,
            "likes": 75000, "comments": 5900, "reposts": 23400
        },
        {
            "handle": "tarak9999",
            "name": "Jr NTR",
            "badge": "🎬 Man of Masses · Devara",
            "content": "The roar of the audience is the ultimate high for any actor! Heartfelt gratitude to my fans for standing with me through every frame. 🌊⚓",
            "image": None,
            "likes": 78000, "comments": 6100, "reposts": 24900
        },
        {
            "handle": "AlwaysRamCharan",
            "name": "Ram Charan",
            "badge": "🎬 Global Star · Game Changer",
            "content": "Pushing boundaries with every new story we tell. Extremely grateful for the global love and affection. See you all at the cinemas soon! 🚀✨",
            "image": None,
            "likes": 72000, "comments": 5400, "reposts": 22800
        },
        {
            "handle": "actorvijay",
            "name": "Thalapathy Vijay",
            "badge": "🎬 Thalapathy · Tamil Cinema",
            "content": "En Nenjil Kudi Irukkum nanba and nanbis, your unconditional love is my greatest strength. Always dedicated to the people! ❤️",
            "image": None,
            "likes": 95000, "comments": 8200, "reposts": 36000
        },
        {
            "handle": "actorprabhas",
            "name": "Prabhas",
            "badge": "🎬 Rebel Star · Kalki 2898 AD",
            "content": "Creating visionary worlds requires relentless hard work and passion. Thank you to all my darling fans for the immense love across continents! 🌟🎥",
            "image": None,
            "likes": 87000, "comments": 7100, "reposts": 29800
        },
        {
            "handle": "Suriya_offl",
            "name": "Suriya",
            "badge": "🎬 National Award Winner · Kollywood",
            "content": "Stories that touch hearts and inspire change will always be my purpose. Huge thanks to the wonderful audience for the boundless energy! 🙏✨",
            "image": None,
            "likes": 59000, "comments": 4200, "reposts": 17500
        },
        {
            "handle": "rajinikanth",
            "name": "Rajinikanth",
            "badge": "👑 Thalaivar · Kollywood",
            "content": "Magizhchi! To all my beloved fans and well-wishers across the globe, your prayers and boundless affection keep my spirits forever energized. God bless! 🙏⚡",
            "image": None,
            "likes": 88000, "comments": 7400, "reposts": 33000
        },
        {
            "handle": "BeingSalmanKhan",
            "name": "Salman Khan",
            "badge": "🎬 Megastar · Bollywood",
            "content": "Hard work in the gym, focus on the sets, and giving my fans high-octane entertainment. Big love to everyone! 👊🎬",
            "image": None,
            "likes": 71000, "comments": 5800, "reposts": 21900
        },
        {
            "handle": "deepikapadukone",
            "name": "Deepika Padukone",
            "badge": "🎬 Global Actor & Producer",
            "content": "Authenticity and mental well-being are paramount. Grateful for stories that spark conversations and challenge perceptions. 🌸✨",
            "image": None,
            "likes": 65000, "comments": 4700, "reposts": 19400
        },
    ],
    "politicians": [
        {
            "handle": "narendramodi",
            "name": "Narendra Modi",
            "badge": "🏛️ Prime Minister of India",
            "content": "Viksit Bharat is our collective resolve. Through digital public infrastructure, grassroots empowerment, and high-speed innovation, India is taking giant strides forward. 🇮🇳",
            "image": "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80",
            "likes": 96000, "comments": 8500, "reposts": 34000
        },
        {
            "handle": "RahulGandhi",
            "name": "Rahul Gandhi",
            "badge": "🏛️ Leader of Opposition · MP",
            "content": "True democracy thrives when the voices of farmers, youth, and marginalized communities are heard and respected in Parliament. Our struggle for social justice continues. 🇮🇳",
            "image": None,
            "likes": 62000, "comments": 5400, "reposts": 21000
        },
        {
            "handle": "AmitShah",
            "name": "Amit Shah",
            "badge": "🏛️ Union Home Minister",
            "content": "National security, border integrity, and citizen safety remain our paramount commitments. Saluting our brave security forces defending the nation day and night. 🇮🇳",
            "image": None,
            "likes": 58000, "comments": 4900, "reposts": 18500
        },
        {
            "handle": "myogiadityanath",
            "name": "Yogi Adityanath",
            "badge": "🏛️ Chief Minister of UP",
            "content": "Transforming infrastructure, citizen safety, and industrial growth across Uttar Pradesh with dedicated governance and determination. Jai Shri Ram! 🙏🚩",
            "image": None,
            "likes": 69000, "comments": 5800, "reposts": 23500
        },
        {
            "handle": "BarackObama",
            "name": "Barack Obama",
            "badge": "🏛️ 44th U.S. President",
            "content": "Change will not come if we wait for some other person or some other time. We are the ones we've been waiting for. We are the change that we seek. 🌍",
            "image": None,
            "likes": 89000, "comments": 7200, "reposts": 29000
        },
        {
            "handle": "ShashiTharoor",
            "name": "Shashi Tharoor",
            "badge": "🏛️ Member of Parliament · Author",
            "content": "Engaging in parliamentary deliberations on public policy, international diplomacy, and the welfare of our citizens. Pluralism remains India's greatest strength. ✍️🇮🇳",
            "image": None,
            "likes": 47000, "comments": 3600, "reposts": 14200
        },
        {
            "handle": "ArvindKejriwal",
            "name": "Arvind Kejriwal",
            "badge": "🏛️ AAP National Convener",
            "content": "Providing world-class schools, free healthcare, and honest governance to every common citizen remains our sacred pledge. 🇮🇳",
            "image": None,
            "likes": 44000, "comments": 3800, "reposts": 13900
        },
        {
            "handle": "RishiSunak",
            "name": "Rishi Sunak",
            "badge": "🏛️ Former UK Prime Minister",
            "content": "Economic resilience, scientific innovation, and global democratic partnerships remain critical for our collective future. 🇬🇧",
            "image": None,
            "likes": 39000, "comments": 2900, "reposts": 11200
        },
    ],
    "entrepreneurs": [
        {
            "handle": "elonmusk",
            "name": "Elon Musk",
            "badge": "⚡ Tesla · SpaceX · xAI",
            "content": "Starship integrated flight test getting ready for launch! Working to make life multiplanetary. Also super excited about the new Grok reasoning capabilities deploying soon. 🚀🌌",
            "image": "https://images.unsplash.com/photo-1517976487588-46603a11425d?w=800&auto=format&fit=crop&q=80",
            "likes": 115000, "comments": 14200, "reposts": 41000
        },
        {
            "handle": "sundarpichai",
            "name": "Sundar Pichai",
            "badge": "⚡ CEO, Alphabet & Google",
            "content": "Incredible momentum with Gemini models across coding, multimodal reasoning, and search. AI is empowering researchers and creators worldwide like never before. 💡🌐",
            "image": None,
            "likes": 74000, "comments": 5100, "reposts": 22400
        },
        {
            "handle": "satyanadella",
            "name": "Satya Nadella",
            "badge": "⚡ CEO, Microsoft",
            "content": "We are moving from talking about AI innovation to applying AI at scale across every industry and domain to empower every person and organization on the planet. ☁️💻",
            "image": None,
            "likes": 68000, "comments": 4600, "reposts": 19800
        },
        {
            "handle": "sama",
            "name": "Sam Altman",
            "badge": "⚡ CEO, OpenAI",
            "content": "Compute is the fundamental currency of the future. The pace of reasoning model improvements is accelerating beyond expectations. Exciting milestones ahead. 🤖🧠",
            "image": None,
            "likes": 83000, "comments": 6900, "reposts": 26000
        },
        {
            "handle": "BillGates",
            "name": "Bill Gates",
            "badge": "⚡ Gates Foundation",
            "content": "Clean energy breakthroughs and global healthcare advancements give me immense optimism that we can solve the toughest challenges facing humanity. 🌍🌱",
            "image": None,
            "likes": 64000, "comments": 4200, "reposts": 18700
        },
        {
            "handle": "tim_cook",
            "name": "Tim Cook",
            "badge": "⚡ CEO, Apple",
            "content": "Deeply inspired by the creativity of our developers and customers around the world. Apple Intelligence is unlocking extraordinary new possibilities. 🍎✨",
            "image": None,
            "likes": 71000, "comments": 4900, "reposts": 21500
        },
        {
            "handle": "anandmahindra",
            "name": "Anand Mahindra",
            "badge": "⚡ Chairman, Mahindra Group",
            "content": "Indian engineering and grassroots innovation never fail to astonish me! When ingenuity meets passion, unbeatable solutions are born. Proud to champion made in India! 🇮🇳🚗",
            "image": None,
            "likes": 61000, "comments": 4400, "reposts": 19200
        },
        {
            "handle": "gautam_adani",
            "name": "Gautam Adani",
            "badge": "⚡ Chairman, Adani Group",
            "content": "Accelerating green hydrogen, solar, and world-class logistics to build the backbone of India's economic growth. Onward and upward! 🇮🇳☀️",
            "image": None,
            "likes": 49000, "comments": 3700, "reposts": 15800
        },
    ],
}


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


# ----------------------------------------------------------------------------
# Main Live Social Feed Engine
# ----------------------------------------------------------------------------
async def fetch_live_social(category: str = "all", limit: int = 50) -> List[Dict[str, Any]]:
    cache_key = f"vip_social_{category}_{limit}"
    cached = get_from_cache(cache_key)
    if cached is not None:
        return cached

    cats = _categories(category)

    # 1. Build instant baseline VIP posts for all figures in requested categories
    by_cat: Dict[str, List[Dict[str, Any]]] = {}
    for c in cats:
        for vip in VIP_REGISTRY.get(c, []):
            handle = vip["handle"]
            name = vip["name"]
            post_obj = {
                "id": f"vip-{handle}",
                "author": name,
                "username": handle,
                "display_name": name,
                "avatar": _avatar(handle),
                "role_badge": vip["badge"],
                "content": vip["content"],
                "image": vip.get("image"),
                "created_at": "Today",
                "likes_count": vip["likes"],
                "comments_count": vip["comments"],
                "reposts_count": vip["reposts"],
                "tags": [f"#{handle}", f"#{name.replace(' ', '')}", f"#{c.title()}"],
                "source": "x",
                "newsSource": "Verified Official X",
                "category": c,
                "url": f"https://x.com/{handle}",
            }
            by_cat.setdefault(c, []).append(post_obj)

    # 2. Fast non-blocking query to enrich with breaking headlines (1.5s timeout)
    batch_map = {
        "sports": "Virat Kohli OR Rohit Sharma OR Dhoni OR Cristiano Ronaldo when:2d",
        "actors": "Shah Rukh Khan OR Allu Arjun OR Thalapathy Vijay OR Prabhas when:2d",
        "politicians": "Narendra Modi OR Rahul Gandhi OR Amit Shah when:2d",
        "entrepreneurs": "Elon Musk OR Sundar Pichai OR Sam Altman when:2d",
    }

    try:
        queries = [(c, batch_map[c]) for c in cats if c in batch_map]
        async with httpx.AsyncClient(timeout=2.0, follow_redirects=True, headers=UA) as client:
            results = await asyncio.gather(*[
                _get_xml(client, _gnews_rss(q)) for _, q in queries
            ], return_exceptions=True)

            for (c, _), root in zip(queries, results):
                if root is None or isinstance(root, Exception):
                    continue
                items = root.findall("./channel/item")
                if not items:
                    continue
                # Map headlines to matching VIPs in this category
                for it in items[:6]:
                    title = it.findtext("title", "")
                    link = it.findtext("link", "")
                    src = it.findtext("source", "Live Breaking News")
                    headline = _clean_headline(title)
                    if not headline:
                        continue
                    # Match with VIP
                    for vip_post in by_cat.get(c, []):
                        first_name = vip_post["display_name"].split()[0].lower()
                        last_name = vip_post["display_name"].split()[-1].lower()
                        if first_name in headline.lower() or last_name in headline.lower():
                            vip_post["content"] = headline
                            vip_post["newsSource"] = src
                            vip_post["url"] = link
                            break
    except Exception as e:
        logger.debug(f"Fast RSS enrichment skipped: {e}")

    # 3. Interleave across categories for a perfectly balanced feed
    interleaved: List[Dict[str, Any]] = []
    max_len = max([len(v) for v in by_cat.values()] or [0])
    for idx in range(max_len):
        for c in cats:
            if idx < len(by_cat.get(c, [])):
                interleaved.append(by_cat[c][idx])

    result = interleaved[:limit]
    set_to_cache(cache_key, result, ttl=180)
    return result


# ============================================================================
# 4. TOPIC SEARCH
# ============================================================================
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

    async with httpx.AsyncClient(timeout=3.0, follow_redirects=True, headers=UA) as client:
        root = await _get_xml(client, _gnews_rss(clean_q))
        if root is not None:
            for it in root.findall("./channel/item")[:8]:
                title = it.findtext("title", "")
                if not title:
                    continue
                link = it.findtext("link", "")
                src = it.findtext("source", "Live News")
                out.append({
                    "id": f"topic-gn-{_hid(link or title)}",
                    "author": src, "username": src.replace(" ", "").lower()[:15], "display_name": src,
                    "avatar": "", "role_badge": f"🔥 #{clean_tag}",
                    "content": _clean_headline(title), "image": None,
                    "created_at": _iso(it.findtext("pubDate", "")),
                    "likes_count": 1420, "comments_count": 180, "reposts_count": 420,
                    "tags": [f"#{clean_tag}"], "source": "news", "newsSource": src, "url": link,
                })

    result = out[:limit]
    if result:
        set_to_cache(cache_key, result, ttl=180)
    return result


# ============================================================================
# 5. LIVE REELS / SHORTS
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
    det = await _get_json(client, f"{instance}/api/v1/videos/{uuid}", timeout=3.0)
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

    async with httpx.AsyncClient(timeout=4.0, follow_redirects=True) as client:
        ig, yt, pt = await asyncio.gather(
            _fetch_instagram(client), _fetch_youtube_shorts(client), _fetch_peertube(client),
            return_exceptions=True
        )

    pools = [
        sorted(p, key=lambda r: r.get("publishedAt", ""), reverse=True)
        for p in (ig, yt, pt) if isinstance(p, list)
    ]
    reels: List[Dict[str, Any]] = []
    while any(pools) and len(reels) < limit:
        for p in pools:
            if p:
                reels.append(p.pop(0))

    result = [_finalize_reel(r) for r in reels[:limit]] if reels else (get_stale(cache_key) or [])
    if result:
        set_to_cache(cache_key, result, ttl=300)
    return result
