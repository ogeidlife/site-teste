import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

export class GameSystems{
  constructor(engine){this.engine=engine;this.running=false;this.keys={};this.activeMission=null;this.objectiveIndex=0;this.playerMesh=null;this.guardTime=0;
    addEventListener("keydown",e=>this.keys[e.key.toLowerCase()]=true);
    addEventListener("keyup",e=>this.keys[e.key.toLowerCase()]=false);
    addEventListener("keydown",e=>{if(e.key==="Escape")engine.setMode("build");});
  }
  start(){
    this.running=true;
    const p=this.engine.project.player;
    if(!this.playerMesh){const g=new THREE.Group();const body=new THREE.Mesh(new THREE.CapsuleGeometry(.35,.9,4,8),new THREE.MeshStandardMaterial({color:0x18242c}));body.position.y=1;g.add(body);this.playerMesh=g;this.engine.scene.scene.add(g)}
    this.playerMesh.position.set(...p.position);this.activeMission=this.activeMission||this.engine.project.missions[0]?.id;this.objectiveIndex=0;
    this.updateHUD();
  }
  stop(){this.running=false}
  update(){
    if(!this.running||!this.playerMesh)return;
    const k=this.keys,s=k.shift?this.engine.project.player.runSpeed:this.engine.project.player.speed;
    let x=0,z=0;if(k.w||k.arrowup)z-=1;if(k.s||k.arrowdown)z+=1;if(k.a||k.arrowleft)x-=1;if(k.d||k.arrowright)x+=1;
    if(x||z){const len=Math.hypot(x,z);x/=len;z/=len;this.playerMesh.position.x+=x*s/60;this.playerMesh.position.z+=z*s/60;this.playerMesh.rotation.y=Math.atan2(x,z)}
    this.updateGuards();this.checkInteractions();this.engine.scene.controls.target.lerp(this.playerMesh.position,.08);this.updateHUD();
  }
  updateGuards(){
    const guards=this.engine.project.scene.objects.filter(o=>o.type==="guard");
    for(const g of guards){const obj=this.engine.scene.objects.get(g.id);if(!obj)continue;const wp=g.waypoints?.length?g.waypoints[0]:g.position;const dx=wp[0]-obj.mesh.position.x,dz=wp[2]-obj.mesh.position.z;const d=Math.hypot(dx,dz);if(d>.2){obj.mesh.position.x+=dx/d*g.speed/60;obj.mesh.position.z+=dz/d*g.speed/60}}
  }
  checkInteractions(){
    const mission=this.engine.project.missions.find(m=>m.id===this.activeMission);if(!mission)return;
    const obj=mission.objectives[this.objectiveIndex];if(!obj)return;
    if(obj.type==="GO_TO"&&this.dist(this.playerMesh.position,obj.position)<2){this.objectiveIndex++;this.updateHUD()}
    if(obj.type==="RETURN"&&this.dist(this.playerMesh.position,obj.position)<2){this.objectiveIndex++;this.updateHUD()}
    if((this.keys.e||this.keys[" "])&&obj.type==="PAINT"){const target=this.engine.project.scene.objects.find(o=>o.id===obj.targetId);if(target){this.engine.world.set(target.wallId||target.id,target.afterState||"PAINTED");this.keys.e=false;this.objectiveIndex++;this.updateHUD();const v=target.completionVideo?this.engine.project.videos.find(x=>x.id===target.completionVideo):null;if(v)this.engine.video.play(v,{label:"MISSION COMPLETE"})}}
  }
  dist(p,a){return Math.hypot(p.x-a[0],p.z-a[2])}
  updateHUD(){
    const m=this.engine.project.missions.find(x=>x.id===this.activeMission)||this.engine.project.missions[0];const o=m?.objectives[this.objectiveIndex];
    document.querySelector("#gameMissionTitle").textContent=m?.name||"MISSÃO";
    document.querySelector("#gameObjective").textContent=o?.name||"MISSÃO COMPLETA";
    document.querySelector("#objectCountHud").textContent=this.engine.project.scene.objects.length;
  }
}