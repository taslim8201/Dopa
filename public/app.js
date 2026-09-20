const grid=document.querySelector("#grid"),filter=document.querySelector("#seasonFilter");
const modal=document.querySelector("#modal"),player=document.querySelector("#player");
let episodes=[];

const esc=v=>String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

async function load(){
  try{
    const r=await fetch("/api/episodes");
    episodes=await r.json();
    const seasons=[...new Set(episodes.map(e=>e.season))].sort((a,b)=>b-a);
    filter.innerHTML='<option value="all">All seasons</option>'+seasons.map(s=>`<option value="${s}">Season ${s}</option>`).join("");
    render();
  }catch{grid.innerHTML='<div class="empty">Could not load episodes.</div>'}
}
function render(){
  const list=filter.value==="all"?episodes:episodes.filter(e=>String(e.season)===filter.value);
  if(!list.length){grid.innerHTML='<div class="empty">No episodes yet.</div>';return}
  grid.innerHTML=list.map(e=>`
    <article class="card" data-id="${e.id}">
      <div class="thumb">${e.thumbnailUrl?`<img src="${esc(e.thumbnailUrl)}" alt="">`:'<span class="play">▶</span>'}</div>
      <div class="card-body">
        <div class="meta">SEASON ${e.season} · EPISODE ${e.episode}${e.duration?` · ${esc(e.duration)}`:""}</div>
        <h3>${esc(e.title)}</h3>${e.description?`<p class="desc">${esc(e.description)}</p>`:""}
      </div>
    </article>`).join("");
  document.querySelectorAll(".card").forEach(c=>c.onclick=()=>open(episodes.find(e=>e.id===c.dataset.id)));
}
function open(e){
  if(!e)return;
  player.src=e.videoUrl;
  document.querySelector("#meta").textContent=`SEASON ${e.season} · EPISODE ${e.episode}`;
  document.querySelector("#title").textContent=e.title;
  document.querySelector("#description").textContent=e.description||"";
  modal.classList.remove("hidden");
  player.play().catch(()=>{});
}
function close(){player.pause();player.removeAttribute("src");player.load();modal.classList.add("hidden")}
filter.onchange=render;
document.querySelector("#close").onclick=close;
modal.onclick=e=>{if(e.target===modal)close()};
document.onkeydown=e=>{if(e.key==="Escape")close()};
load();
