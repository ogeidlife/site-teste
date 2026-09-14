import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import {OrbitControls} from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js";
import {GLTFLoader} from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";
import {TransformControls} from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/TransformControls.js";

export class SceneManager{
  constructor(){this.objects=new Map();this.selected=null;this.grid=null;this.glb=new GLTFLoader();this.fps=60;this.last=performance.now()}
  init(el){
    this.el=el; this.scene=new THREE.Scene(); this.scene.background=new THREE.Color("#0a0e12");
    this.camera=new THREE.PerspectiveCamera(45,el.clientWidth/el.clientHeight,.1,1000);
    this.camera.position.set(17,20,19);
    this.renderer=new THREE.WebGLRenderer({antialias:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setSize(el.clientWidth,el.clientHeight);this.renderer.shadowMap.enabled=true;el.appendChild(this.renderer.domElement);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,0,0);this.controls.enableDamping=true;
    this.transform=new TransformControls(this.camera,this.renderer.domElement);this.transform.setMode("translate");this.transform.addEventListener("dragging-changed",e=>this.controls.enabled=!e.value);this.transform.addEventListener("objectChange",()=>this.syncSelected());
    this.scene.add(this.transform);
    this.grid=new THREE.GridHelper(50,50,0x3a4851,0x1c252c);this.scene.add(this.grid);
    this.scene.add(new THREE.HemisphereLight(0x9fb4c2,0x182029,1.7));
    const sun=new THREE.DirectionalLight(0xffd7a2,2.4);sun.position.set(8,16,8);sun.castShadow=true;this.scene.add(sun);
    addEventListener("resize",()=>this.resize());
    this.renderer.domElement.addEventListener("pointerdown",e=>this.pick(e));
  }
  resize(){if(!this.el)return;this.camera.aspect=this.el.clientWidth/this.el.clientHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(this.el.clientWidth,this.el.clientHeight)}
  clear(){for(const o of this.objects.values())this.scene.remove(o.mesh);this.objects.clear();this.selected=null;this.transform.detach()}
  loadProject(project){
    this.clear();
    for(const data of project.scene.objects)this.addObject(data,false);
    this.focus([0,0,0]);
  }
  primitive(data){
    let geo,mat=new THREE.MeshStandardMaterial({color:0x4a5660,roughness:.78,metalness:.08});
    if(data.type==="ground"){geo=new THREE.BoxGeometry(40,.3,40);mat.color.set(0x20272c)}
    else if(data.type==="wall"||data.type==="building"){geo=new THREE.BoxGeometry(2,2,2);mat.color.set(data.type==="wall"?0x687177:0x30373b)}
    else if(data.type==="guard"){geo=new THREE.CapsuleGeometry(.35,1.1,4,8);mat.color.set(0x11151a)}
    else if(data.type==="camera"){geo=new THREE.BoxGeometry(.65,.4,.9);mat.color.set(0x15191d)}
    else if(data.type==="graffiti"){geo=new THREE.PlaneGeometry(2,1.2);mat=new THREE.MeshBasicMaterial({color:0x596c7b,transparent:true,opacity:.15,side:THREE.DoubleSide})}
    else if(data.type==="item"){geo=new THREE.CylinderGeometry(.18,.18,.6,12);mat.color.set(0x9bb4c3)}
    else if(data.type==="trigger"){geo=new THREE.BoxGeometry(2,1,2);mat=new THREE.MeshBasicMaterial({color:0x4b91c9,wireframe:true,transparent:true,opacity:.35})}
    else if(data.type==="light"){geo=new THREE.SphereGeometry(.18,12,8);mat=new THREE.MeshBasicMaterial({color:0xffc67a})}
    else {geo=new THREE.BoxGeometry(1,1,1)}
    const mesh=new THREE.Mesh(geo,mat);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
  }
  addObject(data,select=true){
    const mesh=this.primitive(data);mesh.name=data.name;
    mesh.position.set(...data.position);mesh.rotation.set(...data.rotation);mesh.scale.set(...data.scale);
    this.scene.add(mesh);this.objects.set(data.id,{data,mesh});
    if(data.type==="light"){const l=new THREE.PointLight(data.color||0xffc88b,data.intensity||2,data.distance||15);l.position.copy(mesh.position);this.scene.add(l);this.objects.get(data.id).light=l}
    if(select)this.select(data.id); return mesh;
  }
  addImportedGLB(file){
    return new Promise((resolve,reject)=>this.glb.load(URL.createObjectURL(file),g=>{
      const id="asset_"+Date.now();const data={id,name:file.name,type:"glb",position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],collision:true,asset:file.name};
      g.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
      this.scene.add(g.scene);this.objects.set(id,{data,mesh:g.scene,asset:true,animations:g.animations||[]});this.select(id);resolve({data,mesh:g.scene,animations:g.animations||[]})
    },undefined,reject))
  }
  select(id){const obj=this.objects.get(id);if(!obj)return;this.selected=id;this.transform.detach();this.transform.attach(obj.mesh);window.dispatchEvent(new CustomEvent("ogeid:selected",{detail:obj.data}))}
  syncSelected(){const o=this.objects.get(this.selected);if(!o)return;o.data.position=o.mesh.position.toArray();o.data.rotation=[o.mesh.rotation.x,o.mesh.rotation.y,o.mesh.rotation.z];o.data.scale=o.mesh.scale.toArray();window.dispatchEvent(new CustomEvent("ogeid:changed",{detail:o.data}))}
  pick(e){if(window.OGEID?.mode==="play")return;const r=this.renderer.domElement.getBoundingClientRect();const x=((e.clientX-r.left)/r.width)*2-1,y=-((e.clientY-r.top)/r.height)*2+1;const ray=new THREE.Raycaster();ray.setFromCamera({x,y},this.camera);const hits=ray.intersectObjects([...this.objects.values()].map(o=>o.mesh),true);if(hits.length){let root=hits[0].object;while(root.parent && ![...this.objects.values()].some(o=>o.mesh===root))root=root.parent;const entry=[...this.objects.entries()].find(([,o])=>o.mesh===root);if(entry)this.select(entry[0])}}
  focus(p){this.controls.target.set(...p);this.camera.position.set(p[0]+15,p[1]+16,p[2]+15);this.controls.update()}
  toggleGrid(){this.grid.visible=!this.grid.visible}
  frame(){const o=this.objects.get(this.selected);if(!o)return;const p=o.mesh.position;this.controls.target.copy(p);this.camera.position.set(p.x+7,p.y+7,p.z+7);this.controls.update()}
  update(){this.controls?.update();this.renderer?.render(this.scene,this.camera);const now=performance.now();if(now-this.last>500){this.fps=Math.round(1000/(now-this.last));this.last=now}}
}