import { useState, useEffect, useCallback, useRef } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

const SHOW_DURATION = 3200;
const FADE_DURATION = 700;
const CHAR_DELAY = 120; // ms per character for handwriting feel

/* ─── Handwriting text: appears char-by-char with ink-reveal ─── */
function HandwrittenText({
  text,
  startDelay,
  className,
  style,
}: {
  text: string;
  startDelay: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const startTimer = setTimeout(() => {
      let count = 0;
      const interval = setInterval(() => {
        count++;
        setRevealed(count);
        if (count >= text.length) clearInterval(interval);
      }, CHAR_DELAY);
      return () => clearInterval(interval);
    }, startDelay);
    return () => clearTimeout(startTimer);
  }, [text, startDelay]);

  return (
    <span className={className} style={style}>
      {text.split("").map((char, i) => (
        <span
          key={i}
          className="handwritten-char"
          style={{
            opacity: i < revealed ? 1 : 0,
            transform: i < revealed ? "translateY(0)" : "translateY(8px)",
            filter: i < revealed ? "blur(0)" : "blur(3px)",
            transition: "opacity 0.3s ease, transform 0.3s ease, filter 0.3s ease",
            display: "inline-block",
            minWidth: char === " " ? "0.3em" : undefined,
          }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
      {/* Blinking cursor while writing */}
      {revealed < text.length && (
        <span className="splash-cursor" />
      )}
    </span>
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
    }, 35);
    return () => clearInterval(timer);
  }, []);

  // Complete callback
  const doComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  // Main timer
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFading(true);
      setTimeout(doComplete, FADE_DURATION);
    }, SHOW_DURATION);
    return () => clearTimeout(fadeTimer);
  }, [doComplete]);

  // Safety net
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

      {/* Second glow */}
      <div
        className="absolute w-[250px] h-[250px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(252,246,186,0.04) 0%, transparent 60%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          animation: "splashPulseGlow 5s 1s infinite alternate ease-in-out",
        }}
      />

      {/* Hindi handwriting — बड़ौलिया top, परिवार below */}
      <div className="splash-branding" style={{ textAlign: "center" }}>
        <HandwrittenText
          text="बड़ौलिया"
          startDelay={300}
          className="splash-hindi-line"
          style={{ justifyContent: "center" }}
        />
        <HandwrittenText
          text="परिवार"
          startDelay={300 + 8 * CHAR_DELAY}
          className="splash-hindi-line"
          style={{ justifyContent: "center" }}
        />
      </div>

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
      <div className="splash-watermark">बड़ौलिया परिवार</div>
    </div>
  );
}
