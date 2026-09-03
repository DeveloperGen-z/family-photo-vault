import { useState, useEffect, useCallback, useRef } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

const TYPING_SPEED = 35;
const SHOW_DURATION = 3200;
const FADE_DURATION = 700;

/* ── Handwriting-reveal component for Hindi text ── */
function HandwrittenLine({
  text,
  delay,
  duration,
  className,
}: {
  text: string;
  delay: number;
  duration: number;
  className?: string;
}) {
  const [progress, setProgress] = useState(0); // 0 → 1
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    const startTime = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, duration]);

  const pct = Math.round(progress * 100);

  return (
    <div className={`relative inline-block ${className ?? ""}`}>
      {/* Full text — invisible, holds space */}
      <span style={{ opacity: 0 }}>{text}</span>
      {/* Revealed text — clipped left-to-right */}
      <span
        className="absolute inset-0"
        style={{
          clipPath: `inset(0 ${100 - pct}% 0 0)`,
        }}
      >
        {text}
      </span>
      {/* Blinking cursor at the writing edge */}
      {started && progress < 1 && (
        <span
          className="absolute top-0 h-full"
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

  /* Typewriter for loading text */
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

  /* Auto-fade after SHOW_DURATION */
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFading(true);
      setTimeout(doComplete, FADE_DURATION);
    }, SHOW_DURATION);
    return () => clearTimeout(fadeTimer);
  }, [doComplete]);

  /* Safety net */
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

      {/* ── Hindi Handwritten Branding ── */}
      <div className="splash-branding">
        <div className="splash-hindi-line">
          <HandwrittenLine
            text="बडोलिया"
            delay={300}
            duration={900}
          />
        </div>
        <div className="splash-hindi-line" style={{ justifyContent: "flex-end", paddingRight: "15%" }}>
          <HandwrittenLine
            text="परिवार"
            delay={1250}
            duration={700}
          />
        </div>
      </div>

      {/* ── English Title ── */}
      <AnimatedTitle text="Family Photo Vault" delay={0.15} />

      <div className="splash-divider" />

      <p className="splash-subtitle">Private Family Gallery</p>
      <p className="splash-tagline">Preserving memories, together</p>

      {/* Typewriter loading */}
      <div className="splash-typewriter">
        {typedText}
        <span className="splash-cursor" />
      </div>

      {/* ── Footer: lock icon + powered by Rajnish ── */}
      <div className="splash-footer-credit">
        {/* Lock SVG icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.6 }}
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>powered by Rajnish</span>
      </div>
    </div>
  );
}
