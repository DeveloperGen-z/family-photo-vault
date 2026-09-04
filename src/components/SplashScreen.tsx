import { useState, useEffect, useRef } from "react";
import { Shield } from "lucide-react";

interface Props { onComplete: () => void; }

export default function SplashScreen({ onComplete }: Props) {
  const [hindiLine1, setHindiLine1] = useState("");
  const [hindiLine2, setHindiLine2] = useState("");
  const [showTitle, setShowTitle] = useState(false);
  const [showCenter, setShowCenter] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const completedRef = useRef(false);

  const hindi1 = "बड़ोलिया";
  const hindi2 = "परिवार";

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      if (i < hindi1.length) { setHindiLine1(hindi1.slice(0, i + 1)); i++; }
      else {
        clearInterval(iv);
        let j = 0;
        const iv2 = setInterval(() => {
          if (j < hindi2.length) { setHindiLine2(hindi2.slice(0, j + 1)); j++; }
          else {
            clearInterval(iv2);
            setShowTitle(true);
            setTimeout(() => setShowCenter(true), 200);
            setTimeout(() => {
              setFadeOut(true);
              setTimeout(() => { if (!completedRef.current) { completedRef.current = true; onComplete(); } }, 500);
            }, 1200);
          }
        }, 65);
      }
    }, 85);
    return () => { clearInterval(iv); };
  }, [onComplete]);

  useEffect(() => {
    const t = setTimeout(() => { if (!completedRef.current) { completedRef.current = true; onComplete(); } }, 3000);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className={`splash-screen ${fadeOut ? "fade-out" : ""}`}>
      <div className="splash-ambient-glow" />
      <div className="splash-branding-top">
        <div className="splash-hindi-writing">
          <span>{hindiLine1}</span>
          <div className="splash-hindi-second-line"><span>{hindiLine2}</span></div>
        </div>
      </div>
      <div className="splash-center-content">
        {showTitle && <div className="splash-title" style={{ opacity: 1, animation: "none" }}>Sweet Family Photos</div>}
        <div className="splash-divider" style={{ animationDelay: showTitle ? "0.1s" : "99s" }} />
        {showCenter && (<>
          <div className="splash-subtitle" style={{ opacity: 1, transform: "translateY(0)" }}>PRIVATE FAMILY GALLERY</div>
          <div className="splash-tagline" style={{ opacity: 1, transform: "translateY(0)" }}>Preserving memories, together</div>
        </>)}
      </div>
      <div className="splash-footer-credit" style={{ opacity: showCenter ? 0.5 : 0, transform: showCenter ? "translateY(0)" : "translateY(8px)", transition: "all 0.4s ease" }}>
        <Shield className="h-3 w-3" />
        <span>powered by Rajnish</span>
      </div>
    </div>
  );
}
