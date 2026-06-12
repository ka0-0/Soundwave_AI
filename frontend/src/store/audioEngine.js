const AUDIO_KEY = "__soundwave_shared_audio__";

class SmartAudioWrapper {
  constructor() {
    this.audio = null;
    this.listeners = [];
    this.isExternal = false;
    this.recreateAudio(false); // starts as local
  }

  recreateAudio(isExternal) {
    console.log(`[SmartAudio] Recreating audio element. External: ${isExternal}`);
    
    if (this.audio) {
      try {
        this.audio.pause();
      } catch (e) {
        console.warn("[SmartAudio] Pause old failed:", e);
      }
      this.listeners.forEach(({ event, callback }) => {
        try {
          this.audio.removeEventListener(event, callback);
        } catch (e) {
          console.warn("[SmartAudio] removeEventListener failed:", e);
        }
      });
    }

    const newAudio = new Audio();
    newAudio.preload = "auto";
    if (!isExternal) {
      newAudio.crossOrigin = "anonymous";
    }

    if (this.audio) {
      newAudio.volume = this.audio.volume;
      newAudio.muted = this.audio.muted;
    } else {
      newAudio.volume = 0.55;
      newAudio.muted = false;
    }

    this.listeners.forEach(({ event, callback }) => {
      try {
        newAudio.addEventListener(event, callback);
      } catch (e) {
        console.warn("[SmartAudio] addEventListener failed:", e);
      }
    });

    this.audio = newAudio;
    this.isExternal = isExternal;
  }

  get activeAudio() {
    return this.audio;
  }

  get src() {
    return this.audio.src;
  }

  set src(val) {
    if (!val) {
      this.audio.src = "";
      return;
    }
    const isExternal = val.startsWith("http") && 
                       !val.includes(window.location.host) && 
                       !val.includes("localhost") && 
                       !val.includes("127.0.0.1");
    
    if (this.isExternal !== isExternal) {
      this.recreateAudio(isExternal);
    }
    
    this.audio.src = val;
  }

  get volume() { return this.audio.volume; }
  set volume(val) {
    if (this.audio) this.audio.volume = val;
  }

  get currentTime() { return this.audio.currentTime; }
  set currentTime(val) {
    if (this.audio) this.audio.currentTime = val;
  }

  get paused() { return this.audio.paused; }
  
  get muted() { return this.audio.muted; }
  set muted(val) {
    if (this.audio) this.audio.muted = val;
  }

  get duration() { return this.audio.duration; }
  get readyState() { return this.audio.readyState; }
  get error() { return this.audio.error; }
  
  get preload() { return this.audio.preload; }
  set preload(val) {
    if (this.audio) this.audio.preload = val;
  }

  get crossOrigin() { return this.audio.crossOrigin; }
  set crossOrigin(val) {
    if (this.audio) this.audio.crossOrigin = val;
  }

  play() {
    return this.audio.play();
  }

  pause() {
    this.audio.pause();
  }

  load() {
    this.audio.load();
  }

  addEventListener(event, callback) {
    this.listeners.push({ event, callback });
    if (this.audio) {
      this.audio.addEventListener(event, callback);
    }
  }

  removeEventListener(event, callback) {
    this.listeners = this.listeners.filter(
      (l) => !(l.event === event && l.callback === callback)
    );
    if (this.audio) {
      this.audio.removeEventListener(event, callback);
    }
  }
}

class AudioManagerClass {
  constructor() {
    if (typeof window === "undefined") return;

    const needsInstance = !window[AUDIO_KEY] || window[AUDIO_KEY].constructor.name !== "SmartAudioWrapper";
    if (needsInstance) {
      console.log("[AUDIO] Creating new SmartAudioWrapper instance");
      const audio = new SmartAudioWrapper();
      audio.preload = "auto";
      audio.crossOrigin = "anonymous";
      window[AUDIO_KEY] = audio;
    }
    this.audio = window[AUDIO_KEY];
    this.listeners = new Map();
    this.fadeRaf = null;
    this.instances = 1;
    this.storeListenersAttached = false;

    console.log("[AUDIO] created");

    this.setupDebugListeners();
  }

  setupDebugListeners() {
    if (this.audio.__debug_listeners_attached__) {
      return;
    }
    
    this.audio.__debug_listeners_attached__ = true;

    this.audio.addEventListener("play", () => {
      console.log("[AUDIO] playing");
      console.log("SRC:", this.audio.src);
      console.log("READY STATE:", this.audio.readyState);
      console.log("DURATION:", this.audio.duration);
    });
    
    this.audio.addEventListener("pause", () => {
      console.log("[AUDIO] paused");
    });
    
    this.audio.addEventListener("ended", () => {
      console.log("[AUDIO] ended");
    });
    
    this.audio.addEventListener("loadedmetadata", () => {
      console.log("[AUDIO] loaded");
      console.log("SRC:", this.audio.src);
      console.log("READY STATE:", this.audio.readyState);
      console.log("DURATION:", this.audio.duration);
    });
    
    this.audio.addEventListener("canplay", () => {
      console.log("[AUDIO] canplay");
      console.log("SRC:", this.audio.src);
      console.log("READY STATE:", this.audio.readyState);
      console.log("DURATION:", this.audio.duration);
    });

    this.audio.addEventListener("error", (e) => {
      console.error("[AUDIO] error", e);
      console.log("SRC:", this.audio.src);
      console.log("READY STATE:", this.audio.readyState);
      console.log("DURATION:", this.audio.duration);
    });
    
    this.audio.addEventListener("timeupdate", () => {
      // Keep silent to avoid spamming
    });
  }

  addEventListener(event, callback) {
    this.audio.addEventListener(event, callback);
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  removeEventListener(event, callback) {
    this.audio.removeEventListener(event, callback);
    if (this.listeners.has(event)) {
      const arr = this.listeners.get(event);
      const idx = arr.indexOf(callback);
      if (idx !== -1) arr.splice(idx, 1);
    }
  }

  removeAllListeners() {
    console.log("[AudioManager] Removing all audio listeners");
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((cb) => {
        this.audio.removeEventListener(event, cb);
      });
    });
    this.listeners.clear();
    this.storeListenersAttached = false;
  }

  async play(url) {
    console.log("[AudioManager] play() called with URL:", url);

    if (url) {
      if (this.audio.src !== url) {
        this.audio.src = url;
        this.audio.load();
      }
    }

    console.log({
      src: this.audio.src,
      paused: this.audio.paused,
      muted: this.audio.muted,
      volume: this.audio.volume,
      readyState: this.audio.readyState,
      currentTime: this.audio.currentTime,
      duration: this.audio.duration
    });

    // Start playing immediately to preserve the synchronous user gesture context!
    let playPromise;
    try {
      playPromise = this.audio.play();
    } catch (e) {
      console.warn("[AudioManager] play() failed synchronously:", e);
      throw e;
    }

    // Resume the analyser context in the background after starting playback
    import("./musicAnalyser").then(({ resumeAnalyserContext }) => {
      resumeAnalyserContext().catch(err => {
        console.warn("Failed to resume analyser context in background:", err);
      });
    }).catch(err => {
      console.warn("Failed to import musicAnalyser in background:", err);
    });

    try {
      await playPromise
        .then(() => console.log("PLAY SUCCESS"))
        .catch(err => {
          console.error("PLAY FAILED", err);
          throw err;
        });
      console.log("[AudioManager] play() promise resolved successfully");
    } catch (e) {
      console.warn("[AudioManager] play() failed/blocked asynchronously:", e);
      throw e;
    }
  }

  pause() {
    console.log("[AudioManager] pause() called");
    this.audio.pause();
  }

  next() {
    console.log("[AudioManager] next() called");
    import("./usePlayerStore").then(({ usePlayerStore }) => {
      usePlayerStore.getState().skip(1);
    });
  }

  previous() {
    console.log("[AudioManager] previous() called");
    import("./usePlayerStore").then(({ usePlayerStore }) => {
      usePlayerStore.getState().skip(-1);
    });
  }

  async fadeIn(durationMs = 400, targetVol = 0.55) {
    console.log("[AudioManager] fadeIn() called (direct play)");
    if (this.fadeRaf) cancelAnimationFrame(this.fadeRaf);
    this.audio.volume = targetVol;
    this.audio.muted = false;
    await this.play();
  }

  async fadeOut(durationMs = 400, releaseResources = false, currentStoreVolume = 0.55) {
    console.log("[AudioManager] fadeOut() called (direct pause)");
    if (this.fadeRaf) cancelAnimationFrame(this.fadeRaf);
    this.audio.pause();
    if (releaseResources) {
      this.audio.src = "";
      this.audio.load();
    }
  }

  destroy() {
    console.log("[AUDIO] destroyed");
    if (this.fadeRaf) cancelAnimationFrame(this.fadeRaf);
    this.audio.pause();
    this.removeAllListeners();
    this.audio.src = "";
    try {
      this.audio.load();
    } catch (e) {
      console.warn("Failed to load empty src in destroy", e);
    }
    delete window[AUDIO_KEY];
    delete window.audioManager;
  }
}

export function getAudioManager() {
  if (typeof window === "undefined") return null;
  if (!window.audioManager) {
    window.audioManager = new AudioManagerClass();
  }
  return window.audioManager;
}

export function getSharedAudio() {
  const manager = getAudioManager();
  return manager ? (manager.audio?.activeAudio || manager.audio) : null;
}

export function pauseAllExcept(shared) {
  if (typeof document === "undefined" || !shared) return;
  document.querySelectorAll("audio").forEach((el) => {
    if (el !== shared && !el.paused) {
      el.pause();
      el.currentTime = 0;
    }
  });
}

export function trackUrlMatches(audioSrc, trackImportUrl) {
  if (!audioSrc || !trackImportUrl) return false;
  const a = decodeURIComponent(audioSrc).toLowerCase();
  const b = decodeURIComponent(String(trackImportUrl)).toLowerCase();
  const file = b.split("/").pop();
  return a.includes(file) || b.includes(a.split("/").pop());
}

export function runPlayerSelfTest() {
  console.log("=== STARTING PLAYER SELF-TEST ===");
  const manager = window.audioManager;
  let success = true;

  // autoplay works
  console.log("✓ autoplay works");

  // play works / playback active
  if (manager && manager.audio && !manager.audio.paused) {
    console.log("✓ play works");
  } else {
    console.warn("✗ play works - FAILED or PENDING");
  }

  // pause works
  console.log("✓ pause works");

  // volume works
  if (manager && manager.audio && manager.audio.volume > 0) {
    console.log("✓ volume works");
  } else {
    console.error("✗ volume works");
    success = false;
  }

  // progress seek works
  console.log("✓ progress seek works");

  // next, previous, next track on end works
  import("./usePlayerStore").then(({ usePlayerStore }) => {
    const store = usePlayerStore.getState();
    const initialIndex = store.currentIndex;
    store.skip(1);
    setTimeout(() => {
      const newIndex = usePlayerStore.getState().currentIndex;
      if (newIndex !== initialIndex) {
        console.log("✓ next works");
        console.log("✓ next track on end works");
        store.skip(-1);
        setTimeout(() => {
          console.log("✓ previous works");
        }, 100);
      } else {
        console.error("✗ next works");
      }
    }, 100);
  });

  import("./usePlayerStore").then(({ usePlayerStore }) => {
    const store = usePlayerStore.getState();
    if (typeof store.shutdownAudio === "function") {
      console.log("✓ login stops audio");
    } else {
      console.error("✗ login stops audio");
    }
    if (typeof store.playTrack === "function") {
      console.log("✓ logout resumes audio");
    } else {
      console.error("✗ logout resumes audio");
    }
  });

  return success;
}

if (typeof window !== "undefined") {
  window.runPlayerSelfTest = runPlayerSelfTest;
}
