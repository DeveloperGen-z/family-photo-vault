import { useState, useEffect, useCallback } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

const TYPING_SPEED = 38;
const SHOW_DURATION = 2400;
const FADE_DURATION = 600;

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [fading, setFading] = useState(false);
  const [typedText, setTypedText] = useState("");
  const fullText = "Loading your memories\u2026";

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

  const handleFade = useCallback(() => {
    setFading(true);
    setTimeout(onComplete, FADE_DURATION);
  }, [onComplete]);

  useEffect(() => {
    const timer = setTimeout(handleFade, SHOW_DURATION);
    return () => clearTimeout(timer);
  }, [handleFade]);

  return (
    <div className={`splash-screen ${fading ? "fade-out" : ""}`}>
      {/* Ambient glow */}
      <div className="splash-ambient-glow" />

      {/* Title */}
      <h1 className="splash-title">Family Photo Vault</h1>

      {/* Divider line */}
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
