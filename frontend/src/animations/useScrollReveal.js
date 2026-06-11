import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current.querySelectorAll(".reveal-char"),
      { rotateX: -90, y: 30, opacity: 0, transformOrigin: "top center" },
      {
        rotateX: 0,
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.03,
        ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 80%" }
      }
    );
  }, []);
  return ref;
}
