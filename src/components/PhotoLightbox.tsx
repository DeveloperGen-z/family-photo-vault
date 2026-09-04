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
    if (!currentPhoto || dlState !== "idle") return; setDlState("loading");
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
  const v = { enter: (d: number) => ({ x: d > 0 ? 50 : -50, opacity: 0 }), center: { x: 0, opacity: 1 }, exit: (d: number) => ({ x: d > 0 ? -50 : 50, opacity: 0 }) };

  return (
    <div className="lb-backdrop" onClick={onClose} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <button onClick={onClose} className="lb-close"><X className="h-4 w-4" /></button>
      <div className="lb-counter">{currentIndex + 1} / {photos.length}</div>

      {/* Nav arrows */}
      {photos.length > 1 && (<>
        <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="lb-nav prev"><ChevronLeft className="h-5 w-5" /></button>
        <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="lb-nav next"><ChevronRight className="h-5 w-5" /></button>
      </>)}

      {/* Image */}
      <div style={{ maxHeight: "80vh", maxWidth: "85vw" }} onClick={(e) => e.stopPropagation()}>
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.img key={currentPhoto._id} custom={direction} variants={v} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25 }} src={currentPhoto.url} alt={currentPhoto.fileName}
            style={{ maxHeight: "80vh", maxWidth: "85vw", borderRadius: "8px", objectFit: "contain" }} draggable={false} />
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      {photos.length <= 20 && (
        <div className="lb-dots">
          {photos.map((_, i) => (
            <button key={i} onClick={(e) => { e.stopPropagation(); setDirection(i > currentIndex ? 1 : -1); setCurrentIndex(i); setOptimisticLike(null); }}
              className={`lb-dot ${i === currentIndex ? "active" : ""}`} />
          ))}
        </div>
      )}

      {/* Bottom toolbar */}
      <div className="lb-toolbar" onClick={(e) => e.stopPropagation()}>
        <button onClick={handleLike} className={`lb-tool-btn ${likeDisplay.liked ? "active" : ""}`}>
          <Heart className={`h-4 w-4 ${likeDisplay.liked ? "fill-current" : ""}`} />
        </button>
        <button onClick={handleDownload} className={`lb-tool-btn ${dlState === "done" ? "dl-ok" : dlState === "loading" ? "dl-load" : ""}`}>
          {dlState === "loading" ? <span className="dl-spin" /> : dlState === "done" ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        </button>
        <span className="lb-counter-center">{currentIndex + 1} / {photos.length}</span>
        <button onClick={() => { setShowComments(!showComments); setShowInfo(false); }} className={`lb-tool-btn ${showComments ? "active" : ""}`}>
          <MessageCircle className="h-4 w-4" />
        </button>
        <button onClick={handleShare} className="lb-tool-btn"><Share2 className="h-4 w-4" /></button>
        <button onClick={() => { setShowInfo(!showInfo); setShowComments(false); }} className={`lb-tool-btn ${showInfo ? "active" : ""}`}>
          <Info className="h-4 w-4" />
        </button>
        <button onClick={() => setSlideshow(!slideshow)} className={`lb-tool-btn ${slideshow ? "active" : ""}`}>
          {slideshow ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
      </div>

      {/* Comments panel */}
      <AnimatePresence>
        {showComments && (
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="lb-comments" onClick={(e) => e.stopPropagation()}>
            <div className="lb-comments-head">
              <h4>Comments ({comments?.length ?? 0})</h4>
              <button onClick={() => setShowComments(false)}><X className="h-4 w-4" /></button>
            </div>
            <div className="lb-comments-list">
              {comments && comments.length > 0 ? comments.map((c: any) => (
                <div key={c._id} className="lb-comment-item">
                  <div className="lb-comment-head">
                    <div className="lb-comment-avatar">{c.author?.[0]?.toUpperCase() ?? "?"}</div>
                    <span className="lb-comment-author">{c.author}</span>
                    <span className="lb-comment-time">{new Date(c.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className="lb-comment-text">{c.text}</p>
                </div>
              )) : <p style={{ textAlign: "center", padding: "32px 0", fontSize: "0.7rem", color: "rgba(255,255,255,0.15)" }}>No comments yet.</p>}
            </div>
            <div className="lb-comments-input">
              {!commentAuthor && <input type="text" placeholder="Name" value={commentAuthor} onChange={(e) => setCommentAuthor(e.target.value)} />}
              <input type="text" placeholder="Write…" value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleComment()} />
              <button onClick={handleComment} disabled={!commentText.trim() || !commentAuthor.trim()}><Send className="h-3.5 w-3.5" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
