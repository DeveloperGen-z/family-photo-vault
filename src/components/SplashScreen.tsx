import { useState, useEffect, useRef } from "react";
import { Lock } from "lucide-react";

interface Props { onComplete: () => void; onAdminClick?: () => void; }

export default function SplashScreen({ onComplete, onAdminClick }: Props) {
  const [hindiLine1, setHindiLine1] = useState("");
  const [hindiLine2, setHindiLine2] = useState("");
  const [showTitle, setShowTitle] = useState(false);
  const [showCenter, setShowCenter] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [fadeOut, setFadeOut] = useState(false);
  const completedRef = useRef(false);

  const hindi1 = "बड़ोलिया";
  const hindi2 = "परिवार";
  const loadingFull = "Loading your memories...";

  useEffect(() => {
    let iv2: ReturnType<typeof setInterval> | undefined;
    let ivL: ReturnType<typeof setInterval> | undefined;
    let timeout2: ReturnType<typeof setTimeout> | undefined;
    let timeout3: ReturnType<typeof setTimeout> | undefined;

    let i = 0;
    const iv = setInterval(() => {
      if (i < hindi1.length) { setHindiLine1(hindi1.slice(0, i + 1)); i++; }
      else {
        clearInterval(iv);
        let j = 0;
        iv2 = setInterval(() => {
          if (j < hindi2.length) { setHindiLine2(hindi2.slice(0, j + 1)); j++; }
          else {
            clearInterval(iv2);
            setShowTitle(true);
            timeout2 = setTimeout(() => setShowCenter(true), 200);
            // Typewriter "Loading your memories..."
            let k = 0;
            timeout3 = setTimeout(() => {
              ivL = setInterval(() => {
                if (k <= loadingFull.length) { setLoadingText(loadingFull.slice(0, k)); k++; }
                else clearInterval(ivL);
              }, 55);
            }, 300);
            setTimeout(() => {
              setFadeOut(true);
              setTimeout(() => { if (!completedRef.current) { completedRef.current = true; onComplete(); } }, 500);
            }, 2600);
          }
        }, 65);
      }
    }, 85);
    return () => { clearInterval(iv); if (iv2) clearInterval(iv2); if (ivL) clearInterval(ivL); if (timeout2) clearTimeout(timeout2); if (timeout3) clearTimeout(timeout3); };
  }, [onComplete]);

  useEffect(() => {
    const t = setTimeout(() => { if (!completedRef.current) { completedRef.current = true; onComplete(); } }, 4500);
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
        {showTitle && <div className="splash-title gold-shimmer">Family Photo Vault</div>}
        <div className="splash-divider" style={{ animationDelay: showTitle ? "0.1s" : "99s" }} />
        {showCenter && (<>
          <div className="splash-subtitle" style={{ opacity: 1, transform: "translateY(0)" }}>PRIVATE FAMILY GALLERY</div>
          <div className="splash-tagline" style={{ opacity: 1, transform: "translateY(0)" }}>Preserving memories, together</div>
          <div className="splash-loading-line">
            {loadingText}<span className="splash-cursor">|</span>
          </div>
        </>)}
      </div>
      <div className="splash-footer" style={{ opacity: showCenter ? 1 : 0, transform: showCenter ? "translateY(0)" : "translateY(8px)", transition: "all 0.5s ease" }}>
        <button
          type="button"
          className="splash-admin-btn"
          onClick={() => { if (!completedRef.current) { completedRef.current = true; } onAdminClick?.(); }}
        >
          <Lock className="h-3 w-3" />
          Admin
        </button>
        <span className="splash-footer-credit">powered by Rajnish</span>
      </div>
    </div>
  );
}
