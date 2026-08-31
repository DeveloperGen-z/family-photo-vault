import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Shield, Download, Heart, X } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import AdminLoginModal from "@/components/AdminLoginModal";
import UploadModal from "@/components/UploadModal";
import PhotoLightbox from "@/components/PhotoLightbox";

export default function Landing() {
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const approvedPhotos = useQuery(api.photos.listApproved);

  const photos = approvedPhotos ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Camera className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Family Photos
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

      {/* Hero Section */}
      <section className="hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(1_0.02_65/0.4),transparent_70%)]" />
        <div className="relative mx-auto max-w-5xl px-6 py-20 text-center md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/60 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-sm">
              <Heart className="h-4 w-4 fill-current" />
              Sharing memories, not just photos
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight text-foreground md:text-7xl">
              Our Family
              <span className="block text-primary">Photo Album</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Share your precious moments in full quality — no compression, no
              clutter. Browse, download, and relive every memory together.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="#gallery"
                className="inline-flex items-center gap-2 rounded-xl bg-foreground px-7 py-3 text-sm font-semibold text-background shadow-lg transition-all hover:shadow-xl hover:translate-y-[-1px] active:scale-[0.97]"
              >
                <Camera className="h-4 w-4" />
                View Gallery
              </a>
              <button
                onClick={() => setShowUpload(true)}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-foreground/20 bg-white/60 px-7 py-3 text-sm font-semibold text-foreground backdrop-blur-sm transition-all hover:border-foreground/40 hover:bg-white/80 active:scale-[0.97]"
              >
                <Upload className="h-4 w-4" />
                Share Your Photos
              </button>
            </div>
          </motion.div>
        </div>
        {/* Decorative elements */}
        <div className="absolute -bottom-1 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Photo Gallery
          </h2>
          <p className="mt-2 text-muted-foreground">
            {photos.length > 0
              ? `${photos.length} beautiful moment${photos.length !== 1 ? "s" : ""} captured`
              : "No photos yet — be the first to share!"}
          </p>
        </div>

        {photos.length > 0 ? (
          <div className="masonry-grid">
            {photos.map((photo, index) => (
              <motion.div
                key={photo._id}
                className="masonry-item"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <div
                  className="photo-frame group relative cursor-pointer overflow-hidden rounded-2xl border border-border/40 bg-card"
                  onClick={() => setLightboxIndex(index)}
                >
                  <img
                    src={photo.url}
                    alt={photo.fileName}
                    className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <span className="truncate text-sm font-medium text-white">
                      {photo.fileName}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const link = document.createElement("a");
                          link.href = photo.url;
                          link.download = photo.fileName;
                          link.click();
                        }}
                        className="rounded-lg bg-white/20 p-2 backdrop-blur-sm transition-colors hover:bg-white/30"
                        title="Download original"
                      >
                        <Download className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-3xl border-2 border-dashed border-border/60 bg-card/50 py-20 text-center"
          >
            <Camera className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">
              No photos yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Click "Upload" to share the first photo
            </p>
          </motion.div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-card/30 py-8 text-center">
        <p className="text-sm text-muted-foreground/70">
          Family Photos — Cherishing every moment together
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
