import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Camera, Upload, ChevronDown, Check, Shield, Search, Heart, ArrowUp } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import SplashScreen from "@/components/SplashScreen";
import AdminLoginModal from "@/components/AdminLoginModal";
import UploadModal from "@/components/UploadModal";
import PhotoLightbox from "@/components/PhotoLightbox";

/* ─── Visitor ID (persistent per browser) ─── */
function getVisitorId(): string {
  let id = localStorage.getItem("vault_visitor_id");
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("vault_visitor_id", id);
  }
  return id;
}

/* ─── Direct download helper ─── */
async function directDownload(
  url: string,
  fileName: string,
  onLoading?: () => void,
  onDone?: () => void,
) {
  onLoading?.();
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
  onDone?.();
}

/* ─── Typewriter hook ─── */
function useTypewriter(text: string, speed = 55, enabled = false) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) { setDisplayed(text.slice(0, i + 1)); i++; }
      else { setDone(true); clearInterval(interval); }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, enabled]);
  return { displayed, done };
}

/* ─── Favorites (localStorage) ─── */
function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("vault_favorites");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const toggle = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem("vault_favorites", JSON.stringify([...next]));
      return next;
    });
  }, []);
  return { favorites, toggle };
}

/* ─── Download button ─── */
function DownloadButton({ url, fileName }: { url: string; fileName: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (state !== "idle") return;
    directDownload(url, fileName, () => setState("loading"), () => {
      setState("done"); setTimeout(() => setState("idle"), 2000);
    });
  };
  return (
    <button onClick={handleClick} className={`vault-download-btn ${state === "loading" ? "is-loading" : ""} ${state === "done" ? "is-done" : ""}`}>
      {state === "idle" && (<>
        <svg className="vault-download-icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
        Download
      </>)}
      {state === "loading" && (<><span className="download-spinner" /> Downloadting…</>)}
      {state === "done" && (<><Check className="h-3.5 w-3.5" /> Downloaded</>)}
    </button>
  );
}

/* ─── Heart/Like button on card ─── */
function HeartButton({ photoId, visitorId }: { photoId: string; visitorId: string }) {
  const likes = useQuery(api.reactions.getLikes, { photoId: photoId as any, visitorId });
  const toggleLike = useMutation(api.reactions.toggleLike);
  const [optimistic, setOptimistic] = useState<{ liked: boolean; count: number } | null>(null);

  const display = optimistic ?? likes ?? { liked: false, count: 0 };

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setOptimistic({ liked: !display.liked, count: display.liked ? display.count - 1 : display.count + 1 });
    try {
      const result = await toggleLike({ photoId: photoId as any, visitorId });
      setOptimistic(result);
    } catch { setOptimistic(null); }
  };

  return (
    <button onClick={handleClick} className={`vault-heart-btn ${display.liked ? "liked" : ""}`}>
      <Heart className={`h-4 w-4 ${display.liked ? "fill-current" : ""}`} />
      {display.count > 0 && <span>{display.count}</span>}
    </button>
  );
}

/* ─── Gallery card ─── */
function GalleryCard({
  photo, index, onClick, visitorId, isFav, onToggleFav,
}: {
  photo: { _id: string; url: string; fileName: string };
  index: number;
  onClick: () => void;
  visitorId: string;
  isFav: boolean;
  onToggleFav: (id: string) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} className="vault-card is-visible">
      <div className="vault-card-img-wrap" onClick={onClick}>
        <img src={photo.url} alt={photo.fileName} className={`vault-card-img ${loaded ? "loaded" : ""}`} loading="lazy" onLoad={() => setLoaded(true)} />
        {/* Favorite button */}
        <button onClick={(e) => { e.stopPropagation(); onToggleFav(photo._id); }} className={`vault-fav-btn ${isFav ? "active" : ""}`}>
          <Heart className={`h-4 w-4 ${isFav ? "fill-red-500 text-red-500" : ""}`} />
        </button>
      </div>
      <div className="vault-card-actions">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <DownloadButton url={photo.url} fileName={photo.fileName} />
          </div>
          <HeartButton photoId={photo._id} visitorId={visitorId} />
        </div>
      </div>
    </div>
  );
}

/* ─── Admin Badge ─── */
function AdminBadge() {
  return (
    <span className="inline-flex items-center justify-center rounded-full border border-dashed border-current px-3 py-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground transition-colors group-hover:text-foreground sm:text-xs">
      Admin
    </span>
  );
}

/* ─── Main Landing ─── */
export default function Landing() {
  const visitorId = useMemo(() => getVisitorId(), []);
  const recordVisitor = useMutation(api.traffic.recordVisitor);

  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem("vault_splash_seen"));
  const [galleryReady, setGalleryReady] = useState(!showSplash);
  const [heroVisible, setHeroVisible] = useState(!showSplash);
  const [dividerExpanded, setDividerExpanded] = useState(!showSplash);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);

  const approvedPhotos = useQuery(api.photos.listApproved);
  const photos = approvedPhotos ?? [];
  const { favorites, toggle: toggleFav } = useFavorites();

  const { displayed: galleryTitle, done: titleDone } = useTypewriter("Family Memories", 55, galleryReady);

  // Filter photos by search
  const filteredPhotos = useMemo(() => {
    if (!searchQuery.trim()) return photos;
    const q = searchQuery.toLowerCase();
    return photos.filter((p) => p.fileName.toLowerCase().includes(q));
  }, [photos, searchQuery]);

  // Record visitor on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      recordVisitor({
        ip: visitorId,
        userAgent: navigator.userAgent,
        page: window.location.pathname,
        device: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : /Tablet|iPad/i.test(navigator.userAgent) ? "tablet" : "desktop",
      }).catch(() => {});
    }, 1000);
    return () => clearTimeout(timer);
  }, [visitorId, recordVisitor]);

  // Back to top visibility
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem("vault_splash_seen", "1");
    setShowSplash(false);
    setGalleryReady(true);
    setHeroVisible(true);
    setTimeout(() => setDividerExpanded(true), 400);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${heroVisible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`}>
        <div className="absolute inset-0 bg-background/70 backdrop-blur-2xl border-b border-white/[0.06]" />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
              <Camera className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col leading-none" style={{ fontFamily: "var(--font-handwritten)" }}>
              <span className="text-sm font-bold tracking-wide text-foreground sm:text-base">बड़ोलिया</span>
              <span className="text-[10px] font-bold tracking-wide text-foreground/70 sm:text-xs" style={{ marginLeft: "auto" }}>परिवार</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowUpload(true)} className="group inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.97] sm:px-4 sm:py-2.5 sm:text-sm">
              <Upload className="h-3.5 w-4 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Upload</span>
            </button>
            <button onClick={() => setShowAdminLogin(true)} className="group inline-flex items-center justify-center backdrop-blur-sm transition-all active:scale-[0.97]">
              <AdminBadge />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#050505]">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(212,175,55,0.06) 0%, transparent 55%)" }} />
        <div className="hero-dot hero-dot-1" /><div className="hero-dot hero-dot-2" /><div className="hero-dot hero-dot-3" /><div className="hero-dot hero-dot-4" /><div className="hero-dot hero-dot-5" />
        <div className="relative mx-auto max-w-5xl px-6 py-10 text-center md:py-16">
          <motion.div initial={heroVisible ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }} className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[10px] font-light tracking-widest text-white/40 uppercase backdrop-blur-sm sm:text-xs">
            Private Family Gallery
          </motion.div>
          <motion.h1 initial={heroVisible ? false : { opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }} className="text-4xl font-semibold leading-tight text-white md:text-6xl" style={{ fontFamily: "var(--font-serif)" }}>
            Sweet Family&apos;s
            <span className="block mt-2" style={{ background: "linear-gradient(135deg, #bf953f 0%, #fcf6ba 30%, #b38728 50%, #fbf5b7 70%, #aa771c 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Photos</span>
          </motion.h1>
          <div className={`hero-divider my-6 ${dividerExpanded ? "expanded" : ""}`} />
          <motion.p initial={heroVisible ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }} className="mx-auto max-w-lg text-xs leading-relaxed text-white/45 font-light sm:text-sm">
            Browse, download, and share your family&apos;s beautiful moments — in full quality, without compression or clutter.
          </motion.p>
          <motion.div initial={heroVisible ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.65, ease: [0.16, 1, 0.3, 1] }} className="mt-6 flex flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row sm:gap-3">
            <a href="#gallery" className="group inline-flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-7 py-3 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-white/5 active:scale-[0.97] sm:px-8 sm:py-3.5 sm:text-sm">
              <Camera className="h-4 w-4 transition-transform group-hover:scale-110" /> View Gallery
            </a>
            <button onClick={() => setShowUpload(true)} className="group inline-flex items-center gap-2.5 rounded-2xl bg-white/10 px-7 py-3 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-white/15 hover:shadow-lg hover:shadow-white/5 active:scale-[0.97] sm:px-8 sm:py-3.5 sm:text-sm">
              <Upload className="h-4 w-4 transition-transform group-hover:scale-110 group-hover:-translate-y-0.5" /> Upload Photos
            </button>
          </motion.div>
          <motion.div initial={heroVisible ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 1.2 }} className="mt-6 sm:mt-8">
            <a href="#gallery" className="inline-flex flex-col items-center text-white/20 transition-colors hover:text-white/40">
              <span className="mb-1.5 text-[8px] tracking-[2px] uppercase sm:mb-2 sm:text-[10px] sm:tracking-[3px]">Scroll</span>
              <ChevronDown className="h-4 w-4 scroll-indicator sm:h-5 sm:w-5" />
            </a>
          </motion.div>
        </div>
        <div className="absolute -bottom-1 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Gallery */}
      <section id="gallery" className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 pb-16 md:pt-8 md:pb-24">
        <div className="mb-10 text-center md:mb-14">
          <h2 className="gallery-title" style={{ fontFamily: "var(--font-serif)" }}>
            {galleryTitle}{!titleDone && <span className="gallery-title-cursor" />}
          </h2>
          {photos.length > 0 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5, duration: 0.6 }} className="mt-3 text-xs text-muted-foreground sm:text-sm">
              {photos.length} photo{photos.length !== 1 ? "s" : ""} in the collection
            </motion.p>
          )}
        </div>

        {/* Search bar */}
        {photos.length > 3 && (
          <div className="mb-6 mx-auto max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Search photos by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              )}
            </div>
          </div>
        )}

        {filteredPhotos.length > 0 ? (
          <div className="gallery-grid">
            {filteredPhotos.map((photo, index) => (
              <GalleryCard
                key={photo._id}
                photo={photo}
                index={index}
                onClick={() => setLightboxIndex(index)}
                visitorId={visitorId}
                isFav={favorites.has(photo._id)}
                onToggleFav={toggleFav}
              />
            ))}
          </div>
        ) : searchQuery ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-md rounded-3xl border border-border/40 bg-card py-16 text-center">
            <Search className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-4 text-base font-medium text-muted-foreground">No photos match "{searchQuery}"</p>
            <button onClick={() => setSearchQuery("")} className="mt-3 text-sm text-primary hover:underline">Clear search</button>
          </motion.div>
        ) : galleryReady ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="mx-auto max-w-md rounded-3xl border border-border/40 bg-card py-20 text-center">
            <Camera className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-4 text-base font-medium text-muted-foreground">No photos yet</p>
            <p className="mt-1 text-sm text-muted-foreground/60">Upload the first one to get started</p>
          </motion.div>
        ) : null}

        {/* Favorites section */}
        {favorites.size > 0 && !searchQuery && (
          <div className="mt-12">
            <div className="mb-4 flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500 fill-red-500" />
              <h3 className="text-sm font-semibold text-foreground">Your Favorites ({favorites.size})</h3>
            </div>
            <div className="gallery-grid">
              {photos.filter((p) => favorites.has(p._id)).map((photo, index) => (
                <GalleryCard key={photo._id} photo={photo} index={index} onClick={() => {
                  const realIndex = photos.findIndex((p) => p._id === photo._id);
                  setLightboxIndex(realIndex);
                }} visitorId={visitorId} isFav={true} onToggleFav={toggleFav} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-12 text-center sm:py-16">
        <div className="space-y-3">
          <p className="font-serif text-sm italic text-muted-foreground/50">A private space for our timeless memories</p>
          <div className="inline-flex items-center gap-2 text-[10px] tracking-wider text-muted-foreground/35 sm:text-xs">
            <Shield className="h-3 w-3" />
            <span>Designed & Developed with <span className="text-red-400">❤</span> by <span className="font-semibold text-muted-foreground/50">Rajnish</span></span>
          </div>
        </div>
      </footer>

      {/* Back to top */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: showScrollTop ? 1 : 0, scale: showScrollTop ? 1 : 0.8 }}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:shadow-xl active:scale-95 sm:bottom-8 sm:right-8"
        style={{ pointerEvents: showScrollTop ? "auto" : "none" }}
      >
        <ArrowUp className="h-5 w-5" />
      </motion.button>

      {/* Modals */}
      {showAdminLogin && <AdminLoginModal onClose={() => setShowAdminLogin(false)} />}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
      {lightboxIndex !== null && (
        <PhotoLightbox photos={filteredPhotos} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} visitorId={visitorId} />
      )}
    </div>
  );
}
