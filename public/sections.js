/* =========================================================
   MOVIEHUB – HOME SECTIONS (single source of truth)
   Home page aur VIEW ALL (browse.html) dono yahi use karte hain.
   Naam / order badalna ho to sirf yaha badlo.
   ========================================================= */
(function () {
  const day = (n = 0) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  const JUNK_TV = '10764,10767,10763,10766'; // Reality, Talk, News, Soap
  const POP = 'popularity.desc';

  const M = '/api/discover/movie';
  const T = '/api/discover/tv';

  // "For You": watchlist ke favourite genres se, warna general picks
  function forYouParams() {
    try {
      const items = JSON.parse(localStorage.getItem('moviehub_tracking_movie') || '[]');
      const count = {};
      items.forEach((m) => (m.genre_ids || []).forEach((g) => (count[g] = (count[g] || 0) + 1)));
      const top = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0]);
      if (top.length) return { with_genres: top.join('|'), sort_by: POP, 'vote_average.gte': 6.5, 'vote_count.gte': 300 };
    } catch (e) {}
    return { sort_by: 'vote_average.desc', 'vote_average.gte': 7, 'vote_count.gte': 800, 'primary_release_date.gte': '2015-01-01' };
  }

  const SECTIONS = [
    /* ============ FEATURED ============ */
    { group: 'Featured', key: 'trending', mode: 'movie', icon: '🔥', title: 'Trending',
      subtitle: 'The movies everyone is watching today.', endpoint: '/api/trending', params: {} },
    { group: 'Featured', key: 'top-rated', mode: 'movie', icon: '⭐', title: 'Top Rated',
      subtitle: 'Movies with the highest audience ratings.', endpoint: M,
      params: { sort_by: 'vote_average.desc', 'vote_count.gte': 2000 } },
    { group: 'Featured', key: 'now-playing', mode: 'movie', icon: '🎬', title: 'Now Playing',
      subtitle: 'Currently in theatres.', endpoint: '/api/now-playing', params: {} },
    { group: 'Featured', key: 'new-releases', mode: 'movie', icon: '🆕', title: 'New Releases',
      subtitle: 'Fresh movie releases.', endpoint: M,
      params: () => ({ sort_by: 'primary_release_date.desc', 'primary_release_date.gte': day(-60),
        'primary_release_date.lte': day(0), 'vote_count.gte': 10 }) },
    { group: 'Featured', key: 'coming-soon', mode: 'movie', icon: '📅', title: 'Coming Soon',
      subtitle: 'Movies coming soon.', endpoint: M,
      params: () => ({ sort_by: POP, 'primary_release_date.gte': day(1), 'primary_release_date.lte': day(240) }) },

    /* ============ GENRES ============ */
    { group: 'Genres', key: 'action', mode: 'movie', icon: '💥', title: 'Action',
      subtitle: 'Fights, chases and explosions.', endpoint: M,
      params: { with_genres: 28, sort_by: POP, 'vote_count.gte': 100 } },
    { group: 'Genres', key: 'romance', mode: 'movie', icon: '❤️', title: 'Romance',
      subtitle: 'Love stories worth watching.', endpoint: M,
      params: { with_genres: 10749, sort_by: POP, 'vote_count.gte': 100 } },
    { group: 'Genres', key: 'comedy', mode: 'movie', icon: '😂', title: 'Comedy',
      subtitle: 'Laugh out loud.', endpoint: M,
      params: { with_genres: 35, sort_by: POP, 'vote_count.gte': 100 } },
    { group: 'Genres', key: 'crime', mode: 'movie', icon: '🕵️', title: 'Crime',
      subtitle: 'Heists, detectives and gangsters.', endpoint: M,
      params: { with_genres: 80, sort_by: POP, 'vote_count.gte': 100 } },
    { group: 'Genres', key: 'thriller', mode: 'movie', icon: '🔪', title: 'Thriller',
      subtitle: 'Edge-of-your-seat suspense.', endpoint: M,
      params: { with_genres: 53, sort_by: POP, 'vote_count.gte': 100 } },
    { group: 'Genres', key: 'horror', mode: 'movie', icon: '👻', title: 'Horror',
      subtitle: 'Scary movies for the brave.', endpoint: M,
      params: { with_genres: 27, sort_by: POP, 'vote_count.gte': 100 } },
    { group: 'Genres', key: 'mind-bending', mode: 'movie', icon: '🧠', title: 'Mind-Bending',
      subtitle: 'Movies that will make you think.', endpoint: M,
      params: { with_genres: '878|9648|53', sort_by: 'vote_average.desc',
        'vote_average.gte': 7.2, 'vote_count.gte': 3000 } },
    { group: 'Genres', key: 'sci-fi', mode: 'movie', icon: '🚀', title: 'Sci-Fi',
      subtitle: 'Science fiction adventures.', endpoint: M,
      params: { with_genres: 878, sort_by: POP, 'vote_count.gte': 100 } },
    { group: 'Genres', key: 'drama', mode: 'movie', icon: '🎭', title: 'Drama',
      subtitle: 'Powerful stories.', endpoint: M,
      params: { with_genres: 18, sort_by: POP, 'vote_count.gte': 100 } },

    /* ============ ANIMATION & FAMILY ============ */
    { group: 'Animation & Family', key: 'animation', mode: 'movie', icon: '🎨', title: 'Animation',
      subtitle: 'Animated movies.', endpoint: M,
      params: { with_genres: 16, with_original_language: 'en', sort_by: POP, 'vote_count.gte': 100 } },
    { group: 'Animation & Family', key: 'anime', mode: 'movie', icon: '🇯🇵', title: 'Anime',
      subtitle: 'Japanese anime movies.', endpoint: M,
      params: { with_genres: 16, with_original_language: 'ja', sort_by: POP, 'vote_count.gte': 30 } },
    { group: 'Animation & Family', key: 'family', mode: 'movie', icon: '🧸', title: 'Family',
      subtitle: 'Fun for the whole family.', endpoint: M,
      params: { with_genres: 10751, sort_by: POP, 'vote_count.gte': 100 } },

    /* ============ REGIONS ============ */
    { group: 'Regions', key: 'indian', mode: 'movie', icon: '🇮🇳', title: 'Indian',
      subtitle: 'Popular Indian movies.', endpoint: M,
      params: { with_origin_country: 'IN', sort_by: POP, 'vote_count.gte': 20 } },
    { group: 'Regions', key: 'international', mode: 'movie', icon: '🌎', title: 'International',
      subtitle: 'Popular movies from around the world.', endpoint: M,
      params: { with_original_language: 'ko', sort_by: POP, 'vote_count.gte': 50 },
      // home page par in sab languages ko merge karte hain
      queries: ['ko', 'fr', 'es', 'de', 'it', 'pt', 'tr', 'zh']
        .map((l) => ({ with_original_language: l, sort_by: POP, 'vote_count.gte': 50 })) },

    /* ============ WEB SERIES (/discover/tv) ============ */
    { group: 'Web Series', key: 'trending-series', mode: 'tv', icon: '📺', title: 'Trending Series',
      subtitle: 'Series everyone is watching.', endpoint: '/api/tv/trending', params: {} },
    { group: 'Web Series', key: 'popular-series', mode: 'tv', icon: '⭐', title: 'Popular Series',
      subtitle: 'Popular TV shows and web series.', endpoint: T,
      params: { sort_by: POP, without_genres: JUNK_TV, 'vote_count.gte': 200 } },
    { group: 'Web Series', key: 'k-drama', mode: 'tv', icon: '🇰🇷', title: 'K-Drama',
      subtitle: 'Korean drama series.', endpoint: T,
      params: { with_original_language: 'ko', with_genres: 18, without_genres: JUNK_TV, sort_by: POP } },
    { group: 'Web Series', key: 'j-series', mode: 'tv', icon: '🇯🇵', title: 'J-Series',
      subtitle: 'Japanese series.', endpoint: T,
      params: { with_original_language: 'ja', without_genres: JUNK_TV + ',16', sort_by: POP } },
    { group: 'Web Series', key: 'c-series', mode: 'tv', icon: '🇨🇳', title: 'C-Series',
      subtitle: 'Chinese series.', endpoint: T,
      params: { with_original_language: 'zh', without_genres: JUNK_TV, sort_by: POP } },
    { group: 'Web Series', key: 'series-crime', mode: 'tv', icon: '🕵️', title: 'Crime',
      subtitle: 'Crime series.', endpoint: T,
      params: { with_genres: 80, without_genres: JUNK_TV, sort_by: POP, 'vote_count.gte': 100 } },
    { group: 'Web Series', key: 'series-sci-fi', mode: 'tv', icon: '🚀', title: 'Sci-Fi',
      subtitle: 'Sci-Fi & Fantasy series.', endpoint: T,
      params: { with_genres: 10765, without_genres: JUNK_TV, sort_by: POP, 'vote_count.gte': 100 } },
    { group: 'Web Series', key: 'series-anime', mode: 'tv', icon: '🎨', title: 'Anime',
      subtitle: 'Anime series.', endpoint: T,
      params: { with_genres: 16, with_original_language: 'ja', sort_by: POP, 'vote_count.gte': 30 } },

    /* ============ DISCOVER ============ */
    { group: 'Discover', key: 'hidden-gems', mode: 'movie', icon: '💎', title: 'Hidden Gems',
      subtitle: 'Great movies you may have missed.', endpoint: M,
      params: { sort_by: 'vote_average.desc', 'vote_average.gte': 7.3,
        'vote_count.gte': 300, 'vote_count.lte': 2000 } },
    { group: 'Discover', key: 'for-you', mode: 'movie', icon: '🎯', title: 'For You',
      subtitle: 'Picked based on your watchlist.', endpoint: M, params: forYouParams }
  ];

  const resolve = (p) => (typeof p === 'function' ? p() : p);

  const BROWSE_CONFIGS = {};
  SECTIONS.forEach((s) => {
    BROWSE_CONFIGS[s.key] = {
      title: s.title, subtitle: s.subtitle, endpoint: s.endpoint,
      get params() { return resolve(s.params); }, mode: s.mode
    };
  });
  // purane VIEW ALL links ke liye
  const alias = { 'highly-rated': 'top-rated', webseries: 'popular-series', korean: 'k-drama',
    china: 'international', japanese: 'anime', hollywood: 'trending', 'late-night': 'thriller',
    'true-stories': 'drama' };
  Object.entries(alias).forEach(([a, k]) => (BROWSE_CONFIGS[a] = BROWSE_CONFIGS[k]));

  window.MH_SECTIONS = SECTIONS;
  window.MH_RESOLVE = (s) => resolve(s.params);
  window.BROWSE_CONFIGS = BROWSE_CONFIGS;
})();
