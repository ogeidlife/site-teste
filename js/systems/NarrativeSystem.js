export class NarrativeSystem{
  constructor(engine){this.engine=engine}
  async playSequence(sequence=[]){
    for(const step of sequence){
      if(step.type==="VIDEO"){const v=this.engine.project.videos.find(x=>x.id===step.videoId);if(v)await this.engine.video.play(v,{label:step.label||"NARRATIVE",skippable:step.skippable!==false})}
      if(step.type==="WAIT")await new Promise(r=>setTimeout(r,step.ms||1000));
      if(step.type==="STATE")this.engine.world.set(step.objectId,step.state);
      if(step.type==="MISSION")this.startMission(step.missionId);
    }
  }
  startMission(id){this.engine.game.activeMission=id;this.engine.game.objectiveIndex=0;window.dispatchEvent(new CustomEvent("ogeid:mission",{detail:id}))}
}