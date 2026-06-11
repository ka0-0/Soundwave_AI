import { Suspense, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Float, 
  MeshDistortMaterial, 
  MeshWobbleMaterial,
  Stars,
  ContactShadows,
  Environment,
  Text,
  Html
} from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { apiGet } from "../utils/api";
import { Sparkles, Music, ChevronLeft, Share2, Download, Info } from "lucide-react";
import Button from "../components/ui/Button";
import GlassCard from "../components/ui/GlassCard";
import PageLoader from "../components/ui/PageLoader";
import { useToastStore } from "../store/useToastStore";

function AvatarPlane({ url }) {
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh position={[0, 0.5, 0]}>
        <planeGeometry args={[3, 3]} />
        <Suspense fallback={<meshStandardMaterial color="#222" />}>
           <AvatarMaterial url={url} />
        </Suspense>
      </mesh>
      
      {/* Decorative Stage */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
        <cylinderGeometry args={[2, 2.2, 0.2, 64]} />
        <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.18, 0]}>
        <ringGeometry args={[2.1, 2.3, 64]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.5} />
      </mesh>
    </Float>
  );
}

function AvatarMaterial({ url }) {
  const [texture, setTexture] = useState(null);
  
  useEffect(() => {
    import("three").then(({ TextureLoader }) => {
      new TextureLoader().load(url, (tex) => setTexture(tex));
    });
  }, [url]);

  if (!texture) return <meshStandardMaterial color="#111" />;
  
  return <meshBasicMaterial map={texture} transparent side={2} />;
}

function MusicParticles() {
  return (
    <group>
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      {Array.from({ length: 20 }).map((_, i) => (
        <Float key={i} speed={3} rotationIntensity={2} floatIntensity={2}>
          <mesh position={[Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5]}>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={2} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

export default function AvatarShowcase() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(true);
  const pushToast = useToastStore((s) => s.push);

  useEffect(() => {
    const fetchAvatar = async () => {
      try {
        const data = await apiGet("/avatars/my");
        const found = data.find(a => a.id === id);
        setAvatar(found);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAvatar();
  }, [id]);

  if (loading) return <PageLoader />;
  if (!avatar) return <div className="p-20 text-center">Persona not found.</div>;

  return (
    <div className="relative h-screen -m-6 overflow-hidden bg-[#030014]">
      {/* 3D Scene */}
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={50} />
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />
        
        <Suspense fallback={null}>
          <AvatarPlane url={avatar.image_url} />
          <MusicParticles />
          <Environment preset="city" />
          <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={10} blur={2} far={4.5} />
        </Suspense>

        <OrbitControls 
          enablePan={false} 
          minDistance={5} 
          maxDistance={12} 
          autoRotate 
          autoRotateSpeed={0.5} 
        />
      </Canvas>

      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top Controls */}
        <div className="p-8 flex justify-between items-start pointer-events-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="bg-black/20 backdrop-blur-md border border-white/10">
            <ChevronLeft size={20} className="mr-2" /> Back to Collection
          </Button>
          <div className="flex gap-3">
            <Button variant="ghost" className="bg-black/20 backdrop-blur-md border border-white/10 rounded-full w-12 h-12 p-0">
              <Share2 size={20} />
            </Button>
            <Button variant="ghost" className="bg-black/20 backdrop-blur-md border border-white/10 rounded-full w-12 h-12 p-0" onClick={() => window.open(avatar.image_url, "_blank")}>
              <Download size={20} />
            </Button>
          </div>
        </div>

        {/* Bottom Details */}
        <div className="absolute bottom-12 left-12 right-12 flex flex-col md:flex-row justify-between items-end gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4 max-w-lg pointer-events-auto"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/20 border border-gold/40 text-gold text-[10px] font-bold uppercase tracking-widest">
              <Sparkles size={12} />
              Neural Manifestation
            </div>
            <h1 className="text-5xl font-bold text-display tracking-tight text-white">
              {avatar.name}
            </h1>
            <div className="flex gap-4">
               <div className="flex items-center gap-2 text-muted text-sm">
                <Music size={16} className="text-purple" />
                {avatar.mood} Vibe
              </div>
              <div className="flex items-center gap-2 text-muted text-sm">
                <Sparkles size={16} className="text-gold" />
                {avatar.style} Aesthetic
              </div>
            </div>
          </motion.div>

          <GlassCard className="p-6 bg-black/40 border-gold/20 pointer-events-auto min-w-[300px]">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center text-gold border border-gold/20">
                <Info size={20} />
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted tracking-widest">Aura Metadata</p>
                <p className="text-sm font-bold">Premium Fidelity Tier</p>
              </div>
            </div>
            <div className="space-y-3">
               <div className="flex justify-between text-xs">
                <span className="text-muted">Complexity</span>
                <span className="text-gold">Ultra-High</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Manifested</span>
                <span className="text-primary">{new Date(avatar.created_at).toLocaleDateString()}</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-2">
                <motion.div 
                  className="h-full bg-gold"
                  initial={{ width: 0 }}
                  animate={{ width: "85%" }}
                  transition={{ duration: 1.5, delay: 0.5 }}
                />
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Ambient Visuals */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-purple/10 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-gold/5 to-transparent" />
      </div>
    </div>
  );
}
