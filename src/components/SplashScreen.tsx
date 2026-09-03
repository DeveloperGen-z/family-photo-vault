import { useState, useEffect, useCallback, useRef } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

const SHOW_DURATION = 2800;
const FADE_DURATION = 600;

function AnimatedTitle() {
  return (
    <div className="splash-branding" style={{ textAlign: "center" }}>
      {/* बड़ोलिया — top line */}
      <div className="splash-hindi-line" style={{ justifyContent: "flex-end" }}>
        {"बड़ोलिया".split("").map((char, i) => (
          <span
            key={`top-${i}`}
            className="splash-char"
            style={{ animationDelay: `${0.1 + i * 0.05}s` }}
          >
            {char}
          </span>
        ))}
      </div>
      {/* परिवार — bottom line, right-aligned to end of या */}
      <div className="splash-hindi-line" style={{ justifyContent: "flex-end" }}>
        {"परिवार".split("").map((char, i) => (
          <span
            key={`bot-${i}`}
            className="splash-char"
            style={{ animationDelay: `${0.5 + i * 0.05}s` }}
          >
            {char}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [fading, setFading] = useState(false);
  const [typedText, setTypedText] = useState("");
  const completedRef = useRef(false);
  const fullText = "Bringing your moments to life\u2026";

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
    }, 40);
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

  // Safety net: if anything goes wrong, force-complete after 6s
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      doComplete();
    }, 6000);
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

      {/* Hindi Branding — character-by-character reveal */}
      <AnimatedTitle />

      {/* Divider */}
      <div className="splash-divider" />

      {/* Subtitle */}
      <p className="splash-subtitle">Sweet Family&apos;s Photos</p>

      {/* Typewriter */}
      <div className="splash-typewriter">
        {typedText}
        <span className="splash-cursor" />
      </div>

      {/* Watermark */}
      <div className="splash-watermark">बड़ोलिया परिवार</div>
    </div>
  );
}
