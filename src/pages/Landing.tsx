import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Camera, Upload, Check, Shield, Search, Heart, ArrowUp, Download, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import SplashScreen from "@/components/SplashScreen";
import AdminLoginModal from "@/components/AdminLoginModal";
import UploadModal from "@/components/UploadModal";
import PhotoLightbox from "@/components/PhotoLightbox";

/* ─── Visitor ID ─── */
function getVisitorId(): string {
  let id = localStorage.getItem("vault_visitor_id");
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("vault_visitor_id", id);
  }
  return id;
}

/* ─── Direct download ─── */
async function directDownload(url: string, fileName: string, onLoading?: () => void, onDone?: () => void) {
  onLoading?.();
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl; a.download = fileName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch { window.open(url, "_blank"); }
  onDone?.();
}

/* ─── Download all ─── */
async function downloadAllPhotos(photos: { url: string; fileName: string }[], onProgress: (c: number, t: number) => void, onDone: () => void) {
  for (let i = 0; i < photos.length; i++) {
    onProgress(i + 1, photos.length);
    try {
      const res = await fetch(photos[i].url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl; a.download = photos[i].fileName;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch { window.open(photos[i].url, "_blank"); }
    if (i < photos.length - 1) await new Promise((r) => setTimeout(r, 350));
  }
  onDone();
}

/* ─── Favorites ─── */
function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try { const s = localStorage.getItem("vault_favorites"); return s ? new Set(JSON.parse(s)) : new Set(); }
    catch { return new Set(); }
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

/* ─── Download Button ─── */
function DownloadButton({ url, fileName }: { url: string; fileName: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (state !== "idle") return;
    directDownload(url, fileName, () => setState("loading"), () => { setState("done"); setTimeout(() => setState("idle"), 2000); });
  };
  return (
    <button onClick={handleClick} className={`vault-download-btn ${state === "loading" ? "is-loading" : ""} ${state === "done" ? "is-done" : ""}`}>
      {state === "idle" && (<><svg className="vault-download-icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> Download</>)}
      {state === "loading" && (<><span className="download-spinner" /> Downloading…</>)}
      {state === "done" && (<><Check className="h-3.5 w-3.5" /> Downloaded</>)}
    </button>
  );
}

/* ─── Heart Button ─── */
function HeartButton({ photoId, visitorId }: { photoId: string; visitorId: string }) {
  const likes = useQuery(api.reactions.getLikes, { photoId: photoId as any, visitorId });
  const toggleLike = useMutation(api.reactions.toggleLike);
  const [optimistic, setOptimistic] = useState<{ liked: boolean; count: number } | null>(null);
  const display = optimistic ?? likes ?? { liked: false, count: 0 };
  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setOptimistic({ liked: !display.liked, count: display.liked ? display.count - 1 : display.count + 1 });
    try { const r = await toggleLike({ photoId: photoId as any, visitorId }); setOptimistic(r); }
    catch { setOptimistic(null); }
  };
  return (
    <button onClick={handleClick} className={`vault-heart-btn ${display.liked ? "liked" : ""}`}>
      <Heart className={`h-4 w-4 transition-all ${display.liked ? "fill-current scale-110" : ""}`} />
      {display.count > 0 && <span>{display.count}</span>}
    </button>
  );
}

/* ─── Gallery Card ─── */
function GalleryCard({ photo, index, onClick, visitorId, isFav, onToggleFav }: {
  photo: { _id: string; url: string; fileName: string };
  index: number; onClick: () => void; visitorId: string;
  isFav: boolean; onToggleFav: (id: string) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="vault-card" style={{ animationDelay: `${Math.min(index * 0.06, 0.4)}s` }}>
      <div className="vault-card-img-wrap" onClick={onClick}>
        <img src={photo.url} alt={photo.fileName} className={`vault-card-img ${loaded ? "loaded" : ""}`} loading="lazy" onLoad={() => setLoaded(true)} />
        <button onClick={(e) => { e.stopPropagation(); onToggleFav(photo._id); }} className={`vault-fav-btn ${isFav ? "active" : ""}`}>
          <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-current" : ""}`} />
        </button>
      </div>
      <div className="vault-card-actions">
        <div className="flex items-center gap-2">
          <div className="flex-1"><DownloadButton url={photo.url} fileName={photo.fileName} /></div>
          <HeartButton photoId={photo._id} visitorId={visitorId} />
        </div>
      </div>
    </div>
  );
}

/* ─── Admin Badge ─── */
function AdminBadge() {
  return (
    <span className="inline-flex items-center justify-center rounded-full border border-dashed border-current px-3 py-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground transition-all duration-300 group-hover:text-foreground group-hover:border-foreground/30 sm:text-xs">
      Admin
    </span>
  );
}

/* ─── Main ─── */
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
  const [dlAllState, setDlAllState] = useState<"idle" | "loading" | "done">("idle");
  const [dlAllProgress, setDlAllProgress] = useState({ current: 0, total: 0 });
  const [titleRevealed, setTitleRevealed] = useState(false);

  const approvedPhotos = useQuery(api.photos.listApproved);
  const photos = approvedPhotos ?? [];
  const { favorites, toggle: toggleFav } = useFavorites();

  useEffect(() => { if (galleryReady) { const t = setTimeout(() => setTitleRevealed(true), 300); return () => clearTimeout(t); } }, [galleryReady]);

  const filteredPhotos = useMemo(() => {
    if (!searchQuery.trim()) return photos;
    const q = searchQuery.toLowerCase();
    return photos.filter((p) => p.fileName.toLowerCase().includes(q));
  }, [photos, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      recordVisitor({ ip: visitorId, userAgent: navigator.userAgent, page: window.location.pathname, device: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : /Tablet|iPad/i.test(navigator.userAgent) ? "tablet" : "desktop" }).catch(() => {});
    }, 1000);
    return () => clearTimeout(timer);
  }, [visitorId, recordVisitor]);

  useEffect(() => {
    const h = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem("vault_splash_seen", "1");
    setShowSplash(false); setGalleryReady(true); setHeroVisible(true);
    setTimeout(() => setDividerExpanded(true), 400);
  }, []);

  const handleDownloadAll = async () => {
    if (dlAllState !== "idle" || photos.length === 0) return;
    setDlAllState("loading"); setDlAllProgress({ current: 0, total: photos.length });
    await downloadAllPhotos(
      photos.map((p) => ({ url: p.url, fileName: p.fileName })),
      (c, t) => setDlAllProgress({ current: c, total: t }),
      () => { setDlAllState("done"); setTimeout(() => setDlAllState("idle"), 3000); },
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      {/* ── Navigation ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${heroVisible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`}>
        <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-b border-border" />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/5 ring-1 ring-primary/10">
              <Camera className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col leading-none" style={{ fontFamily: "var(--font-handwritten)" }}>
              <span className="text-sm font-bold tracking-wide text-foreground sm:text-base">बड़ोलिया</span>
              <span className="text-[10px] font-bold tracking-wide text-muted-foreground sm:text-xs" style={{ marginLeft: "auto" }}>परिवार</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowUpload(true)} className="group inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.97] sm:px-4 sm:py-2.5 sm:text-sm">
              <Upload className="h-3.5 w-4 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Upload</span>
            </button>
            <button onClick={() => setShowAdminLogin(true)} className="group inline-flex items-center justify-center transition-all duration-200 active:scale-[0.97]">
              <AdminBadge />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[#0A0A0F]">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(99, 102, 241, 0.08) 0%, transparent 60%)" }} />
        <div className="hero-dot hero-dot-1" /><div className="hero-dot hero-dot-2" /><div className="hero-dot hero-dot-3" /><div className="hero-dot hero-dot-4" /><div className="hero-dot hero-dot-5" />
        <div className="relative mx-auto max-w-4xl px-6 py-12 text-center md:py-20">
          <motion.div initial={heroVisible ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-5 py-1.5 text-[10px] font-light tracking-[0.25em] text-white/35 uppercase backdrop-blur-sm sm:text-xs">
            Private Family Gallery
          </motion.div>
          <motion.h1 initial={heroVisible ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }} className="text-4xl font-bold leading-[1.1] text-white md:text-6xl" style={{ fontFamily: "var(--font-serif)", letterSpacing: "-0.03em" }}>
            Sweet Family&apos;s
            <span className="block mt-2 text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #818CF8, #C4B5FD, #6366F1)" }}>Photos</span>
          </motion.h1>
          <div className={`hero-divider my-6 ${dividerExpanded ? "expanded" : ""}`} />
          <motion.p initial={heroVisible ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.45 }} className="mx-auto max-w-md text-xs leading-relaxed text-white/35 font-light sm:text-sm">
            Browse, download, and share your family&apos;s beautiful moments — in full quality, without compression or clutter.
          </motion.p>
          <motion.div initial={heroVisible ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }} className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:mt-9 sm:flex-row sm:gap-3">
            <a href="#gallery" className="group inline-flex items-center gap-2.5 rounded-xl bg-white px-6 py-3 text-xs font-semibold text-[#0F172A] transition-all duration-200 hover:shadow-lg hover:shadow-white/10 active:scale-[0.97] sm:px-8 sm:py-3.5 sm:text-sm">
              <Camera className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" /> View Gallery
            </a>
            <button onClick={() => setShowUpload(true)} className="group inline-flex items-center gap-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-6 py-3 text-xs font-medium text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/[0.08] hover:border-white/[0.15] active:scale-[0.97] sm:px-8 sm:py-3.5 sm:text-sm">
              <Upload className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" /> Upload Photos
            </button>
          </motion.div>
        </div>
        <div className="absolute -bottom-1 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ── Gallery ── */}
      <section id="gallery" className="mx-auto max-w-7xl px-4 sm:px-6 pt-3 pb-16 md:pt-5 md:pb-24">
        <div className="mb-4 text-center md:mb-5">
          <h2 className="gallery-title" style={{ fontFamily: "var(--font-serif)" }}>
            {titleRevealed ? (
              <span className="brush-write"><span className="brush-text">Family Memories</span><span className="brush-underline" /></span>
            ) : <span style={{ opacity: 0 }}>Family Memories</span>}
          </h2>
          {photos.length > 0 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
              {photos.length} photo{photos.length !== 1 ? "s" : ""} in the collection
            </motion.p>
          )}
        </div>

        {/* Download All + Search */}
        <div className="mb-5 mx-auto max-w-2xl flex flex-col sm:flex-row items-center gap-3">
          {photos.length > 1 && (
            <motion.button initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} onClick={handleDownloadAll}
              className={`download-all-btn ${dlAllState === "loading" ? "is-loading" : ""} ${dlAllState === "done" ? "is-done" : ""}`}>
              {dlAllState === "idle" && (<><Download className="h-4 w-4" /> Download All ({photos.length})</>)}
              {dlAllState === "loading" && (<><Loader2 className="h-4 w-4 animate-spin" /> {dlAllProgress.current}/{dlAllProgress.total}…</>)}
              {dlAllState === "done" && (<><Check className="h-4 w-4" /> Done!</>)}
              {dlAllState === "loading" && <div className="download-all-progress" style={{ width: `${(dlAllProgress.current / dlAllProgress.total) * 100}%` }} />}
            </motion.button>
          )}
          {photos.length > 3 && (
            <div className="flex-1 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                <input type="text" placeholder="Search photos…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm outline-none transition-all duration-200 focus:border-ring/30 focus:ring-2 focus:ring-ring/10 placeholder:text-muted-foreground/30" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {filteredPhotos.length > 0 ? (
          <div className="gallery-grid">
            {filteredPhotos.map((photo, index) => (
              <GalleryCard key={photo._id} photo={photo} index={index} onClick={() => setLightboxIndex(index)} visitorId={visitorId} isFav={favorites.has(photo._id)} onToggleFav={toggleFav} />
            ))}
          </div>
        ) : searchQuery ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-sm rounded-2xl border border-border bg-card py-16 text-center shadow-sm">
            <Search className="mx-auto h-10 w-10 text-muted-foreground/20" />
            <p className="mt-4 text-sm font-medium text-muted-foreground">No results for &ldquo;{searchQuery}&rdquo;</p>
            <button onClick={() => setSearchQuery("")} className="mt-3 text-sm text-ring hover:underline transition-colors">Clear</button>
          </motion.div>
        ) : galleryReady ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mx-auto max-w-sm rounded-2xl border border-border bg-card py-20 text-center shadow-sm">
            <Camera className="mx-auto h-10 w-10 text-muted-foreground/20" />
            <p className="mt-4 text-sm font-medium text-muted-foreground">No photos yet</p>
            <p className="mt-1 text-xs text-muted-foreground/50">Upload the first one to get started</p>
          </motion.div>
        ) : null}

        {/* Favorites */}
        {favorites.size > 0 && !searchQuery && (
          <div className="mt-12">
            <div className="mb-4 flex items-center gap-2">
              <Heart className="h-4 w-4 text-[#EF4444] fill-[#EF4444]" />
              <h3 className="text-sm font-semibold text-foreground">Your Favorites ({favorites.size})</h3>
            </div>
            <div className="gallery-grid">
              {photos.filter((p) => favorites.has(p._id)).map((photo, index) => (
                <GalleryCard key={photo._id} photo={photo} index={index} onClick={() => { const ri = photos.findIndex((p) => p._id === photo._id); setLightboxIndex(ri); }} visitorId={visitorId} isFav={true} onToggleFav={toggleFav} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-10 text-center sm:py-14">
        <div className="space-y-2">
          <p className="font-serif text-sm italic text-muted-foreground/40">A private space for our timeless memories</p>
          <div className="inline-flex items-center gap-2 text-[10px] tracking-wider text-muted-foreground/30 sm:text-xs">
            <Shield className="h-3 w-3" />
            <span>Designed & Developed with <span className="text-[#EF4444]">❤</span> by <span className="font-semibold text-muted-foreground/50">Rajnish</span></span>
          </div>
        </div>
      </footer>

      {/* Back to top */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: showScrollTop ? 1 : 0, scale: showScrollTop ? 1 : 0.8 }}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95 sm:bottom-8 sm:right-8"
        style={{ pointerEvents: showScrollTop ? "auto" : "none" }}
      >
        <ArrowUp className="h-5 w-5" />
      </motion.button>

      {/* Modals */}
      {showAdminLogin && <AdminLoginModal onClose={() => setShowAdminLogin(false)} />}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
      {lightboxIndex !== null && <PhotoLightbox photos={filteredPhotos} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} visitorId={visitorId} />}
    </div>
  );
}
