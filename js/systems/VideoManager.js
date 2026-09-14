export class VideoManager{
  constructor(){this.overlay=document.querySelector("#videoOverlay");this.video=document.querySelector("#storyVideo");this.label=document.querySelector("#videoLabel");this.skip=document.querySelector("#skipVideo");this.current=null;this.skip.addEventListener("click",()=>this.stop())}
  add(video){return video}
  play(video,{label="NARRATIVE",skippable=true}={}){
    if(!video?.src && !video?.url)return Promise.resolve();
    this.current=video;this.label.textContent=label;this.skip.style.display=skippable?"block":"none";this.overlay.classList.remove("hidden");
    this.video.src=video.src||video.url;this.video.currentTime=0;this.video.play().catch(()=>{});
    return new Promise(resolve=>{this._resolve=resolve;this.video.onended=()=>{this.stop();resolve()}})
  }
  stop(){this.video.pause();this.video.removeAttribute("src");this.video.load();this.overlay.classList.add("hidden");if(this._resolve){this._resolve();this._resolve=null}}
}