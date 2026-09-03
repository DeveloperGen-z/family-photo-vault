import { useState, useEffect, useCallback, useRef } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

const TYPING_SPEED = 35;
const SHOW_DURATION = 3200;
const FADE_DURATION = 700;

/* ── Handwriting-reveal: clipPath left-to-right with cursor ── */
function HandwrittenLine({
  text,
  delay,
  duration,
  style,
}: {
  text: string;
  delay: number;
  duration: number;
  style?: React.CSSProperties;
}) {
  const [progress, setProgress] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    const t0 = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, duration]);

  const pct = Math.round(progress * 100);

  return (
    <div className="relative inline-block" style={style}>
      {/* Invisible full text to hold layout */}
      <span style={{ opacity: 0, userSelect: "none" }}>{text}</span>
      {/* Clipped reveal */}
      <span className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}>
        {text}
      </span>
      {/* Cursor at writing edge */}
      {started && progress < 1 && (
        <span
          className="absolute top-0 h-full pointer-events-none"
          style={{
            left: `${pct}%`,
            width: "2px",
            background: "#d4af37",
            animation: "splashBlink 0.6s infinite",
          }}
        />
      )}
    </div>
  );
}

/* ── Character-by-character reveal for English title ── */
function AnimatedTitle({ text, delay }: { text: string; delay: number }) {
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
            animationDelay: `${delay + i * 0.035}s`,
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

  const doComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFading(true);
      setTimeout(doComplete, FADE_DURATION);
    }, SHOW_DURATION);
    return () => clearTimeout(fadeTimer);
  }, [doComplete]);

  useEffect(() => {
    const safetyTimer = setTimeout(() => doComplete(), 6000);
    return () => clearTimeout(safetyTimer);
  }, [doComplete]);

  return (
    <div
      className={`splash-screen ${fading ? "fade-out" : ""}`}
      style={{ opacity: fading ? 0 : 1 }}
    >
      {/* Ambient glow */}
      <div className="splash-ambient-glow" />

      {/* ── TOP: Hindi Handwritten Branding ── */}
      <div className="splash-branding-top">
        <div className="splash-hindi-writing">
          <HandwrittenLine
            text="बडोलिया"
            delay={300}
            duration={900}
          />
        </div>
        <div className="splash-hindi-writing splash-hindi-second-line">
          <HandwrittenLine
            text="परिवार"
            delay={1250}
            duration={700}
          />
        </div>
      </div>

      {/* ── CENTER: Title + Subtitle + Loading ── */}
      <div className="splash-center-content">
        <AnimatedTitle text="Family Photo Vault" delay={0.15} />

        <div className="splash-divider" />

        <p className="splash-subtitle">Private Family Gallery</p>
        <p className="splash-tagline">Preserving memories, together</p>

        <div className="splash-typewriter">
          {typedText}
          <span className="splash-cursor" />
        </div>
      </div>

      {/* ── BOTTOM: Lock icon + powered by Rajnish ── */}
      <div className="splash-footer-credit">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" fill="rgba(212,175,55,0.5)" stroke="#d4af37" strokeWidth="1.5" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#d4af37" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <circle cx="12" cy="16" r="1.5" fill="#d4af37" />
        </svg>
        <span>powered by Rajnish</span>
      </div>
    </div>
  );
}
