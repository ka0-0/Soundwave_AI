import { getSharedAudio } from "./audioEngine";

let audioContext = null;
let sourceNode = null;
let analyserNode = null;
let frequencyData = null;
let connectedAudio = null;

// Equalizer filter nodes
let bassFilter = null;
let midFilter = null;
let highFilter = null;
let currentPreset = "normal";

export const EQ_PRESETS = {
  normal: { label: "Flat", bass: 0, mid: 0, high: 0 },
  "bass-boost": { label: "Bass Boost", bass: 8, mid: 0, high: -2 },
  "treble-boost": { label: "Treble Boost", bass: -3, mid: 1, high: 7 },
  "clear-vocals": { label: "Clear Vocals", bass: -4, mid: 6, high: 2 },
  cinematic: { label: "Cinematic 3D", bass: 6, mid: -2, high: 5 }
};

export function connectMusicAnalyser() {
  const audio = getSharedAudio();
  if (!audio) return null;

  // Do NOT connect non-CORS elements to the Web Audio API to prevent browser muting
  if (audio.crossOrigin !== "anonymous") {
    if (connectedAudio && connectedAudio !== audio) {
      console.log("[Analyser] Non-CORS audio element. Cleaning up old analyser.");
      if (audioContext) {
        audioContext.close().catch(() => {});
      }
      audioContext = null;
      sourceNode = null;
      analyserNode = null;
      bassFilter = null;
      midFilter = null;
      highFilter = null;
      connectedAudio = null;
    }
    return null;
  }

  if (analyserNode && sourceNode && connectedAudio === audio) return analyserNode;

  try {
    if (connectedAudio && connectedAudio !== audio) {
      console.log("[Analyser] Audio element changed. Reconnecting analyser.");
      if (audioContext) {
        audioContext.close().catch(() => {});
      }
      audioContext = null;
      sourceNode = null;
      analyserNode = null;
      bassFilter = null;
      midFilter = null;
      highFilter = null;
    }

    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    const resumeContext = () => {
      if (audioContext && audioContext.state === "suspended") {
        audioContext.resume().then(() => {
          console.log("[Analyser] AudioContext resumed successfully via interaction listener");
          cleanup();
        }).catch((err) => {
          console.warn("[Analyser] Failed to resume AudioContext:", err);
        });
      } else {
        cleanup();
      }
    };
    
    const cleanup = () => {
      window.removeEventListener("click", resumeContext);
      window.removeEventListener("mousedown", resumeContext);
      window.removeEventListener("keydown", resumeContext);
      window.removeEventListener("touchstart", resumeContext);
    };

    window.addEventListener("click", resumeContext);
    window.addEventListener("mousedown", resumeContext);
    window.addEventListener("keydown", resumeContext);
    window.addEventListener("touchstart", resumeContext);

    // Create primary audio nodes
    sourceNode = audioContext.createMediaElementSource(audio);
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 256;
    analyserNode.smoothingTimeConstant = 0.82;
    frequencyData = new Uint8Array(analyserNode.frequencyBinCount);

    // Initialize Equalizer filters
    bassFilter = audioContext.createBiquadFilter();
    bassFilter.type = "lowshelf";
    bassFilter.frequency.value = 150; // controls sub-bass & bass
    bassFilter.gain.value = 0;

    midFilter = audioContext.createBiquadFilter();
    midFilter.type = "peaking";
    midFilter.frequency.value = 1500; // controls vocal presence
    midFilter.Q.value = 1.0;
    midFilter.gain.value = 0;

    highFilter = audioContext.createBiquadFilter();
    highFilter.type = "highshelf";
    highFilter.frequency.value = 6000; // controls treble air
    highFilter.gain.value = 0;

    // Chain the Web Audio graph:
    // Source -> Bass -> Mid -> High -> Analyser -> Output
    sourceNode.connect(bassFilter);
    bassFilter.connect(midFilter);
    midFilter.connect(highFilter);
    highFilter.connect(analyserNode);
    analyserNode.connect(audioContext.destination);

    connectedAudio = audio;

    // Apply active EQ settings immediately
    setEqualizerPreset(currentPreset);
  } catch (err) {
    console.error("[Analyser] Connection failed:", err);
    return null;
  }

  return analyserNode;
}

export async function resumeAnalyserContext() {
  if (audioContext?.state === "suspended") {
    await audioContext.resume();
  }
}

export function setEqualizerPreset(presetName) {
  currentPreset = presetName;
  if (!bassFilter || !midFilter || !highFilter) return;
  
  const preset = EQ_PRESETS[presetName] || EQ_PRESETS.normal;
  const t = audioContext ? audioContext.currentTime : 0;

  if (bassFilter.gain.setValueAtTime) {
    bassFilter.gain.setValueAtTime(preset.bass, t);
    midFilter.gain.setValueAtTime(preset.mid, t);
    highFilter.gain.setValueAtTime(preset.high, t);
  } else {
    bassFilter.gain.value = preset.bass;
    midFilter.gain.value = preset.mid;
    highFilter.gain.value = preset.high;
  }
  console.log(`[Analyser] Applied EQ Preset: ${presetName}`, preset);
}

export function readMusicLevels() {
  const audio = getSharedAudio();
  const isPlaying = audio ? !audio.paused : false;

  // If the audio is playing but we are not connected to the analyser (e.g. non-CORS audio)
  if (isPlaying && (!analyserNode || !frequencyData)) {
    const t = Date.now() * 0.004;
    // Generate organic-looking simulated levels
    const simBass = 0.5 + Math.sin(t * 2.0) * 0.2 + Math.cos(t * 0.75) * 0.1;
    const simMid = 0.4 + Math.sin(t * 1.4) * 0.15 + Math.cos(t * 0.45) * 0.08;
    const simHigh = 0.3 + Math.sin(t * 2.8) * 0.12 + Math.cos(t * 1.15) * 0.07;
    const simEnergy = (simBass * 0.5 + simMid * 0.35 + simHigh * 0.15);
    return { energy: simEnergy, bass: simBass, mid: simMid, high: simHigh };
  }

  if (!analyserNode || !frequencyData) {
    return { energy: 0, bass: 0, mid: 0, high: 0 };
  }

  analyserNode.getByteFrequencyData(frequencyData);
  const len = frequencyData.length;
  const bassEnd = Math.floor(len * 0.12);
  const midEnd = Math.floor(len * 0.45);

  let bass = 0;
  let mid = 0;
  let high = 0;

  for (let i = 0; i < len; i++) {
    const v = frequencyData[i] / 255;
    if (i < bassEnd) bass += v;
    else if (i < midEnd) mid += v;
    else high += v;
  }

  bass /= bassEnd || 1;
  mid /= midEnd - bassEnd || 1;
  high /= len - midEnd || 1;

  const energy = (bass * 0.5 + mid * 0.35 + high * 0.15);

  // Fallback: If the audio is playing but we read all zeroes (e.g. CORS-tainted source)
  if (isPlaying && energy === 0) {
    const t = Date.now() * 0.004;
    const simBass = 0.5 + Math.sin(t * 2.0) * 0.2 + Math.cos(t * 0.75) * 0.1;
    const simMid = 0.4 + Math.sin(t * 1.4) * 0.15 + Math.cos(t * 0.45) * 0.08;
    const simHigh = 0.3 + Math.sin(t * 2.8) * 0.12 + Math.cos(t * 1.15) * 0.07;
    const simEnergy = (simBass * 0.5 + simMid * 0.35 + simHigh * 0.15);
    return { energy: simEnergy, bass: simBass, mid: simMid, high: simHigh };
  }

  return { energy, bass, mid, high };
}
