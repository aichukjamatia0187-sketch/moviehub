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

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[c]));

const poster = (m) =>
  m?.poster_path ? IMG + 'w500' + m.poster_path : '';

const backdrop = (m) =>
  m?.backdrop_path ? IMG + 'original' + m.backdrop_path : '';

const isTV = (m) =>
  m?.media_type === 'tv' || m?.name !== undefined;


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
    throw new Error(d.error || `Request failed (${r.status})`);
  }

  return d;
}


/* =========================
   MOVIE / TV CARD
========================= */

function card(m, forcedType) {
  const tv = forcedType === 'tv' || isTV(m);

  const title = tv ? m.name : m.title;
  const date = tv ? m.first_air_date : m.release_date;

  return `
    <article
      class="card"
      data-id="${m.id}"
      data-type="${tv ? 'tv' : 'movie'}"
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
          ${tv ? 'TV' : 'FILM'}
        </span>

      </div>

      <div class="card-info">

        <span class="card-title">
          ${esc(title)}
        </span>

        <span class="year">
          ${(date || '').slice(0, 4)}
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

  el.innerHTML = (arr || [])
    .filter((x) => x.poster_path)
    .slice(0, 14)
    .map((x) => card(x, type))
    .join('') || `
      <div class="empty">
        No titles found
      </div>
    `;
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

        location.href =
          `/movie.html?id=${encodeURIComponent(id)}&type=${encodeURIComponent(type)}`;

      };

    });
}


/* =========================
   HERO
========================= */

function setHero(m) {
  state.hero = m;

  if (!m) return;

  const tv = isTV(m);

  const title = tv ? m.name : m.title;
  const date = tv
    ? m.first_air_date
    : m.release_date;

  const heroTitle = $('#heroTitle');
  const heroOverview = $('#heroOverview');
  const heroBg = $('#heroBg');
  const heroMeta = $('#heroMeta');

  if (heroTitle) {
    heroTitle.textContent =
      title || 'Untitled';
  }

  if (heroOverview) {
    heroOverview.textContent =
      m.overview ||
      'No synopsis available.';
  }

  if (heroBg) {
    heroBg.style.backgroundImage =
      `url("${backdrop(m)}")`;
  }

  if (heroMeta) {
    heroMeta.innerHTML = `
      <span class="score">
        ${
          m.vote_average
            ? Number(m.vote_average).toFixed(1)
            : '—'
        }
      </span>

      <span>★</span>

      <span>
        ${
          m.vote_count
            ? Number(m.vote_count).toLocaleString()
            : '0'
        } votes
      </span>

      <span>
        ${(date || '').slice(0, 4)}
      </span>

      <span>
        ${tv ? 'TV' : 'FILM'}
      </span>
    `;
  }
}


/* =========================
   HOME DATA
========================= */

async function load() {
  try {

    const requests = [
      api('/api/trending'),
      api('/api/popular'),
      api('/api/now-playing'),
      api('/api/upcoming'),
      api('/api/genres'),

      api('/api/tv/popular'),
      api('/api/tv/trending'),
      api('/api/tv/today'),
      api('/api/tv/genres')
    ];

    /*
      Promise.allSettled means one failed
      section will not stop the entire homepage.
    */

    const results =
      await Promise.allSettled(requests);

    const get = (index) => {
      const result = results[index];

      if (
        result &&
        result.status === 'fulfilled'
      ) {
        return result.value || {};
      }

      return {};
    };


    const t = get(0);
    const p = get(1);
    const n = get(2);
    const u = get(3);
    const g = get(4);

    const tp = get(5);
    const tt = get(6);
    const ta = get(7);
    const tg = get(8);


    state.trending =
      t.results || [];

    state.popular =
      p.results || [];

    state.now =
      n.results || [];

    state.upcoming =
      u.results || [];

    state.genres =
      g.genres || [];

    state.tvPopular =
      tp.results || [];

    state.tvTrending =
      tt.results || [];

    state.tvToday =
      ta.results || [];

    state.tvGenres =
      tg.genres || [];


    /* HERO */

    setHero(
      state.trending[0] ||
      state.tvTrending[0] ||
      state.popular[0] ||
      {}
    );


    /* MOVIES */

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
      '#nowRail',
      state.now,
      'movie'
    );

    fill(
      '#upcomingRail',
      state.upcoming,
      'movie'
    );


    /* TV */

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


    /* GENRES */

    const allGenres = [
      ...state.genres,
      ...state.tvGenres.filter(
        (x) =>
          !state.genres.some(
            (g) => g.id === x.id
          )
      )
    ];


    const genresList =
      $('#genresList');

    if (genresList) {
      genresList.innerHTML =
        allGenres
          .map(
            (x) => `
              <button
                class="genre"
                data-genre="${x.id}"
              >
                ${esc(x.name)}
              </button>
            `
          )
          .join('');
    }


    /* CARD EVENTS */

    bindCards();


    /* REMOVE LOADING ELEMENT
       if your HTML has one */

    const loading =
      $('#loading');

    if (loading) {
      loading.style.display = 'none';
    }


    /* Check if any request failed */

    const failed =
      results.find(
        (x) => x.status === 'rejected'
      );

    if (failed) {
      console.warn(
        'Some MovieHub API requests failed:',
        failed.reason
      );
    }

  } catch (e) {

    console.error(e);

    toast(
      'TMDB connection error: ' +
      e.message
    );
  }
}


/* =========================
   DETAILS
========================= */

async function openDetails(id, type) {

  try {

    const endpoint =
      type === 'tv'
        ? `/api/tv/${id}`
        : `/api/movie/${id}`;

    const m =
      await api(endpoint);


    const tv =
      type === 'tv';

    const title =
      tv ? m.name : m.title;

    const date =
      tv
        ? m.first_air_date
        : m.release_date;


    /* TRAILER */

    const trailer =
      (m.videos?.results || [])
        .find(
          (v) =>
            v.site === 'YouTube' &&
            v.type === 'Trailer'
        ) ||

      (m.videos?.results || [])
        .find(
          (v) =>
            v.site === 'YouTube'
        );


    /* CAST */

    const cast =
      (m.credits?.cast || [])
        .slice(0, 10);


    /* RUNTIME */

    const runtime =
      tv

        ? (
            m.episode_run_time?.[0]
              ? m.episode_run_time[0] +
                ' min/episode'
              : 'Runtime N/A'
          )

        : (
            m.runtime
              ? m.runtime + ' min'
              : 'Runtime N/A'
          );


    /* PROVIDERS */

    let providers = null;

    try {

      providers =
        await api(
          `/api/${tv ? 'tv' : 'movie'}/providers/${id}?watch_region=IN`
        );

    } catch (e) {

      console.warn(
        'Provider request failed:',
        e
      );

      providers = null;
    }


    const region =
      providers?.results?.IN || {};


    const providerList = [

      ...(region.flatrate || []),

      ...(region.free || []),

      ...(region.ads || []),

      ...(region.rent || []),

      ...(region.buy || [])

    ].filter(
      (p, i, a) =>
        a.findIndex(
          (x) =>
            x.provider_id ===
            p.provider_id
        ) === i
    );


    const watchLink =
      region.link || '';


    /* TRAILER BUTTON */

    const trailerButton =
      trailer

        ? `
          <button
            class="btn primary"
            onclick="playTrailer('${esc(trailer.key)}')"
          >
            WATCH TRAILER
          </button>
        `

        : '';


    /* WATCH HERE BUTTON */

    const watchButton =
      watchLink

        ? `
          <a
            class="btn"
            href="${esc(watchLink)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            WATCH HERE
          </a>
        `

        : '';


    /* PROVIDER LIST */

    const providerInfo =
      providerList.length

        ? `
          <div
            class="watch-providers"
            style="margin-top:25px"
          >

            <div class="eyebrow">
              AVAILABLE ON
            </div>

            <div
              style="
                display:flex;
                flex-wrap:wrap;
                gap:10px;
                margin-top:12px;
              "
            >

              ${providerList
                .slice(0, 8)
                .map(
                  (p) => `
                    <div
                      style="
                        display:flex;
                        align-items:center;
                        gap:8px;
                        padding:8px 10px;
                        border:1px solid #302c24;
                        background:#11110f;
                        border-radius:4px;
                      "
                    >

                      ${
                        p.logo_path

                          ? `
                            <img
                              src="${
                                IMG +
                                'w92' +
                                p.logo_path
                              }"
                              alt="${esc(
                                p.provider_name
                              )}"
                              style="
                                width:28px;
                                height:28px;
                                object-fit:contain;
                              "
                            >
                          `

                          : ''
                      }

                      <span
                        style="
                          font:10px var(--mono);
                          color:#cfc7b8;
                        "
                      >
                        ${esc(
                          p.provider_name
                        )}
                      </span>

                    </div>
                  `
                )
                .join('')}

            </div>

            <small
              style="
                display:block;
                margin-top:10px;
                color:#777267;
                font:9px var(--mono);
              "
            >
              Streaming availability powered by JustWatch.
            </small>

          </div>
        `

        : '';


    /* DETAILS HTML */

    const modalBox =
      $('#modalBox');

    if (!modalBox) {
      throw new Error(
        'modalBox not found in index.html'
      );
    }


    modalBox.innerHTML = `

      <div
        class="details-hero"
        style="
          background-image:url('${backdrop(m)}')
        "
      >

        <div class="details-content">

          <div class="eyebrow">
            ${
              tv
                ? 'TV SHOW / DRAMA'
                : 'FILM'
            }
            DETAILS
          </div>


          <h2>
            ${esc(title)}
          </h2>


          <div class="meta">

            <span class="score">
              ${
                m.vote_average
                  ? Number(
                      m.vote_average
                    ).toFixed(1)
                  : '—'
              }
            </span>

            <span>★</span>

            <span>
              ${(date || '').slice(0, 4)}
            </span>

            <span>
              ${runtime}
            </span>

            ${
              tv &&
              m.number_of_seasons

                ? `
                  <span>
                    ${
                      m.number_of_seasons
                    }
                    season${
                      m.number_of_seasons > 1
                        ? 's'
                        : ''
                    }
                  </span>
                `

                : ''
            }

          </div>


          <p class="overview">
            ${
              esc(
                m.overview ||
                'No synopsis available.'
              )
            }
          </p>


          <div class="actions">

            ${trailerButton}

            ${watchButton}

          </div>


          ${providerInfo}

        </div>

      </div>


      <div class="details-body">

        <div>

          <h3>
            Cast
          </h3>


          <div class="credits">

            ${
              cast.length

                ? cast
                    .map(
                      (p) => `

                        <div class="person">

                          ${
                            p.profile_path

                              ? `
                                <img
                                  src="${
                                    IMG +
                                    'w185' +
                                    p.profile_path
                                  }"
                                  alt="${esc(
                                    p.name
                                  )}"
                                >
                              `

                              : `
                                <div
                                  style="
                                    width:82px;
                                    height:110px;
                                    background:#171715;
                                    display:grid;
                                    place-items:center;
                                    color:#777;
                                    font:9px var(--mono);
                                  "
                                >
                                  NO PHOTO
                                </div>
                              `
                          }


                          <span>
                            ${esc(p.name)}
                          </span>


                          ${
                            p.character

                              ? `
                                <small
                                  style="
                                    display:block;
                                    margin-top:3px;
                                    color:#666;
                                    font-size:9px;
                                  "
                                >
                                  ${esc(
                                    p.character
                                  )}
                                </small>
                              `

                              : ''
                          }

                        </div>

                      `
                    )
                    .join('')

                : `
                  <span
                    style="
                      color:#777;
                      font-size:11px;
                    "
                  >
                    Cast information unavailable.
                  </span>
                `
            }

          </div>

        </div>


        <div class="facts">

          <div>
            <b>
              Genres
            </b>
            <br>

            ${
              (m.genres || [])
                .map(
                  (g) =>
                    esc(g.name)
                )
                .join(' · ') ||
              '—'
            }

          </div>


          <div>
            <b>
              Original title
            </b>
            <br>

            ${
              esc(
                tv
                  ? m.original_name ||
                    '—'
                  : m.original_title ||
                    '—'
              )
            }

          </div>


          <div>
            <b>
              First release
            </b>
            <br>

            ${esc(date || '—')}

          </div>


          <div>
            <b>
              Language
            </b>
            <br>

            ${esc(
              m.original_language ||
              '—'
            ).toUpperCase()}

          </div>


          ${
            tv

              ? `
                <div>
                  <b>
                    Episodes
                  </b>
                  <br>
                  ${
                    m.number_of_episodes ||
                    '—'
                  }
                </div>
              `

              : ''
          }

        </div>

      </div>

    `;


    const modal =
      $('#modal');

    if (modal) {
      modal.classList.add('open');
    }


  } catch (e) {

    console.error(e);

    toast(
      'Details error: ' +
      e.message
    );
  }
}


/* =========================
   PLAY TRAILER
========================= */

function playTrailer(key) {

  if (!key) {
    toast(
      'Trailer is not available.'
    );

    return;
  }


  const modalBox =
    $('#modalBox');

  if (!modalBox) return;


  /*
    Trailer only starts AFTER
    user clicks WATCH TRAILER.
  */

  modalBox.innerHTML = `

    <div class="video">

      <iframe
        src="https://www.youtube.com/embed/${encodeURIComponent(
          key
        )}?autoplay=1&rel=0"
        title="Movie Trailer"
        allow="
          accelerometer;
          autoplay;
          clipboard-write;
          encrypted-media;
          gyroscope;
          picture-in-picture;
          web-share
        "
        allowfullscreen
      ></iframe>

    </div>

  `;
}


/* =========================
   CARD TRAILER
   Optional helper
========================= */

async function playCardTrailer(
  id,
  type
) {

  try {

    const m =
      await api(
        `/api/${
          type === 'tv'
            ? 'tv'
            : 'movie'
        }/${id}`
      );


    const v =
      (m.videos?.results || [])
        .find(
          (x) =>
            x.site === 'YouTube' &&
            x.type === 'Trailer'
        )

      ||

      (m.videos?.results || [])
        .find(
          (x) =>
            x.site === 'YouTube' &&
            x.type === 'Teaser'
        )

      ||

      (m.videos?.results || [])
        .find(
          (x) =>
            x.site === 'YouTube'
        );


    if (!v) {

      toast(
        'No trailer is listed for this title.'
      );

      return;
    }


    $('#modal')?.classList.add(
      'open'
    );

    playTrailer(v.key);

  } catch (e) {

    toast(e.message);

  }
}


/* =========================
   HERO TRAILER
========================= */

async function heroAction() {

  if (!state.hero) return;


  const type =
    isTV(state.hero)
      ? 'tv'
      : 'movie';


  try {

    const m =
      await api(
        `/api/${type}/${state.hero.id}`
      );


    const v =
      (m.videos?.results || [])
        .find(
          (x) =>
            x.site === 'YouTube' &&
            x.type === 'Trailer'
        )

      ||

      (m.videos?.results || [])
        .find(
          (x) =>
            x.site === 'YouTube'
        );


    if (!v) {

      toast(
        'No trailer is listed for this title.'
      );

      return;
    }


    await openDetails(
      state.hero.id,
      type
    );


    playTrailer(v.key);

  } catch (e) {

    toast(e.message);

  }
}


/* =========================
   BUTTONS
========================= */

const trailerBtn =
  $('#trailerBtn');

if (trailerBtn) {
  trailerBtn.onclick =
    heroAction;
}


const detailsBtn =
  $('#detailsBtn');

if (detailsBtn) {

  detailsBtn.onclick = () => {

    if (!state.hero) return;

    openDetails(
      state.hero.id,
      isTV(state.hero)
        ? 'tv'
        : 'movie'
    );

  };
}


/* =========================
   MODAL CLOSE
========================= */

const modalClose =
  $('#modalClose');

if (modalClose) {

  modalClose.onclick = () => {

    $('#modal')?.classList.remove(
      'open'
    );

    if ($('#modalBox')) {
      $('#modalBox').innerHTML = '';
    }

  };

}


const modal =
  $('#modal');

if (modal) {

  modal.onclick = (e) => {

    if (
      e.target.id === 'modal'
    ) {
      modalClose?.click();
    }

  };

}


/* =========================
   SEARCH
========================= */

const searchBtn =
  $('#searchBtn');

if (searchBtn) {

  searchBtn.onclick = () => {

    $('#searchPanel')
      ?.classList.add('open');

    $('#searchInput')
      ?.focus();

  };

}


const searchClose =
  $('#searchClose');

if (searchClose) {

  searchClose.onclick = () => {

    $('#searchPanel')
      ?.classList.remove('open');

  };

}


let timer;


const searchInput =
  $('#searchInput');

if (searchInput) {

  searchInput.oninput = () => {

    clearTimeout(timer);


    const q =
      searchInput.value.trim();


    if (!q) {

      $('#searchResults').innerHTML =
        '';

      return;
    }


    timer = setTimeout(
      async () => {

        try {

          const d =
            await api(
              '/api/search?q=' +
              encodeURIComponent(q)
            );


          const results =
            (d.results || [])
              .filter(
                (x) =>
                  x.poster_path &&
                  (
                    x.media_type ===
                      'movie' ||
                    x.media_type ===
                      'tv'
                  )
              )
              .slice(0, 20);


          const searchResults =
            $('#searchResults');

          if (!searchResults) {
            return;
          }


          searchResults.innerHTML =
            results
              .map(
                (x) => card(x)
              )
              .join('') ||

            `
              <div class="empty">
                No results found
              </div>
            `;


          bindCards(
            searchResults
          );


        } catch (e) {

          toast(
            'Search error: ' +
            e.message
          );

        }

      },
      300
    );

  };

}


/* =========================
   GENRE BUTTONS
========================= */

const genresList =
  $('#genresList');

if (genresList) {

  genresList.onclick = (e) => {

    const b =
      e.target.closest(
        '.genre'
      );


    if (!b) return;


    location.href =
  `/genre.html?id=${encodeURIComponent(b.dataset.genre)}&name=${encodeURIComponent(b.textContent.trim())}`;
  };
}

/* =========================
   TOAST
========================= */

function toast(t) {

  const el =
    $('#toast');

  if (!el) return;


  el.textContent = t;

  el.classList.add('show');


  setTimeout(
    () =>
      el.classList.remove(
        'show'
      ),
    3500
  );

}


/* =========================
   GLOBAL FUNCTIONS
========================= */

window.playTrailer =
  playTrailer;

window.openDetails =
  openDetails;

window.playCardTrailer =
  playCardTrailer;


/* =========================
   START MOVIEHUB
========================= */

load();
