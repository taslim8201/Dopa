const $=s=>document.querySelector(s);
let videoUrl="",thumbUrl="",videoBusy=false,thumbBusy=false;

const savedCloud=localStorage.getItem("cloudName")||"";
const savedPreset=localStorage.getItem("uploadPreset")||"";
$("#cloudName").value=savedCloud;
$("#uploadPreset").value=savedPreset;

function saveConfig(){
  localStorage.setItem("cloudName",$("#cloudName").value.trim());
  localStorage.setItem("uploadPreset",$("#uploadPreset").value.trim());
}
function widget(resourceType,done){
  saveConfig();
  const cloudName=$("#cloudName").value.trim(),uploadPreset=$("#uploadPreset").value.trim();
  if(!cloudName||!uploadPreset){alert("Cloudinary Cloud Name and Unsigned Upload Preset are required.");return}
  cloudinary.createUploadWidget({
    cloudName,
    uploadPreset,
    sources:["local"],
    multiple:false,
    resourceType,
    clientAllowedFormats:resourceType==="video"?["mp4","webm","mov","m4v"]:["jpg","jpeg","png","webp"],
    maxVideoFileSize:2147483648,
maxChunkSize:20000000,
    folder:"streambox",
    showAdvancedOptions:false,
    cropping:false,
    theme:"purple"
  },(error,result)=>{
    if(error){console.error(error);$("#status").textContent=error.message||"Upload failed.";return}
    if(result.event==="upload-added"){ $("#status").textContent="Uploading…"; }
    if(result.event==="success"){
      done(result.info.secure_url);
      $("#status").textContent="Upload complete.";
    }
  }).open();
}
$("#videoBtn").onclick=()=>widget("video",url=>{
  videoUrl=url;videoBusy=false;$("#videoStatus").textContent="✓ Uploaded";
});
$("#thumbBtn").onclick=()=>widget("image",url=>{
  thumbUrl=url;thumbBusy=false;$("#thumbStatus").textContent="✓ Uploaded";
});

$("#publishBtn").onclick=async()=>{
  saveConfig();
  const password=$("#password").value.trim();
  if(!password)return alert("Enter admin password.");
  if(!videoUrl)return alert("Upload the video first.");
  const payload={
    title:$("#titleInput").value.trim()||"Untitled Episode",
    season:Number($("#seasonInput").value)||1,
    episode:Number($("#episodeInput").value)||1,
    duration:$("#durationInput").value.trim(),
    description:$("#descriptionInput").value.trim(),
    videoUrl,thumbnailUrl:thumbUrl
  };
  $("#status").textContent="Publishing episode…";
  const r=await fetch("/api/episodes",{method:"POST",headers:{"content-type":"application/json","x-admin-password":password},body:JSON.stringify(payload)});
  const data=await r.json();
  if(!r.ok){$("#status").textContent=data.error||"Publish failed.";return}
  $("#status").textContent="Published successfully.";
  videoUrl="";thumbUrl="";
  $("#videoStatus").textContent="Not selected";
  $("#thumbStatus").textContent="Not selected";
  $("#titleInput").value="";$("#descriptionInput").value="";
  load();
};

async function load(){
  const r=await fetch("/api/episodes");
  const items=await r.json();
  $("#adminGrid").innerHTML=items.length?items.map(e=>`
    <div class="admin-row">
      <div><strong>${esc(e.title)}</strong><span>Season ${e.season} · Episode ${e.episode}</span></div>
      <button class="danger" data-id="${e.id}">Remove</button>
    </div>`).join(""):'<p class="meta">No episodes yet.</p>';
  document.querySelectorAll(".danger").forEach(b=>b.onclick=async()=>{
    if(!confirm("Remove this episode from the website?"))return;
    const password=$("#password").value.trim();
    const r=await fetch("/api/episodes?id="+encodeURIComponent(b.dataset.id),{method:"DELETE",headers:{"x-admin-password":password}});
    if(!r.ok){const d=await r.json();alert(d.error||"Delete failed.");return}
    load();
  });
}
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
load();
