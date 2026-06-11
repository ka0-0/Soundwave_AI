    import localSong from "./song.mp3";
import songTwo from "./Jat Jatni.mp3";
import songThree from "./My Queen Kd Desirock 128 Kbps.mp3";
import tuNaSamjhe from "./dhurandhar.mp3";
import bairan from "./Bairan.mp3";
import Fortuner from "./Fortuner_1.mp3";
import Kitaab from "./Kitab.mp3";

export const PLAYER_TRACKS = [
  {
    id: " tu-na-samjhe",
    src: tuNaSamjhe,
    title: "Dhurandhar",
    artist: "Revenge",
    accent: "#14b8a6",
    accentAlt: "#6366f1",
    mood: "Romantic flow"
  },
  {
    id: "jat-jatni",
    src: songTwo,
    title: "Jat Jatni",
    artist: "Desi Beats",
    accent: "#ec4899",
    accentAlt: "#a855f7",
    mood: "Desi energy"
  },
  {
    id: "my-queen",
    src: songThree,
    title: "My Queen",
    artist: "Kd Desirock",
    accent: "#3b82f6",
    accentAlt: "#a855f7",
    mood: "Hip-hop drive"
  },
  {
    id: "intro",
    src: localSong,
    title: "Haaye Re",
    artist: "Banjare",
    accent: "#8b5cf6",
    accentAlt: "#22d3ee",
    mood: "Electronic pulse"
  },
  {
    id: "bairan",
    src: bairan,
    title: "Bairan",
    artist: "Banjare",
    accent: "#f43f5e",
    accentAlt: "#8b5cf6",
    mood: "Emotional wave"
  },
  {
    id: "Fortuner",
    src: Fortuner,
    title: "Fortuner",
    artist: "Ruchika",
    accent: "#d8910c",
    accentAlt: "#df120b",
    mood: "Energy"
  },
  {
    id: "Kitaab",
    src: Kitaab,
    title: "Kitaab",
    artist: "Legend",
    accent: "#0cd1d8",
    accentAlt: "#0954f7",
    mood: "Chill"
  },

];

export function getTrackByIndex(index) {
  const len = PLAYER_TRACKS.length;
  return PLAYER_TRACKS[((index % len) + len) % len];
}
