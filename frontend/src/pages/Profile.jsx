import { useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, Heart, History, FileText, Moon, Sun, Monitor, 
  User, Mail, MapPin, Calendar, Music, Mic, Edit3, Save, Sparkles, Image as ImageIcon,
  ChevronRight, Download, Trash2, Check, X, Zap, Star
} from "lucide-react";
import StatsGlobe from "../3d/StatsGlobe";
import GlassCard from "../components/ui/GlassCard";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import ProfileAvatarCard from "../components/profile/ProfileAvatarCard";
import { getTrackByIndex } from "../components/player/playerTracks";
import { useMusicAnalyser } from "../hooks/useMusicAnalyser";
import { usePlayerStore } from "../store/usePlayerStore";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { usePreferencesStore } from "../store/usePreferencesStore";
import { useAuthStore } from "../store/useAuthStore";
import { useToastStore } from "../store/useToastStore";
import { useTranslation } from "react-i18next";
import { apiGet, apiPut } from "../utils/api";

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbaHex(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "zh", label: "中文" },
  { code: "ar", label: "العربية" },
];

export default function Profile() {
  const { t } = useTranslation();
  useMusicAnalyser(true);

  const { bootstrap } = useWorkspaceStore();
  const { theme, setTheme, language, setLanguage, highContrast, setHighContrast } = usePreferencesStore();
  const { user, updateUser } = useAuthStore();
  const { push: pushToast } = useToastStore();

  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const track = getTrackByIndex(currentIndex);

  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: "",
    username: "",
    age: "",
    gender: "",
    country: "",
    bio: "",
    avatar_url: "",
    favorite_genres: [],
    favorite_artists: user?.favorite_artists || [],
  });
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState("");

  const fetchProfile = async () => {
    try {
      const data = await apiGet("/auth/me");
      const mappedData = {
        full_name: data.full_name || "",
        username: data.username || "",
        age: data.age || "",
        gender: data.gender || "",
        country: data.country || "",
        bio: data.bio || "",
        avatar_url: data.avatar_url || "",
        favorite_genres: data.favorite_genres || [],
        favorite_artists: data.favorite_artists || [],
      };
      setProfileData(mappedData);
      setImagePreview(data.avatar_url || "");
      // Sync global auth store
      updateUser(data);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setImagePreview(base64String);
        setProfileData({ ...profileData, avatar_url: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const favorites = bootstrap?.favorites || [];
  const history = bootstrap?.recent_searches || [];
  const reports = bootstrap?.saved_reports || [];
  const statsSummary = bootstrap?.stats || { searches: 0, favorites: 0, analyses: 0, reports: 0 };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Ensure age is an integer or null
      const payload = {
        ...profileData,
        age: profileData.age ? parseInt(profileData.age, 10) : null
      };
      const updatedUser = await apiPut("/auth/me", payload);
      updateUser(updatedUser);
      setIsEditing(false);
      pushToast({ type: "success", title: "Profile Updated", message: "Your luxury sonic identity has been saved." });
    } catch (err) {
      pushToast({ type: "error", title: "Update Failed", message: err.message || "Could not save profile changes." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-10 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted">{t("common.profile")}</p>
          <motion.h1
            className="text-display mt-2 text-4xl font-bold md:text-5xl transition-all duration-300"
            style={{
              textShadow: isPlaying
                ? `0 0 24px ${rgbaHex(track.accent, 0.65)}`
                : "none"
            }}
          >
            {isEditing ? "Editing Persona" : user?.full_name || user?.username}
          </motion.h1>
        </div>
        <Button 
          variant={isEditing ? "secondary" : "outline"} 
          size="sm" 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          loading={loading}
          className="mb-1"
        >
          {isEditing ? <><Save size={16} className="mr-2" /> Save Changes</> : <><Edit3 size={16} className="mr-2" /> Edit Profile</>}
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Avatar & Stats */}
        <div className="lg:col-span-5 space-y-6">
          <ProfileAvatarCard
            isEditing={isEditing}
            imagePreview={imagePreview}
            handleImageChange={handleImageChange}
            statsSummary={statsSummary}
          />

          {/* AI Avatar Studio Quick Access */}
          <motion.div whileHover={{ scale: 1.018 }} transition={{ type: 'spring', stiffness: 300 }}>
            <GlassCard interactive onClick={() => pushToast({ type: 'info', message: 'Studio redirect coming soon' })} className="p-5 border border-gold/25" style={{ background: `linear-gradient(135deg, ${rgbaHex(track.accent, 0.08)}, ${rgbaHex(track.accentAlt, 0.04)})` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <motion.div
                    className="w-12 h-12 rounded-xl flex items-center justify-center border text-gold"
                    style={{ borderColor: rgbaHex(track.accent, 0.4), background: rgbaHex(track.accent, 0.12) }}
                    animate={{ boxShadow: [`0 0 8px ${rgbaHex(track.accent, 0.3)}`, `0 0 20px ${rgbaHex(track.accent, 0.6)}`, `0 0 8px ${rgbaHex(track.accent, 0.3)}`] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles size={22} />
                  </motion.div>
                  <div>
                    <h3 className="font-bold text-base text-gold">AI Music Avatar Studio</h3>
                    <p className="text-xs text-muted">Generate futuristic music personas</p>
                  </div>
                </div>
                <motion.div animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                  <ChevronRight className="text-gold" />
                </motion.div>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Right Column: Information & Settings */}
        <div className="lg:col-span-7 space-y-6">
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div 
                key="edit"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <GlassCard className="p-8 space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Input 
                      label="Full Name" 
                      value={profileData.full_name} 
                      onChange={(e) => setProfileData({...profileData, full_name: e.target.value})} 
                      placeholder="e.g. Alexander Knight"
                    />
                    <Input 
                      label="Username" 
                      value={profileData.username} 
                      onChange={(e) => setProfileData({...profileData, username: e.target.value})} 
                      placeholder="e.g. sonic_lord"
                    />
                    <Input 
                      label="Age" 
                      type="number"
                      value={profileData.age} 
                      onChange={(e) => setProfileData({...profileData, age: e.target.value})} 
                      placeholder="28"
                    />
                    <Input 
                      label="Gender" 
                      value={profileData.gender} 
                      onChange={(e) => setProfileData({...profileData, gender: e.target.value})} 
                      placeholder="Male / Female / Other"
                    />
                    <Input 
                      label="Country" 
                      value={profileData.country} 
                      onChange={(e) => setProfileData({...profileData, country: e.target.value})} 
                      placeholder="United Kingdom"
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <Input 
                      label="Favorite Genres (comma separated)" 
                      value={profileData.favorite_genres.join(", ")} 
                      onChange={(e) => setProfileData({...profileData, favorite_genres: e.target.value.split(",").map(s => s.trim())})} 
                      placeholder="Techno, Ambient, Jazz"
                    />
                    <Input 
                      label="Favorite Artists (comma separated)" 
                      value={profileData.favorite_artists.join(", ")} 
                      onChange={(e) => setProfileData({...profileData, favorite_artists: e.target.value.split(",").map(s => s.trim())})} 
                      placeholder="Aphex Twin, Burial, Four Tet"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-sm font-medium text-muted">Bio</label>
                    <textarea 
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-primary focus:ring-2 focus:ring-gold/50 transition-all outline-none min-h-[100px]"
                      value={profileData.bio}
                      onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                      placeholder="Tell us about your sonic journey..."
                    />
                  </div>
                  <div className="flex gap-4 justify-end">
                    <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button onClick={handleSave} loading={loading}>Save Identity</Button>
                  </div>
                </GlassCard>
              </motion.div>
            ) : (
              <motion.div 
                key="view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <GlassCard className="p-8">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <User className="text-gold" size={24} />
                    Sonic Identity
                  </h2>
                  <div className="grid md:grid-cols-2 gap-y-8 gap-x-12">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase text-muted tracking-widest">Full Name</p>
                      <p className="text-lg font-medium">{user?.full_name || "Unidentified Entity"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase text-muted tracking-widest">Email</p>
                      <p className="text-lg font-medium">{user?.email}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase text-muted tracking-widest">Age & Gender</p>
                      <p className="text-lg font-medium">{user?.age || "???"} • {user?.gender || "Unknown"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase text-muted tracking-widest">Origin</p>
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-gold" />
                        <p className="text-lg font-medium">{user?.country || "The Void"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-10 pt-10 border-t border-white/5">
                    <p className="text-[10px] uppercase text-muted tracking-widest mb-3">Bio</p>
                    <p className="text-secondary leading-relaxed italic">
                      "{user?.bio || "This entity has not yet documented their existence in the SoundWave universe."}"
                    </p>
                  </div>
                </GlassCard>

                {/* Preferences & Settings */}
                <div className="grid md:grid-cols-2 gap-6">
                   <GlassCard className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Settings className="text-gold" size={20} />
                      <h2 className="text-xl font-bold">Preferences</h2>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-muted mb-3">
                          <Monitor size={14} />
                          <span>Theme</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => setTheme("dark")} className={`flex-1 py-2 rounded-lg text-[10px] transition-all ${theme === "dark" ? "bg-white/10 ring-1 ring-white/20" : "bg-white/5"}`}>Dark</button>
                          <button onClick={() => setTheme("light")} className={`flex-1 py-2 rounded-lg text-[10px] transition-all ${theme === "light" ? "bg-white/10 ring-1 ring-white/20" : "bg-white/5"}`}>Light</button>
                          <button onClick={() => setTheme("amoled")} className={`flex-1 py-2 rounded-lg text-[10px] transition-all ${theme === "amoled" ? "bg-purple-500/20 ring-1 ring-purple-500/40 text-purple-300" : "bg-white/5"}`}>AMOLED</button>
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Music className="text-gold" size={20} />
                      <h2 className="text-xl font-bold">Aura Tags</h2>
                    </div>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {(user?.favorite_genres?.length > 0 ? user.favorite_genres : ["No Genres"]).map((g, i) => (
                          <span key={i} className="px-3 py-1 rounded-full bg-purple/10 border border-purple/30 text-[10px] text-purple font-bold uppercase tracking-wider">{g}</span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(user?.favorite_artists?.length > 0 ? user.favorite_artists : ["No Artists"]).map((a, i) => (
                          <span key={i} className="px-3 py-1 rounded-full bg-cyan/10 border border-cyan/30 text-[10px] text-cyan font-bold uppercase tracking-wider">{a}</span>
                        ))}
                      </div>
                    </div>
                  </GlassCard>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Collection Sections */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Heart className="text-pink" size={18} />
            <h2 className="text-xl font-bold">Liked Tracks</h2>
          </div>
          <div className="space-y-3">
            {favorites.length > 0 ? (
              favorites.slice(0, 4).map((f, i) => (
                <GlassCard key={i} className="flex items-center gap-4 py-3 group">
                  <img src={f.track_data?.album_art} className="w-10 h-10 rounded object-cover" alt="" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{f.track_data?.name}</p>
                    <p className="text-xs text-muted truncate">{f.track_data?.artist}</p>
                  </div>
                </GlassCard>
              ))
            ) : (
              <p className="text-xs text-muted italic">No liked tracks yet.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <History className="text-cyan" size={18} />
            <h2 className="text-xl font-bold">Audit History</h2>
          </div>
          <div className="space-y-3">
            {history.length > 0 ? (
              history.slice(0, 4).map((h, i) => (
                <GlassCard key={i} className="py-3 px-4">
                  <p className="text-sm font-medium">{h.query}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-muted uppercase tracking-wider">{h.search_type}</span>
                    <span className="text-[10px] text-muted">{new Date(h.created_at).toLocaleDateString()}</span>
                  </div>
                </GlassCard>
              ))
            ) : (
              <p className="text-xs text-muted italic">History is clear.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="text-violet" size={18} />
            <h2 className="text-xl font-bold">Sonic Reports</h2>
          </div>
          <div className="space-y-3">
            {reports.length > 0 ? (
              reports.slice(0, 4).map((r, i) => (
                <GlassCard key={i} className="py-3 px-4">
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-[10px] text-muted mt-1">Generated {new Date(r.created_at).toLocaleDateString()}</p>
                </GlassCard>
              ))
            ) : (
              <p className="text-xs text-muted italic">No reports generated yet.</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
