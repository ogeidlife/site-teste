export class WorldStateManager{
  constructor(project){this.setProject(project)}
  setProject(project){this.project=project;this.states={};for(const o of project.scene.objects){if(o.currentState)this.states[o.id]=o.currentState}}
  set(id,state){this.states[id]=state;const o=this.project.scene.objects.find(x=>x.id===id);if(o)o.currentState=state;window.dispatchEvent(new CustomEvent("ogeid:worldstate",{detail:{id,state}}))}
  get(id){return this.states[id]}
  reset(){this.states={};for(const o of this.project.scene.objects)if(o.states)o.currentState=Object.keys(o.states)[0]}
}