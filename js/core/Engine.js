import { SceneManager } from "./SceneManager.js";
import { ProjectManager } from "./ProjectManager.js";
import { VideoManager } from "../systems/VideoManager.js";
import { WorldStateManager } from "../systems/WorldStateManager.js";
import { NarrativeSystem } from "../systems/NarrativeSystem.js";
import { GameSystems } from "../systems/GameSystems.js";
import { ConfiguratorUI } from "../configurator/ConfiguratorUI.js";

export class Engine {
  constructor(){
    this.project = ProjectManager.defaultProject();
    this.scene = new SceneManager();
    this.world = new WorldStateManager(this.project);
    this.video = new VideoManager();
    this.narrative = new NarrativeSystem(this);
    this.game = new GameSystems(this);
    this.ui = new ConfiguratorUI(this);
    this.mode = "build";
  }

  async init(){
    this.scene.init(document.querySelector("#viewport"));
    this.ui.init();
    this.loadProject(this.project);
    this.animate();
  }

  loadProject(project){
    this.project = project;
    this.world.setProject(project);
    this.scene.loadProject(project);
    this.ui.refreshAll();
  }

  setMode(mode){
    this.mode = mode;
    document.querySelectorAll(".mode").forEach(b=>b.classList.toggle("active", b.dataset.mode===mode));
    document.querySelectorAll(".mode-panel").forEach(p=>p.classList.add("hidden"));
    const panel=document.querySelector(`#${mode}Tools`);
    if(panel) panel.classList.remove("hidden");
    document.querySelector("#modeTitle").textContent =
      mode==="build" ? "BUILD / ASSETS" : mode==="story" ? "STORY / NARRATIVE" : "PLAY / TEST";
    document.querySelector("#gameHud").classList.toggle("hidden", mode!=="play");
    if(mode==="play") this.game.start();
    else this.game.stop();
  }

  animate(){
    requestAnimationFrame(()=>this.animate());
    this.scene.update();
    this.game.update();
    this.ui.update();
  }

  save(){ ProjectManager.save(this.project); this.ui.toast("PROJECT SAVED"); }
  export(){
    const blob=new Blob([JSON.stringify(this.project,null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=(this.project.meta.name||"ogeid-project")+".json"; a.click();
  }
}