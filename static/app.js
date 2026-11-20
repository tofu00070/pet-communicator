const video = document.getElementById("video");
const cameraBox = document.getElementById("cameraBox");
const placeholder = document.getElementById("cameraPlaceholder");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const result = document.getElementById("result");
const progress = document.getElementById("progress");
const aiStatus = document.getElementById("aiStatus");
let selectedPet = "bird";
let stream = null;
let recorder = null;
let chunks = [];
let stopped = false;
let timer = null;

document.querySelectorAll(".pet-card").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".pet-card").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  selectedPet = btn.dataset.pet;
}));

async function checkStatus(){
  try{
    const r = await fetch("/api/status"); const s = await r.json();
    aiStatus.textContent = s.ai_configured ? "AI connected" : "AI setup needed";
    aiStatus.classList.toggle("ready",s.ai_configured);
  }catch{aiStatus.textContent="Server unavailable";}
}
checkStatus();

function cleanup(){
  if(timer) clearInterval(timer);
  if(recorder && recorder.state !== "inactive"){try{recorder.stop()}catch{}}
  if(stream) stream.getTracks().forEach(t=>t.stop());
  stream=null; video.srcObject=null; cameraBox.classList.remove("active");
  placeholder.style.display="block"; stopBtn.disabled=true; startBtn.disabled=false;
  progress.style.width="0";
}
function stopNow(){stopped=true;cleanup();}

startBtn.addEventListener("click", async()=>{
  stopped=false; chunks=[];
  result.className="result-content loading"; result.textContent="Preparing camera and microphone…";
  startBtn.disabled=true; stopBtn.disabled=false;
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:true});
    video.srcObject=stream; await video.play();
    cameraBox.classList.add("active"); placeholder.style.display="none";
    const canvas=document.createElement("canvas");
    canvas.width=video.videoWidth||1280; canvas.height=video.videoHeight||720;
    canvas.getContext("2d").drawImage(video,0,0,canvas.width,canvas.height);
    const imageBlob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",.82));
    const mime=MediaRecorder.isTypeSupported("audio/webm;codecs=opus")?"audio/webm;codecs=opus":"";
    recorder=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
    const finished=new Promise(resolve=>recorder.onstop=()=>resolve());
    recorder.start();
    let elapsed=0;
    timer=setInterval(()=>{elapsed++;progress.style.width=(elapsed/8*100)+"%";if(elapsed>=8)finishCapture();},1000);
    async function finishCapture(){
      if(stopped || !recorder || recorder.state==="inactive")return;
      clearInterval(timer); recorder.stop(); await finished;
      if(stopped)return;
      const audioBlob=new Blob(chunks,{type:recorder.mimeType||"audio/webm"});
      stream.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;cameraBox.classList.remove("active");placeholder.style.display="block";
      stopBtn.disabled=true;
      result.textContent="Analysing the image and sound together…";
      const fd=new FormData();
      fd.append("pet",selectedPet);
      fd.append("species",document.getElementById("species").value.trim() || "Unknown species");
      fd.append("animal_group",document.getElementById("animalGroup").value);
      fd.append("language",document.getElementById("language").value);
      fd.append("notes",document.getElementById("notes").value);
      fd.append("image",imageBlob,"pet.jpg");fd.append("audio",audioBlob,"pet-audio.webm");
      try{
        const response=await fetch("/api/analyze",{method:"POST",body:fd});
        const data=await response.json();
        if(!response.ok)throw new Error(data.detail||"Analysis failed.");
        result.className="result-content";result.textContent=data.analysis;
      }catch(err){result.className="result-content error";result.textContent=err.message;}
      finally{startBtn.disabled=false;progress.style.width="0";}
    }
    // Save callback so Stop never submits the sample.
    window.finishPetCapture=finishCapture;
  }catch(err){
    result.className="result-content error";
    result.textContent="Could not start camera/microphone: "+err.message+". Use HTTPS on your phone, allow permissions, and close other apps using the camera.";
    cleanup();
  }
});
stopBtn.addEventListener("click",()=>{stopped=true;cleanup();result.className="result-content";result.textContent="Observation stopped. Nothing was sent for analysis.";});
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("/static/sw.js").catch(()=>{}));}
