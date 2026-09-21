const $=s=>document.querySelector(s);
const IMG='https://image.tmdb.org/t/p/';
const state={trending:[],popular:[],now:[],upcoming:[],tvPopular:[],tvTrending:[],tvToday:[],genres:[],tvGenres:[],hero:null};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const poster=m=>m?.poster_path?IMG+'w500'+m.poster_path:'';
const backdrop=m=>m?.backdrop_path?IMG+'original'+m.backdrop_path:'';
const isTV=m=>m?.media_type==='tv'||m?.name!==undefined;
async function api(url){const r=await fetch(url);const d=await r.json();if(!r.ok||d.error)throw new Error(d.error||'Request failed');return d}
function card(m, forcedType){
  const tv=forcedType==='tv'||isTV(m);
  const title=tv?m.name:m.title;
  const date=tv?m.first_air_date:m.release_date;

  return `<article class="card" data-id="${m.id}" data-type="${tv?'tv':'movie'}">
    <div class="poster">
      ${m.poster_path
        ? `<img loading="lazy" src="${poster(m)}" alt="${esc(title)}">`
        : '<div class="empty">NO POSTER</div>'}

      <span class="badge">${tv?'TV':'FILM'}</span>

      
    </div>

    <div class="card-info">
      <span class="card-title">${esc(title)}</span>
      <span class="year">${(date||'').slice(0,4)}</span>
    </div>
  </article>`;
}
function fill(id,arr,type){
  $(id).innerHTML=arr
    .filter(x=>x.poster_path)
    .slice(0,14)
    .map(x=>card(x,type))
    .join('')||'<div class="empty">No titles found</div>';
}
function bindCards(root=document){root.querySelectorAll('.card[data-id]').forEach(c=>c.onclick=()=>openDetails(c.dataset.id,c.dataset.type))}
function setHero(m){state.hero=m;const tv=isTV(m);const title=tv?m.name:m.title;const date=tv?m.first_air_date:m.release_date;$('#heroTitle').textContent=title||'Untitled';$('#heroOverview').textContent=m.overview||'No synopsis available.';$('#heroBg').style.backgroundImage=`url("${backdrop(m)}")`;$('#heroMeta').innerHTML=`<span class="score">${m.vote_average?m.vote_average.toFixed(1):'—'}</span><span>★</span><span>${m.vote_count?m.vote_count.toLocaleString():'0'} votes</span><span>${(date||'').slice(0,4)}</span><span>${tv?'TV':'FILM'}</span>`}
async function load(){try{const [t,p,n,u,g,tp,tt,ta,tg]=await Promise.all([api('/api/trending'),api('/api/popular'),api('/api/now-playing'),api('/api/upcoming'),api('/api/genres'),api('/api/tv/popular'),api('/api/tv/trending'),api('/api/tv/today'),api('/api/tv/genres')]);state.trending=t.results||[];state.popular=p.results||[];state.now=n.results||[];state.upcoming=u.results||[];state.genres=g.genres||[];state.tvPopular=tp.results||[];state.tvTrending=tt.results||[];state.tvToday=ta.results||[];state.tvGenres=tg.genres||[];setHero(state.trending[0]||state.tvTrending[0]||state.popular[0]||{});fill('#trendingRail',state.trending,'movie');fill('#popularRail',state.popular,'movie');fill('#nowRail',state.now,'movie');fill('#upcomingRail',state.upcoming,'movie');fill('#tvPopularRail',state.tvPopular,'tv');fill('#tvTrendingRail',state.tvTrending,'tv');fill('#tvTodayRail',state.tvToday,'tv');const allGenres=[...state.genres,...state.tvGenres.filter(x=>!state.genres.some(g=>g.id===x.id))];$('#genresList').innerHTML=allGenres.map(x=>`<button class="genre" data-genre="${x.id}">${esc(x.name)}</button>`).join('');bindCards();}catch(e){toast('TMDB connection error: '+e.message)}}
async function openDetails(id,type){
  try{
    const m=await api(`/api/${type==='tv'?'tv':'movie'}/${id}`);

    const trailer=
      (m.videos?.results||[]).find(v=>v.site==='YouTube'&&v.type==='Trailer') ||
      (m.videos?.results||[]).find(v=>v.site==='YouTube');

    const cast=(m.credits?.cast||[]).slice(0,8);
    const tv=type==='tv';
    const title=tv?m.name:m.title;
    const date=tv?m.first_air_date:m.release_date;
    const runtime=tv
      ? (m.episode_run_time?.[0]?m.episode_run_time[0]+' min/episode':'Runtime N/A')
      : (m.runtime?m.runtime+' min':'Runtime N/A');

    let providers=null;

    try{
      providers=await api(
        `/api/${tv?'tv':'movie'}/providers/${id}?watch_region=IN`
      );
    }catch(e){
      providers=null;
    }

    const region=providers?.results?.IN || {};
    const providerList=[
      ...(region.flatrate||[]),
      ...(region.free||[]),
      ...(region.ads||[]),
      ...(region.rent||[]),
      ...(region.buy||[])
    ].filter((p,i,a)=>a.findIndex(x=>x.provider_id===p.provider_id)===i);

    const watchLink=region.link||'';

    const trailerButton=trailer
      ? `<button class="btn primary" onclick="playTrailer('${trailer.key}')">WATCH TRAILER</button>`
      : '';

    const watchButton=watchLink
      ? `<a class="btn" href="${esc(watchLink)}" target="_blank" rel="noopener noreferrer">WATCH HERE</a>`
      : '';

    const providerInfo=providerList.length
      ? `<div class="watch-providers">
          <b>AVAILABLE ON</b>
          <div class="provider-list">
            ${providerList.slice(0,8).map(p=>`
              <span class="provider">
                ${p.logo_path
                  ? `<img src="${IMG+'w92'+p.logo_path}" alt="${esc(p.provider_name)}">`
                  : ''}
                <span>${esc(p.provider_name)}</span>
              </span>
            `).join('')}
          </div>
          <small>Streaming availability powered by JustWatch.</small>
        </div>`
      : '';

    $('#modalBox').innerHTML=`
      <div class="details-hero" style="background-image:url('${backdrop(m)}')">
        <div class="details-content">

          <div class="eyebrow">
            ${tv?'TV SHOW / DRAMA':'FILM'} DETAILS
          </div>

          <h2>${esc(title)}</h2>

          <div class="meta">
            <span class="score">${m.vote_average?.toFixed(1)||'—'}</span>
            <span>★</span>
            <span>${(date||'').slice(0,4)}</span>
            <span>${runtime}</span>
            <span>
              ${tv&&m.number_of_seasons
                ? m.number_of_seasons+' season'+(m.number_of_seasons>1?'s':'')
                : ''}
            </span>
          </div>

          <p class="overview">
            ${esc(m.overview||'No synopsis available.')}
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
          <h3>Cast</h3>

          <div class="credits">
            ${cast.map(p=>`
              <div class="person">
                <img
                  src="${p.profile_path?IMG+'w185'+p.profile_path:''}"
                  alt="${esc(p.name)}"
                >
                <span>${esc(p.name)}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="facts">

          <div>
            <b>Genres</b><br>
            ${(m.genres||[]).map(g=>esc(g.name)).join(' · ')||'—'}
          </div>

          <div>
            <b>Original title</b><br>
            ${esc(tv?m.original_name||'—':m.original_title||'—')}
          </div>

          <div>
            <b>First release</b><br>
            ${esc(date||'—')}
          </div>

          <div>
            <b>Language</b><br>
            ${esc(m.original_language||'—').toUpperCase()}
          </div>

          ${tv
            ? `<div>
                <b>Episodes</b><br>
                ${m.number_of_episodes||'—'}
              </div>`
            : ''}
        </div>

      </div>
    `;

    $('#modal').classList.add('open');

  }catch(e){
    toast(e.message);
  }
}
function playTrailer(key){
  $('#modalBox').innerHTML=`<div class="video"><iframe src="https://www.youtube.com/embed/${encodeURIComponent(key)}?rel=0" title="Trailer" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
}
async function playCardTrailer(id,type){
  try{
    const m=await api(`/api/${type==='tv'?'tv':'movie'}/${id}`);
    const v=(m.videos?.results||[]).find(x=>x.site==='YouTube'&&x.type==='Trailer')
      ||(m.videos?.results||[]).find(x=>x.site==='YouTube'&&x.type==='Teaser')
      ||(m.videos?.results||[]).find(x=>x.site==='YouTube');

    if(v){
      $('#modal').classList.add('open');
      playTrailer(v.key);
    }else{
      toast('No trailer is listed for this title.');
    }
  }catch(e){
    toast(e.message);
  }
}
async function heroAction(){
  if(!state.hero)return;
  const type=isTV(state.hero)?'tv':'movie';

  try{
    const m=await api(`/api/${type}/${state.hero.id}`);
    const v=(m.videos?.results||[]).find(x=>x.site==='YouTube'&&x.type==='Trailer')
      ||(m.videos?.results||[]).find(x=>x.site==='YouTube');

    if(v){
      await openDetails(state.hero.id,type);
      playTrailer(v.key);
    }else{
      toast('No trailer is listed for this title.');
    }
  }catch(e){
    toast(e.message);
  }
}
$('#trailerBtn').onclick=heroAction;$('#detailsBtn').onclick=()=>state.hero&&openDetails(state.hero.id,isTV(state.hero)?'tv':'movie');$('#modalClose').onclick=()=>{$('#modal').classList.remove('open');$('#modalBox').innerHTML=''};$('#modal').onclick=e=>{if(e.target.id==='modal')$('#modalClose').click()};
$('#searchBtn').onclick=()=>{$('#searchPanel').classList.add('open');$('#searchInput').focus()};$('#searchClose').onclick=()=>$('#searchPanel').classList.remove('open');
let timer;$('#searchInput').oninput=()=>{clearTimeout(timer);const q=$('#searchInput').value.trim();if(!q){$('#searchResults').innerHTML='';return}timer=setTimeout(async()=>{try{const d=await api('/api/search?q='+encodeURIComponent(q));$('#searchResults').innerHTML=(d.results||[]).filter(x=>x.poster_path&&(x.media_type==='movie'||x.media_type==='tv')).slice(0,20).map(x=>card(x)).join('');bindCards($('#searchResults'))}catch(e){toast(e.message)}},300)};
$('#genresList').onclick=e=>{const b=e.target.closest('.genre');if(b) location.hash='genre-'+b.dataset.genre};
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),3500)}
window.playTrailer=playTrailer;load();
