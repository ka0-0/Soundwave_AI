import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useToastStore } from "../../store/useToastStore";

export default function HummingSearch({ onMatch }) {
  useTranslation();
  const pushToast = useToastStore((s) => s.push);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        setIsAnalyzing(true);
        const audioBlob = new Blob(chunksRef.current, { type: "audio/wav" });
        const formData = new FormData();
        formData.append("file", audioBlob, "humming.wav");

        try {
          const response = await fetch("/api/v1/discover/recognize", {
            method: "POST",
            body: formData,
            headers: {
              // Note: Do not set Content-Type, browser will set it with boundary
              "Authorization": `Bearer ${localStorage.getItem("soundwave_token")}`
            }
          });
          const data = await response.json();
          
          if (data.status === "success" && data.result) {
            const match = data.result;
            onMatch({
              name: match.title,
              artist: match.artist,
              confidence: 1.0,
              spotify_url: match.spotify_id ? `https://open.spotify.com/track/${match.spotify_id}` : ""
            });
            pushToast({ type: "success", title: "Match Found!", message: `We detected "${match.title}" by ${match.artist}` });
          } else {
            pushToast({ type: "info", message: "Could not recognize the song. Try humming a bit louder or longer." });
          }
        } catch (err) {
          console.error("Humming recognition failed", err);
          pushToast({ type: "error", message: "Failed to connect to recognition service." });
        } finally {
          setIsAnalyzing(false);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          stopRecording();
        }
      }, 10000);

    } catch {
      pushToast({ type: "error", message: "Microphone access denied or not available." });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 glass rounded-xl border border-white/10">
      <div className="text-center">
        <h3 className="text-lg font-bold">Hum to Find</h3>
        <p className="text-sm text-muted mt-1">Hum, sing, or play a clip for 10 seconds</p>
      </div>

      <div className="relative h-24 w-24 flex items-center justify-center">
        <AnimatePresence>
          {isRecording && (
            <>
              <motion.div
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 2, opacity: 0 }}
                exit={{ scale: 1, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 bg-pink rounded-full"
              />
              <motion.div
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 1.5, opacity: 0 }}
                exit={{ scale: 1, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }}
                className="absolute inset-0 bg-pink rounded-full"
              />
            </>
          )}
        </AnimatePresence>
        
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isAnalyzing}
          className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all ${
            isRecording ? "bg-pink text-white scale-110" : "bg-white/10 text-primary hover:bg-white/20"
          } ${isAnalyzing ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isAnalyzing ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            </motion.div>
          ) : isRecording ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
          )}
        </button>
      </div>

      {isRecording && <p className="text-pink text-xs font-medium animate-pulse">Recording...</p>}
      {isAnalyzing && <p className="text-cyan text-xs font-medium">Analyzing frequencies...</p>}
    </div>
  );
}
