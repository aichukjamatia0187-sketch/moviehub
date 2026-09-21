export default async function handler(req, res) {
  try {
    const token = process.env.TMDB_BEARER_TOKEN;

    if (!token) {
      return res.status(500).json({
        error: "TMDB_BEARER_TOKEN is not configured"
      });
    }

    let path = req.query.path || "";

    const routeMap = {
      "trending": "trending/movie/day",
      "popular": "movie/popular",
      "now-playing": "movie/now_playing",
      "upcoming": "movie/upcoming",
      "genres": "genre/movie/list",
      "tv/popular": "tv/popular",
      "tv/trending": "trending/tv/day",
      "tv/today": "tv/airing_today",
      "tv/genres": "genre/tv/list"
    };

    if (routeMap[path]) {
      path = routeMap[path];
    }

    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(req.query)) {
      if (key !== "path" && value !== undefined) {
        params.set(key, value);
      }
    }

    if (!params.has("language")) {
      params.set("language", "en-US");
    }
if (path.startsWith("movie/providers/")) {
  path = `movie/${path.split("/")[2]}/watch/providers`;
}

if (path.startsWith("tv/providers/")) {
  path = `tv/${path.split("/")[2]}/watch/providers`;
}
    const url = `https://api.themoviedb.org/3/${path}${
      params.toString() ? "?" + params.toString() : ""
    }`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    });

    const data = await response.json();

    return res.status(response.status).json(data);

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
