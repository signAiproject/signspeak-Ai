import { FilesetResolver, HandLandmarker, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const $ = (id) => document.getElementById(id);
const video = $("camera"), canvas = $("overlay"), ctx = canvas.getContext("2d");
let stream = null, landmarker = null, animationId = null, lastVideoTime = -1, history = [];
let currentPhrase = "";
const modelUrl = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

function setStatus(title, detail, confidence = null) {
  $("recognitionStatus").textContent = title;
  $("statusDetail").textContent = detail;
  $("confidence").textContent = confidence === null ? "—" : `${Math.round(confidence * 100)}%`;
  $("confidenceBar").style.width = confidence === null ? "0%" : `${Math.round(confidence * 100)}%`;
}
function setCameraStatus(on, text) {
  $("cameraStatus").classList.toggle("on", on);
  $("cameraStatus").innerHTML = `<i></i> ${text}`;
  $("cameraPlaceholder").hidden = on;
  $("startCamera").disabled = on;
  $("stopCamera").disabled = !on;
}
async function initHandTracking() {
  if (landmarker) return landmarker;
  setStatus("Loading hand tracking…", "Loading the hand-landmark detector. This detects hand positions, not ISL meanings.");
  const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
  landmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: modelUrl, delegate: "GPU" },
    runningMode: "VIDEO", numHands: 2
  });
  return landmarker;
}
async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("Camera unavailable", "Use a modern browser and open this page on HTTPS or localhost. Camera access may not work from a file:// URL.");
    return;
  }
  try {
    $("startCamera").disabled = true;
    stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"},audio:false});
    video.srcObject = stream;
    await video.play();
    setCameraStatus(true, "Camera on");
    try {
      await initHandTracking();
      $("handBadge").textContent = "Hand tracking active";
      setStatus("Hand tracking active", "Hands can be detected, but no trained ISL classifier is connected. Demo buttons test the English output.");
      detectLoop();
    } catch (err) {
      console.error(err);
      $("handBadge").textContent = "Tracking model unavailable";
      setStatus("Camera active • tracker unavailable", "The camera works, but the hand-tracking model could not load. Check your internet connection and reload.");
    }
  } catch (err) {
    console.error(err);
    $("startCamera").disabled = false;
    const message = err.name === "NotAllowedError" ? "Camera permission was denied. Allow camera access in your browser settings and try again." : "Could not start the camera. Check that another app is not using it.";
    setStatus("Could not start camera", message);
  }
}
function detectLoop() {
  if (!stream || video.readyState < 2) { animationId = requestAnimationFrame(detectLoop); return; }
  if (video.currentTime !== lastVideoTime && landmarker) {
    lastVideoTime = video.currentTime;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    try {
      const result = landmarker.detectForVideo(video, performance.now());
      const draw = new DrawingUtils(ctx);
      for (const landmarks of result.landmarks || []) {
        draw.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {color:"#a7f3d0", lineWidth:3});
        draw.drawLandmarks(landmarks, {color:"#9a8cff", lineWidth:1, radius:3});
      }
      $("handBadge").textContent = result.landmarks?.length ? `${result.landmarks.length} hand(s) detected • meaning not classified` : "No hand detected";
      if (result.landmarks?.length) {
        setStatus("Hand detected", "Landmarks are visible. A trained ISL classifier is still needed to identify the sign.", null);
      }
    } catch (e) { console.warn("Detection frame skipped", e); }
  }
  animationId = requestAnimationFrame(detectLoop);
}
function stopCamera() {
  if (animationId) cancelAnimationFrame(animationId);
  animationId = null;
  if (stream) stream.getTracks().forEach(t => t.stop());
  stream = null; video.srcObject = null;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  setCameraStatus(false, "Camera off");
  $("handBadge").textContent = "Hand tracking not started";
  setStatus("Ready to begin", "Start the camera to initialise hand tracking. ISL translation needs a trained ISL recognition model.");
}
function addTranslation(phrase, source = "Demo phrase") {
  currentPhrase = phrase;
  $("translationText").textContent = phrase;
  $("speakButton").disabled = !phrase;
  setStatus(source === "Demo phrase" ? "Demo phrase selected" : "Translation added", source === "Demo phrase" ? "This is example text for testing the interface, not an AI prediction." : "This item was added to your session.");
  history.unshift({phrase, source, time: new Date()});
  renderHistory();
}
function renderHistory() {
  const list = $("historyList");
  if (!history.length) { list.innerHTML = '<div class="empty-history">Your translations will appear here during this session.</div>'; return; }
  list.innerHTML = "";
  history.slice(0,12).forEach((item) => {
    const row = document.createElement("div"); row.className = "history-item";
    const left = document.createElement("div"), strong = document.createElement("strong"), small = document.createElement("small");
    strong.textContent = item.phrase; small.textContent = `${item.source} • ${item.time.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}`;
    left.append(strong,small);
    const speak = document.createElement("button"); speak.textContent = "Speak"; speak.addEventListener("click", () => speakText(item.phrase));
    row.append(left,speak); list.append(row);
  });
}
function speakText(text) {
  if (!("speechSynthesis" in window)) { setStatus("Speech unavailable", "This browser does not support speech synthesis."); return; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-IN"; utterance.rate = 0.92;
  window.speechSynthesis.speak(utterance);
}
$("startCamera").addEventListener("click", startCamera);
$("stopCamera").addEventListener("click", stopCamera);
$("speakButton").addEventListener("click", () => currentPhrase && speakText(currentPhrase));
$("clearButton").addEventListener("click", () => { currentPhrase=""; $("translationText").textContent="Your recognised English will appear here."; $("speakButton").disabled=true; setStatus("Ready to begin", "The output was cleared. No live ISL classifier is connected yet."); });
$("clearHistory").addEventListener("click", () => { history=[]; renderHistory(); });
document.querySelectorAll(".demo-chip").forEach(button => button.addEventListener("click", () => addTranslation(button.dataset.phrase)));
$("fileInput").addEventListener("change", (event) => {
  const file = event.target.files?.[0]; if (!file) return;
  const holder = $("filePreview"); holder.hidden=false; holder.replaceChildren();
  const info = document.createElement("div"); info.textContent = `${file.name} • ${(file.size/1024/1024).toFixed(2)} MB`;
  holder.append(info);
  if (file.type.startsWith("image/")) {
    const img=document.createElement("img"); img.alt="Uploaded sign image preview"; img.src=URL.createObjectURL(file); holder.append(img);
  } else if (file.type.startsWith("video/")) {
    const v=document.createElement("video"); v.controls=true; v.playsInline=true; v.src=URL.createObjectURL(file); holder.append(v);
  }
  const note=document.createElement("p"); note.className="small-note"; note.textContent="File preview only: the ISL recognition model is not connected, so this file has not been translated."; holder.append(note);
});
window.addEventListener("beforeunload", stopCamera);
