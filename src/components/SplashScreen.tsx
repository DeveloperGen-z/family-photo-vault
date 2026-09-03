import { useState, useEffect, useCallback, useRef } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

const TYPING_SPEED = 35;
const SHOW_DURATION = 2600;
const FADE_DURATION = 700;

function AnimatedTitle({ text }: { text: string }) {
  return (
    <h1
      className="splash-title"
      style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}
    >
      {text.split("").map((char, i) => (
        <span
          key={i}
          className="splash-char"
          style={{
            animationDelay: `${0.15 + i * 0.035}s`,
            minWidth: char === " " ? "0.3em" : undefined,
          }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </h1>
  );
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [fading, setFading] = useState(false);
  const [typedText, setTypedText] = useState("");
  const completedRef = useRef(false);
  const fullText = "Loading your memories\u2026";

  // Typewriter effect
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < fullText.length) {
        setTypedText(fullText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
      }
    }, TYPING_SPEED);
    return () => clearInterval(timer);
  }, []);

  // Complete callback — guarded against double-fire
  const doComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  // Main timer: show for SHOW_DURATION, then fade
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFading(true);
      setTimeout(doComplete, FADE_DURATION);
    }, SHOW_DURATION);
    return () => clearTimeout(fadeTimer);
  }, [doComplete]);

  // Safety net
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      doComplete();
    }, 5000);
    return () => clearTimeout(safetyTimer);
  }, [doComplete]);

  return (
    <div
      className={`splash-screen ${fading ? "fade-out" : ""}`}
      style={{ opacity: fading ? 0 : 1 }}
    >
      {/* Ambient glow */}
      <div className="splash-ambient-glow" />

      {/* Second glow layer */}
      <div
        className="absolute w-[250px] h-[250px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(252,246,186,0.04) 0%, transparent 60%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          animation: "splashPulseGlow 5s 1s infinite alternate ease-in-out",
        }}
      />

      {/* Title — character-by-character reveal */}
      <AnimatedTitle text="Family Photo Vault" />

      {/* Divider */}
      <div className="splash-divider" />

      {/* Subtitle */}
      <p className="splash-subtitle">Private Family Gallery</p>

      {/* Tagline */}
      <p className="splash-tagline">Preserving memories, together</p>

      {/* Typewriter */}
      <div className="splash-typewriter">
        {typedText}
        <span className="splash-cursor" />
      </div>

      {/* Watermark */}
      <div className="splash-watermark">Family Photo Vault</div>
    </div>
  );
}
