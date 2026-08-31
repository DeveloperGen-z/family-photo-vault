import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Shield, Download } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import SplashScreen from "@/components/SplashScreen";
import AdminLoginModal from "@/components/AdminLoginModal";
import UploadModal from "@/components/UploadModal";
import PhotoLightbox from "@/components/PhotoLightbox";

function useTypewriter(text: string, speed = 50, startDelay = 0) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;

    const startTimeout = setTimeout(() => {
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
    }, startDelay);

    timer = startTimeout;
    return () => clearTimeout(timer);
  }, [text, speed, startDelay]);

  return { displayed, done };
}

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
          setTimeout(() => setVisible(true), (index % 4) * 80);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -20px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  return (
    <div
      ref={ref}
      className={`vault-card ${visible ? "is-visible" : ""}`}
    >
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
            const link = document.createElement("a");
            link.href = photo.url;
            link.download = photo.fileName;
            link.click();
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

export default function Landing() {
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem("vault_splash_seen");
  });
  const [galleryReady, setGalleryReady] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const approvedPhotos = useQuery(api.photos.listApproved);
  const photos = approvedPhotos ?? [];

  const { displayed: galleryTitle, done: titleDone } = useTypewriter(
    "Family Memories",
    50,
    galleryReady ? 200 : 99999,
  );

  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem("vault_splash_seen", "1");
    setShowSplash(false);
    setTimeout(() => setGalleryReady(true), 100);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Splash Screen */}
      <AnimatePresence>
        {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
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

      {/* Hero Section — minimal, dark, elegant */}
      <section className="relative overflow-hidden bg-[#050505]">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 40%, rgba(212,175,55,0.06) 0%, transparent 60%)",
            }}
          />
        </div>
        <div className="relative mx-auto max-w-5xl px-6 py-24 text-center md:py-32">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-light tracking-widest text-white/50 uppercase">
            Private Family Gallery
          </div>
          <h1
            className="text-5xl font-semibold leading-tight text-white md:text-7xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Family Photo
            <span
              className="block mt-1"
              style={{
                background:
                  "linear-gradient(to right, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Vault
            </span>
          </h1>
          <div className="mx-auto my-6 h-px w-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <p className="mx-auto max-w-xl text-base leading-relaxed text-white/50 font-light">
            Your family&apos;s memories, preserved in full quality. Browse,
            download, and share without compression or clutter.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="#gallery"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-7 py-3 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/20 active:scale-[0.97]"
            >
              <Camera className="h-4 w-4" />
              View Gallery
            </a>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-7 py-3 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/15 active:scale-[0.97]"
            >
              <Upload className="h-4 w-4" />
              Upload Photos
            </button>
          </div>
        </div>
        <div className="absolute -bottom-1 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="mb-12 text-center">
          <h2
            className="gallery-title"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {galleryTitle}
            {!titleDone && <span className="gallery-title-cursor" />}
          </h2>
          {photos.length > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              {photos.length} photo{photos.length !== 1 ? "s" : ""} in the
              vault
            </p>
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
          <div className="mx-auto max-w-md rounded-3xl border border-border/40 bg-card py-20 text-center">
            <Camera className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-4 text-base font-medium text-muted-foreground">
              No photos yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground/60">
              Upload the first one to get started
            </p>
          </div>
        ) : null}
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-10 text-center">
        <p
          className="text-xs tracking-widest text-muted-foreground/50 uppercase"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Family Photo Vault &mdash; Preserving memories, together
        </p>
      </footer>

      {/* Modals */}
      <AnimatePresence>
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
      </AnimatePresence>
    </div>
  );
}
