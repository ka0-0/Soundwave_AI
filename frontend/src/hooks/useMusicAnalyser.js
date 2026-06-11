import { useEffect } from "react";
import { create } from "zustand";
import { connectMusicAnalyser, readMusicLevels, resumeAnalyserContext } from "../store/musicAnalyser";
import { usePlayerStore } from "../store/usePlayerStore";

export const useAnalyserStore = create(() => ({
  energy: 0,
  bass: 0,
  mid: 0,
  high: 0
}));

export function useMusicAnalyser(active = true) {
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  useEffect(() => {
    if (!active) return;

    connectMusicAnalyser();
    let raf = 0;

    const tick = () => {
      const levels = isPlaying ? readMusicLevels() : { energy: 0, bass: 0, mid: 0, high: 0 };
      useAnalyserStore.setState(levels);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, isPlaying]);

  useEffect(() => {
    if (isPlaying) resumeAnalyserContext();
  }, [isPlaying]);
}
