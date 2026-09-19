const $=s=>document.querySelector(s);
const IMG='https://image.tmdb.org/t/p/';
const KEY='38870ed292ca97bf270c57c4df297771';

const state={trending:[],popular:[],now:[],upcoming:[],tvPopular:[],tvTrending:[],tvToday:[],genres:[],tvGenres:[],hero:null};

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const poster=m=>m?.poster_path?IMG+'w500'+m.poster_path:'';
const backdrop=m=>m?.backdrop_path?IMG+'original'+m.backdrop_path:'';
const isTV=m=>m?.media_type==='tv'||m?.name!==undefined;

async function api(path, params={}){
  try {
    const tmdbUrl = new URL(`https://api.themoviedb.org/3${path}`);
    tmdbUrl.searchParams.set('api_key', KEY);
    tmdbUrl.searchParams.set('language', 'en-US');
    for (const [k, v] of Object.entries(params)) tmdbUrl.searchParams.set(k, v);

    // Using CORS proxy to bypass browser restrictions
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(tmdbUrl.toString())}`;

    const r = await fetch(proxyUrl);
    if (!r.ok) throw new Error(`HTTP Error: ${r.status}`);
    const d = await r.json();
    return d;
  } catch (err) {
    console.error("API Error:", err);
    throw err;
  }
}

function card(m, forcedType){
  const tv=forcedType==='tv'||isTV(m);
  const title=tv?m.name:m.title;
  const date=tv?m.first_air_date:m.release_date;
  return `<article class="card" data-id="${m.id}" data-type="${tv?'tv':'movie'}"><div class="poster">${m.poster_path?`<img loading="lazy" src="${poster(m)}" alt="${esc(title)}">`:'<div class="empty">NO POSTER</div>'}<span class="badge">${tv?'TV':'FILM'}</span></div><div class="card-info"><span class="card-title">${esc(title)}</span><span class="year">${(date||'').slice(0,4)}</span></div></article>`;
}

function fill(id,arr,type){
  const el = $(id);
  if(!el) return;
  if(!arr || !arr.length) {
    el.innerHTML = '<div class="empty">No titles found</div>';
    return;
  }
  el.innerHTML=arr.filter(x=>x.poster_path).slice(0,14).map(x=>card(x,type)).join('');
}

function bindCards(root=document){
  if(!root) return;
  root.querySelectorAll('.card[data-id]').forEach(c=>c.onclick=()=>openDetails(c.dataset.id,c.dataset.type));
}

function setHero(m){
  if(!m) return;
  state.hero=m;
  const tv=isTV(m);
  const title=tv?m.name:m.title;
  const date=tv?m.first_air_date:m.release_date;
  
  if($('#heroTitle')) $('#heroTitle').textContent=title||'Untitled';
  if($('#heroOverview')) $('#heroOverview').textContent=m.overview||'No synopsis available.';
  if($('#heroBg') && backdrop(m)) $('#heroBg').style.backgroundImage=`url("${backdrop(m)}")`;
  if($('#heroMeta')) $('#heroMeta').innerHTML=`<span class="score">${m.vote_average?m.vote_average.toFixed(1):'—'}</span><span>★</span><span>${m.vote_count?m.vote_count.toLocaleString():'0'} votes</span><span>${(date||'').slice(0,4)}</span><span>${tv?'TV':'FILM'}</span>`;
}

async function load(){
  try{
    const [t,p,n,u,g,tp,tt,ta,tg]=await Promise.all([
      api('/trending/movie/day').catch(()=>({results:[]})),
      api('/movie/popular').catch(()=>({results:[]})),
      api('/movie/now_playing').catch(()=>({results:[]})),
      api('/movie/upcoming').catch(()=>({results:[]})),
      api('/genre/movie/list').catch(()=>({genres:[]})),
      api('/tv/popular').catch(()=>({results:[]})),
      api('/trending/tv/day').catch(()=>({results:[]})),
      api('/tv/airing_today').catch(()=>({results:[]})),
      api('/genre/tv/list').catch(()=>({genres:[]}))
    ]);

    state.trending=t.results||[];
    state.popular=p.results||[];
    state.now=n.results||[];
    state.upcoming=u.results||[];
    state.genres=g.genres||[];
    state.tvPopular=tp.results||[];
    state.tvTrending=tt.results||[];
    state.tvToday=ta.results||[];
    state.tvGenres=tg.genres||[];

    setHero(state.trending[0]||state.tvTrending[0]||state.popular[0]||{});

    fill('#trendingRail',state.trending,'movie');
    fill('#popularRail',state.popular,'movie');
    fill('#nowRail',state.now,'movie');
    fill('#upcomingRail',state.upcoming,'movie');
    fill('#tvPopularRail',state.tvPopular,'tv');
    fill('#tvTrendingRail',state.tvTrending,'tv');
    fill('#tvTodayRail',state.tvToday,'tv');

    const allGenres=[...state.genres,...state.tvGenres.filter(x=>!state.genres.some(g=>g.id===x.id))];
    if($('#genresList')) $('#genresList').innerHTML=allGenres.map(x=>`<button class="genre" data-genre="${x.id}">${esc(x.name)}</button>`).join('');
    bindCards();
  }catch(e){
    toast('Connection error: '+e.message);
  }
}

async function openDetails(id,type){
  try{
    const m=await api(`/${type==='tv'?'tv':'movie'}/${id}`, { append_to_response: 'videos,credits' });
    const trailer=(m.videos?.results||[]).find(v=>v.site==='YouTube'&&v.type==='Trailer')||(m.videos?.results||[]).find(v=>v.site==='YouTube');
    const cast=(m.credits?.cast||[]).slice(0,8);
    const tv=type==='tv';
    const title=tv?m.name:m.title;
    const date=tv?m.first_air_date:m.release_date;
    const runtime=tv?(m.episode_run_time?.[0]?m.episode_run_time[0]+' min/ep':'N/A'):(m.runtime?m.runtime+' min':'N/A');

    if($('#modalBox')) {
      $('#modalBox').innerHTML=`<div class="details-hero" style="background-image:url('${backdrop(m)}')"><div class="details-content"><div class="eyebrow">${tv?'TV SHOW':'FILM'} DETAILS</div><h2>${esc(title)}</h2><div class="meta"><span class="score">${m.vote_average?.toFixed(1)||'—'}</span><span>★</span><span>${(date||'').slice(0,4)}</span><span>${runtime}</span></div><p class="overview">${esc(m.overview||'No synopsis available.')}</p><div class="actions">${trailer?`<button class="btn primary" onclick="playTrailer('${trailer.key}')">WATCH TRAILER</button>`:''}</div></div></div><div class="details-body"><div><h3>Cast</h3><div class="credits">${cast.map(p=>`<div class="person"><img src="${p.profile_path?IMG+'w185'+p.profile_path:''}" alt="${esc(p.name)}"><span>${esc(p.name)}</span></div>`).join('')}</div></div><div class="facts"><div><b>Genres</b><br>${(m.genres||[]).map(g=>esc(g.name)).join(' · ')||'—'}</div><div><b>Language</b><br>${esc(m.original_language||'—').toUpperCase()}</div></div></div>`;
    }
    if($('#modal')) $('#modal').classList.add('open');
  }catch(e){
    toast(e.message);
  }
}

function playTrailer(key){
  if($('#modalBox')) $('#modalBox').innerHTML=`<div class="video"><iframe src="https://www.youtube.com/embed/${encodeURIComponent(key)}?autoplay=1" title="Trailer" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
}

async function heroAction(){
  if(!state.hero)return;
  const type=isTV(state.hero)?'tv':'movie';
  try{
    const m=await api(`/${type}/${state.hero.id}`, { append_to_response: 'videos' });
    const v=(m.videos?.results||[]).find(x=>x.site==='YouTube'&&x.type==='Trailer')||(m.videos?.results||[]).find(x=>x.site==='YouTube');
    if(v){
      openDetails(state.hero.id,type);
      setTimeout(()=>playTrailer(v.key),80);
    }else toast('No trailer listed.');
  }catch(e){
    toast(e.message);
  }
}

if($('#trailerBtn')) $('#trailerBtn').onclick=heroAction;
if($('#detailsBtn')) $('#detailsBtn').onclick=()=>state.hero&&openDetails(state.hero.id,isTV(state.hero)?'tv':'movie');
if($('#modalClose')) $('#modalClose').onclick=()=>{$('#modal').classList.remove('open');if($('#modalBox')) $('#modalBox').innerHTML=''};
if($('#modal')) $('#modal').onclick=e=>{if(e.target.id==='modal') if($('#modalClose')) $('#modalClose').click()};

if($('#searchBtn')) $('#searchBtn').onclick=()=>{$('#searchPanel')?.classList.add('open');$('#searchInput')?.focus()};
if($('#searchClose')) $('#searchClose').onclick=()=>$('#searchPanel')?.classList.remove('open');

let timer;
if($('#searchInput')) $('#searchInput').oninput=()=>{
  clearTimeout(timer);
  const q=$('#searchInput').value.trim();
  if(!q){if($('#searchResults')) $('#searchResults').innerHTML='';return}
  timer=setTimeout(async()=>{
    try{
      const d=await api('/search/multi', { query: q });
      if($('#searchResults')) {
        $('#searchResults').innerHTML=(d.results||[]).filter(x=>x.poster_path&&(x.media_type==='movie'||x.media_type==='tv')).slice(0,20).map(x=>card(x)).join('');
        bindCards($('#searchResults'));
      }
    }catch(e){
      toast(e.message);
    }
  },300);
};

function toast(t){
  const el = $('#toast');
  if(!el) return;
  el.textContent=t;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),3500);
}

window.playTrailer=playTrailer;
load();
