import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Upload, Image, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

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
        setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: "error" as const, error: err instanceof Error ? err.message : "Upload failed" } : f));
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/90 backdrop-blur-xl px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10"><Upload className="h-4 w-4 text-indigo-500" /></div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Upload Photos</h2>
              <p className="text-[11px] text-muted-foreground">Photos appear after admin approval</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Drop Zone */}
          <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 ${isDragging ? "border-indigo-400 bg-indigo-500/5" : "border-border hover:border-indigo-300 hover:bg-muted/30"}`}>
            <Image className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-3 text-sm font-medium text-foreground">Drag & drop photos</p>
            <p className="mt-1 text-xs text-muted-foreground/50">or click to browse — JPG, PNG, WebP</p>
            <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
          </div>

          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{files.length} photo{files.length !== 1 ? "s" : ""}</p>
                {pendingFiles.length > 0 && (
                  <button onClick={uploadAll} disabled={isUploading} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all duration-200 hover:shadow-md disabled:opacity-50 active:scale-[0.97]">
                    {isUploading ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>) : (<><Upload className="h-3.5 w-3.5" /> Upload All ({pendingFiles.length})</>)}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {files.map((f, i) => (
                  <div key={i} className="group relative overflow-hidden rounded-xl border border-border bg-muted/20">
                    <img src={f.preview} alt="" className="aspect-square w-full object-cover" />
                    {f.status === "idle" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="rounded-lg bg-white/90 p-1 text-foreground"><X className="h-3 w-3" /></button>
                      </div>
                    )}
                    {f.status === "uploading" && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Loader2 className="h-5 w-5 animate-spin text-white" /></div>}
                    {f.status === "success" && <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/30"><CheckCircle className="h-5 w-5 text-emerald-500" /></div>}
                    {f.status === "error" && <div className="absolute inset-0 flex items-center justify-center bg-red-500/30"><AlertCircle className="h-5 w-5 text-red-500" /></div>}
                  </div>
                ))}
              </div>
              {allDone && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-indigo-500/5 p-3 text-center border border-indigo-500/10">
                  <p className="text-xs font-medium text-indigo-600">{files.filter((f) => f.status === "success").length} of {files.length} uploaded! Awaiting admin approval.</p>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
