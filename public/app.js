const $ = (s) => document.querySelector(s);

const IMG = 'https://image.tmdb.org/t/p/';

const state = {
  trending: [],
  popular: [],
  now: [],
  upcoming: [],
  tvPopular: [],
  tvTrending: [],
  tvToday: [],
  genres: [],
  tvGenres: [],
  hero: null
};


/* =========================
   HELPERS
========================= */

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[c]));


const poster = (m) =>
  m?.poster_path
    ? IMG + 'w500' + m.poster_path
    : '';


const backdrop = (m) =>
  m?.backdrop_path
    ? IMG + 'original' + m.backdrop_path
    : '';


const isTV = (m) =>
  m?.media_type === 'tv' ||
  (
    m?.name !== undefined &&
    m?.title === undefined
  );


const getTitle = (m, type) => {
  if (type === 'tv') {
    return m?.name || m?.original_name || 'Untitled';
  }

  return m?.title || m?.original_title || 'Untitled';
};


const getDate = (m, type) => {
  return type === 'tv'
    ? (m?.first_air_date || '')
    : (m?.release_date || '');
};


/* =========================
   API
========================= */

async function api(url) {

  const r = await fetch(url, {
    headers: {
      Accept: 'application/json'
    }
  });

  let d;

  try {
    d = await r.json();
  } catch {
    throw new Error(`API error ${r.status}`);
  }

  if (!r.ok || d.error) {
    throw new Error(
      d.error || `Request failed (${r.status})`
    );
  }

  return d;
}


/* =========================
   CARD
========================= */

function card(m, forcedType) {

  const tv =
    forcedType === 'tv'
      ? true
      : forcedType === 'movie'
        ? false
        : isTV(m);

  const type =
    tv ? 'tv' : 'movie';

  const title =
    getTitle(m, type);

  const date =
    getDate(m, type);

  return `
    <article
      class="card"
      data-id="${esc(m.id)}"
      data-type="${type}"
    >

      <div class="poster">

        ${
          m.poster_path
            ? `
              <img
                loading="lazy"
                src="${poster(m)}"
                alt="${esc(title)}"
              >
            `
            : `
              <div class="empty">
                NO POSTER
              </div>
            `
        }

        <span class="badge">
          ${type === 'tv' ? 'TV' : 'FILM'}
        </span>

      </div>

      <div class="card-info">

        <span class="card-title">
          ${esc(title)}
        </span>

        <span class="year">
          ${esc((date || '').slice(0, 4))}
        </span>

      </div>

    </article>
  `;
}


/* =========================
   FILL SECTION
========================= */

function fill(id, arr, type) {

  const el = $(id);

  if (!el) return;

  const clean =
    Array.isArray(arr)
      ? arr
          .filter(Boolean)
          .filter(x =>
            type === 'tv'
              ? isTV(x)
              : !isTV(x)
          )
          .filter(x => x.poster_path)
      : [];

  el.innerHTML =
    clean
      .slice(0, 14)
      .map(x => card(x, type))
      .join('') ||
    `
      <div class="empty">
        No titles found
      </div>
    `;
}


/* =========================
   WATCHLIST
========================= */

function loadHomeWatchlist() {

  const section =
    $('#watchlistSection');

  const rail =
    $('#watchlistRail');

  if (!section || !rail) return;

  let movies = [];
  let tv = [];

  try {

    movies = JSON.parse(
      localStorage.getItem(
        'moviehub_tracking_movie'
      ) || '[]'
    );

    tv = JSON.parse(
      localStorage.getItem(
        'moviehub_tracking_tv'
      ) || '[]'
    );

  } catch (error) {

    console.warn(
      'Watchlist could not be loaded:',
      error
    );

    return;
  }


  const items = [

    ...movies.map(item => ({
      ...item,
      media_type: 'movie'
    })),

    ...tv.map(item => ({
      ...item,
      media_type: 'tv'
    }))

  ];


  items.sort((a, b) =>
    String(b.added_at || '')
      .localeCompare(
        String(a.added_at || '')
      )
  );


  if (!items.length) {

    section.style.display = 'none';

    return;
  }


  section.style.display = 'block';


  rail.innerHTML =
    items
      .slice(0, 14)
      .map(item => {

        const type =
          item.media_type === 'tv'
            ? 'tv'
            : 'movie';

        return `
          <article
            class="card"
            data-id="${esc(item.id)}"
            data-type="${type}"
          >

            <div class="poster">

              <div class="empty">
                LOADING
              </div>

            </div>

            <div class="card-info">

              <span class="card-title">
                ${esc(
                  item.title ||
                  item.name ||
                  'Untitled'
                )}
              </span>

              <span class="year">
                ${esc(
                  (
                    item.release_date ||
                    item.first_air_date ||
                    ''
                  ).slice(0, 4)
                )}
              </span>

            </div>

          </article>
        `;

      })
      .join('');


  items
    .slice(0, 14)
    .forEach(async (item) => {

      try {

        const type =
          item.media_type === 'tv'
            ? 'tv'
            : 'movie';

        const data =
          await api(
            `/api/${type}/${encodeURIComponent(item.id)}`
          );

        const element =
          rail.querySelector(
            `.card[data-id="${item.id}"][data-type="${type}"]`
          );

        if (!element) return;

        const posterBox =
          element.querySelector('.poster');

        if (!posterBox) return;

        const title =
          getTitle(data, type);

        posterBox.innerHTML =
          data.poster_path
            ? `
              <img
                loading="lazy"
                src="${poster(data)}"
                alt="${esc(title)}"
              >

              <span class="badge">
                ${type === 'tv' ? 'TV' : 'FILM'}
              </span>
            `
            : `
              <div class="empty">
                NO POSTER
              </div>
            `;

      } catch (error) {

        console.warn(
          'Watchlist item failed:',
          item.id,
          error
        );

      }

    });


  bindCards(rail);
}


/* =========================
   CARD CLICK
========================= */

function bindCards(root = document) {
  root
    .querySelectorAll('.card[data-id]')
    .forEach((c) => {

      c.onclick = () => {

        const id =
          c.dataset.id;

        const type =
          c.dataset.type || 'movie';

        if (!id) return;

        window.location.href =
          `/movie.html?id=${encodeURIComponent(id)}&type=${encodeURIComponent(type)}`;
      };

    });
}

/* =========================
   SECTION HELPERS
========================= */

function showSection(id, show = true) {

  const el = $(id);

  if (!el) return;

  el.style.display =
    show ? '' : 'none';
}


function sectionHasItems(arr) {

  return Array.isArray(arr) &&
    arr.some(
      item =>
        item &&
        item.poster_path
    );
}


/* =========================
   CATEGORY CONFIG
========================= */

const CATEGORY_CONFIG = {

  action: {
    type: 'movie',
    genre: 28
  },

  adventure: {
    type: 'movie',
    genre: 12
  },

  animation: {
    type: 'movie',
    genre: 16
  },

  comedy: {
    type: 'movie',
    genre: 35
  },

  crime: {
    type: 'movie',
    genre: 80
  },

  documentary: {
    type: 'movie',
    genre: 99
  },

  drama: {
    type: 'movie',
    genre: 18
  },

  family: {
    type: 'movie',
    genre: 10751
  },

  fantasy: {
    type: 'movie',
    genre: 14
  },

  history: {
    type: 'movie',
    genre: 36
  },

  horror: {
    type: 'movie',
    genre: 27
  },

  music: {
    type: 'movie',
    genre: 10402
  },

  mystery: {
    type: 'movie',
    genre: 9648
  },

  romance: {
    type: 'movie',
    genre: 10749
  },

  'science-fiction': {
    type: 'movie',
    genre: 878
  },

  thriller: {
    type: 'movie',
    genre: 53
  },

  war: {
    type: 'movie',
    genre: 10752
  },

  western: {
    type: 'movie',
    genre: 37
  },


  /*
   * MIND-BENDING
   *
   * Only movies having BOTH:
   * Sci-Fi + Thriller
   */

  'mind-bending': {
    type: 'movie',
    genres: '878,53'
  },


  /*
   * ACTION & ADVENTURE
   *
   * Action OR Adventure
   */

  'action-adventure': {
    type: 'movie',
    genres: '28|12'
  },


  /*
   * INDIAN
   *
   * Movies originating from India.
   */

  indian: {
    type: 'movie',
    country: 'IN'
  },


  /*
   * KOREAN
   */

  korean: {
    type: 'movie',
    country: 'KR'
  },


  /*
   * JAPANESE
   */

  japanese: {
    type: 'movie',
    country: 'JP'
  },


  /*
   * CHINESE
   */

  chinese: {
    type: 'movie',
    country: 'CN'
  },


  /*
   * HOLLYWOOD
   *
   * US + English original language.
   */

  hollywood: {
    type: 'movie',
    country: 'US',
    language: 'en'
  },


  /*
   * WEB SERIES
   *
   * TV ONLY.
   */

  webseries: {
    type: 'tv'
  }

};


/* =========================
   DISCOVER URL
========================= */

function buildDiscoverURL(config = {}) {

  const type =
    config.type === 'tv'
      ? 'tv'
      : 'movie';

  const params =
    new URLSearchParams();


  params.set(
    'page',
    config.page || '1'
  );


  params.set(
    'sort_by',
    config.sort_by ||
      'popularity.desc'
  );


  params.set(
    'include_adult',
    'false'
  );


  params.set(
    'include_video',
    'false'
  );


  /*
   * MOVIE / TV GENRES
   */

  if (config.genre) {

    params.set(
      'with_genres',
      String(config.genre)
    );

  }


  if (config.genres) {

    params.set(
      'with_genres',
      String(config.genres)
    );

  }


  /*
   * COUNTRY
   */

  if (config.country) {

    params.set(
      'with_origin_country',
      String(config.country)
    );

  }


  /*
   * LANGUAGE
   */

  if (config.language) {

    params.set(
      'with_original_language',
      String(config.language)
    );

  }


  /*
   * RATING
   */

  if (
    config.vote_average_gte !== undefined
  ) {

    params.set(
      'vote_average.gte',
      String(
        config.vote_average_gte
      )
    );

  }


  /*
   * VOTE COUNT
   */

  if (
    config.vote_count_gte !== undefined
  ) {

    params.set(
      'vote_count.gte',
      String(
        config.vote_count_gte
      )
    );

  }


  /*
   * YEAR
   */

  if (config.year) {

    if (type === 'tv') {

      params.set(
        'first_air_date_year',
        String(config.year)
      );

    } else {

      params.set(
        'primary_release_year',
        String(config.year)
      );

    }

  }


  /*
   * TV-SPECIFIC SAFETY
   */

  if (type === 'tv') {

    params.set(
      'include_null_first_air_dates',
      'false'
    );

  }


  return `/api/discover/${type}?${params.toString()}`;
}


/* =========================
   DISCOVER CATEGORY
========================= */

async function discoverCategory(
  category
) {

  const config =
    CATEGORY_CONFIG[category];

  if (!config) {

    console.warn(
      `Unknown MovieHub category: ${category}`
    );

    return [];

  }


  try {

    const url =
      buildDiscoverURL(config);

    const data =
      await api(url);

    const results =
      Array.isArray(data?.results)
        ? data.results
        : [];


    return results
      .filter(Boolean)
      .filter(item => {

        /*
         * STRICT MEDIA TYPE
         */

        if (config.type === 'tv') {

          return (
            item.name !== undefined &&
            item.title === undefined
          );

        }


        return (
          item.title !== undefined &&
          item.name === undefined
        );

      })
      .map(item => ({

        ...item,

        media_type:
          config.type

      }));

  } catch (error) {

    console.warn(
      `Category failed: ${category}`,
      error
    );

    return [];

  }
}


/* =========================
   CATEGORY CACHE
========================= */

const categoryCache =
  new Map();


async function getCategory(
  category
) {

  if (
    categoryCache.has(category)
  ) {

    return categoryCache.get(
      category
    );

  }


  const promise =
    discoverCategory(category);


  categoryCache.set(
    category,
    promise
  );


  return promise;
}


/* =========================
   CATEGORY RAIL MAP
========================= */

const CATEGORY_RAILS = {

  action:
    '#actionRail',

  adventure:
    '#adventureRail',

  animation:
    '#animationRail',

  comedy:
    '#comedyRail',

  crime:
    '#crimeRail',

  documentary:
    '#documentaryRail',

  drama:
    '#dramaRail',

  family:
    '#familyRail',

  fantasy:
    '#fantasyRail',

  history:
    '#historyRail',

  horror:
    '#horrorRail',

  music:
    '#musicRail',

  mystery:
    '#mysteryRail',

  romance:
    '#romanceRail',

  thriller:
    '#thrillerRail',

  'science-fiction':
    '#scienceFictionRail',

  'mind-bending':
    '#mindBendingRail',

  'action-adventure':
    '#actionAdventureRail',

  indian:
    '#indianRail',

  korean:
    '#koreanRail',

  japanese:
    '#japaneseRail',

  chinese:
    '#chineseRail',

  hollywood:
    '#hollywoodRail',

  webseries:
    '#webseriesRail'

};


/* =========================
   UNIQUE TITLES
========================= */

function uniqueTitles(
  items = []
) {

  const seen =
    new Set();

  return items.filter(
    item => {

      if (!item || !item.id) {
        return false;
      }

      const type =
        isTV(item)
          ? 'tv'
          : 'movie';

      const key =
        `${type}:${item.id}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;

    }
  );
}


/* =========================
   ONLY MOVIES
========================= */

function onlyMovies(
  items = []
) {

  return uniqueTitles(
    items.filter(
      item =>
        item &&
        !isTV(item) &&
        item.title !== undefined
    )
  );
}


/* =========================
   ONLY TV
========================= */

function onlyTV(
  items = []
) {

  return uniqueTitles(
    items.filter(
      item =>
        item &&
        isTV(item) &&
        item.name !== undefined
    )
  );
}


/* =========================
   CATEGORY RESULT CLEANER
========================= */

function cleanCategoryResults(
  items,
  category
) {

  const config =
    CATEGORY_CONFIG[category];

  if (!config) {
    return [];
  }


  let result =
    Array.isArray(items)
      ? items
      : [];


  /*
   * STRICT MEDIA TYPE
   */

  if (config.type === 'tv') {

    result =
      onlyTV(result);

  } else {

    result =
      onlyMovies(result);

  }


  /*
   * POSTER ONLY
   */

  result =
    result.filter(
      item =>
        item &&
        item.poster_path
    );


  /*
   * Additional safety for
   * Mind-Bending.
   *
   * Must contain BOTH:
   * Sci-Fi 878
   * Thriller 53
   */

  if (
    category === 'mind-bending'
  ) {

    result =
      result.filter(item => {

        const genres =
          Array.isArray(
            item.genre_ids
          )
            ? item.genre_ids
            : [];

        return (
          genres.includes(878) &&
          genres.includes(53)
        );

      });

  }


  /*
   * Additional safety for
   * Action & Adventure.
   *
   * Must contain either:
   * Action 28
   * OR Adventure 12
   */

  if (
    category === 'action-adventure'
  ) {

    result =
      result.filter(item => {

        const genres =
          Array.isArray(
            item.genre_ids
          )
            ? item.genre_ids
            : [];

        return (
          genres.includes(28) ||
          genres.includes(12)
        );

      });

  }


  /*
   * COUNTRY SAFETY
   *
   * This prevents unrelated titles
   * from appearing if TMDB returns
   * unexpected data.
   */

  if (
    config.country
  ) {

    result =
      result.filter(item => {

        const countries =
          Array.isArray(
            item.origin_country
          )
            ? item.origin_country
            : [];

        return countries.includes(
          config.country
        );

      });

  }


  /*
   * LANGUAGE SAFETY
   */

  if (
    config.language
  ) {

    result =
      result.filter(item =>
        item.original_language ===
        config.language
      );

  }


  /*
   * REMOVE DUPLICATES
   */

  result =
    uniqueTitles(result);


  return result;
}


/* =========================
   CATEGORY DISPLAY NAME
========================= */

function categoryDisplayName(
  category
) {

  const names = {

    action:
      'Action',

    adventure:
      'Adventure',

    animation:
      'Animation',

    comedy:
      'Comedy',

    crime:
      'Crime',

    documentary:
      'Documentary',

    drama:
      'Drama',

    family:
      'Family',

    fantasy:
      'Fantasy',

    history:
      'History',

    horror:
      'Horror',

    music:
      'Music',

    mystery:
      'Mystery',

    romance:
      'Romance',

    thriller:
      'Thriller',

    'science-fiction':
      'Science Fiction',

    'mind-bending':
      'Mind-Bending',

    'action-adventure':
      'Action & Adventure',

    indian:
      'Indian',

    korean:
      'Korean',

    japanese:
      'Japanese',

    chinese:
      'Chinese',

    hollywood:
      'Hollywood',

    webseries:
      'Web Series'

  };


  return (
    names[category] ||
    category
  );
}


/* =========================
   CATEGORY VISIBILITY
========================= */

function updateCategorySection(
  category,
  results
) {

  const railSelector =
    CATEGORY_RAILS[category];

  if (!railSelector) return;


  const rail =
    $(railSelector);

  if (!rail) return;


  const section =
    rail.closest('section');

  if (!section) return;


  const valid =
    cleanCategoryResults(
      results,
      category
    );


  if (!valid.length) {

    section.style.display =
      'none';

    return;
  }


  section.style.display =
    '';


  const heading =
    section.querySelector('h2');


  if (
    heading &&
    heading.dataset.autoCategory !== 'true'
  ) {

    return;
  }


  if (heading) {

    heading.textContent =
      categoryDisplayName(
        category
      );

    heading.dataset.autoCategory =
      'true';

  }
}


/* =========================
   RENDER CATEGORY
========================= */

async function renderCategorySafe(
  category
) {

  const selector =
    CATEGORY_RAILS[category];

  if (!selector) return;


  const rail =
    $(selector);

  if (!rail) return;


  rail.innerHTML = `
    <div class="loading">
      Loading...
    </div>
  `;


  try {

    const data =
      await getCategory(
        category
      );


    const results =
      cleanCategoryResults(
        data,
        category
      );


    updateCategorySection(
      category,
      results
    );


    if (!results.length) {

      rail.innerHTML = '';

      return;
    }


    const config =
      CATEGORY_CONFIG[category];


    rail.innerHTML =
      results
        .slice(0, 14)
        .map(item =>
          card(
            item,
            config.type
          )
        )
        .join('');


    bindCards(rail);

  } catch (error) {

    console.warn(
      `Could not render ${category}:`,
      error
    );

    rail.innerHTML = '';

  }
}


/* =========================
   LOAD CATEGORIES
========================= */

async function loadImportantCategories() {

  const categories = [

    'action',

    'adventure',

    'animation',

    'comedy',

    'crime',

    'documentary',

    'drama',

    'family',

    'fantasy',

    'history',

    'horror',

    'music',

    'mystery',

    'romance',

    'thriller',

    'science-fiction',

    'mind-bending',

    'action-adventure',

    'indian',

    'korean',

    'japanese',

    'chinese',

    'hollywood',

    'webseries'

  ];


  await Promise.allSettled(

    categories.map(
      category =>
        renderCategorySafe(
          category
        )
    )

  );
}


/* =========================
   GENERIC COLLECTION
========================= */

async function loadCollection(
  endpoint,
  type
) {

  try {

    const data =
      await api(endpoint);

    const results =
      Array.isArray(data?.results)
        ? data.results
        : [];


    return results
      .filter(Boolean)
      .filter(item => {

        if (type === 'tv') {

          return (
            item.name !== undefined &&
            item.title === undefined
          );

        }

        return (
          item.title !== undefined &&
          item.name === undefined
        );

      })
      .map(item => ({

        ...item,

        media_type:
          type

      }));

  } catch (error) {

    console.warn(
      `Collection failed: ${endpoint}`,
      error
    );

    return [];
  }
}


/* =========================
   HOME COLLECTIONS
========================= */

async function loadHomeCollections() {

  const results =
    await Promise.allSettled([

      loadCollection(
        '/api/trending',
        'movie'
      ),

      loadCollection(
        '/api/popular',
        'movie'
      ),

      loadCollection(
        '/api/now-playing',
        'movie'
      ),

      loadCollection(
        '/api/upcoming',
        'movie'
      ),

      loadCollection(
        '/api/tv/popular',
        'tv'
      ),

      loadCollection(
        '/api/tv/trending',
        'tv'
      ),

      loadCollection(
        '/api/tv/today',
        'tv'
      )

    ]);


  const value =
    (index) =>
      results[index]?.status ===
      'fulfilled'
        ? results[index].value
        : [];


  state.trending =
    value(0);

  state.popular =
    value(1);

  state.now =
    value(2);

  state.upcoming =
    value(3);

  state.tvPopular =
    value(4);

  state.tvTrending =
    value(5);

  state.tvToday =
    value(6);
}


/* =========================
   GENRES
========================= */

async function loadGenres() {

  const results =
    await Promise.allSettled([

      api('/api/genres'),

      api('/api/tv/genres')

    ]);


  state.genres =
    results[0]?.status === 'fulfilled'
      ? (
          Array.isArray(
            results[0].value?.genres
          )
            ? results[0].value.genres
            : []
        )
      : [];


  state.tvGenres =
    results[1]?.status === 'fulfilled'
      ? (
          Array.isArray(
            results[1].value?.genres
          )
            ? results[1].value.genres
            : []
        )
      : [];
}


/* =========================
   HERO
========================= */

function pickHero() {

  const candidates = [

    ...(state.trending || []),

    ...(state.popular || []),

    ...(state.tvTrending || []),

    ...(state.tvPopular || [])

  ];


  const item =
    candidates.find(
      x =>
        x &&
        x.backdrop_path
    );


  state.hero =
    item || null;


  return state.hero;
}


/* =========================
   HERO RENDER
========================= */

function renderHero() {

  const hero =
    $('.hero');

  if (!hero) return;


  const item =
    state.hero || pickHero();

  if (!item) return;


  const tv =
    isTV(item);

  const title =
    getTitle(
      item,
      tv ? 'tv' : 'movie'
    );

  const date =
    getDate(
      item,
      tv ? 'tv' : 'movie'
    );


  hero.style.backgroundImage =
    item.backdrop_path
      ? `
        linear-gradient(
          90deg,
          rgba(0,0,0,.96) 0%,
          rgba(0,0,0,.76) 34%,
          rgba(0,0,0,.25) 70%,
          rgba(0,0,0,.05) 100%
        ),
        linear-gradient(
          0deg,
          #08090d 0%,
          transparent 42%
        ),
        url("${backdrop(item)}")
      `
      : '';


  const titleEl =
    hero.querySelector(
      '[data-hero-title]'
    );

  const overviewEl =
    hero.querySelector(
      '[data-hero-overview]'
    );

  const metaEl =
    hero.querySelector(
      '[data-hero-meta]'
    );


  if (titleEl) {

    titleEl.textContent =
      title || 'Untitled';

  }


  if (overviewEl) {

    overviewEl.textContent =
      item.overview ||
      'Discover movies and TV shows on MovieHub.';

  }


  if (metaEl) {

    metaEl.innerHTML = `
      <span>
        ${esc(
          (date || '').slice(0, 4)
        )}
      </span>

      ${
        item.vote_average
          ? `
            <span>•</span>

            <span>
              ★ ${Number(
                item.vote_average
              ).toFixed(1)}
            </span>
          `
          : ''
      }

      <span>•</span>

      <span>
        ${tv ? 'TV' : 'FILM'}
      </span>
    `;

  }


  const details =
    hero.querySelector(
      '[data-hero-details]'
    );


  if (details) {

    details.onclick = () => {

      window.location.href =
        `/movie.html?id=${encodeURIComponent(
          item.id
        )}&type=${encodeURIComponent(
          tv ? 'tv' : 'movie'
        )}`;

    };

  }


  const trailer =
    hero.querySelector(
      '[data-hero-trailer]'
    );


  if (trailer) {

    trailer.onclick = () => {

      window.location.href =
        `/movie.html?id=${encodeURIComponent(
          item.id
        )}&type=${encodeURIComponent(
          tv ? 'tv' : 'movie'
        )}`;

    };

  }
}


/* =========================
   STANDARD SECTIONS
========================= */

function renderStandardSections() {

  fill(
    '#trendingRail',
    state.trending,
    'movie'
  );


  fill(
    '#popularRail',
    state.popular,
    'movie'
  );


  fill(
    '#nowPlayingRail',
    state.now,
    'movie'
  );


  fill(
    '#upcomingRail',
    state.upcoming,
    'movie'
  );


  fill(
    '#tvPopularRail',
    state.tvPopular,
    'tv'
  );


  fill(
    '#tvTrendingRail',
    state.tvTrending,
    'tv'
  );


  fill(
    '#tvTodayRail',
    state.tvToday,
    'tv'
  );


  bindCards();
}


/* =========================
   GENRE NAVIGATION
========================= */

function bindGenreLinks() {

  document
    .querySelectorAll(
      '[data-genre]'
    )
    .forEach(link => {

      link.onclick = (
        event
      ) => {

        event.preventDefault();


        const genre =
          link.dataset.genre;


        if (!genre) return;


        window.location.href =
          `/search.html?genre=${encodeURIComponent(
            genre
          )}`;

      };

    });
}


/* =========================
   SEARCH
========================= */

function bindSearch() {

  const forms =
    document.querySelectorAll(
      'form[data-search]'
    );


  forms.forEach(form => {

    form.addEventListener(
      'submit',
      event => {

        event.preventDefault();


        const input =
          form.querySelector(
            'input[name="q"], input[type="search"]'
          );


        const query =
          input?.value?.trim();


        if (!query) return;


        window.location.href =
          `/search.html?q=${encodeURIComponent(
            query
          )}`;

      }
    );

  });


  const searchButtons =
    document.querySelectorAll(
      '[data-search-button]'
    );


  searchButtons.forEach(button => {

    button.onclick = () => {

      const input =
        document.querySelector(
          'input[name="q"], input[type="search"]'
        );


      const query =
        input?.value?.trim();


      if (!query) {

        window.location.href =
          '/search.html';

        return;

      }


      window.location.href =
        `/search.html?q=${encodeURIComponent(
          query
        )}`;

    };

  });
}


/* =========================
   VIEW ALL
========================= */

function bindViewAll() {

  document
    .querySelectorAll(
      '[data-view-all]'
    )
    .forEach(link => {

      link.onclick = (
        event
      ) => {

        event.preventDefault();


        const category =
          link.dataset.viewAll;


        if (!category) return;


        window.location.href =
          `/search.html?category=${encodeURIComponent(
            category
          )}`;

      };

    });
}


/* =========================
   HOME INIT
========================= */

async function initHome() {

  try {

    await Promise.allSettled([

      loadHomeCollections(),

      loadGenres()

    ]);


    renderStandardSections();

    renderHero();

    loadHomeWatchlist();


    await loadImportantCategories();


    bindGenreLinks();

    bindSearch();

    bindViewAll();

    bindCards();


  } catch (error) {

    console.error(
      'MovieHub home initialization failed:',
      error
    );


  } finally {

    hidePageLoader();

  }

}


/* =========================
   PAGE START
========================= */

if (
  document.readyState ===
  'loading'
) {

  document.addEventListener(
    'DOMContentLoaded',
    () => {

      initHome();

    },
    {
      once: true
    }
  );

} else {

  initHome();

}
/* =========================
   HIDE PAGE LOADER
========================= */

function hidePageLoader() {

  const loader =
    document.querySelector(
      '#pageLoader, #loadingScreen, .page-loader, .loading-screen'
    );

  if (!loader) return;

  loader.style.opacity = '0';
  loader.style.pointerEvents = 'none';

  setTimeout(() => {

    loader.style.display = 'none';

  }, 300);

}
