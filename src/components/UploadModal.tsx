import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Upload, Image, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Logo from "@/components/Logo";

interface UploadModalProps { onClose: () => void; }
type UploadStatus = "idle" | "uploading" | "success" | "error";
interface FileUpload { file: File; preview: string; status: UploadStatus; error?: string; }

export default function UploadModal({ onClose }: UploadModalProps) {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.photos.generateUploadUrl);
  const familyUpload = useMutation(api.photos.familyUpload);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const imageFiles = Array.from(newFiles).filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...imageFiles.map((file) => ({ file, preview: URL.createObjectURL(file), status: "idle" as const }))]);
  }, []);

  const uploadAll = async () => {
    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== "idle") continue;
      setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: "uploading" as const } : f));
      try {
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": files[i].file.type }, body: files[i].file });
        const { storageId } = await response.json();
        await familyUpload({ storageId, fileName: files[i].file.name });
        setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: "success" as const } : f));
      } catch (err) {
        setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: "error" as const, error: err instanceof Error ? err.message : "Failed" } : f));
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => { URL.revokeObjectURL(prev[index].preview); return prev.filter((_, i) => i !== index); });
  };

  useEffect(() => { fileInputRef.current?.click(); }, []);

  const pendingFiles = files.filter((f) => f.status === "idle");
  const isUploading = files.some((f) => f.status === "uploading");
  const allDone = files.length > 0 && files.every((f) => f.status === "success" || f.status === "error");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2 }} className="modal-card" onClick={(e) => e.stopPropagation()}>

        <div className="modal-head">
          <div className="modal-head-left">
            <div className="modal-head-icon" style={{ background: "rgba(0,113,227,0.12)" }}><Upload className="h-4 w-4" style={{ color: "#0071E3" }} /></div>
            <div>
              <div className="modal-head-title">Upload Photos</div>
              <div className="modal-head-sub">Photos appear after admin approval</div>
            </div>
          </div>
          <button onClick={onClose} className="modal-close"><X className="h-4 w-4" /></button>
        </div>

        <div className="modal-body">
          <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            className={`upload-dropzone ${isDragging ? "dragging" : ""}`}>
            <Image className="h-8 w-8" style={{ margin: "0 auto", color: "var(--vault-icon-dim)" }} />
            <p>Drag & drop photos</p>
            <small>or click to browse — JPG, PNG, WebP</small>
            <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
          </div>

          {files.length > 0 && (
            <>
              <div className="upload-actions">
                <p>{files.length} photo{files.length !== 1 ? "s" : ""}</p>
                {pendingFiles.length > 0 && (
                  <button onClick={uploadAll} disabled={isUploading} className="upload-btn">
                    {isUploading ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>) : (<><Upload className="h-3.5 w-3.5" /> Upload All</>)}
                  </button>
                )}
              </div>
              <div className="upload-file-grid">
                {files.map((f, i) => (
                  <div key={i} className="upload-file-item">
                    <img src={f.preview} alt="" />
                    {f.status === "idle" && (
                      <div className="upload-file-status" style={{ opacity: 0 }}>
                        <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="upload-file-remove"><X className="h-3 w-3" /></button>
                      </div>
                    )}
                    {f.status === "uploading" && <div className="upload-file-status" style={{ background: "rgba(0,0,0,0.5)" }}><Loader2 className="h-5 w-5 animate-spin" style={{ color: "#fff" }} /></div>}
                    {f.status === "success" && <div className="upload-file-status" style={{ background: "rgba(52,199,89,0.2)" }}><CheckCircle className="h-5 w-5" style={{ color: "#34C759" }} /></div>}
                    {f.status === "error" && <div className="upload-file-status" style={{ background: "rgba(255,59,48,0.2)" }}><AlertCircle className="h-5 w-5" style={{ color: "#FF6B6B" }} /></div>}
                  </div>
                ))}
              </div>
              {allDone && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="upload-success">
                  <p>{files.filter((f) => f.status === "success").length} of {files.length} uploaded! Awaiting approval.</p>
                </motion.div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
