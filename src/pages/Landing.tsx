import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, Upload, Shield, ChevronDown } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import SplashScreen from "@/components/SplashScreen";
import AdminLoginModal from "@/components/AdminLoginModal";
import UploadModal from "@/components/UploadModal";
import PhotoLightbox from "@/components/PhotoLightbox";

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
            const a = document.createElement("a");
            a.href = photo.url;
            a.download = photo.fileName;
            a.click();
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
      {/* Splash — self-managed fade, no AnimatePresence */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      {/* Navigation — always visible after splash */}
      <nav
        className={`sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl transition-all duration-700 ${
          heroVisible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Camera className="h-5 w-5 text-primary" />
            </div>
            <span
              className="text-lg font-bold tracking-tight text-foreground"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Family Photo Vault
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.97]"
            >
              <Upload className="h-4 w-4" />
              Upload
            </button>
            <button
              onClick={() => setShowAdminLogin(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-accent/10 hover:text-foreground"
            >
              <Shield className="h-4 w-4" />
              Admin
            </button>
          </div>
        </div>
      </nav>

      {/* Hero — dark, cinematic, premium */}
      <section className="relative overflow-hidden bg-[#050505]">
        {/* Ambient glow */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 40%, rgba(212,175,55,0.06) 0%, transparent 55%)",
          }}
        />

        {/* Floating gold dots */}
        <div className="hero-dot hero-dot-1" />
        <div className="hero-dot hero-dot-2" />
        <div className="hero-dot hero-dot-3" />
        <div className="hero-dot hero-dot-4" />
        <div className="hero-dot hero-dot-5" />

        <div className="relative mx-auto max-w-5xl px-6 py-28 text-center md:py-36">
          {/* Badge */}
          <motion.div
            initial={heroVisible ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-1.5 text-xs font-light tracking-widest text-white/40 uppercase backdrop-blur-sm"
          >
            Private Family Gallery
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={heroVisible ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl font-semibold leading-tight text-white md:text-7xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Family Photo
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
              Vault
            </span>
          </motion.h1>

          {/* Divider line */}
          <div className={`hero-divider my-7 ${dividerExpanded ? "expanded" : ""}`} />

          {/* Subtitle */}
          <motion.p
            initial={heroVisible ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-xl text-base leading-relaxed text-white/45 font-light"
          >
            Your family&apos;s memories, preserved in full quality. Browse,
            download, and share without compression or clutter.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={heroVisible ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <a
              href="#gallery"
              className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-7 py-3 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/20 active:scale-[0.97]"
            >
              <Camera className="h-4 w-4 transition-transform group-hover:scale-110" />
              View Gallery
            </a>
            <button
              onClick={() => setShowUpload(true)}
              className="group inline-flex items-center gap-2 rounded-xl bg-white/10 px-7 py-3 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/15 active:scale-[0.97]"
            >
              <Upload className="h-4 w-4 transition-transform group-hover:scale-110 group-hover:-translate-y-0.5" />
              Upload Photos
            </button>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={heroVisible ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="mt-16"
          >
            <a href="#gallery" className="inline-flex flex-col items-center text-white/20 transition-colors hover:text-white/40">
              <span className="mb-2 text-[10px] tracking-[3px] uppercase">Scroll</span>
              <ChevronDown className="h-5 w-5 scroll-indicator" />
            </a>
          </motion.div>
        </div>

        {/* Bottom fade */}
        <div className="absolute -bottom-1 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="mb-14 text-center">
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
              className="mt-3 text-sm text-muted-foreground"
            >
              {photos.length} photo{photos.length !== 1 ? "s" : ""} in the vault
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

      {/* Footer */}
      <footer className="border-t border-border/40 py-12 text-center">
        <p
          className="text-xs tracking-widest text-muted-foreground/40 uppercase"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Family Photo Vault &mdash; Preserving memories, together
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
