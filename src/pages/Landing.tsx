import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, Upload, Check, Shield, Search, Heart, ArrowUp, Download, Loader2, X, Lock, Sun, Moon, Ban } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import SplashScreen from "@/components/SplashScreen";
import AdminLoginModal from "@/components/AdminLoginModal";
import UploadModal from "@/components/UploadModal";
import PhotoLightbox from "@/components/PhotoLightbox";
import Logo from "@/components/Logo";
import { useTheme } from "@/hooks/use-theme";

function getVisitorId(): string {
  let id = localStorage.getItem("vault_visitor_id");
  if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("vault_visitor_id", id); }
  return id;
}

/* ── Device fingerprint helpers ── */
function detectDevice(ua: string): string {
  if (/Tablet|iPad/i.test(ua)) return "tablet";
  if (/Mobi|Android/i.test(ua)) return "mobile";
  return "desktop";
}
function detectBrowser(ua: string): string {
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("OPR/") || ua.includes("Opera")) return "Opera";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("SamsungBrowser/")) return "Samsung Internet";
  if (ua.includes("CriOS/")) return "Chrome (iOS)";
  if (ua.includes("Chrome/")) return "Chrome";
  if (ua.includes("Safari/")) return "Safari";
  return "Unknown";
}
function detectOS(ua: string): string {
  if (ua.includes("Windows NT 10")) return "Windows 10/11";
  if (ua.includes("Windows NT 6.1")) return "Windows 7";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Mac OS X")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  return "Unknown";
}

/** Fetch the real client IP via the Convex HTTP action, cached in localStorage. */
async function fetchRealIp(): Promise<string | null> {
  const cached = localStorage.getItem("vault_real_ip");
  if (cached) return cached;
  try {
    const res = await fetch(`${import.meta.env.VITE_CONVEX_URL}/client-info`);
    const data = (await res.json()) as { ip?: string };
    if (data.ip && data.ip !== "unknown") {
      localStorage.setItem("vault_real_ip", data.ip);
      return data.ip;
    }
  } catch {}
  return cached;
}

/** Speak a short phrase (best effort — wrapped so it can never break the app). */
function speak(text: string) {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1.05;
    window.speechSynthesis.speak(u);
  } catch {}
}

async function directDownload(url: string, fileName: string, onLoading?: () => void, onDone?: () => void) {
  onLoading?.();
  try {
    const res = await fetch(url); const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = blobUrl; a.download = fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl);
  } catch { window.open(url, "_blank"); }
  onDone?.();
}

async function downloadAllPhotos(photos: { url: string; fileName: string }[], onProgress: (c: number, t: number) => void, onDone: () => void) {
  for (let i = 0; i < photos.length; i++) {
    onProgress(i + 1, photos.length);
    try {
      const res = await fetch(photos[i].url); const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = blobUrl; a.download = photos[i].fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl);
    } catch { window.open(photos[i].url, "_blank"); }
    if (i < photos.length - 1) await new Promise((r) => setTimeout(r, 350));
  }
  onDone();
}

function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try { const s = localStorage.getItem("vault_favorites"); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
  });
  const toggle = useCallback((id: string) => {
    setFavorites((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); localStorage.setItem("vault_favorites", JSON.stringify([...n])); return n; });
  }, []);
  return { favorites, toggle };
}

/* ── Blocked screen (admin blocked this device) ── */
function BlockedScreen() {
  return (
    <div className="vault-blocked">
      <div className="vault-blocked-card">
        <div className="vault-blocked-icon"><Ban className="h-8 w-8" /></div>
        <h1>Access Restricted</h1>
        <p>This device has been blocked by the family admin. If you think this is a mistake, please contact Rajnish.</p>
        <span className="vault-blocked-brand">बड़ोलिया परिवार</span>
      </div>
    </div>
  );
}

/* ── Camera flash entry animation ── */
function CameraFlash() {
  return (
    <motion.div className="vault-camera-flash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, ease: "easeOut" }} className="vault-camera-ring">
        <Camera className="h-10 w-10" />
      </motion.div>
      <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.4 }} className="vault-camera-label">
        Sweet Family memories
      </motion.span>
      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="vault-camera-sub">
        📷 opening your photo vault
      </motion.span>
    </motion.div>
  );
}

/* ── Overlay Download Button ── */
function OverlayDownloadBtn({ url, fileName }: { url: string; fileName: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); if (state !== "idle") return;
    directDownload(url, fileName, () => setState("loading"), () => { setState("done"); setTimeout(() => setState("idle"), 2000); });
  };
  return (
    <button onClick={handleClick} className={`vault-card-dl-btn ${state === "loading" ? "is-loading" : ""} ${state === "done" ? "is-done" : ""}`}>
      {state === "idle" && (<><Download className="h-3 w-3" /> Save</>)}
      {state === "loading" && (<><span className="dl-spin" /></>)}
      {state === "done" && (<><Check className="h-3 w-3" /> Saved</>)}
    </button>
  );
}

/* ── Overlay Heart Button ── */
function OverlayHeartBtn({ photoId, visitorId }: { photoId: string; visitorId: string }) {
  const likes = useQuery(api.reactions.getLikes, { photoId: photoId as any, visitorId });
  const toggleLike = useMutation(api.reactions.toggleLike);
  const [opt, setOpt] = useState<{ liked: boolean; count: number } | null>(null);
  const d = opt ?? likes ?? { liked: false, count: 0 };
  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpt({ liked: !d.liked, count: d.liked ? d.count - 1 : d.count + 1 });
    try { const r = await toggleLike({ photoId: photoId as any, visitorId }); setOpt(r); } catch { setOpt(null); }
  };
  return (
    <button onClick={handleClick} className={`vault-card-like-btn ${d.liked ? "liked" : ""}`}>
      <Heart className={`h-3.5 w-3.5 ${d.liked ? "fill-current" : ""}`} />
    </button>
  );
}

/* ── Card ── */
function PhotoCard({ photo, index, onClick, visitorId, isFav, onToggleFav }: {
  photo: { _id: string; url: string; fileName: string }; index: number;
  onClick: () => void; visitorId: string; isFav: boolean; onToggleFav: (id: string) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const prettyName = photo.fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return (
    <div className="vault-vcard" style={{ animationDelay: `${Math.min(index * 0.06, 0.35)}s` }}>
      <div className="vault-vcard-img-wrap" onClick={onClick}>
        <img src={photo.url} alt={photo.fileName} className={loaded ? "loaded" : ""} loading="lazy" onLoad={() => setLoaded(true)} />
        {!loaded && <div className="vault-vcard-skeleton" />}
      </div>
      <div className="vault-vcard-info">
        <div className="vault-vcard-meta">
          <span className="vault-vcard-date">{dateStr}</span>
          <button onClick={(e) => { e.stopPropagation(); onToggleFav(photo._id); }} className={`vault-vcard-fav ${isFav ? "active" : ""}`}>
            <Heart className={`h-3 w-3 ${isFav ? "fill-current" : ""}`} />
          </button>
        </div>
        <h3 className="vault-vcard-title">{prettyName}</h3>
        <div className="vault-vcard-actions">
          <button className="vault-vcard-view" onClick={onClick}>View</button>
          <OverlayDownloadBtn url={photo.url} fileName={photo.fileName} />
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const visitorId = useMemo(() => getVisitorId(), []);
  const recordVisitor = useMutation(api.traffic.recordVisitor);
  const { theme, toggle: toggleTheme } = useTheme();

  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem("vault_splash_seen"));
  const [galleryReady, setGalleryReady] = useState(!showSplash);
  const [heroVisible, setHeroVisible] = useState(!showSplash);
  const [dividerExpanded, setDividerExpanded] = useState(!showSplash);
  const [cameraFlash, setCameraFlash] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [dlAllState, setDlAllState] = useState<"idle" | "loading" | "done">("idle");
  const [dlAllProgress, setDlAllProgress] = useState({ current: 0, total: 0 });
  const [titleRevealed, setTitleRevealed] = useState(false);
  const [realIp, setRealIp] = useState<string | null>(() => localStorage.getItem("vault_real_ip"));

  const approvedPhotos = useQuery(api.photos.listApproved);
  const photos = approvedPhotos ?? [];
  const blockedIps = useQuery(api.traffic.getBlockedIps);
  const { favorites, toggle: toggleFav } = useFavorites();

  const effectiveIp = realIp ?? visitorId;
  const isBlocked = !!blockedIps && blockedIps.includes(effectiveIp);

  // Fetch the real IP once.
  useEffect(() => {
    fetchRealIp().then((ip) => { if (ip) setRealIp(ip); }).catch(() => {});
  }, []);

  useEffect(() => { if (galleryReady) { const t = setTimeout(() => setTitleRevealed(true), 300); return () => clearTimeout(t); } }, [galleryReady]);

  const filteredPhotos = useMemo(() => {
    if (!searchQuery.trim()) return photos;
    const q = searchQuery.toLowerCase();
    return photos.filter((p) => p.fileName.toLowerCase().includes(q));
  }, [photos, searchQuery]);

  // Record exactly once — wait briefly for the real IP, then fall back to the visitor id.
  const visitorRecorded = useRef(false);
  useEffect(() => {
    if (visitorRecorded.current) return;
    const timer = setTimeout(() => {
      visitorRecorded.current = true;
      recordVisitor({
        ip: effectiveIp,
        userAgent: navigator.userAgent,
        page: window.location.pathname,
        device: detectDevice(navigator.userAgent),
        browser: detectBrowser(navigator.userAgent),
        os: detectOS(navigator.userAgent),
        screen: `${window.innerWidth}x${window.innerHeight}`,
      }).catch(() => {});
    }, realIp ? 600 : 1800);
    return () => clearTimeout(timer);
  }, [effectiveIp, realIp, recordVisitor]);

  useEffect(() => {
    const h = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const handleSplashComplete = useCallback((fromAdmin = false) => {
    sessionStorage.setItem("vault_splash_seen", "1");
    setShowSplash(false); setGalleryReady(true); setHeroVisible(true);
    setTimeout(() => setDividerExpanded(true), 400);
    if (fromAdmin) return;
    // Entry journey: camera flash + voice + auto-scroll to the photos.
    setTimeout(() => {
      setCameraFlash(true);
      speak("Sweet Family memories");
      setTimeout(() => {
        setCameraFlash(false);
        document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 1800);
    }, 800);
  }, []);

  const handleDownloadAll = async () => {
    if (dlAllState !== "idle" || photos.length === 0) return;
    setDlAllState("loading"); setDlAllProgress({ current: 0, total: photos.length });
    await downloadAllPhotos(photos.map((p) => ({ url: p.url, fileName: p.fileName })),
      (c, t) => setDlAllProgress({ current: c, total: t }),
      () => { setDlAllState("done"); setTimeout(() => setDlAllState("idle"), 3000); });
  };

  if (isBlocked) return <BlockedScreen />;

  return (
    <div className="min-h-screen bg-background">
      {showSplash && <SplashScreen onComplete={handleSplashComplete} onAdminClick={() => { handleSplashComplete(true); setShowAdminLogin(true); }} />}
      {cameraFlash && <CameraFlash />}

      {/* ── Floating Pill Nav ── */}
      <div className={`vault-nav ${heroVisible ? "" : "is-hidden"}`}>
        <div className="vault-nav-brand">
          <Logo size={32} />
        </div>
        <div className="vault-nav-actions">
          <button onClick={toggleTheme} className="vault-nav-theme" aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => setShowUpload(true)} className="vault-nav-btn">
            <Upload className="h-3.5 w-3.5" />
            <span className="label">Upload</span>
          </button>
          <button onClick={() => setShowAdminLogin(true)} className="vault-nav-admin">
            <Lock className="h-3 w-3" />
            <span className="label">admin</span>
          </button>
        </div>
      </div>

      {/* ── Immersive Hero ── */}
      <section className="vault-hero">
        <div className="vault-hero-glow" />
        <div className="vault-hero-particle" /><div className="vault-hero-particle" /><div className="vault-hero-particle" /><div className="vault-hero-particle" /><div className="vault-hero-particle" /><div className="vault-hero-particle" />
        <motion.div initial={heroVisible ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <span className="vault-hero-badge">Private Family Gallery</span>
        </motion.div>
        <motion.h1 initial={heroVisible ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }} className="vault-hero-title">
          Sweet Family&apos;s<span className="accent">Photos</span>
        </motion.h1>
        <div className={`vault-hero-line ${dividerExpanded ? "expanded" : ""}`} />
        <motion.p initial={heroVisible ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }} className="vault-hero-desc">
          Browse, download, and share your family&apos;s beautiful moments — in full quality, without compression or clutter.
        </motion.p>
        <motion.div initial={heroVisible ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} className="vault-hero-ctas">
          <a href="#gallery" className="vault-hero-cta-primary"><Camera className="h-4 w-4" /> View Gallery</a>
          <button onClick={() => setShowUpload(true)} className="vault-hero-cta-secondary"><Upload className="h-4 w-4" /> Upload Photos</button>
        </motion.div>
        <div className="vault-hero-fade" />
      </section>

      {/* ── Gallery Section ── */}
      <section id="gallery" className="vault-gallery-section">
        <div className="vault-gallery-header">
          <Logo size={28} showText className="justify-center" />
          <h2 className="vault-gallery-title" style={{ fontFamily: "var(--font-serif)", marginTop: 12 }}>
            {titleRevealed ? (
              <span className="brush-write"><span className="brush-text">Family Memories</span><span className="brush-underline" /></span>
            ) : <span style={{ opacity: 0 }}>Family Memories</span>}
          </h2>
          {photos.length > 0 && <p className="vault-gallery-count">{photos.length} photo{photos.length !== 1 ? "s" : ""}</p>}
        </div>

        {/* Toolbar */}
        <div className="vault-gallery-toolbar">
          {photos.length > 1 && (
            <button onClick={handleDownloadAll} className={`vault-dl-all ${dlAllState === "loading" ? "is-loading" : ""} ${dlAllState === "done" ? "is-done" : ""}`}>
              {dlAllState === "idle" && (<><Download className="h-3.5 w-3.5" /> Download All ({photos.length})</>)}
              {dlAllState === "loading" && (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> {dlAllProgress.current}/{dlAllProgress.total}</>)}
              {dlAllState === "done" && (<><Check className="h-3.5 w-3.5" /> Done</>)}
              {dlAllState === "loading" && <div className="vault-dl-all-progress" style={{ width: `${(dlAllProgress.current / dlAllProgress.total) * 100}%` }} />}
            </button>
          )}
          {photos.length > 3 && (
            <div className="vault-search">
              <Search />
              <input type="text" placeholder="Search photos…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="vault-search-clear"><X className="h-3.5 w-3.5" /></button>
              )}
            </div>
          )}
        </div>

        {/* Grid */}
        {filteredPhotos.length > 0 ? (
          <div className="vault-grid">
            {filteredPhotos.map((photo, i) => (
              <PhotoCard key={photo._id} photo={photo} index={i} onClick={() => setLightboxIndex(i)} visitorId={visitorId} isFav={favorites.has(photo._id)} onToggleFav={toggleFav} />
            ))}
          </div>
        ) : searchQuery ? (
          <div className="vault-empty">
            <Search className="vault-empty-icon" />
            <p className="vault-empty-title">No results for &ldquo;{searchQuery}&rdquo;</p>
            <button onClick={() => setSearchQuery("")} className="vault-empty-action">Clear search</button>
          </div>
        ) : galleryReady ? (
          <div className="vault-empty">
            <Camera className="vault-empty-icon" />
            <p className="vault-empty-title">No photos yet</p>
            <p className="vault-empty-desc">Upload the first one to get started</p>
          </div>
        ) : null}

        {/* Favorites */}
        {favorites.size > 0 && !searchQuery && (
          <div className="vault-favorites-section">
            <div className="vault-favorites-header">
              <Heart className="h-4 w-4 text-[#FF3B30] fill-[#FF3B30]" />
              <h3 className="vault-favorites-title">Your Favorites ({favorites.size})</h3>
            </div>
            <div className="vault-grid">
              {photos.filter((p) => favorites.has(p._id)).map((photo, i) => (
                <PhotoCard key={photo._id} photo={photo} index={i} onClick={() => { const ri = photos.findIndex((p) => p._id === photo._id); setLightboxIndex(ri); }} visitorId={visitorId} isFav={true} onToggleFav={toggleFav} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Footer ── */}
      <footer className="vault-footer">
        <Logo size={24} showText className="justify-center" />
        <p className="vault-footer-slogan">A private space for our timeless memories</p>
        <div className="vault-footer-credit">
          <Shield className="h-3 w-3" />
          <span>Designed & Developed with <span className="text-[#FF3B30]">❤</span> by <strong>Rajnish</strong></span>
        </div>
      </footer>

      {/* Back to top */}
      <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: showScrollTop ? 1 : 0, scale: showScrollTop ? 1 : 0.8 }}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="vault-back-top"
        style={{ pointerEvents: showScrollTop ? "auto" : "none" }}>
        <ArrowUp className="h-4 w-4" />
      </motion.button>

      {showAdminLogin && <AdminLoginModal onClose={() => setShowAdminLogin(false)} />}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
      {lightboxIndex !== null && <PhotoLightbox photos={filteredPhotos} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} visitorId={visitorId} />}
    </div>
  );
}