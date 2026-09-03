import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ChevronLeft, ChevronRight, Check, Heart, MessageCircle, Share2, Play, Pause, Info, Send } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

interface Photo {
  _id: string;
  url: string;
  fileName: string;
  uploadedBy?: string;
  uploadedAt?: number;
  status?: string;
}

interface PhotoLightboxProps {
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
  visitorId?: string;
}

export default function PhotoLightbox({ photos, initialIndex, onClose, visitorId = "anonymous" }: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [slideshow, setSlideshow] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentAuthor, setCommentAuthor] = useState(() => localStorage.getItem("vault_comment_name") || "");
  const touchStartX = useRef(0);
  const slideshowRef = useRef<NodeJS.Timeout | null>(null);

  const currentPhoto = photos[currentIndex];
  const photoId = currentPhoto?._id;

  // Reactions
  const likes = useQuery(api.reactions.getLikes, photoId ? { photoId: photoId as any, visitorId } : "skip");
  const comments = useQuery(api.reactions.getComments, photoId ? { photoId: photoId as any } : "skip");
  const toggleLike = useMutation(api.reactions.toggleLike);
  const addComment = useMutation(api.reactions.addComment);
  const recordView = useMutation(api.traffic.recordPhotoView);

  const [optimisticLike, setOptimisticLike] = useState<{ liked: boolean; count: number } | null>(null);
  const likeDisplay = optimisticLike ?? likes ?? { liked: false, count: 0 };

  // Record view
  useEffect(() => {
    if (photoId) {
      recordView({ photoId: photoId as any, action: "view", ip: visitorId }).catch(() => {});
    }
  }, [photoId, visitorId, recordView]);

  // Save author name
  useEffect(() => {
    if (commentAuthor) localStorage.setItem("vault_comment_name", commentAuthor);
  }, [commentAuthor]);

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % photos.length);
    setOptimisticLike(null);
    setShowComments(false);
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
    setOptimisticLike(null);
    setShowComments(false);
  }, [photos.length]);

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === " ") { e.preventDefault(); setSlideshow((s) => !s); }
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handleKey); document.body.style.overflow = ""; };
  }, [onClose, goNext, goPrev]);

  // Slideshow
  useEffect(() => {
    if (slideshow) {
      slideshowRef.current = setInterval(goNext, 3000);
    } else if (slideshowRef.current) {
      clearInterval(slideshowRef.current);
    }
    return () => { if (slideshowRef.current) clearInterval(slideshowRef.current); };
  }, [slideshow, goNext]);

  // Touch
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { if (diff > 0) goNext(); else goPrev(); }
  };

  // Download
  const [dlState, setDlState] = useState<"idle" | "loading" | "done">("idle");
  const handleDownload = async () => {
    if (!currentPhoto || dlState !== "idle") return;
    setDlState("loading");
    try {
      const res = await fetch(currentPhoto.url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = blobUrl; a.download = currentPhoto.fileName;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl);
      recordView({ photoId: currentPhoto._id as any, action: "download", ip: visitorId }).catch(() => {});
    } catch { window.open(currentPhoto.url, "_blank"); }
    setDlState("done"); setTimeout(() => setDlState("idle"), 2000);
  };

  // Like
  const handleLike = async () => {
    setOptimisticLike({ liked: !likeDisplay.liked, count: likeDisplay.liked ? likeDisplay.count - 1 : likeDisplay.count + 1 });
    try {
      const result = await toggleLike({ photoId: currentPhoto._id as any, visitorId });
      setOptimisticLike(result);
    } catch { setOptimisticLike(null); }
  };

  // Comment
  const handleComment = async () => {
    if (!commentText.trim() || !commentAuthor.trim()) return;
    try {
      await addComment({ photoId: currentPhoto._id as any, author: commentAuthor.trim(), text: commentText.trim() });
      setCommentText("");
    } catch {}
  };

  // Share
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: currentPhoto.fileName, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  if (!currentPhoto) return null;

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0, scale: 0.97 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0, scale: 0.97 }),
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/92 backdrop-blur-md" onClick={onClose} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Close */}
      <button onClick={onClose} className="absolute right-4 top-4 z-20 rounded-full bg-white/10 p-2.5 text-white/70 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white sm:right-5 sm:top-5"><X className="h-5 w-5" /></button>

      {/* Counter */}
      <div className="absolute left-4 top-4 z-20 rounded-full bg-white/10 px-4 py-1.5 text-sm font-light text-white/70 backdrop-blur-sm sm:left-5 sm:top-5">{currentIndex + 1} / {photos.length}</div>

      {/* Right actions */}
      <div className="absolute right-4 top-16 z-20 flex flex-col gap-2 sm:right-5 sm:top-16">
        {/* Download */}
        <button onClick={(e) => { e.stopPropagation(); handleDownload(); }} className={`rounded-full p-2.5 backdrop-blur-sm transition-all ${dlState === "done" ? "bg-green-500/80 text-white" : dlState === "loading" ? "bg-white/15 text-white/80" : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"}`} title="Download">
          {dlState === "loading" ? <span className="download-spinner" /> : dlState === "done" ? <Check className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        </button>
        {/* Heart */}
        <button onClick={(e) => { e.stopPropagation(); handleLike(); }} className={`rounded-full p-2.5 backdrop-blur-sm transition-all ${likeDisplay.liked ? "bg-red-500/80 text-white" : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"}`} title="Like">
          <Heart className={`h-5 w-5 ${likeDisplay.liked ? "fill-current" : ""}`} />
          {likeDisplay.count > 0 && <span className="absolute -bottom-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{likeDisplay.count}</span>}
        </button>
        {/* Comments */}
        <button onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); setShowInfo(false); }} className={`rounded-full p-2.5 backdrop-blur-sm transition-all ${showComments ? "bg-primary/80 text-white" : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"}`} title="Comments">
          <MessageCircle className="h-5 w-5" />
        </button>
        {/* Share */}
        <button onClick={(e) => { e.stopPropagation(); handleShare(); }} className="rounded-full bg-white/10 p-2.5 text-white/70 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white" title="Share">
          <Share2 className="h-5 w-5" />
        </button>
        {/* Info */}
        <button onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); setShowComments(false); }} className={`rounded-full p-2.5 backdrop-blur-sm transition-all ${showInfo ? "bg-primary/80 text-white" : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"}`} title="Info">
          <Info className="h-5 w-5" />
        </button>
        {/* Slideshow */}
        <button onClick={(e) => { e.stopPropagation(); setSlideshow(!slideshow); }} className={`rounded-full p-2.5 backdrop-blur-sm transition-all ${slideshow ? "bg-primary/80 text-white" : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"}`} title={slideshow ? "Pause slideshow" : "Start slideshow"}>
          {slideshow ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
      </div>

      {/* Progress dots */}
      {photos.length <= 20 && (
        <div className="absolute bottom-16 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
          {photos.map((_, i) => (
            <button key={i} onClick={(e) => { e.stopPropagation(); setDirection(i > currentIndex ? 1 : -1); setCurrentIndex(i); setOptimisticLike(null); }} className={`rounded-full transition-all duration-300 ${i === currentIndex ? "h-2 w-2 bg-white" : "h-1.5 w-1.5 bg-white/25 hover:bg-white/40"}`} />
          ))}
        </div>
      )}

      {/* Nav arrows */}
      {photos.length > 1 && (<>
        <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="absolute left-3 z-20 rounded-full bg-white/10 p-3 text-white/70 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white sm:left-4"><ChevronLeft className="h-6 w-6" /></button>
        <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="absolute right-3 z-20 rounded-full bg-white/10 p-3 text-white/70 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white sm:right-4"><ChevronRight className="h-6 w-6" /></button>
      </>)}

      {/* Image */}
      <div className="flex max-h-[85vh] max-w-[85vw] items-center justify-center sm:max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.img key={currentPhoto._id} custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }} src={currentPhoto.url} alt={currentPhoto.fileName} className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-2xl sm:max-w-[90vw]" draggable={false} />
        </AnimatePresence>
      </div>

      {/* File name */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-5 py-1.5 text-xs font-light tracking-wide text-white/50 backdrop-blur-sm">{currentPhoto.fileName}</div>

      {/* Info Panel */}
      <AnimatePresence>
        {showInfo && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onClick={(e) => e.stopPropagation()} className="absolute right-4 top-28 z-30 w-64 rounded-2xl border border-white/10 bg-black/80 p-4 backdrop-blur-xl sm:right-5">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">Photo Details</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-white/40">Name</span><span className="text-white/80 truncate ml-2 max-w-[140px]">{currentPhoto.fileName}</span></div>
              {currentPhoto.uploadedBy && <div className="flex justify-between"><span className="text-white/40">Uploaded by</span><span className="text-white/80">{currentPhoto.uploadedBy}</span></div>}
              {currentPhoto.uploadedAt && <div className="flex justify-between"><span className="text-white/40">Date</span><span className="text-white/80">{new Date(currentPhoto.uploadedAt).toLocaleDateString()}</span></div>}
              <div className="flex justify-between"><span className="text-white/40">Likes</span><span className="text-white/80">{likeDisplay.count}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Comments</span><span className="text-white/80">{comments?.length ?? 0}</span></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments Panel */}
      <AnimatePresence>
        {showComments && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onClick={(e) => e.stopPropagation()} className="absolute right-4 top-28 z-30 flex w-72 flex-col rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl sm:right-5 sm:h-[70vh] max-h-[60vh]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">Comments ({comments?.length ?? 0})</h4>
              <button onClick={() => setShowComments(false)} className="text-white/40 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            {/* Comment list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.15) transparent" }}>
              {comments && comments.length > 0 ? comments.map((c: any) => (
                <div key={c._id} className="rounded-xl bg-white/5 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/30 text-[8px] font-bold text-white">{c.author?.[0]?.toUpperCase() ?? "?"}</div>
                    <span className="text-[10px] font-semibold text-white/70">{c.author}</span>
                    <span className="ml-auto text-[9px] text-white/30">{new Date(c.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/60">{c.text}</p>
                </div>
              )) : (
                <p className="py-8 text-center text-xs text-white/30">No comments yet. Be the first!</p>
              )}
            </div>
            {/* Comment input */}
            <div className="border-t border-white/10 p-3 space-y-2">
              {!commentAuthor && (
                <input type="text" placeholder="Your name" value={commentAuthor} onChange={(e) => setCommentAuthor(e.target.value)} className="w-full rounded-lg bg-white/10 px-3 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:bg-white/15" />
              )}
              <div className="flex gap-2">
                <input type="text" placeholder="Write a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleComment()} className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:bg-white/15" />
                <button onClick={handleComment} disabled={!commentText.trim() || !commentAuthor.trim()} className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-30"><Send className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
