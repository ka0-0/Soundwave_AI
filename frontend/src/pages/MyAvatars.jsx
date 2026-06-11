import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trash2, Download, User, Calendar, Music, Palette, 
  Search, Grid, List as ListIcon, MoreVertical, ExternalLink,
  Sparkles, RotateCcw
} from "lucide-react";
import GlassCard from "../components/ui/GlassCard";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useToastStore } from "../store/useToastStore";
import { useAuthStore } from "../store/useAuthStore";
import { apiGet, apiDelete, apiPut } from "../utils/api";
import { useNavigate } from "react-router-dom";

export default function MyAvatars() {
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { push: pushToast } = useToastStore();
  const { updateUser } = useAuthStore();
  const navigate = useNavigate();

  const fetchAvatars = async () => {
    setLoading(true);
    try {
      const data = await apiGet("/avatars/my");
      setAvatars(data);
    } catch (err) {
      pushToast({ type: "error", title: "Fetch Failed", message: "Could not retrieve your collection." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvatars();
  }, []);

  const handleDelete = async (id) => {
    try {
      await apiDelete(`/avatars/${id}`);
      setAvatars(avatars.filter(a => a.id !== id));
      pushToast({ type: "success", title: "Persona Removed", message: "The avatar has been deleted from your collection." });
    } catch (err) {
      pushToast({ type: "error", title: "Delete Failed", message: err.message });
    }
  };

  const handleSetProfile = async (avatar) => {
    try {
      const updatedUser = await apiPut("/auth/me", { avatar_url: avatar.image_url });
      updateUser(updatedUser);
      pushToast({ type: "success", title: "Profile Updated", message: "This persona is now your official identity." });
    } catch (err) {
      pushToast({ type: "error", title: "Update Failed", message: err.message });
    }
  };

  const filteredAvatars = avatars.filter(a => 
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.mood?.toLowerCase().includes(search.toLowerCase()) ||
    a.style?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted">Identity Collection</p>
          <h1 className="text-display mt-2 text-4xl font-bold md:text-5xl">My <span className="text-gold">Avatars</span></h1>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={fetchAvatars} disabled={loading}>
            <RotateCcw size={16} className={loading ? "animate-spin" : ""} />
          </Button>
          <Button onClick={() => navigate("/avatars/studio")}>
            <Sparkles size={16} className="mr-2" /> New Persona
          </Button>
        </div>
      </header>

      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search size={18} className="text-muted" />
        </div>
        <input 
          type="text"
          placeholder="Search by name, mood, or style..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-primary focus:ring-2 focus:ring-gold/50 outline-none transition-all"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="aspect-[4/5] rounded-3xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : filteredAvatars.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence>
            {filteredAvatars.map((avatar, i) => (
              <motion.div
                key={avatar.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassCard className="group overflow-hidden border-gold/10 hover:border-gold/30 transition-all">
                  <div className="relative aspect-square overflow-hidden">
                    <img 
                      src={avatar.image_url} 
                      alt={avatar.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                      <div className="flex gap-2 mb-2">
                         <Button size="sm" className="flex-1" onClick={() => navigate(`/avatars/showcase/${avatar.id}`)}>
                          Showcase
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" className="flex-1" onClick={() => handleSetProfile(avatar)}>
                          Use as Profile
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.open(avatar.image_url, "_blank")}>
                          <Download size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-pink hover:bg-pink/10" onClick={() => handleDelete(avatar.id)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg">{avatar.name}</h3>
                        <p className="text-xs text-muted flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(avatar.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-[10px] text-gold font-bold uppercase tracking-wider">
                        {avatar.style}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-secondary">
                      <div className="flex items-center gap-1">
                        <Music size={14} className="text-purple" />
                        {avatar.mood}
                      </div>
                      <div className="flex items-center gap-1">
                        <Palette size={14} className="text-cyan" />
                        Premium
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center glass rounded-3xl border border-dashed border-white/10">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
            <User size={40} className="text-muted" />
          </div>
          <h2 className="text-2xl font-bold">No Personas Found</h2>
          <p className="text-muted mt-2 max-w-sm">
            You haven't materialized any futuristic music personas yet. Visit the studio to begin.
          </p>
          <Button className="mt-8" onClick={() => navigate("/avatars/studio")}>
            Open AI Studio
          </Button>
        </div>
      )}
    </div>
  );
}
