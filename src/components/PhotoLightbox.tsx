import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ChevronLeft, ChevronRight } from "lucide-react";

interface Photo {
  _id: string;
  url: string;
  fileName: string;
}

interface PhotoLightboxProps {
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
}

export default function PhotoLightbox({
  photos,
  initialIndex,
  onClose,
}: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);
  const touchStartX = useRef(0);

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, goNext, goPrev]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  const handleDownload = async () => {
    const photo = photos[currentIndex];
    if (!photo) return;
    try {
      const res = await fetch(photo.url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = photo.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(photo.url, "_blank");
    }
  };

  const currentPhoto = photos[currentIndex];
  if (!currentPhoto) return null;

  const variants = {
    enter: (d: number) => ({
      x: d > 0 ? 60 : -60,
      opacity: 0,
      scale: 0.97,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (d: number) => ({
      x: d > 0 ? -60 : 60,
      opacity: 0,
      scale: 0.97,
    }),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/92 backdrop-blur-md"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute right-5 top-5 z-10 rounded-full bg-white/8 p-2.5 text-white/70 backdrop-blur-sm transition-all hover:bg-white/15 hover:text-white"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Download */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDownload();
        }}
        className="absolute right-5 top-16 z-10 rounded-full bg-white/8 p-2.5 text-white/70 backdrop-blur-sm transition-all hover:bg-white/15 hover:text-white"
        title="Download original"
      >
        <Download className="h-5 w-5" />
      </button>

      {/* Photo counter */}
      <div className="absolute left-5 top-5 z-10 rounded-full bg-white/8 px-4 py-1.5 text-sm font-light text-white/70 backdrop-blur-sm">
        {currentIndex + 1} / {photos.length}
      </div>

      {/* Progress dots — show when <= 20 photos */}
      {photos.length <= 20 && (
        <div className="absolute bottom-16 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setDirection(i > currentIndex ? 1 : -1);
                setCurrentIndex(i);
              }}
              className={`rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? "h-2 w-2 bg-white"
                  : "h-1.5 w-1.5 bg-white/25 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
      )}

      {/* Prev */}
      {photos.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="absolute left-4 z-10 rounded-full bg-white/8 p-3 text-white/70 backdrop-blur-sm transition-all hover:bg-white/15 hover:text-white"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Next */}
      {photos.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="absolute right-4 z-10 rounded-full bg-white/8 p-3 text-white/70 backdrop-blur-sm transition-all hover:bg-white/15 hover:text-white"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Image with slide transition */}
      <div
        className="flex max-h-[85vh] max-w-[90vw] items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.img
            key={currentPhoto._id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            src={currentPhoto.url}
            alt={currentPhoto.fileName}
            className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            draggable={false}
          />
        </AnimatePresence>
      </div>

      {/* File name */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/8 px-5 py-1.5 text-xs font-light tracking-wide text-white/50 backdrop-blur-sm">
        {currentPhoto.fileName}
      </div>
    </motion.div>
  );
}
