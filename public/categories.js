/* =========================================================
   MovieHub — shared category definitions
   Used by the home page (app.js) AND the "View all" page
   (browse.html), so both always show the same titles.
========================================================= */
(function () {
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const shift = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return iso(d);
  };

  /* Superhero / franchise titles must never land in "Mind-Bending" */
  const NOT_MIND_BENDING =
    'spider|avengers|marvel|batman|superman|x-men|deadpool|venom|iron man|' +
    'thor|captain america|guardians of the galaxy|justice league|aquaman|' +
    'black panther|the flash|shazam|wolverine|fantastic four|star wars';

  const TV_NOISE = '10767,10763,10766,10764'; // talk, news, soap, reality

  /* Order = page order = duplicate priority.
     A title is shown only in the FIRST row where it qualifies. */
  const CATEGORIES = [
    {
      id: 'trending', rail: 'trendingRail', mode: 'movie',
      kicker: 'Right now', title: 'Trending Today',
      subtitle: 'The movies everyone is watching today.',
      browse: 'trending',
      endpoint: '/api/trending', params: {}
    },
    {
      id: 'highly-rated', rail: 'popularRail', mode: 'movie',
      kicker: 'All-time favourites', title: 'Highly Rated',
      subtitle: 'Movies with the highest audience ratings.',
      browse: 'highly-rated',
      endpoint: '/api/discover/movie',
      params: { sort_by: 'vote_average.desc', 'vote_count.gte': '2500', include_adult: 'false' }
    },
    {
      id: 'new-releases', rail: 'nowRail', mode: 'movie',
      kicker: 'Latest', title: 'New Releases',
      subtitle: 'Popular movies released in the last few weeks.',
      browse: 'new-releases',
      endpoint: '/api/discover/movie',
      params: {
        sort_by: 'popularity.desc',
        'primary_release_date.gte': shift(-75),
        'primary_release_date.lte': iso(today),
        'vote_count.gte': '10', include_adult: 'false'
      }
    },
    {
      id: 'webseries', rail: 'tvPopularRail', mode: 'tv',
      kicker: 'Binge-worthy', title: 'Web Series',
      subtitle: 'Popular TV shows and web series.',
      browse: 'webseries',
      endpoint: '/api/discover/tv',
      params: { sort_by: 'popularity.desc', without_genres: TV_NOISE, 'vote_count.gte': '50' }
    },
    {
      id: 'romance', rail: 'romanceRail', mode: 'movie',
      kicker: 'Genre', title: 'Romance',
      href: '/genre.html?id=10749&name=Romance',
      endpoint: '/api/discover/movie',
      params: { with_genres: '10749', sort_by: 'popularity.desc', 'vote_count.gte': '300', include_adult: 'false' }
    },
    {
      id: 'action', rail: 'actionRail', mode: 'movie',
      kicker: 'Genre', title: 'Action',
      href: '/genre.html?id=28&name=Action',
      endpoint: '/api/discover/movie',
      params: { with_genres: '28', sort_by: 'popularity.desc', 'vote_count.gte': '300', include_adult: 'false' }
    },
    {
      id: 'horror', rail: 'horrorRail', mode: 'movie',
      kicker: 'Genre', title: 'Horror',
      href: '/genre.html?id=27&name=Horror',
      endpoint: '/api/discover/movie',
      params: { with_genres: '27', sort_by: 'popularity.desc', 'vote_count.gte': '300', include_adult: 'false' }
    },
    {
      id: 'mind-bending', rail: 'mindBendingRail', mode: 'movie',
      kicker: 'Think twice', title: 'Mind-Bending',
      subtitle: 'Twisty sci-fi and mysteries that mess with your head.',
      browse: 'mind-bending',
      excludeTitle: NOT_MIND_BENDING,
      endpoint: '/api/discover/movie',
      params: {
        with_genres: '9648|878',
        without_genres: '16,10751,35',
        without_keywords: '9715,9717',        // superhero, based on comic
        sort_by: 'vote_average.desc',
        'vote_count.gte': '3000', include_adult: 'false'
      }
    },
    {
      id: 'true-stories', rail: 'trueStoriesRail', mode: 'movie',
      kicker: 'Real life', title: 'Based on True Stories',
      subtitle: 'Stories inspired by real events.',
      browse: 'true-stories',
      endpoint: '/api/discover/movie',
      params: { with_keywords: '9672', sort_by: 'popularity.desc', 'vote_count.gte': '300', include_adult: 'false' }
    },
    {
      id: 'family', rail: 'familyRail', mode: 'movie',
      kicker: 'Genre', title: 'Family Night',
      href: '/genre.html?id=10751&name=Family',
      endpoint: '/api/discover/movie',
      params: { with_genres: '10751', sort_by: 'popularity.desc', 'vote_count.gte': '300', include_adult: 'false' }
    },
    {
      id: 'hollywood', rail: 'hollywoodRail', mode: 'movie',
      kicker: 'Blockbusters', title: 'Hollywood',
      subtitle: 'English-language blockbusters.',
      browse: 'hollywood',
      endpoint: '/api/discover/movie',
      params: { with_original_language: 'en', sort_by: 'revenue.desc', 'vote_count.gte': '4000', include_adult: 'false' }
    },
    {
      id: 'late-night', rail: 'lateNightRail', mode: 'movie',
      kicker: 'After dark', title: 'Late Night Movies',
      subtitle: 'Crime and thrillers for your late-night watch.',
      browse: 'late-night',
      endpoint: '/api/discover/movie',
      params: {
        with_genres: '53,80', 'with_runtime.gte': '85', 'with_runtime.lte': '160',
        sort_by: 'popularity.desc', 'vote_count.gte': '500', include_adult: 'false'
      }
    },
    {
      id: 'korean', rail: 'koreanRail', mode: 'tv',
      kicker: 'World cinema', title: 'Korean Drama & More',
      subtitle: 'Popular Korean TV shows.',
      browse: 'korean',
      endpoint: '/api/discover/tv',
      params: { with_original_language: 'ko', without_genres: TV_NOISE, sort_by: 'popularity.desc', 'vote_count.gte': '20' }
    },
    {
      id: 'china', rail: 'chinaRail', mode: 'movie',
      kicker: 'World cinema', title: 'China',
      subtitle: 'Popular Chinese movies.',
      browse: 'china',
      endpoint: '/api/discover/movie',
      params: { with_original_language: 'zh', sort_by: 'popularity.desc', 'vote_count.gte': '50', include_adult: 'false' }
    },
    {
      id: 'japanese', rail: 'japaneseRail', mode: 'movie',
      kicker: 'World cinema', title: 'Japanese',
      subtitle: 'Popular Japanese movies.',
      browse: 'japanese',
      endpoint: '/api/discover/movie',
      params: { with_original_language: 'ja', sort_by: 'popularity.desc', 'vote_count.gte': '100', include_adult: 'false' }
    },
    {
      id: 'indian', rail: 'indianRail', mode: 'movie',
      kicker: 'World cinema', title: 'Indian',
      subtitle: 'Popular Indian movies.',
      browse: 'indian',
      endpoint: '/api/discover/movie',
      params: { with_origin_country: 'IN', sort_by: 'popularity.desc', 'vote_count.gte': '100', include_adult: 'false' }
    },
    {
      id: 'coming-soon', rail: 'upcomingRail', mode: 'movie',
      kicker: 'On the horizon', title: 'Coming Soon',
      subtitle: 'Movies releasing in the coming months.',
      browse: 'coming-soon',
      endpoint: '/api/discover/movie',
      params: {
        sort_by: 'popularity.desc',
        'primary_release_date.gte': shift(1),
        'primary_release_date.lte': shift(150),
        include_adult: 'false'
      }
    }
  ];

  /* "View all" link for every row */
  CATEGORIES.forEach((c) => {
    c.href = c.href || '/browse.html?type=' + c.browse;
  });

  /* Lookup for browse.html */
  const BROWSE = {};
  CATEGORIES.forEach((c) => {
    if (!c.browse) return;
    BROWSE[c.browse] = {
      title: c.title,
      subtitle: c.subtitle || '',
      endpoint: c.endpoint,
      params: c.params,
      mode: c.mode,
      excludeTitle: c.excludeTitle || ''
    };
  });

  window.MH_CATEGORIES = CATEGORIES;
  window.MH_BROWSE = BROWSE;
})();
