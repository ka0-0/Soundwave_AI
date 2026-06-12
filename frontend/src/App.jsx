import { Suspense, lazy, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Route, Routes, useLocation } from "react-router-dom";
import { useLenis } from "./animations/useLenis";
import ProtectedLayout from "./components/layout/ProtectedLayout";
import PageLoader from "./components/ui/PageLoader";
import ToastContainer from "./components/ui/Toast";
import AmbientSongPlayer from "./components/player/AmbientSongPlayer";
import BackendHealthChecker from "./components/layout/BackendHealthChecker";
import { useAuthStore } from "./store/useAuthStore";
import { usePlayerStore } from "./store/usePlayerStore";
import { resumeAnalyserContext } from "./store/musicAnalyser";
import { getAudioManager } from "./store/audioEngine";

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Discover = lazy(() => import("./pages/Discover"));
const Library = lazy(() => import("./pages/Library"));
const Player = lazy(() => import("./pages/Player"));
const Profile = lazy(() => import("./pages/Profile"));
/*const AvatarStudio = lazy(() => import("./pages/AvatarStudio"));
const MyAvatars = lazy(() => import("./pages/MyAvatars"));
const AvatarShowcase = lazy(() => import("./pages/AvatarShowcase"));*/

const pageTransition = {
  initial: { opacity: 0, y: 20, filter: "blur(8px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  },
  exit: {
    opacity: 0,
    y: -12,
    filter: "blur(4px)",
    transition: { duration: 0.3 }
  }
};

export default function App() {
  useLenis();
  const location = useLocation();
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { playTrack, fadeOut, isPlaying, currentIndex } = usePlayerStore();

  const prevAuthRef = useRef(isAuthenticated);
  const ambientStartedRef = useRef(false);

  useEffect(() => {
    if (!prevAuthRef.current && isAuthenticated) {
      console.log("[App] Transition from guest to authenticated. Shutting down ambient music.");
      const store = usePlayerStore.getState();
      store.shutdownAudio();
      store.initEngine();
      store.setVolume(1.0);
      ambientStartedRef.current = false;
    } else if (prevAuthRef.current && !isAuthenticated) {
      console.log("[AUDIO] logout resume");
      ambientStartedRef.current = true; // Set to true to prevent public page autoplay from running concurrently
      const store = usePlayerStore.getState();
      store.initEngine();
      store.setVolume(1.0);
      store.playTrack(store.currentIndex, { fromStart: true });
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window.runPlayerSelfTest === "function") {
        window.runPlayerSelfTest();
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    refreshSession();
    
    // Safety timeout: if checking auth takes > 5s, something is wrong.
    const timer = setTimeout(() => {
      const currentIsChecking = useAuthStore.getState().isCheckingAuth;
      if (currentIsChecking) {
        console.warn("[AUTH] refreshSession safety timeout reached. Forcing state update.");
        useAuthStore.setState({ isCheckingAuth: false });
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [refreshSession]);

  useEffect(() => {
    if (isAuthenticated) return; // If logged in, let the user's dashboard player handle all states and avoid resets!

    const publicRoutes = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback"];
    const isPublicPath = publicRoutes.includes(location.pathname);
    let clickHandler, keydownHandler, touchstartHandler;

    const removeListeners = () => {
      if (clickHandler) window.removeEventListener("click", clickHandler);
      if (keydownHandler) window.removeEventListener("keydown", keydownHandler);
      if (touchstartHandler) window.removeEventListener("touchstart", touchstartHandler);
    };

    if (isPublicPath) {
      if (ambientStartedRef.current) return;
      ambientStartedRef.current = true;

      // User is guest and on public page
      const startAmbient = async () => {
        console.log("Autoplay attempted");
        try {
          const startIndex = usePlayerStore.getState().currentIndex;
          await playTrack(startIndex);
          console.log("Autoplay success");
          const manager = getAudioManager();
          const audio = manager ? manager.audio : null;
          console.log("Audio paused:", audio ? audio.paused : true);
          console.log("[AUDIO] autoplay success");
          console.log("[AUDIO] playback started");
        } catch (err) {
          console.log("Autoplay blocked");
          const manager = getAudioManager();
          const audio = manager ? manager.audio : null;
          console.log("Audio paused:", audio ? audio.paused : true);
          console.log("[AUDIO] autoplay blocked");
          console.log("[AMBIENT] Autoplay blocked, waiting for user interaction.", err);
          
          // Setup interaction fallback
          const playOnInteraction = async () => {
            console.log("[AUDIO] first interaction detected");
            try {
              resumeAnalyserContext();
            } catch (rErr) {
              console.warn("Failed to resume analyser context on user gesture", rErr);
            }

            try {
              const latestState = useAuthStore.getState();
              const latestPlayer = usePlayerStore.getState();
              const latestPath = window.location.pathname;
              
              if (!latestState.isAuthenticated && publicRoutes.includes(latestPath)) {
                // Read directly from native audio element to check if it's paused
                const manager = getAudioManager();
                const isRealPaused = manager ? manager.audio.paused : true;
                if (isRealPaused) {
                  await latestPlayer.playTrack(latestPlayer.currentIndex);
                  console.log("[AUDIO] playback started");
                }
              }
              removeListeners();
            } catch (e) {
              console.warn("[AMBIENT] Failed to play on interaction", e);
            }
          };

          clickHandler = playOnInteraction;
          keydownHandler = playOnInteraction;
          touchstartHandler = playOnInteraction;

          window.addEventListener("click", playOnInteraction);
          window.addEventListener("keydown", playOnInteraction);
          window.addEventListener("touchstart", playOnInteraction);
        }
      };

      startAmbient();
    } else {
      // User is guest and navigated to a protected page (redirecting)
      if (isPlaying || usePlayerStore.getState().isPlaying) {
        usePlayerStore.getState().shutdownAudio();
      }
      ambientStartedRef.current = false;
    }

    return () => {
      removeListeners();
    };
  }, [isAuthenticated, location.pathname, playTrack, fadeOut, isPlaying, currentIndex]);

  return (
    <>
      <ToastContainer />
      <AmbientSongPlayer />
      <BackendHealthChecker />
      <Suspense fallback={<PageLoader />}>
        <Routes location={location}>
  <Route path="/" element={<Landing />} />
  <Route path="/auth/callback" element={<AuthCallback />} />
          {[["/login", Login], ["/signup", Signup], ["/forgot-password", ForgotPassword], ["/reset-password", ResetPassword]].map(([path, Component]) => (
            <Route
              key={path}
              path={path}
              element={
                <motion.div {...pageTransition} className="min-h-screen">
                  <Component />
                </motion.div>
              }
            />
          ))}
          <Route element={<ProtectedLayout />}>
            {[
              ["dashboard", Dashboard],
              ["discover", Discover],
              ["library", Library],
              ["player", Player],
              ["profile", Profile],
            ].map(([path, Component]) => (
              <Route
                key={path}
                path={path}
                element={
                  <motion.div {...pageTransition} className="min-h-screen">
                    <Component />
                  </motion.div>
                }
              />
            ))}
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
