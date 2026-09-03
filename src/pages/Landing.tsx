import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, Upload, ChevronDown } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import SplashScreen from "@/components/SplashScreen";
import AdminLoginModal from "@/components/AdminLoginModal";
import UploadModal from "@/components/UploadModal";
import PhotoLightbox from "@/components/PhotoLightbox";

/* ─── Direct download helper (works with cross-origin URLs) ─── */
async function directDownload(url: string, fileName: string) {
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
    // Fallback: open in new tab
    window.open(url, "_blank");
  }
}

/* ─── Typewriter hook ─── */
function useTypewriter(text: string, speed = 55, enabled = false) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        setDone(true);
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, enabled]);

  return { displayed, done };
}

/* ─── Gallery card with shimmer + scroll reveal ─── */
function GalleryCard({
  photo,
  index,
  onClick,
}: {
  photo: { _id: string; url: string; fileName: string };
  index: number;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), (index % 4) * 100);
          observer.unobserve(el);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  return (
    <div ref={ref} className={`vault-card ${visible ? "is-visible" : ""}`}>
      <div className="vault-card-img-wrap" onClick={onClick}>
        <img
          src={photo.url}
          alt={photo.fileName}
          className={`vault-card-img ${loaded ? "loaded" : ""}`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
      </div>
      <div className="vault-card-actions">
        <button
          onClick={(e) => {
            e.stopPropagation();
            directDownload(photo.url, photo.fileName);
          }}
          className="vault-download-btn"
        >
          <svg className="vault-download-icon" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </button>
      </div>
    </div>
  );
}

/* ─── Dotted Admin Circle ─── */
function AdminBadge() {
  return (
    <span className="inline-flex items-center justify-center rounded-full border border-dashed border-current px-3 py-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground transition-colors group-hover:text-foreground sm:text-xs">
      Admin
    </span>
  );
}

/* ─── Main Landing ─── */
export default function Landing() {
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem("vault_splash_seen");
  });
  const [galleryReady, setGalleryReady] = useState(!showSplash);
  const [heroVisible, setHeroVisible] = useState(!showSplash);
  const [dividerExpanded, setDividerExpanded] = useState(!showSplash);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const approvedPhotos = useQuery(api.photos.listApproved);
  const photos = approvedPhotos ?? [];

  const { displayed: galleryTitle, done: titleDone } = useTypewriter(
    "Family Memories",
    55,
    galleryReady,
  );

  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem("vault_splash_seen", "1");
    setShowSplash(false);
    setGalleryReady(true);
    setHeroVisible(true);
    setTimeout(() => setDividerExpanded(true), 400);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Splash */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
          heroVisible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
        }`}
      >
        <div className="absolute inset-0 bg-background/70 backdrop-blur-2xl border-b border-white/[0.06]" />

        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3">
          {/* Logo — Hindi handwritten branding */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
              <Camera className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col leading-none" style={{ fontFamily: "var(--font-handwritten)" }}>
              <span className="text-sm font-bold tracking-wide text-foreground sm:text-base">बड़ोलिया</span>
              <span className="text-[10px] font-bold tracking-wide text-foreground/70 sm:text-xs" style={{ marginLeft: "auto" }}>परिवार</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUpload(true)}
              className="group inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.97] sm:px-4 sm:py-2.5 sm:text-sm"
            >
              <Upload className="h-3.5 w-4 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Upload</span>
            </button>
            <button
              onClick={() => setShowAdminLogin(true)}
              className="group inline-flex items-center justify-center backdrop-blur-sm transition-all active:scale-[0.97]"
            >
              <AdminBadge />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#050505]">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 40%, rgba(212,175,55,0.06) 0%, transparent 55%)",
          }}
        />

        <div className="hero-dot hero-dot-1" />
        <div className="hero-dot hero-dot-2" />
        <div className="hero-dot hero-dot-3" />
        <div className="hero-dot hero-dot-4" />
        <div className="hero-dot hero-dot-5" />

        <div className="relative mx-auto max-w-5xl px-6 py-24 text-center md:py-32">
          {/* Badge */}
          <motion.div
            initial={heroVisible ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[10px] font-light tracking-widest text-white/35 uppercase backdrop-blur-sm sm:text-xs"
          >
            Private Family Gallery
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={heroVisible ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl font-semibold leading-tight text-white md:text-6xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Sweet Family&apos;s
            <span
              className="block mt-1"
              style={{
                background:
                  "linear-gradient(135deg, #bf953f 0%, #fcf6ba 30%, #b38728 50%, #fbf5b7 70%, #aa771c 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Photos
            </span>
          </motion.h1>

          {/* Divider */}
          <div className={`hero-divider my-5 ${dividerExpanded ? "expanded" : ""}`} />

          {/* Subtitle */}
          <motion.p
            initial={heroVisible ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-lg text-sm leading-relaxed text-white/40 font-light sm:text-base"
          >
            Browse, download, and share your family&apos;s beautiful moments — in full quality, without compression or clutter.
          </motion.p>

          {/* CTAs — reduced gap */}
          <motion.div
            initial={heroVisible ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:mt-8 sm:flex-row sm:gap-3"
          >
            <a
              href="#gallery"
              className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/20 active:scale-[0.97] sm:px-7 sm:py-3 sm:text-sm"
            >
              <Camera className="h-4 w-4 transition-transform group-hover:scale-110" />
              View Gallery
            </a>
            <button
              onClick={() => setShowUpload(true)}
              className="group inline-flex items-center gap-2 rounded-xl bg-white/10 px-6 py-2.5 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-white/15 active:scale-[0.97] sm:px-7 sm:py-3 sm:text-sm"
            >
              <Upload className="h-4 w-4 transition-transform group-hover:scale-110 group-hover:-translate-y-0.5" />
              Upload Photos
            </button>
          </motion.div>

          {/* Scroll — smaller, less margin */}
          <motion.div
            initial={heroVisible ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="mt-8 sm:mt-10"
          >
            <a href="#gallery" className="inline-flex flex-col items-center text-white/20 transition-colors hover:text-white/40">
              <span className="mb-1 text-[7px] tracking-[2px] uppercase sm:mb-1.5 sm:text-[9px] sm:tracking-[3px]">Scroll</span>
              <ChevronDown className="h-3.5 w-3.5 scroll-indicator sm:h-4 sm:w-4" />
            </a>
          </motion.div>
        </div>

        <div className="absolute -bottom-1 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Gallery — shifted up */}
      <section id="gallery" className="mx-auto max-w-7xl px-6 pt-8 pb-16 md:pt-12 md:pb-24">
        <div className="mb-12 text-center md:mb-14">
          <h2
            className="gallery-title"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {galleryTitle}
            {!titleDone && <span className="gallery-title-cursor" />}
          </h2>
          {photos.length > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.6 }}
              className="mt-2 text-xs text-muted-foreground sm:text-sm"
            >
              {photos.length} photo{photos.length !== 1 ? "s" : ""} in the collection
            </motion.p>
          )}
        </div>

        {photos.length > 0 ? (
          <div className="gallery-grid">
            {photos.map((photo, index) => (
              <GalleryCard
                key={photo._id}
                photo={photo}
                index={index}
                onClick={() => setLightboxIndex(index)}
              />
            ))}
          </div>
        ) : galleryReady ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-md rounded-3xl border border-border/40 bg-card py-20 text-center"
          >
            <Camera className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-4 text-base font-medium text-muted-foreground">
              No photos yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground/60">
              Upload the first one to get started
            </p>
          </motion.div>
        ) : null}
      </section>

      {/* Footer — developer credit */}
      <footer className="border-t border-border/40 py-10 text-center sm:py-12">
        <p className="text-[10px] tracking-wider text-muted-foreground/40 sm:text-xs">
          Designed &amp; Developed with <span className="text-red-400">&#10084;&#65039;</span> by{" "}
          <span className="font-semibold text-muted-foreground/60">Rajnish</span>
        </p>
      </footer>

      {/* Modals */}
      {showAdminLogin && (
        <AdminLoginModal onClose={() => setShowAdminLogin(false)} />
      )}
      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} />
      )}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
