import { useState, useEffect, useRef, useCallback } from "react";
import { Shield } from "lucide-react";

interface Props {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: Props) {
  const [phase, setPhase] = useState<"writing" | "title" | "done">("writing");
  const [hindiLine1, setHindiLine1] = useState("");
  const [hindiLine2, setHindiLine2] = useState("");
  const [titleChars, setTitleChars] = useState<string[]>([]);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showTagline, setShowTagline] = useState(false);
  const [showTypewriter, setShowTypewriter] = useState(false);
  const [showFooter, setShowFooter] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const completedRef = useRef(false);

  const hindi1 = "बड़ोलिया";
  const hindi2 = "परिवार";
  const titleText = "Sweet Family Photos";
  const typewriterText = "BRINGING YOUR MOMENTS TO LIFE…";

  // Phase 1: Write Hindi text
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < hindi1.length) {
        setHindiLine1(hindi1.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        // Start writing line 2
        let j = 0;
        const interval2 = setInterval(() => {
          if (j < hindi2.length) {
            setHindiLine2(hindi2.slice(0, j + 1));
            j++;
          } else {
            clearInterval(interval2);
            setPhase("title");
          }
        }, 120);
      }
    }, 140);
    return () => clearInterval(interval);
  }, []);

  // Phase 2: Reveal title characters
  useEffect(() => {
    if (phase !== "title") return;
    let i = 0;
    const interval = setInterval(() => {
      if (i < titleText.length) {
        setTitleChars((prev) => [...prev, titleText[i]]);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => setShowSubtitle(true), 200);
        setTimeout(() => setShowTagline(true), 500);
        setTimeout(() => setShowTypewriter(true), 800);
        setTimeout(() => setShowFooter(true), 1000);
        // Auto-complete after all elements shown
        setTimeout(() => {
          setPhase("done");
          setFadeOut(true);
          setTimeout(() => {
            if (!completedRef.current) {
              completedRef.current = true;
              onComplete();
            }
          }, 700);
        }, 3500);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [phase, onComplete]);

  // Safety net
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    }, 6000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`splash-screen ${fadeOut ? "fade-out" : ""}`}>
      {/* Ambient glow */}
      <div className="splash-ambient-glow" />

      {/* Hindi branding — top left */}
      <div className="splash-branding-top">
        <div className="splash-hindi-writing">
          <span>{hindiLine1}</span>
          <div className="splash-hindi-second-line">
            <span>{hindiLine2}</span>
          </div>
        </div>
      </div>

      {/* Center content */}
      <div className="splash-center-content">
        {/* Title — character by character */}
        <div className="splash-title">
          {titleChars.map((char, i) => (
            <span key={i} className="splash-char" style={{ animationDelay: `${i * 0.03}s` }}>
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </div>

        {/* Divider */}
        <div className="splash-divider" />

        {/* Subtitle */}
        <div className="splash-subtitle" style={{ animationDelay: showSubtitle ? "0s" : "99s", opacity: showSubtitle ? undefined : 0, transform: showSubtitle ? undefined : "translateY(12px)" }}>
          PRIVATE FAMILY GALLERY
        </div>

        {/* Tagline */}
        <div className="splash-tagline" style={{ animationDelay: showTagline ? "0s" : "99s", opacity: showTagline ? undefined : 0, transform: showTagline ? undefined : "translateY(12px)" }}>
          Preserving memories, together
        </div>

        {/* Typewriter */}
        <div className="splash-typewriter" style={{ opacity: showTypewriter ? 1 : 0, transition: "opacity 0.5s ease" }}>
          {showTypewriter && <TypewriterText text={typewriterText} />}
        </div>
      </div>

      {/* Footer credit */}
      <div className="splash-footer-credit" style={{ opacity: showFooter ? undefined : 0, transform: showFooter ? undefined : "translateY(8px)" }}>
        <Shield className="h-3 w-3" style={{ opacity: showFooter ? undefined : 0, animation: showFooter ? "splashSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards" : "none" }} />
        <span style={{ animation: showFooter ? "splashSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.1s" : "none", opacity: showFooter ? undefined : 0 }}>
          powered by Rajnish
        </span>
      </div>
    </div>
  );
}

/* Typewriter sub-component */
function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 35);
    return () => clearInterval(interval);
  }, [text]);
  return (
    <>
      {displayed}
      <span className="splash-cursor" />
    </>
  );
}
