import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ChevronLeft, ChevronRight, Check, Heart, MessageCircle, Share2, Play, Pause, Info, Send } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

interface Photo { _id: string; url: string; fileName: string; uploadedBy?: string; uploadedAt?: number; status?: string; }
interface PhotoLightboxProps { photos: Photo[]; initialIndex: number; onClose: () => void; visitorId?: string; }

export default function PhotoLightbox({ photos, initialIndex, onClose, visitorId = "anonymous" }: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [slideshow, setSlideshow] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentAuthor, setCommentAuthor] = useState(() => localStorage.getItem("vault_comment_name") || "");
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const slideshowRef = useRef<NodeJS.Timeout | null>(null);

  const currentPhoto = photos[currentIndex];
  const photoId = currentPhoto?._id;

  const likes = useQuery(api.reactions.getLikes, photoId ? { photoId: photoId as any, visitorId } : "skip");
  const comments = useQuery(api.reactions.getComments, photoId ? { photoId: photoId as any } : "skip");
  const toggleLike = useMutation(api.reactions.toggleLike);
  const addComment = useMutation(api.reactions.addComment);
  const recordView = useMutation(api.traffic.recordPhotoView);

  const [optimisticLike, setOptimisticLike] = useState<{ liked: boolean; count: number } | null>(null);
  const likeDisplay = optimisticLike ?? likes ?? { liked: false, count: 0 };

  useEffect(() => { if (photoId) recordView({ photoId: photoId as any, action: "view", ip: visitorId }).catch(() => {}); }, [photoId, visitorId, recordView]);
  useEffect(() => { if (commentAuthor) localStorage.setItem("vault_comment_name", commentAuthor); }, [commentAuthor]);

  const goNext = useCallback(() => { setDirection(1); setCurrentIndex((p) => (p + 1) % photos.length); setOptimisticLike(null); setShowComments(false); }, [photos.length]);
  const goPrev = useCallback(() => { setDirection(-1); setCurrentIndex((p) => (p - 1 + photos.length) % photos.length); setOptimisticLike(null); setShowComments(false); }, [photos.length]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === " ") { e.preventDefault(); setSlideshow((s) => !s); }
    };
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [onClose, goNext, goPrev]);

  useEffect(() => {
    if (slideshow) slideshowRef.current = setInterval(goNext, 3000);
    else if (slideshowRef.current) clearInterval(slideshowRef.current);
    return () => { if (slideshowRef.current) clearInterval(slideshowRef.current); };
  }, [slideshow, goNext]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) { dx > 0 ? goNext() : goPrev(); }
  };

  const [dlState, setDlState] = useState<"idle" | "loading" | "done">("idle");
  const handleDownload = async () => {
    if (!currentPhoto || dlState !== "idle") return;
    setDlState("loading");
    try {
      const res = await fetch(currentPhoto.url); const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = blobUrl; a.download = currentPhoto.fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl);
      recordView({ photoId: currentPhoto._id as any, action: "download", ip: visitorId }).catch(() => {});
    } catch { window.open(currentPhoto.url, "_blank"); }
    setDlState("done"); setTimeout(() => setDlState("idle"), 2000);
  };

  const handleLike = async () => {
    setOptimisticLike({ liked: !likeDisplay.liked, count: likeDisplay.liked ? likeDisplay.count - 1 : likeDisplay.count + 1 });
    try { const r = await toggleLike({ photoId: currentPhoto._id as any, visitorId }); setOptimisticLike(r); }
    catch { setOptimisticLike(null); }
  };

  const handleComment = async () => {
    if (!commentText.trim() || !commentAuthor.trim()) return;
    try { await addComment({ photoId: currentPhoto._id as any, author: commentAuthor.trim(), text: commentText.trim() }); setCommentText(""); } catch {}
  };

  const handleShare = async () => {
    if (navigator.share) { try { await navigator.share({ title: currentPhoto.fileName, url: window.location.href }); } catch {} }
    else { await navigator.clipboard.writeText(window.location.href); }
  };

  if (!currentPhoto) return null;

  const v = { enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0, scale: 0.97 }), center: { x: 0, opacity: 1, scale: 1 }, exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0, scale: 0.97 }) };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(0, 0, 0, 0.92)", backdropFilter: "blur(24px)" }}
      onClick={onClose} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

      {/* Close */}
      <button onClick={onClose} className="absolute right-3 top-3 z-20 rounded-xl bg-white/[0.06] p-2.5 text-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/[0.12] hover:text-white active:scale-90 sm:right-5 sm:top-5">
        <X className="h-5 w-5" />
      </button>

      {/* Counter */}
      <div className="absolute left-3 top-3 z-20 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/50 backdrop-blur-sm sm:left-5 sm:top-5">
        {currentIndex + 1} / {photos.length}
      </div>

      {/* Right actions */}
      <div className="absolute right-3 top-14 z-20 flex flex-col gap-1.5 sm:right-5 sm:top-16">
        <button onClick={(e) => { e.stopPropagation(); handleDownload(); }} className={`rounded-xl p-2.5 backdrop-blur-sm transition-all duration-200 active:scale-90 ${dlState === "done" ? "bg-emerald-500/80 text-white" : dlState === "loading" ? "bg-white/10 text-white/60" : "bg-white/[0.06] text-white/50 hover:bg-white/[0.12] hover:text-white"}`} title="Download">
          {dlState === "loading" ? <span className="download-spinner" /> : dlState === "done" ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        </button>
        <button onClick={(e) => { e.stopPropagation(); handleLike(); }} className={`rounded-xl p-2.5 backdrop-blur-sm transition-all duration-200 active:scale-90 ${likeDisplay.liked ? "bg-red-500/80 text-white" : "bg-white/[0.06] text-white/50 hover:bg-white/[0.12] hover:text-white"}`} title="Like">
          <Heart className={`h-4 w-4 transition-transform duration-200 ${likeDisplay.liked ? "fill-current scale-110" : ""}`} />
          {likeDisplay.count > 0 && <span className="absolute -bottom-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{likeDisplay.count}</span>}
        </button>
        <button onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); setShowInfo(false); }} className={`rounded-xl p-2.5 backdrop-blur-sm transition-all duration-200 active:scale-90 ${showComments ? "bg-indigo-500/80 text-white" : "bg-white/[0.06] text-white/50 hover:bg-white/[0.12] hover:text-white"}`} title="Comments">
          <MessageCircle className="h-4 w-4" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); handleShare(); }} className="rounded-xl bg-white/[0.06] p-2.5 text-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/[0.12] hover:text-white active:scale-90" title="Share">
          <Share2 className="h-4 w-4" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); setShowComments(false); }} className={`rounded-xl p-2.5 backdrop-blur-sm transition-all duration-200 active:scale-90 ${showInfo ? "bg-indigo-500/80 text-white" : "bg-white/[0.06] text-white/50 hover:bg-white/[0.12] hover:text-white"}`} title="Info">
          <Info className="h-4 w-4" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); setSlideshow(!slideshow); }} className={`rounded-xl p-2.5 backdrop-blur-sm transition-all duration-200 active:scale-90 ${slideshow ? "bg-indigo-500/80 text-white" : "bg-white/[0.06] text-white/50 hover:bg-white/[0.12] hover:text-white"}`} title={slideshow ? "Pause" : "Slideshow"}>
          {slideshow ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
      </div>

      {/* Progress dots */}
      {photos.length <= 20 && (
        <div className="absolute bottom-14 left-1/2 z-20 flex -translate-x-1/2 gap-1">
          {photos.map((_, i) => (
            <button key={i} onClick={(e) => { e.stopPropagation(); setDirection(i > currentIndex ? 1 : -1); setCurrentIndex(i); setOptimisticLike(null); }}
              className={`rounded-full transition-all duration-300 ${i === currentIndex ? "h-1.5 w-1.5 bg-white" : "h-1 w-1 bg-white/15 hover:bg-white/30"}`} />
          ))}
        </div>
      )}

      {/* Nav arrows */}
      {photos.length > 1 && (<>
        <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="absolute left-2 z-20 rounded-xl bg-white/[0.06] p-2.5 text-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/[0.12] hover:text-white active:scale-90 sm:left-4"><ChevronLeft className="h-5 w-5" /></button>
        <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="absolute right-2 z-20 rounded-xl bg-white/[0.06] p-2.5 text-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/[0.12] hover:text-white active:scale-90 sm:right-4"><ChevronRight className="h-5 w-5" /></button>
      </>)}

      {/* Image */}
      <div className="flex max-h-[85vh] max-w-[85vw] items-center justify-center sm:max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.img key={currentPhoto._id} custom={direction} variants={v} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            src={currentPhoto.url} alt={currentPhoto.fileName}
            className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain sm:max-w-[90vw]" draggable={false} />
        </AnimatePresence>
      </div>

      {/* File name */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-lg bg-white/[0.06] px-4 py-1.5 text-xs font-light tracking-wide text-white/40 backdrop-blur-sm max-w-[80vw] truncate">
        {currentPhoto.fileName}
      </div>

      {/* Info Panel */}
      <AnimatePresence>
        {showInfo && (
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()} className="absolute right-4 top-24 z-30 w-60 rounded-2xl border border-white/[0.06] bg-white/[0.06] p-4 backdrop-blur-xl sm:right-5">
            <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-white/30">Details</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-white/30">Name</span><span className="text-white/60 truncate ml-2 max-w-[140px]">{currentPhoto.fileName}</span></div>
              {currentPhoto.uploadedBy && <div className="flex justify-between"><span className="text-white/30">By</span><span className="text-white/60">{currentPhoto.uploadedBy}</span></div>}
              {currentPhoto.uploadedAt && <div className="flex justify-between"><span className="text-white/30">Date</span><span className="text-white/60">{new Date(currentPhoto.uploadedAt).toLocaleDateString()}</span></div>}
              <div className="flex justify-between"><span className="text-white/30">Likes</span><span className="text-white/60">{likeDisplay.count}</span></div>
              <div className="flex justify-between"><span className="text-white/30">Comments</span><span className="text-white/60">{comments?.length ?? 0}</span></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments Panel */}
      <AnimatePresence>
        {showComments && (
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()} className="absolute right-4 top-24 z-30 flex w-72 flex-col rounded-2xl border border-white/[0.06] bg-white/[0.06] backdrop-blur-xl sm:right-5 sm:h-[65vh] max-h-[55vh]">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Comments ({comments?.length ?? 0})</h4>
              <button onClick={() => setShowComments(false)} className="text-white/30 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}>
              {comments && comments.length > 0 ? comments.map((c: any) => (
                <div key={c._id} className="rounded-xl bg-white/[0.04] px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/30 text-[8px] font-bold text-white">{c.author?.[0]?.toUpperCase() ?? "?"}</div>
                    <span className="text-[10px] font-semibold text-white/50">{c.author}</span>
                    <span className="ml-auto text-[9px] text-white/20">{new Date(c.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/40">{c.text}</p>
                </div>
              )) : <p className="py-8 text-center text-xs text-white/20">No comments yet.</p>}
            </div>
            <div className="border-t border-white/[0.06] p-3 space-y-2">
              {!commentAuthor && <input type="text" placeholder="Your name" value={commentAuthor} onChange={(e) => setCommentAuthor(e.target.value)} className="w-full rounded-lg bg-white/[0.06] px-3 py-2 text-xs text-white outline-none placeholder:text-white/20 focus:bg-white/[0.1] transition-colors" />}
              <div className="flex gap-2">
                <input type="text" placeholder="Write a comment…" value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleComment()} className="flex-1 rounded-lg bg-white/[0.06] px-3 py-2 text-xs text-white outline-none placeholder:text-white/20 focus:bg-white/[0.1] transition-colors" />
                <button onClick={handleComment} disabled={!commentText.trim() || !commentAuthor.trim()} className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white transition-all duration-200 hover:bg-indigo-400 disabled:opacity-25 active:scale-90"><Send className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
