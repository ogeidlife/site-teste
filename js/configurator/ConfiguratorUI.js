import {ProjectManager} from "../core/ProjectManager.js";

export class ConfiguratorUI{
  constructor(engine){this.engine=engine;this.selected=null}
  init(){
    document.querySelectorAll(".mode").forEach(b=>b.onclick=()=>this.engine.setMode(b.dataset.mode));
    document.querySelector("#saveProject").onclick=()=>this.engine.save();
    document.querySelector("#exportProject").onclick=()=>this.engine.export();
    document.querySelector("#newProject").onclick=()=>{if(confirm("Criar novo projeto?"))this.engine.loadProject(ProjectManager.defaultProject())};
    document.querySelector("#debugBtn").onclick=()=>document.querySelector("#debugOverlay").classList.toggle("hidden");
    document.querySelector("#toggleGrid").onclick=()=>this.engine.scene.toggleGrid();
    document.querySelector("#frameSelected").onclick=()=>this.engine.scene.frame();
    document.querySelector("#toggleCollisions").onclick=()=>this.toast("COLLISION DEBUG: visualização simplificada");
    document.querySelector("#playFromStart").onclick=()=>this.engine.setMode("play");
    document.querySelector("#exitPlay").onclick=()=>this.engine.setMode("build");
    document.querySelector("#storyPreview").onclick=()=>this.previewStory();
    document.querySelector("#addMission").onclick=()=>this.addMission();
    document.querySelector("#glbInput").onchange=async e=>{for(const f of e.target.files){if(f.name.toLowerCase().endsWith(".glb")){const r=await this.engine.scene.addImportedGLB(f);this.engine.project.assets.push({id:"asset_"+Date.now(),name:f.name,type:"GLB"});this.engine.project.scene.objects.push(r.data);this.refreshAll()}}};
    document.querySelector("#videoInput").onchange=e=>{for(const f of e.target.files){const id="video_"+Date.now()+Math.random().toString(16).slice(2);const v={id,name:f.name,src:URL.createObjectURL(f),type:"CUSTOM",skippable:true};this.engine.project.videos.push(v)}this.refreshAll()};
    document.querySelectorAll("[data-create]").forEach(b=>b.onclick=()=>this.create(b.dataset.create));
    addEventListener("ogeid:selected",e=>{this.selected=e.detail;this.renderInspector()});
    addEventListener("ogeid:changed",e=>{this.selected=e.detail;this.renderInspector();this.syncProjectObject(e.detail)});
    addEventListener("ogeid:worldstate",()=>this.renderInspector());
  }
  syncProjectObject(data){const p=this.engine.project.scene.objects.find(x=>x.id===data.id);if(p)Object.assign(p,data)}
  create(type){
    const id=type+"_"+Date.now();const d={id,name:type.toUpperCase()+" "+id.slice(-4),type,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],collision:["wall","building","guard"].includes(type)};
    if(type==="wall")Object.assign(d,{states:{EMPTY:{visual:"default"},PAINTED:{visual:"graffiti_final"}},currentState:"EMPTY"});
    if(type==="guard")Object.assign(d,{speed:1.8,visionDistance:7,visionAngle:1.1,waypoints:[[0,0,0],[5,0,0],[5,0,5],[0,0,5]]});
    if(type==="camera")Object.assign(d,{visionDistance:10,visionAngle:.8,rotationSpeed:.4});
    if(type==="graffiti")Object.assign(d,{wallId:null,beforeState:"EMPTY",afterState:"PAINTED",paintVideo:null,completionVideo:null});
    if(type==="trigger")Object.assign(d,{trigger:"ENTER",action:"VIDEO",videoId:null});
    if(type==="item")Object.assign(d,{itemType:"SPRAY"});
    if(type==="light")Object.assign(d,{intensity:2,distance:15,color:"#ffd39a"});
    this.engine.project.scene.objects.push(d);this.engine.scene.addObject(d);this.refreshAll();
  }
  renderInspector(){
    const d=this.selected;if(!d){document.querySelector("#inspector").innerHTML='<div class="empty-inspector">Selecione um objeto no cenário.</div>';return}
    const pos=d.position||[0,0,0],rot=d.rotation||[0,0,0],sc=d.scale||[1,1,1];
    let extra="";
    if(d.type==="wall")extra=`<div class="section-title">WORLD STATES</div><div class="state-box"><div class="state-head"><b>BEFORE</b><span>${d.currentState==="EMPTY"?"ACTIVE":"stored"}</span></div><select id="wallState"><option>EMPTY</option><option>PAINTED</option></select></div>`;
    if(d.type==="graffiti")extra=`<div class="section-title">GRAFFITI</div>${this.selectField("wallId","WALL TARGET",d.wallId||"")} ${this.selectField("paintVideo","PAINT VIDEO",d.paintVideo||"")} ${this.selectField("completionVideo","COMPLETION VIDEO",d.completionVideo||"")}`;
    if(d.type==="trigger")extra=`<div class="section-title">TRIGGER</div>${this.selectField("trigger","TRIGGER",d.trigger||"ENTER",["ENTER","INTERACT","MISSION_START"])}${this.selectField("action","ACTION",d.action||"VIDEO",["VIDEO","STATE","MISSION"])}${this.selectField("videoId","VIDEO",d.videoId||"")}`;
    if(d.type==="guard")extra=`<div class="section-title">SECURITY AI</div>${this.numField("speed","SPEED",d.speed||1.8)}${this.numField("visionDistance","VISION DISTANCE",d.visionDistance||7)}${this.numField("visionAngle","VISION ANGLE",d.visionAngle||1.1)}`;
    document.querySelector("#inspector").innerHTML=`
      <div class="field"><label>NAME</label><input id="f_name" value="${this.esc(d.name||"")}"></div>
      <div class="field"><label>TYPE</label><input disabled value="${d.type}"></div>
      <div class="section-title">TRANSFORM</div>
      ${this.xyzField("position",pos)}${this.xyzField("rotation",rot)}${this.xyzField("scale",sc)}
      <div class="field"><label>COLLISION</label><select id="f_collision"><option ${d.collision?"selected":""}>true</option><option ${!d.collision?"selected":""}>false</option></select></div>
      ${extra}
      <div class="row-actions"><button id="duplicate">DUPLICATE</button><button id="delete" >DELETE</button></div>`;
    document.querySelector("#f_name").oninput=e=>{d.name=e.target.value;this.syncProjectObject(d);this.refreshTree()};
    document.querySelector("#f_collision").onchange=e=>d.collision=e.target.value==="true";
    document.querySelector("#duplicate").onclick=()=>{const copy=JSON.parse(JSON.stringify(d));copy.id=d.id+"_copy_"+Date.now();copy.name=d.name+" COPY";copy.position[0]+=2;this.engine.project.scene.objects.push(copy);this.engine.scene.addObject(copy);this.refreshAll()};
    document.querySelector("#delete").onclick=()=>{this.engine.project.scene.objects=this.engine.project.scene.objects.filter(x=>x.id!==d.id);const o=this.engine.scene.objects.get(d.id);if(o)this.engine.scene.scene.remove(o.mesh);this.engine.scene.objects.delete(d.id);this.selected=null;this.renderInspector();this.refreshAll()};
    if(document.querySelector("#wallState"))document.querySelector("#wallState").onchange=e=>{d.currentState=e.target.value;this.engine.world.set(d.id,e.target.value)};
    this.bindXYZ(d,"position");this.bindXYZ(d,"rotation");this.bindXYZ(d,"scale");
    this.bindExtra(d);
  }
  xyzField(name,v){return `<div class="field"><label>${name.toUpperCase()}</label><div class="xyz">${v.map((n,i)=>`<input class="xyz-${name}-${i}" type="number" step="0.1" value="${Number(n).toFixed(2)}">`).join("")}</div></div>`}
  bindXYZ(d,name){[0,1,2].forEach(i=>{const el=document.querySelector(`.xyz-${name}-${i}`);if(el)el.oninput=e=>{d[name][i]=Number(e.target.value);const o=this.engine.scene.objects.get(d.id);if(o)o.mesh[name].set(...d[name]);this.syncProjectObject(d)}})}
  numField(id,label,val){return `<div class="field"><label>${label}</label><input id="extra_${id}" type="number" step=".1" value="${val}"></div>`}
  selectField(id,label,val,opts=null){let options=opts||["",...this.engine.project.videos.map(v=>v.id)];if(id==="wallId")options=["",...this.engine.project.scene.objects.filter(o=>o.type==="wall").map(o=>o.id)];return `<div class="field"><label>${label}</label><select id="extra_${id}">${options.map(o=>`<option value="${o}" ${o===val?"selected":""}>${o||"NONE"}</option>`).join("")}</select></div>`}
  bindExtra(d){
    ["speed","visionDistance","visionAngle"].forEach(k=>{const e=document.querySelector("#extra_"+k);if(e)e.oninput=()=>d[k]=Number(e.value)});
    ["wallId","paintVideo","completionVideo","trigger","action","videoId"].forEach(k=>{const e=document.querySelector("#extra_"+k);if(e)e.onchange=()=>d[k]=e.value||null});
  }
  refreshAll(){this.refreshTree();this.refreshAssets();this.refreshMissions();this.refreshVideos();this.renderInspector();document.querySelector("#sceneNameHud").textContent=this.engine.project.meta.name;document.querySelector("#objectCountHud").textContent=this.engine.project.scene.objects.length}
  refreshTree(){const el=document.querySelector("#sceneTree");el.innerHTML=this.engine.project.scene.objects.map(o=>`<div class="tree-row ${this.selected?.id===o.id?"selected":""}" data-id="${o.id}"><b>${o.type.toUpperCase()}</b> — ${this.esc(o.name)}</div>`).join("");el.querySelectorAll(".tree-row").forEach(x=>x.onclick=()=>this.engine.scene.select(x.dataset.id))}
  refreshAssets(){document.querySelector("#assetList").innerHTML=this.engine.project.assets.length?this.engine.project.assets.map(a=>`<div class="asset-item"><b>${this.esc(a.name)}</b><small>${a.type}</small></div>`).join(""):'<div class="muted">Importe seus GLBs para começar.</div>'}
  refreshMissions(){document.querySelector("#missionList").innerHTML=this.engine.project.missions.map((m,i)=>`<div class="mission-item"><b>${i+1}. ${this.esc(m.name)}</b><span>${m.objectives.length} OBJ</span></div>`).join("")}
  refreshVideos(){document.querySelector("#videoList").innerHTML=this.engine.project.videos.length?this.engine.project.videos.map(v=>`<div class="asset-item"><b>${this.esc(v.name)}</b><small>${v.type}</small></div>`).join(""):'<div class="muted">Nenhum vídeo importado.</div>'}
  addMission(){const n=this.engine.project.missions.length+1;this.engine.project.missions.push({id:"mission_"+Date.now(),name:"Nova missão "+n,description:"",introVideo:null,completeVideo:null,failedVideo:null,objectives:[{id:"obj_"+Date.now(),type:"GO_TO",name:"Novo objetivo",position:[0,0,0]}]});this.refreshMissions()}
  async previewStory(){const m=this.engine.project.missions[0];if(!m)return;const steps=[];if(m.introVideo)steps.push({type:"VIDEO",videoId:m.introVideo,label:"MISSION INTRO"});steps.push({type:"WAIT",ms:500});await this.engine.narrative.playSequence(steps);this.toast("STORY PREVIEW END")}
  update(){document.querySelector("#fpsHud").textContent=this.engine.scene.fps||"--";const d=this.engine.scene.selected?this.engine.scene.objects.get(this.engine.scene.selected)?.data:null;if(d&&this.selected?.id!==d.id){this.selected=d;this.renderInspector()}const dbg=document.querySelector("#debugOverlay");if(!dbg.classList.contains("hidden"))dbg.textContent=`MODE: ${this.engine.mode}\\nOBJECTS: ${this.engine.project.scene.objects.length}\\nSELECTED: ${d?.name||"-"}\\nFPS: ${this.engine.scene.fps||"-"}\\nWORLD STATES: ${Object.keys(this.engine.world.states).length}`}
  toast(msg){const old=document.querySelector(".toast");if(old)old.remove();const t=document.createElement("div");t.className="toast";t.textContent=msg;Object.assign(t.style,{position:"fixed",right:"20px",bottom:"35px",padding:"12px 16px",background:"#111a20",border:"1px solid #70818c",fontSize:"10px",zIndex:300});document.body.appendChild(t);setTimeout(()=>t.remove(),1400)}
  esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  xyz(){}
}