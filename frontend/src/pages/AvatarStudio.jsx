import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Upload, Music, Palette, ArrowRight, Check, RotateCcw, Download, User, Play, Image as ImageIcon, Disc3 } from "lucide-react";
import GlassCard from "../components/ui/GlassCard";
import Button from "../components/ui/Button";
import { useToastStore } from "../store/useToastStore";
import { apiPost } from "../utils/api";
import { useNavigate } from "react-router-dom";

const MOODS = ["Chill", "EDM", "Hip-Hop", "Rock", "Classical", "Lofi", "Bollywood", "Jazz", "Pop"];
const STYLES = ["Futuristic", "Cyberpunk", "Luxury", "Neon", "Anime", "Realistic", "Music Producer", "DJ", "Rockstar"];

export default function AvatarStudio() {
  const [step, setStep] = useState(1);
  const [selectedMood, setSelectedMood] = useState(MOODS[0]);
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0]);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { push: pushToast } = useToastStore();
  const navigate = useNavigate();
  const fileInputRef = useRef();

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setStep(4); // Moving to loading/generation view
    try {
      const data = await apiPost("/avatars/generate", {
        mood: selectedMood,
        style: selectedStyle,
        image_data: preview // In production, upload to S3 and send URL
      });
      setResult(data);
      pushToast({ type: "success", title: "Avatar Generated", message: "Your luxury music persona is ready." });
    } catch (err) {
      setStep(3);
      pushToast({ type: "error", title: "Generation Failed", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 pb-20 max-w-5xl mx-auto">
      <header className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs font-bold uppercase tracking-widest mb-4">
          <Sparkles size={14} />
          AI Persona Studio
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-display tracking-tight">
          Craft Your <span className="text-gold">Sonic Identity</span>
        </h1>
        <p className="mt-4 text-muted max-w-2xl mx-auto text-lg">
          The world's first futuristic luxury avatar engine. Transform your presence into a high-fashion music persona.
        </p>
      </header>

      {/* Progress Bar */}
      <div className="flex justify-center gap-4 mb-12">
        {[1, 2, 3].map((s) => (
          <div 
            key={s} 
            className={`h-1.5 w-16 rounded-full transition-all duration-500 ${step >= s ? "bg-gold" : "bg-white/10"}`} 
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid md:grid-cols-2 gap-8 items-center"
          >
            <div className="space-y-6">
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <Upload className="text-gold" />
                Upload Your Essence
              </h2>
              <p className="text-secondary text-lg leading-relaxed">
                Provide a clear portrait. Our AI will preserve your facial features while weaving in the luxury music aesthetics of your choice.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-muted">
                  <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center text-gold text-[10px] font-bold">1</div>
                  High resolution preferred
                </div>
                <div className="flex items-center gap-3 text-sm text-muted">
                  <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center text-gold text-[10px] font-bold">2</div>
                  Neutral lighting works best
                </div>
              </div>
              <Button size="lg" onClick={() => fileInputRef.current?.click()} className="mt-4">
                Choose Image
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            </div>
            
            <GlassCard 
              className="aspect-square flex flex-col items-center justify-center border-dashed border-2 border-white/10 hover:border-gold/30 transition-all group overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <img src={preview} className="w-full h-full object-cover" alt="Preview" />
              ) : (
                <>
                  <ImageIcon size={64} className="text-white/10 group-hover:text-gold/40 transition-colors" />
                  <p className="mt-4 text-muted font-medium">Drop your portrait here</p>
                </>
              )}
            </GlassCard>

            {preview && (
              <div className="md:col-span-2 flex justify-end">
                <Button variant="secondary" onClick={() => setStep(2)}>
                  Next Step <ArrowRight className="ml-2" size={18} />
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold flex items-center justify-center gap-3">
                <Music className="text-gold" />
                Select Your Vibe
              </h2>
              <p className="text-muted">Choose the music mood that defines your persona.</p>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
              {MOODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedMood(m)}
                  className={`p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 ${
                    selectedMood === m 
                      ? "bg-gold/20 border-gold text-gold shadow-glow" 
                      : "bg-white/5 border-white/10 text-muted hover:bg-white/10"
                  }`}
                >
                  <Disc3 size={24} className={selectedMood === m ? "animate-spin-slow" : ""} />
                  <span className="text-sm font-bold uppercase tracking-widest">{m}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-between items-center pt-8 border-t border-white/5">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button variant="secondary" onClick={() => setStep(3)}>
                Style Selection <ArrowRight className="ml-2" size={18} />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold flex items-center justify-center gap-3">
                <Palette className="text-gold" />
                Visual Aesthetic
              </h2>
              <p className="text-muted">Finalize the luxury style of your futuristic persona.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedStyle(s)}
                  className={`relative p-8 rounded-3xl border transition-all text-left overflow-hidden group ${
                    selectedStyle === s 
                      ? "bg-gold/10 border-gold shadow-glow" 
                      : "bg-white/5 border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className={`absolute top-0 right-0 p-4 transition-transform ${selectedStyle === s ? "translate-x-0" : "translate-x-full"}`}>
                    <Check className="text-gold" />
                  </div>
                  <h3 className={`text-lg font-bold mb-2 transition-colors ${selectedStyle === s ? "text-gold" : "text-primary"}`}>{s}</h3>
                  <p className="text-xs text-muted leading-relaxed">
                    A premium {s.toLowerCase()} aesthetic optimized for the {selectedMood.toLowerCase()} mood.
                  </p>
                </button>
              ))}
            </div>
            <div className="flex justify-between items-center pt-8 border-t border-white/5">
              <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
              <Button size="lg" onClick={handleGenerate} loading={loading}>
                <Sparkles className="mr-2" size={18} /> Generate Persona
              </Button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div 
            key="step4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            {loading ? (
              <div className="space-y-8 text-center">
                <div className="relative w-48 h-48 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-gold/20 border-t-gold animate-spin" />
                  <div className="absolute inset-4 rounded-full border-4 border-purple/20 border-b-purple animate-spin-reverse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles size={48} className="text-gold animate-pulse" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-gold tracking-widest uppercase">Neural Sculpting...</h2>
                  <p className="text-muted italic">Applying {selectedStyle} aesthetics to your {selectedMood} vibe.</p>
                </div>
              </div>
            ) : result && (
              <div className="w-full grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-8">
                   <div className="space-y-2">
                    <h2 className="text-4xl font-bold">Your Persona is <span className="text-gold">Live</span></h2>
                    <p className="text-muted text-lg">Your futuristic luxury identity has been successfully materialized.</p>
                  </div>
                  
                  <GlassCard className="p-6 space-y-6 bg-gold/5 border-gold/20">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold">
                        <User size={24} />
                      </div>
                      <div>
                        <p className="text-xs text-muted uppercase tracking-widest">Persona ID</p>
                        <p className="font-bold">{result.name}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-white/5">
                        <p className="text-[10px] text-muted uppercase mb-1">Mood</p>
                        <p className="font-bold text-gold">{result.mood}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-white/5">
                        <p className="text-[10px] text-muted uppercase mb-1">Style</p>
                        <p className="font-bold text-purple">{result.style}</p>
                      </div>
                    </div>
                  </GlassCard>

                  <div className="flex flex-wrap gap-4">
                    <Button size="lg" className="flex-1" onClick={() => navigate(`/avatars/showcase/${result.id}`)}>
                      Enter 3D Showcase
                    </Button>
                    <Button variant="outline" size="lg" className="flex-1" onClick={() => navigate("/avatars/collection")}>
                      View Collection
                    </Button>
                    <Button variant="outline" size="lg" className="flex-1" onClick={() => window.open(result.image_url, "_blank")}>
                      <Download size={18} className="mr-2" /> Download
                    </Button>
                    <Button variant="ghost" size="lg" className="w-full" onClick={() => { setStep(1); setResult(null); setPreview(null); }}>
                      <RotateCcw size={18} className="mr-2" /> Start Over
                    </Button>
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute -inset-4 bg-gold/20 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
                  <GlassCard className="relative aspect-square p-2 overflow-hidden border-gold/30">
                    <img src={result.image_url} className="w-full h-full object-cover rounded-2xl" alt="Generated Avatar" />
                    <div className="absolute bottom-6 left-6 right-6 p-4 glass-dark rounded-xl flex items-center justify-between border border-white/10 translate-y-20 group-hover:translate-y-0 transition-transform">
                      <div className="flex items-center gap-3">
                        <Play className="text-gold" fill="currentColor" size={20} />
                        <span className="text-xs font-bold tracking-widest uppercase">Persona Visualization</span>
                      </div>
                      <Sparkles className="text-gold" size={16} />
                    </div>
                  </GlassCard>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
