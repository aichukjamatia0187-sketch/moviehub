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
   HOME WATCHLIST
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


  /* Latest tracked first */

  items.sort((a, b) =>
    String(b.added_at || '')
      .localeCompare(
        String(a.added_at || '')
      )
  );


  /* Nothing tracked */

  if (!items.length) {

    section.style.display = 'none';

    return;
  }


  /* Show Watchlist */

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
            data-id="${item.id}"
            data-type="${type}"
          >

            <div class="poster">

              <div class="empty">
                LOADING
              </div>

            </div>

            <div class="card-info">

              <span class="card-title">
                ${esc(item.title || 'Untitled')}
              </span>

              <span class="year">
                ${(item.release_date || '').slice(0, 4)}
              </span>

            </div>

          </article>
        `;

      })
      .join('');


  /*
    Load actual TMDB details
    so poster is available.
  */

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
            `/api/${type}/${item.id}`
          );

        const element =
          rail.querySelector(
            `.card[data-id="${item.id}"][data-type="${type}"]`
          );

        if (!element) return;

        const posterBox =
          element.querySelector('.poster');

        if (!posterBox) return;

        posterBox.innerHTML =
          data.poster_path
            ? `
              <img
                loading="lazy"
                src="${poster(data)}"
                alt="${esc(
                  type === 'tv'
                    ? data.name
                    : data.title
                )}"
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
   HERO AUTOPLAY TRAILER
========================= */

async function loadHeroTrailer(m) {
  const heroVideo = $('#heroVideo');
  const heroVideoFrame = $('#heroVideoFrame');

  if (!m || !heroVideo || !heroVideoFrame) return;

  // Video ko pehle hidden rakho.
  // Isliye slow network ya unavailable trailer mein banner hi dikhega.
  heroVideo.classList.remove('active');

  try {
    const tv = isTV(m);

    const details = await api(
      tv
        ? `/api/tv/${m.id}`
        : `/api/movie/${m.id}`
    );

    const videos =
      details?.videos?.results || [];

    const trailer =
      videos.find(v =>
        v.site === 'YouTube' &&
        v.type === 'Trailer'
      ) ||
      videos.find(v =>
        v.site === 'YouTube'
      );

    // Trailer hi nahi mila → banner rehne do.
    if (!trailer?.key) return;

    const videoId = trailer.key;

    function createHeroPlayer() {

      if (!window.YT || !window.YT.Player) {
        return;
      }

      new YT.Player('heroVideoFrame', {

        videoId: videoId,

        playerVars: {
          autoplay: 1,
          controls: 0,
          rel: 0,
          playsinline: 1,
          loop: 1,
          playlist: videoId
        },

        events: {

          onReady: (event) => {

            event.target.mute();

            event.target.playVideo();

          },

          onStateChange: (event) => {

            // Trailer actually start ho gaya.
            if (
              event.data ===
              YT.PlayerState.PLAYING
            ) {

              heroVideo.classList.add(
                'active'
              );

            }

          },

          onError: () => {

            // Owner ne embed disable kiya
            // ya video unavailable hai.
            heroVideo.classList.remove(
              'active'
            );

            console.warn(
              'Hero trailer unavailable. Showing banner.'
            );

          }

        }

      });

    }


    // YouTube IFrame API load karo.
    if (
      window.YT &&
      window.YT.Player
    ) {

      createHeroPlayer();

    } else {

      window.onYouTubeIframeAPIReady =
        createHeroPlayer;

      const script =
        document.createElement('script');

      script.src =
        'https://www.youtube.com/iframe_api';

      script.async = true;

      document.head.appendChild(
        script
      );

    }

  } catch (error) {

    // Kisi bhi error par banner hi rahega.
    heroVideo.classList.remove(
      'active'
    );

    console.warn(
      'Hero trailer unavailable. Showing banner:',
      error
    );

  }
}
/* =========================
   HOME DATA
========================= */

async function load() {
  try {

    /* =========================
       MOVIE DISCOVERY
    ========================= */

    /* =========================
       SECTIONS: sections.js se banate hain
       (har category ka naam sirf ek baar)
    ========================= */

    const SECTIONS = window.MH_SECTIONS || [];
    const host = $('#homeSections');

    if (host) {
      host.innerHTML = SECTIONS.map((s) => `
        <section class="section" id="sec-${s.key}">
          <div class="section-head">
            <div>
              <div class="section-kicker">${s.group}</div>
              <h2>${s.icon} ${s.title}</h2>
            </div>
            <a class="see view-all" href="/browse.html?type=${s.key}">VIEW ALL</a>
          </div>
          <div class="rail" id="rail-${s.key}"></div>
        </section>
      `).join('');
    }

    const toQuery = (o) => Object.entries(o || {})
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    // Har section ke 2 pages mangwate hain taaki dedupe ke baad bhi rail bhari rahe
    const fetchSection = async (s) => {
      const base = s.queries || [window.MH_RESOLVE(s)];
      const calls = [];
      base.forEach((p) => [1, 2].forEach((page) => {
        calls.push(api(s.endpoint + '?' + toQuery({ ...p, page })));
      }));
      const parts = await Promise.allSettled(calls);
      let all = [];
      parts.forEach((r) => {
        if (r.status === 'fulfilled') all = all.concat((r.value && r.value.results) || []);
      });
      // multi-query sections ko popularity se sort karo
      if (s.queries) all.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      // same item do baar na aaye
      const ids = new Set();
      all = all.filter((x) => !ids.has(x.id) && ids.add(x.id));
      return { results: all };
    };

    const results = await Promise.allSettled(SECTIONS.map(fetchSection));

    /* =========================
       DEDUPE: ek movie/show sirf ek hi section me
       (upar wale section ko priority)
    ========================= */

    const seen = { movie: new Set(), tv: new Set() };
    const discovery = {};

    SECTIONS.forEach((s, i) => {
      const r = results[i];
      const list = (r.status === 'fulfilled' && r.value && r.value.results) || [];
      const unique = list.filter((x) => x.poster_path && !seen[s.mode].has(x.id));
      // jo section chhup jayega, uske titles dusre sections se na rokein
      if (unique.length >= 8) unique.slice(0, 14).forEach((x) => seen[s.mode].add(x.id));
      discovery[s.key] = unique;
      fill('#rail-' + s.key, unique, s.mode);
    });

    // Jis section me kam titles hon (8 se kam), use chhupa do
    const MIN_ITEMS = 8;
    SECTIONS.forEach((s) => {
      if (discovery[s.key].length < MIN_ITEMS) {
        const el = $('#sec-' + s.key);
        if (el) el.style.display = 'none';
      }
    });

    /* =========================
       HERO
    ========================= */

    const hero =
      (discovery.trending || [])[0] ||
      (discovery['trending-series'] || [])[0] ||
      (discovery['top-rated'] || [])[0] ||
      {};

    setHero(hero);
    loadHeroTrailer(hero).catch(console.warn);


    /* =========================
       MY WATCHLIST
    ========================= */

    loadHomeWatchlist();

    bindCards();

    /* REMOVE LOADING ELEMENT
       if your HTML has one */

    const loading =
      $('#loading');

    if (loading) {
      loading.style.display = 'none';
    }
console.log('MovieHub LOAD FINISHED');

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

  
<a
  class="person"
  href="/person.html?id=${encodeURIComponent(p.id)}"
  data-person-id="${p.id}"
  style="cursor:pointer; text-decoration:none;"
>
              ${
                p.profile_path
                  ? `
                    <img
                      src="${IMG + 'w185' + p.profile_path}"
                      alt="${esc(p.name)}"
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

              <span>${esc(p.name)}</span>

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
                      ${esc(p.character)}
                    </small>
                  `
                  : ''
              }

            </a>

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
modalBox
  .querySelectorAll('.person[data-person-id]')
  .forEach((person) => {

    person.onclick = (e) => {

      e.stopPropagation();

      const id =
        person.dataset.personId;

      if (!id) return;

      window.location.href =
        `/person.html?id=${encodeURIComponent(id)}`;

    };

  });
const modal = $('#modal');
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


const modalCloseOverlay =
  $('#modal');

if (modalCloseOverlay) {

  modalCloseOverlay.onclick = (e) => {

    if (
      e.target.id === 'modal'
    ) {
      modalClose?.click();
    }

  };

}

/* =========================
   SMART SEARCH
========================= */

const searchBtn = $('#searchBtn');
const searchPanel = $('#searchPanel');
const searchInput = $('#searchInput');
const searchSubmit = $('#searchSubmit');
const searchClose = $('#searchClose');
const searchResults = $('#searchResults');

let currentSearchFilter = 'all';


/* OPEN SEARCH */

if (searchBtn) {
  searchBtn.onclick = () => {

    searchPanel?.classList.add('open');

    setTimeout(() => {
      searchInput?.focus();
    }, 250);

  };
}


/* CLOSE SEARCH */

function closeSearch() {

  searchPanel?.classList.remove('open');

  if (searchInput) {
    searchInput.value = '';
  }

  if (searchResults) {
    searchResults.innerHTML = '';
  }

}


if (searchClose) {
  searchClose.onclick = closeSearch;
}


/* ESC KEY */

document.addEventListener('keydown', (e) => {

  if (
    e.key === 'Escape' &&
    searchPanel?.classList.contains('open')
  ) {
    closeSearch();
  }

});


/* SEARCH SKELETON */

function showSearchSkeleton() {

  if (!searchResults) return;

  searchResults.innerHTML = '';

  for (let i = 0; i < 12; i++) {

    const skeleton =
      document.createElement('div');

    skeleton.className =
      'search-skeleton';

    skeleton.style.setProperty(
      '--i',
      i
    );

    searchResults.appendChild(
      skeleton
    );

  }

}


/* SMART QUERY PARSER */

function parseSmartQuery(query) {

  const original = query.trim();

  let text = original;

  const filters = {
    year: null,
    genre: null,
    type: null,
    minRating: null
  };


  /* YEAR */

  const yearMatch =
    text.match(/\b(19|20)\d{2}\b/);

  if (yearMatch) {

    filters.year =
      Number(yearMatch[0]);

    text =
      text.replace(
        yearMatch[0],
        ''
      );

  }


  /* RATING */

  const ratingMatch =
    text.match(
      /\b(?:rating|rated|score|above)\s*(?:of|over|above|:)?\s*(\d(?:\.\d)?)\b/i
    );

  if (ratingMatch) {

    filters.minRating =
      Number(ratingMatch[1]);

    text =
      text.replace(
        ratingMatch[0],
        ''
      );

  }


  /* TV */

  if (
    /\b(tv|tv shows|tv series|series|shows)\b/i.test(text)
  ) {

    filters.type = 'tv';

    text =
      text.replace(
        /\b(tv shows|tv series|tv|series|shows)\b/gi,
        ''
      );

  }


  /* MOVIE */

  if (
    /\b(movie|movies|film|films)\b/i.test(text)
  ) {

    filters.type = 'movie';

    text =
      text.replace(
        /\b(movies|movie|films|film)\b/gi,
        ''
      );

  }


  /* GENRES */

  const genres = {

    action: 28,
    adventure: 12,
    animation: 16,
    comedy: 35,
    crime: 80,
    documentary: 99,
    drama: 18,
    family: 10751,
    fantasy: 14,
    horror: 27,
    mystery: 9648,
    romance: 10749,
    'science fiction': 878,
    'sci fi': 878,
    'sci-fi': 878,
    thriller: 53,
    war: 10752,
    western: 37

  };


  for (const [name, id] of Object.entries(genres)) {

    const regex =
      new RegExp(
        `\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
        'i'
      );

    if (regex.test(text)) {

      filters.genre = id;

      text =
        text.replace(
          regex,
          ''
        );

      break;

    }

  }


  /* REMOVE COMMON SEARCH WORDS */

  text =
    text
      .replace(
        /\b(best|top|good|popular|highly rated|latest|new|recent|movies|movie|films|film|shows|show|series|tv)\b/gi,
        ' '
      )
      .replace(
        /\s+/g,
        ' '
      )
      .trim();


  return {
    original,
    searchText: text || original,
    filters
  };

}


/* RENDER SEARCH RESULTS */

function renderSmartResults(
  results
) {

  if (!searchResults) return;


  const filtered =
    results.filter((item) => {

      if (
        currentSearchFilter === 'movie' &&
        item.media_type !== 'movie'
      ) {
        return false;
      }

      if (
        currentSearchFilter === 'tv' &&
        item.media_type !== 'tv'
      ) {
        return false;
      }

      if (
        currentSearchFilter === 'person' &&
        item.media_type !== 'person'
      ) {
        return false;
      }

      return true;

    });


  if (!filtered.length) {

    searchResults.innerHTML = `
      <div
        class="empty"
        style="
          grid-column:1/-1;
          height:180px;
        "
      >
        NO RESULTS FOUND
      </div>
    `;

    return;

  }


  searchResults.innerHTML =
    filtered
      .slice(0, 30)
      .map((item, index) => {

        if (
          item.media_type === 'person'
        ) {

          return `
            <article
              class="card"
              data-person-id="${item.id}"
              style="--i:${index}"
            >

              <div class="poster">

                ${
                  item.profile_path

                    ? `
                      <img
                        loading="lazy"
                        src="${IMG}w500${item.profile_path}"
                        alt="${esc(item.name)}"
                      >
                    `

                    : `
                      <div class="empty">
                        NO PHOTO
                      </div>
                    `
                }

              </div>

              <div class="card-info">

                <span class="card-title">
                  ${esc(item.name)}
                </span>

                <span class="year">
                  PERSON
                </span>

              </div>

            </article>
          `;

        }


        return `
          <div style="--i:${index}">
            ${card(
              item,
              item.media_type
            )}
          </div>
        `;

      })
      .join('');


  bindCards(searchResults);


  searchResults
    .querySelectorAll(
      '[data-person-id]'
    )
    .forEach((personCard) => {

      personCard.onclick = () => {

        const id =
          personCard.dataset.personId;

        location.href =
          `/person.html?id=${encodeURIComponent(id)}`;

      };

    });

}


/* SMART SEARCH */


    
async function performSearch() {
  const rawQuery = searchInput?.value.trim();

  if (!rawQuery) return;

  showSearchSkeleton();

  try {
    const parsed = parseSmartQuery(rawQuery);

    const hasSmartFilters =
  parsed.filters.year ||
  parsed.filters.minRating ||
  parsed.filters.genre ||
  parsed.filters.type;

    let results = [];

    /*
      NORMAL SEARCH
      Example:
      Spider man
      Korean drama
      Interstellar
      Tom Cruise
    */
    if (!hasSmartFilters) {
      const [movieRes, tvRes, personRes] =
        await Promise.allSettled([
          fetch(`/api/search/movie?query=${encodeURIComponent(rawQuery)}&page=1`),
          fetch(`/api/search/tv?query=${encodeURIComponent(rawQuery)}&page=1`),
          fetch(`/api/search/person?query=${encodeURIComponent(rawQuery)}&page=1`)
        ]);

      const movieData =
        movieRes.status === 'fulfilled' && movieRes.value.ok
          ? await movieRes.value.json()
          : { results: [] };

      const tvData =
        tvRes.status === 'fulfilled' && tvRes.value.ok
          ? await tvRes.value.json()
          : { results: [] };

      const personData =
        personRes.status === 'fulfilled' && personRes.value.ok
          ? await personRes.value.json()
          : { results: [] };

      results = [
        ...(movieData.results || []).map(item => ({
          ...item,
          media_type: 'movie'
        })),

        ...(tvData.results || []).map(item => ({
          ...item,
          media_type: 'tv'
        })),

        ...(personData.results || []).map(item => ({
          ...item,
          media_type: 'person'
        }))
      ];

      /*
        Put exact text matches first.
        This makes searches like "Spider man"
        show Spider-Man results before unrelated results.
      */
      const q = rawQuery.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

      results.sort((a, b) => {
        const aName = (
          a.title ||
          a.name ||
          ''
        ).toLowerCase();

        const bName = (
          b.title ||
          b.name ||
          ''
        ).toLowerCase();

        const aClean = aName.replace(/[^a-z0-9]+/g, ' ').trim();
        const bClean = bName.replace(/[^a-z0-9]+/g, ' ').trim();

        const aExact = aClean === q;
        const bExact = bClean === q;

        const aStarts = aClean.startsWith(q);
        const bStarts = bClean.startsWith(q);

        if (aExact !== bExact) {
          return aExact ? -1 : 1;
        }

        if (aStarts !== bStarts) {
          return aStarts ? -1 : 1;
        }

        return (b.popularity || 0) - (a.popularity || 0);
      });
    }

    /*
      SMART SEARCH
      Example:
      Best action movies
      2025 comedy movies
      Best sci-fi TV shows
    */
    else {
      const params = new URLSearchParams();

      if (parsed.filters.year) {
  params.set(
    'primary_release_year',
    parsed.filters.year
  );
}

if (parsed.filters.minRating) {
  params.set(
    'vote_average.gte',
    parsed.filters.minRating
  );
}

if (parsed.filters.genre) {
  params.set(
    'with_genres',
    parsed.filters.genre
  );
}

      params.set('sort_by', 'popularity.desc');

      const endpoints = [];

      if (
  !parsed.filters.type ||
  parsed.filters.type === 'movie'
) {
        endpoints.push(
          `/api/discover/movie?${params.toString()}`
        );
      }

      if (
  !parsed.filters.type ||
  parsed.filters.type === 'tv'
) {
        const tvParams = new URLSearchParams();

if (parsed.filters.year) {
  tvParams.set(
    'first_air_date_year',
    parsed.filters.year
  );
}

if (parsed.filters.minRating) {
  tvParams.set(
    'vote_average.gte',
    parsed.filters.minRating
  );
}

if (parsed.filters.genre) {
  tvParams.set(
    'with_genres',
    parsed.filters.genre
  );
}

tvParams.set('sort_by', 'popularity.desc');

endpoints.push(
          `/api/discover/tv?${tvParams.toString()}`
        );
      }

      const responses = await Promise.all(
        endpoints.map(url =>
          fetch(url).then(res =>
            res.ok ? res.json() : { results: [] }
          )
        )
      );

      responses.forEach((data, index) => {
        const type =
          endpoints[index].includes('/movie/')
            ? 'movie'
            : 'tv';

        results.push(
          ...(data.results || []).map(item => ({
            ...item,
            media_type: type
          }))
        );
      });
    }

    /*
      Remove duplicates
    */
    const unique = new Map();

    results.forEach(item => {
      const key =
        `${item.media_type}-${item.id}`;

      if (!unique.has(key)) {
        unique.set(key, item);
      }
    });

    results = Array.from(unique.values());

    /*
      Current filter button
    */
    if (currentSearchFilter !== 'all') {
      results = results.filter(item => {
        if (currentSearchFilter === 'movie') {
          return item.media_type === 'movie';
        }

        if (currentSearchFilter === 'tv') {
          return item.media_type === 'tv';
        }

        return true;
      });
    }

    renderSmartResults(results);

  } catch (error) {
    console.error('Smart search error:', error);

    if (searchResults) {
      searchResults.innerHTML = `
        <div style="
          padding:40px 20px;
          text-align:center;
          color:#aaa;
        ">
          Search failed. Please try again.
        </div>
      `;
    }
  }
}

/* SEARCH BUTTON */

if (searchSubmit) {

  searchSubmit.onclick =
    performSearch;

}


/* ENTER KEY */

if (searchInput) {

  searchInput.onkeydown =
    (e) => {

      if (e.key === 'Enter') {

        e.preventDefault();

        performSearch();

      }

    };

}
/* =========================
   LOAD & RENDER GENRES
========================= */

async function loadGenres() {

  const genresList = $('#genresList');

  if (!genresList) return;

  try {

    const results = await Promise.allSettled([
      api('/api/genres'),
      api('/api/tv/genres')
    ]);

    const allGenres = [];

    results.forEach((result) => {

      if (
        result.status === 'fulfilled' &&
        Array.isArray(result.value?.genres)
      ) {
        allGenres.push(
          ...result.value.genres
        );
      }

    });

    const uniqueGenres =
      Array.from(
        new Map(
          allGenres.map((genre) => [
            genre.id,
            genre
          ])
        ).values()
      );

    uniqueGenres.sort((a, b) =>
      String(a.name).localeCompare(
        String(b.name)
      )
    );

    genresList.innerHTML =
      uniqueGenres
        .map((genre) => `
          <button
            type="button"
            class="genre"
            data-genre="${genre.id}"
          >
            ${esc(genre.name)}
          </button>
        `)
        .join('');

    console.log(
      'MovieHub genres loaded:',
      uniqueGenres
    );

  } catch (error) {

    console.error(
      'Genre loading failed:',
      error
    );

    genresList.innerHTML = '';
  }
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

async function startMovieHub() {
  const movieLoader =
    document.getElementById('movieLoader');

  try {
    await load();
await loadGenres();
    // Movies/hero/sections render hone ke baad
    // hi main animated loader hide hoga.
    if (movieLoader) {
      movieLoader.classList.add('hide');

      setTimeout(() => {
        movieLoader.remove();
      }, 500);
    }

  } catch (error) {
    console.error('MovieHub startup error:', error);
  }
}

startMovieHub();

