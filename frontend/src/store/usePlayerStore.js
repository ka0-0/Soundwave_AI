import { create } from "zustand";
import { PLAYER_TRACKS } from "../components/player/playerTracks";
import { getAudioManager, trackUrlMatches } from "./audioEngine";
import { connectMusicAnalyser } from "./musicAnalyser";
const isAudioSource = (source) => source === "audio" || source === "deezer" || source === "itunes" || source === "local" || source === "database" || !source;

function indexFromAudioSrc(audio, queue) {
  if (!audio?.src) return 0;
  const found = queue.findIndex((t) => trackUrlMatches(audio.src, t.src));
  return found >= 0 ? found : 0;
}

async function fetchRealPreviewUrl(title, artist) {
  if (!title || !artist) return null;
  const localTitles = ["dhurandhar", "jat jatni", "my queen", "haaye re", "bairan", "fortuner", "kitaab"];
  const tTitle = title.toLowerCase().trim();
  if (localTitles.includes(tTitle)) {
    return null;
  }
  try {
    const query = encodeURIComponent(`${artist} ${title}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${query}&limit=1&media=music&entity=song`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return data.results[0].previewUrl;
      }
    }
  } catch (e) {
    console.error("iTunes dynamic resolver failed", e);
  }
  return null;
}

let initialIndex = 0;
if (typeof window !== "undefined") {
  const savedIndex = localStorage.getItem("soundwave_autoplay_index");
  if (savedIndex !== null) {
    initialIndex = (parseInt(savedIndex, 10) + 1) % (PLAYER_TRACKS.length || 1);
  } else {
    initialIndex = 0; // First entry starts with Dhurandhar (index 0)
  }
  localStorage.setItem("soundwave_autoplay_index", initialIndex.toString());
}

export const usePlayerStore = create((set, get) => ({
  currentIndex: initialIndex,
  isPlaying: true,
  volume: 0.55,
  current: PLAYER_TRACKS[initialIndex] || PLAYER_TRACKS[0],
  queue: [...PLAYER_TRACKS],
  shuffledQueue: [],
  isShuffled: false,
  progress: 0,
  currentTime: 0,
  duration: 0,
  repeatMode: "off",
  engineReady: false,
  sourceType: "audio",
  equalizerMode: (typeof window !== "undefined" && localStorage.getItem("soundwave_eq_mode")) || "normal",

  initEngine: () => {
    const manager = getAudioManager();
    if (!manager) return;

    if (manager.storeListenersAttached) {
      return;
    }

    const audio = manager.audio;
    manager.removeAllListeners();

    audio.volume = get().volume;
    if (get().volume > 0) audio.muted = false;

    // ended listener
    const onEnded = () => {
      console.log("[PlayerStore] ended event received");
      if (isAudioSource(get().sourceType)) set({ isPlaying: false });
      const { repeatMode } = get();
      if (repeatMode === "one") {
        get().playTrack(get().currentIndex, { fromStart: true });
      } else {
        get().skip(1);
      }
    };
    manager.addEventListener("ended", onEnded);

    // play listener
    const onPlay = () => {
      console.log("[PlayerStore] play event received, checking paused state");
      if (isAudioSource(get().sourceType)) {
        set({ isPlaying: !audio.paused });
      }
      if (!audio.paused) {
        connectMusicAnalyser();
      }
    };
    manager.addEventListener("play", onPlay);

    // pause listener
    const onPause = () => {
      console.log("[PlayerStore] pause event received, checking paused state");
      if (isAudioSource(get().sourceType) && audio.paused) {
        set({ isPlaying: false });
      }
    };
    manager.addEventListener("pause", onPause);

    // loadedmetadata listener
    const onLoadedMetadata = () => {
      const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
      console.log("[PlayerStore] loadedmetadata event received, duration:", dur);
      set({
        duration: dur,
        progress: dur > 0 ? audio.currentTime / dur : 0
      });
    };
    manager.addEventListener("loadedmetadata", onLoadedMetadata);

    // timeupdate listener
    const onTimeUpdate = () => {
      if (!isAudioSource(get().sourceType)) return;
      const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
      const cur = audio.currentTime || 0;
      set({
        currentTime: cur,
        duration: dur,
        progress: dur > 0 ? cur / dur : 0
      });
    };
    manager.addEventListener("timeupdate", onTimeUpdate);

    // Preload first track if src is empty
    if (!audio.src) {
      const firstTrack = get().current || get().queue[0];
      if (firstTrack && isAudioSource(firstTrack.source)) {
        const url = firstTrack.src || firstTrack.audio_url || firstTrack.preview_url || firstTrack.preview;
        if (url) {
          audio.src = url;
          audio.load();
          console.log("[PlayerStore] preloaded first track:", firstTrack.title, "src:", url);
        }
      }
    } else {
      // Sync duration if src already exists and metadata is already loaded
      const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
      if (dur > 0) {
        set({
          duration: dur,
          progress: dur > 0 ? audio.currentTime / dur : 0
        });
      }
    }

    manager.storeListenersAttached = true;
    set({ engineReady: true });

    // Sync equalizer preset on engine startup
    import("./musicAnalyser").then(({ setEqualizerPreset }) => {
      setEqualizerPreset(get().equalizerMode);
    }).catch(() => {});
  },

  togglePlay: async () => {
    console.log("[AUDIO CLICK] Play/Pause clicked");
    const { sourceType } = get();
    if (isAudioSource(sourceType)) {
      const manager = getAudioManager();
      if (!manager) return;
      get().initEngine();
      
      const isRealPlaying = !manager.audio.paused;
      
      if (isRealPlaying) {
        manager.audio.pause();
        set({ isPlaying: false });
        logAudioState("pause");
      } else {
        set({ isPlaying: true });
        try {
          if (!manager.audio.src) {
            const url = get().current.src || get().current.audio_url || get().current.preview_url;
            await manager.play(url);
          } else {
            await manager.play();
          }
          logAudioState("play");
        } catch (e) {
          console.warn("Play blocked by browser autoplay policy", e);
          set({ isPlaying: false });
          logAudioState("play-failed");
        }
      }
    } else {
      const { isPlaying } = get();
      set({ isPlaying: !isPlaying });
      logAudioState("togglePlay-fallback");
    }
  },

  pause: () => {
    console.log("[AUDIO CLICK] Pause clicked");
    const manager = getAudioManager();
    if (manager) {
      manager.audio.pause();
    }
    set({ isPlaying: false });
    logAudioState("pause");
  },

  playTrack: async (index, options = {}) => {
    console.log(`[AUDIO CLICK] playTrack index: ${index}`);
    const manager = getAudioManager();
    if (!manager) return;
    get().initEngine();

    const targetQueue = get().isShuffled ? get().shuffledQueue : get().queue;
    const track = targetQueue[index];
    if (!track) return;

    // ROOT CAUSE INVESTIGATION PROCESS: Step 1 & 2
    // Print the full recommendation object before playback and compare with PLAYER_TRACKS[0]
    const workingTrack = PLAYER_TRACKS[0];
    console.log("=== PLAYBACK DIAGNOSTICS: SIDE-BY-SIDE COMPARE ===");
    console.log("WORKING TRACK (PLAYER_TRACKS[0]):", JSON.stringify(workingTrack, null, 2));
    console.log("REQUESTED TRACK:", JSON.stringify(track, null, 2));
    console.log(`WORKING TRACK info: id="${workingTrack?.id}" | title="${workingTrack?.title}" | artist="${workingTrack?.artist}" | cover_url="${workingTrack?.cover_url}" | audio_url="${workingTrack?.audio_url}" | preview_url="${workingTrack?.preview_url}" | stream_url="${workingTrack?.stream_url}" | src="${workingTrack?.src}"`);
    console.log(`REQUESTED TRACK info: id="${track?.id}" | title="${track?.title}" | artist="${track?.artist}" | cover_url="${track?.cover_url}" | audio_url="${track?.audio_url}" | preview_url="${track?.preview_url}" | stream_url="${track?.stream_url}" | src="${track?.src}"`);
    console.log("================================================");

    const source = track.source || "audio";
    let url = track.src || track.audio_url || track.preview_url || track.preview;

    // Verify whether the audio URL field exists
    const hasUrlField = !!url;
    console.log(`[AUDIO DEBUG] Audio URL field exists: ${hasUrlField} (Value: ${url})`);

    const isMock = track.isMockUrl || 
                   !url || 
                   url === "None" || 
                   url === "null" || 
                   url === "undefined" || 
                   String(url).includes("cdn.soundwave.ai") || 
                   String(url).includes("soundhelix.com");

    if (isMock) {
      try {
        console.log(`[AUDIO Store] Track "${track.title}" is mock/SoundHelix. Attempting iTunes resolve.`);
        const realUrl = await fetchRealPreviewUrl(track.title, track.artist);
        if (realUrl) {
          console.log(`[AUDIO Store] Successfully resolved real preview for "${track.title}":`, realUrl);
          url = realUrl;
          track.src = realUrl; // update in place
        } else {
          console.log(`[AUDIO Store] iTunes resolve returned no results for "${track.title}". Playing fallback.`);
        }
      } catch (e) {
        console.warn("Failed to dynamically resolve preview via iTunes", e);
      }
    }

    // Verification is handled upstream, play directly to preserve user gesture context

    const isSameTrack = trackUrlMatches(manager.audio.src, url);

    if (get().isPlaying && manager.audio.src && (!isSameTrack || options.fromStart)) {
      manager.audio.pause();
    }

    // Save previous state in case we need it, but we can set the new selected song metadata as requested
    set({ sourceType: source, currentIndex: index, current: track, isPlaying: true });

    if (isAudioSource(source)) {
      if (options.fromStart) manager.audio.currentTime = 0;
      if (!isSameTrack) {
        manager.audio.src = url || "";
        manager.audio.load();
      }
      console.log(`[AUDIO DEBUG] Final audio.src assigned: ${manager.audio.src}`);

      try {
        await manager.play();
        logAudioState("playTrack-success");
      } catch (e) {
        console.error("=== PLAYBACK FAILURE DETECTED ===");
        console.error("Failure Reason:", e.message || e);
        console.error("Recommendation ID:", track.id);
        console.error("Audio URL from API:", track.audio_url || track.preview_url || track.preview || "None");
        console.error("Final audio.src assigned to player:", manager.audio.src);
        console.error("=================================");

        // Display a user-friendly error message, keep player state intact (not playing), queue unchanged, carousels mounted
        set({ isPlaying: false });
        logAudioState("playTrack-failed");

        const { useToastStore } = await import("./useToastStore");
        useToastStore.getState().push({
          type: "error",
          title: "Playback Error",
          message: "Unable to play this track. Audio source unavailable."
        });

        // Do not rethrow the error, handle it cleanly so the dashboard remains responsive and doesn't reload/crash
        return;
      }
    } else {
      manager.audio.pause();
      logAudioState("playTrack-nonAudio");
    }

    const { apiPost } = await import("../utils/api");
    apiPost("/workspace/recently-played", {
      song_id: track.id,
      track_data: track
    }).then(() => {
      import("./useWorkspaceStore").then(({ useWorkspaceStore }) =>
        useWorkspaceStore.getState().refresh()
      );
    }).catch(() => {});
  },

  skip: (direction) => {
    console.log(`[AUDIO CLICK] Skip clicked, direction: ${direction > 0 ? "Next" : "Previous"}`);
    const { currentIndex, isShuffled, queue, shuffledQueue } = get();
    const currentQueue = isShuffled ? shuffledQueue : queue;
    let nextIndex = currentIndex + direction;

    if (nextIndex >= currentQueue.length) {
      nextIndex = 0;
    } else if (nextIndex < 0) {
      nextIndex = currentQueue.length - 1;
    }

    if (direction > 0) {
      console.log("[AUDIO] next track");
    }

    get().playTrack(nextIndex, { fromStart: true });
    logAudioState(direction > 0 ? "next" : "previous");
  },

  setVolume: (volume) => {
    console.log(`[AUDIO CLICK] Volume changed: ${volume}`);
    const v = Math.max(0, Math.min(1, volume));
    const manager = getAudioManager();
    if (manager) {
      manager.audio.volume = v;
      manager.audio.muted = v === 0;
    }
    set({ volume: v });
    logAudioState("volume");
  },

  seek: (time) => {
    console.log(`[AUDIO CLICK] Progress seek: ${time}`);
    const manager = getAudioManager();
    if (!manager || !Number.isFinite(time)) return;
    manager.audio.currentTime = time;
    const dur = Number.isFinite(manager.audio.duration) ? manager.audio.duration : time;
    set({
      currentTime: time,
      progress: dur > 0 ? time / dur : 0
    });
    logAudioState("seek");
  },

  setRepeatMode: (mode) => {
    console.log(`[AUDIO CLICK] Repeat mode changed: ${mode}`);
    set({ repeatMode: mode });
    logAudioState("repeat");
  },

  setEqualizerMode: (mode) => {
    console.log(`[AUDIO CLICK] Equalizer preset changed: ${mode}`);
    set({ equalizerMode: mode });
    if (typeof window !== "undefined") {
      localStorage.setItem("soundwave_eq_mode", mode);
    }
    import("./musicAnalyser").then(({ setEqualizerPreset }) => {
      setEqualizerPreset(mode);
    }).catch(() => {});
    logAudioState("equalizer");
  },

  toggleShuffle: () => {
    console.log("[AUDIO CLICK] Shuffle clicked");
    const { isShuffled, queue, current } = get();
    if (!isShuffled) {
      const shuffled = [...queue].sort(() => Math.random() - 0.5);
      const currentIndexInShuffled = shuffled.findIndex(t => t.id === current.id);
      if (currentIndexInShuffled !== -1) {
        [shuffled[0], shuffled[currentIndexInShuffled]] = [shuffled[currentIndexInShuffled], shuffled[0]];
      }
      set({ isShuffled: true, shuffledQueue: shuffled, currentIndex: 0 });
    } else {
      const indexInOriginal = queue.findIndex(t => t.id === current.id);
      set({ isShuffled: false, currentIndex: indexInOriginal });
    }
    logAudioState("shuffle");
  },

  addToQueue: (track) => {
    set((state) => ({ queue: [...state.queue, track] }));
    if (get().isShuffled) {
      set((state) => ({ shuffledQueue: [...state.shuffledQueue, track] }));
    }
  },

  setQueue: (tracks) => {
    console.log("[AUDIO] setQueue with count:", tracks ? tracks.length : 0);
    set({ queue: tracks });
    if (get().isShuffled) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      set({ shuffledQueue: shuffled });
    }
  },

  fadeIn: async (durationMs = 400) => {
    const manager = getAudioManager();
    if (!manager) return;
    set({ isPlaying: true });
    await manager.fadeIn(durationMs, get().volume);
  },

  fadeOut: async (durationMs = 400, releaseResources = false) => {
    const manager = getAudioManager();
    if (!manager) return;
    await manager.fadeOut(durationMs, releaseResources, get().volume);
    set({ isPlaying: false });
  },

  shutdownAudio: async () => {
    const manager = getAudioManager();
    if (!manager) return;
    console.log("[AUDIO] login stop");
    manager.audio.pause();
    manager.destroy();
    set({ isPlaying: false, engineReady: false });
    logAudioState("shutdown");
  }
}));

function logAudioState(action) {
  const manager = getAudioManager();
  const audio = manager ? manager.audio : null;
  const store = usePlayerStore.getState();
  console.log(`[AUDIO DEBUG] Action: ${action}`);
  console.log(`Current Track: ${store.current ? store.current.title : "None"}`);
  console.log(`Track Index: ${store.currentIndex}`);
  console.log(`Audio Source: ${audio ? audio.src : "None"}`);
  console.log(`Is Playing: ${store.isPlaying}`);
  console.log(`Current Time: ${audio ? audio.currentTime.toFixed(2) : 0}s`);
  console.log(`Duration: ${audio ? audio.duration.toFixed(2) : 0}s`);
  console.log(`Volume: ${audio ? audio.volume.toFixed(2) : 0}`);
  console.log(`Loop: ${store.repeatMode}`);
  console.log(`Shuffle: ${store.isShuffled}`);
}

if (typeof window !== "undefined") {
  queueMicrotask(() => {
    usePlayerStore.getState().initEngine();
  });
}
