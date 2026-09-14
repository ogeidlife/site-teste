export class ProjectManager {
  static defaultProject(){
    return {
      meta:{name:"DEMO_TERMINAL",version:"0.1.0"},
      assets:[],
      scene:{
        objects:[
          {id:"ground",name:"GROUND",type:"ground",position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],collision:false},
          {id:"building_01",name:"DEPOT BUILDING",type:"building",position:[0,2,-9],rotation:[0,0,0],scale:[8,4,2],collision:true},
          {id:"wall_01",name:"WALL 01",type:"wall",position:[0,2,-5],rotation:[0,0,0],scale:[7,3,0.25],collision:true,
           states:{EMPTY:{visual:"default"},PAINTED:{visual:"graffiti_final"}},currentState:"EMPTY"},
          {id:"wall_02",name:"WALL 02",type:"wall",position:[8,2,0],rotation:[0,Math.PI/2,0],scale:[5,3,0.25],collision:true,
           states:{EMPTY:{visual:"default"},PAINTED:{visual:"graffiti_final"}},currentState:"EMPTY"},
          {id:"guard_01",name:"SECURITY 01",type:"guard",position:[-7,0,5],rotation:[0,0,0],scale:[1,1,1],collision:true,
           speed:1.8,visionDistance:7,visionAngle:1.1,waypoints:[[-7,0,5],[-2,0,5],[-2,0,-2],[-7,0,-2]]},
          {id:"camera_01",name:"CAMERA 01",type:"camera",position:[5,5,-4],rotation:[-0.4,0.5,0],scale:[1,1,1],collision:false,
           visionDistance:10,visionAngle:.8,rotationSpeed:.4},
          {id:"camera_02",name:"CAMERA 02",type:"camera",position:[-6,5,-4],rotation:[-0.4,-.5,0],scale:[1,1,1],collision:false,
           visionDistance:8,visionAngle:.8,rotationSpeed:.25},
          {id:"graffiti_01",name:"GRAFFITI SPOT 01",type:"graffiti",position:[0,2,-4.7],rotation:[0,0,0],scale:[5,2.4,1],collision:false,
           wallId:"wall_01",beforeState:"EMPTY",afterState:"PAINTED",paintVideo:null,completionVideo:null},
          {id:"spray_01",name:"SPRAY",type:"item",position:[-4,0,1],rotation:[0,0,0],scale:[.5,.5,.5],collision:false,itemType:"SPRAY"},
          {id:"trigger_01",name:"MISSION INTRO TRIGGER",type:"trigger",position:[-1,0,7],rotation:[0,0,0],scale:[3,1,3],collision:false,
           trigger:"ENTER",action:"VIDEO",videoId:null},
          {id:"light_01",name:"DEPOT LIGHT",type:"light",position:[0,6,-3],rotation:[0,0,0],scale:[1,1,1],collision:false,
           intensity:2,distance:16,color:"#ffd39a"}
        ]
      },
      player:{asset:null,position:[-6,0,7],speed:3.5,runSpeed:6,animations:{idle:"Idle",walk:"Walk",run:"Run",spray:"Spray"}},
      videos:[],
      missions:[
        {id:"mission_01",name:"Pinte o depósito",description:"Encontre o muro e faça o graffiti.",introVideo:null,completeVideo:null,failedVideo:null,
         objectives:[
           {id:"obj1",type:"GO_TO",name:"Encontre o depósito",position:[0,0,-4]},
           {id:"obj2",type:"PAINT",name:"Pinte o muro",targetId:"graffiti_01"},
           {id:"obj3",type:"RETURN",name:"Volte para a base",position:[-6,0,7]}
         ]}
      ],
      narrative:{sequences:[]},
      ui:{showHP:true,showEnergy:true,showMissionPanel:true,showMinimap:true,showInventory:true,showCameraFeed:true}
    };
  }
  static save(project){localStorage.setItem("ogeid_project",JSON.stringify(project))}
  static load(){try{return JSON.parse(localStorage.getItem("ogeid_project"))||this.defaultProject()}catch{return this.defaultProject()}}
}