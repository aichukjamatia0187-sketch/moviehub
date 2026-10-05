/* =========================================================
   FREE ON YOUTUBE – official channels jo khud movies upload karte hain
   Nayi channel add karne ke liye bas ek line add karo:
     { name: "Channel Name", handle: "YouTubeHandle" }   // @ ke baad ka naam
     { name: "Channel Name", id: "UCxxxxxxxxxxxxxxxxxxxxxx" }
   Jo channel resolve na ho, wo chupchap skip ho jata hai.
   ========================================================= */
const YT_CHANNELS = [
  { name: "Goldmines", handle: "goldminestelefilms" },
  { name: "Goldmines Housefull", id: "UC2aBjYYDkwN5LLSB8957KZQ" },
  { name: "Shemaroo Movies", handle: "ShemarooMovies" },
  { name: "Rajshri", handle: "Rajshri" },
  { name: "Pen Movies", handle: "PenMovies" },
  { name: "Aditya Movies", handle: "AdityaMovies" },
  { name: "Movie Central", handle: "MovieCentral" },
  { name: "Cult Cinema Classics", handle: "CultCinemaClassics" },
  { name: "Popcornflix", handle: "Popcornflix" }
];

const FULL_MOVIE_RE =
  /full\s+(hindi\s+|dubbed\s+|hd\s+|length\s+)*(movie|film)|full\s+length|फुल\s*मूवी|पूरी\s*फिल्म/i;

const ytIdCache = new Map();

async function timedFetch(url, opts = {}, ms = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function resolveChannelId(ch) {
  if (ch.id) return ch.id;
  if (ytIdCache.has(ch.handle)) return ytIdCache.get(ch.handle);

  const r = await timedFetch("https://www.youtube.com/@" + encodeURIComponent(ch.handle), {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      Cookie: "CONSENT=YES+1"
    }
  });
  if (!r.ok) return null;
  const html = await r.text();
  const m =
    html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/) ||
    html.match(/"externalId":"(UC[\w-]{22})"/) ||
    html.match(/"channelId":"(UC[\w-]{22})"/);
  const id = m ? m[1] : null;
  if (id) ytIdCache.set(ch.handle, id);
  return id;
}

const decodeXml = (s) =>
  String(s || "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");

async function fetchChannelMovies(ch) {
  const cid = await resolveChannelId(ch);
  if (!cid) return [];

  const r = await timedFetch("https://www.youtube.com/feeds/videos.xml?channel_id=" + cid);
  if (!r.ok) return [];
  const xml = await r.text();

  const out = [];
  const entries = xml.split("<entry>").slice(1);
  for (const e of entries) {
    const id = (e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
    const title = decodeXml((e.match(/<title>([^<]*)<\/title>/) || [])[1]);
    const published = (e.match(/<published>([^<]+)<\/published>/) || [])[1] || "";
    if (!id || !title || !FULL_MOVIE_RE.test(title)) continue;
    out.push({ id, title, channel: ch.name, published });
  }
  return out;
}

export default async function handler(req, res) {
  try {
    const token = process.env.TMDB_BEARER_TOKEN;

    if (!token) {
      return res.status(500).json({
        error: "TMDB_BEARER_TOKEN is not configured"
      });
    }

  let path = req.query.path || "";

if (!path && req.url) {
  const cleanUrl = req.url.split('?')[0];

  if (cleanUrl.startsWith('/api/')) {
    path = cleanUrl
      .replace(/^\/api\//, '')
      .replace(/\/$/, '');
  }
}  

    /* =========================
       FREE ON YOUTUBE (official channels, embed only)
    ========================= */

    if (path === "free/youtube") {
      res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

      const parts = await Promise.allSettled(YT_CHANNELS.map(fetchChannelMovies));
      const seen = new Set();
      const results = [];

      parts.forEach((p) => {
        if (p.status !== "fulfilled") return;
        p.value.forEach((v) => {
          if (!seen.has(v.id)) { seen.add(v.id); results.push(v); }
        });
      });

      results.sort((a, b) => (b.published || "").localeCompare(a.published || ""));
      return res.status(200).json({ results: results.slice(0, 80) });
    }

    /* =========================
       FREE CLASSICS (Internet Archive, public domain)
       TMDB token ki zaroorat nahi
    ========================= */

    if (path === "free/list" || path.startsWith("free/item/")) {
      res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");

      if (path === "free/list") {
        const q =
          "collection:feature_films AND mediatype:movies AND year:[1915 TO 1968]";
        const url =
          "https://archive.org/advancedsearch.php?q=" + encodeURIComponent(q) +
          "&fl[]=identifier&fl[]=title&fl[]=year&fl[]=downloads" +
          "&sort[]=" + encodeURIComponent("downloads desc") +
          "&rows=80&page=1&output=json";

        const r = await fetch(url);
        if (!r.ok) return res.status(502).json({ results: [] });
        const j = await r.json();
        const docs = (j.response && j.response.docs) || [];

        return res.status(200).json({
          results: docs
            .filter((d) => d.identifier && d.title)
            .map((d) => ({
              id: d.identifier,
              title: Array.isArray(d.title) ? d.title[0] : d.title,
              year: d.year || ""
            }))
        });
      }

      const id = path.split("/")[2] || "";
      if (!/^[A-Za-z0-9._-]+$/.test(id)) {
        return res.status(400).json({ error: "Invalid id" });
      }

      const r = await fetch("https://archive.org/metadata/" + id);
      if (!r.ok) return res.status(502).json({ error: "Not found" });
      const j = await r.json();
      const m = j.metadata || {};
      const one = (v) => (Array.isArray(v) ? v[0] : v) || "";

      return res.status(200).json({
        id,
        title: one(m.title),
        year: one(m.year),
        description: one(m.description),
        licenseurl: one(m.licenseurl)
      });
    }

    const routeMap = {
      "trending": "trending/movie/day",
      "popular": "movie/popular",
      "now-playing": "movie/now_playing",
      "upcoming": "movie/upcoming",
      "genres": "genre/movie/list",

      "tv/popular": "tv/popular",
      "tv/trending": "trending/tv/day",
      "tv/today": "tv/airing_today",
      "tv/genres": "genre/tv/list",
   "search/movie": "search/movie",
"search/tv": "search/tv",
  "search/person": "search/person",
"discover/movie": "discover/movie",
"discover/tv": "discover/tv"
    };

    if (routeMap[path]) {
      path = routeMap[path];
    }

    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(req.query)) {
      if (
        key !== "path" &&
        value !== undefined
      ) {
        params.set(key, value);
      }
    }

    if (!params.has("language")) {
      params.set("language", "en-US");
    }


    /* =========================
       MOVIE WATCH PROVIDERS
    ========================= */

    if (path.startsWith("movie/providers/")) {
      const id = path.split("/")[2];

      path = `movie/${id}/watch/providers`;
    }


    /* =========================
       TV WATCH PROVIDERS
    ========================= */

    if (path.startsWith("tv/providers/")) {
      const id = path.split("/")[2];

      path = `tv/${id}/watch/providers`;
    }


    /* =========================
       MOVIE / TV DETAILS
       Add credits + videos
    ========================= */

    const isMovieDetails =
      /^movie\/\d+$/.test(path);

    const isTVDetails =
      /^tv\/\d+$/.test(path);


    if (
      isMovieDetails ||
      isTVDetails
    ) {
      params.set(
        "append_to_response",
        "credits,videos"
      );
    }


    /* =========================
       TMDB REQUEST
    ========================= */

    const url =
      `https://api.themoviedb.org/3/${path}` +
      (
        params.toString()
          ? "?" + params.toString()
          : ""
      );


    const response =
      await fetch(url, {
        headers: {
          Authorization:
            `Bearer ${token}`,

          Accept:
            "application/json"
        }
      });


    const data =
      await response.json();


    return res
      .status(response.status)
      .json(data);


  } catch (error) {

    return res
      .status(500)
      .json({
        error: error.message
      });

  }
}
