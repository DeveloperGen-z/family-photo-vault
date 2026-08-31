import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { X, Upload, Lock, Image, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

interface UploadModalProps {
  onClose: () => void;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface FileUpload {
  file: File;
  preview: string;
  status: UploadStatus;
  error?: string;
}

export default function UploadModal({ onClose }: UploadModalProps) {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.photos.generateUploadUrl);
  const uploadPhoto = useMutation(api.photos.uploadPhoto);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "121520") {
      setIsAuthenticated(true);
      setPasswordError("");
    } else {
      setPasswordError("Incorrect password. Ask the admin for the upload code.");
      setPassword("");
    }
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const imageFiles = Array.from(newFiles).filter((f) =>
      f.type.startsWith("image/"),
    );
    const previews = imageFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      status: "idle" as const,
    }));
    setFiles((prev) => [...prev, ...previews]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const uploadAll = async () => {
    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== "idle") continue;

      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: "uploading" as const } : f,
        ),
      );

      try {
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": files[i].file.type },
          body: files[i].file,
        });
        const { storageId } = await response.json();

        await uploadPhoto({
          storageId,
          fileName: files[i].file.name,
          uploadedBy: "family",
          status: "pending",
        });

        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "success" as const } : f,
          ),
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: "error" as const,
                  error: err instanceof Error ? err.message : "Upload failed",
                }
              : f,
          ),
        );
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const pendingFiles = files.filter((f) => f.status === "idle");
  const isUploading = files.some((f) => f.status === "uploading");
  const allDone =
    files.length > 0 && files.every((f) => f.status === "success" || f.status === "error");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-border/60 bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Upload Photos</h2>
              <p className="text-xs text-muted-foreground">
                Submit photos to the vault for admin review
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Password Step */}
          {!isAuthenticated ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="rounded-2xl bg-muted/50 p-4 text-center">
                <Lock className="mx-auto h-8 w-8 text-muted-foreground/60" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter the access code shared by the vault administrator
                </p>
              </div>
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError("");
                  }}
                  placeholder="Enter upload code"
                  autoFocus
                  className="w-full rounded-xl border border-input bg-background py-3 px-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              {passwordError && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
                >
                  {passwordError}
                </motion.p>
              )}
              <button
                type="submit"
                disabled={!password.trim()}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
                }`}
              >
                <Image className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium text-foreground">
                  Drag & drop photos here
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  or click to browse — JPG, PNG, WebP
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>

              {/* File Preview */}
              {files.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      {files.length} photo{files.length !== 1 ? "s" : ""} selected
                    </p>
                    {pendingFiles.length > 0 && (
                      <button
                        onClick={uploadAll}
                        disabled={isUploading}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Upload All ({pendingFiles.length})
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {files.map((f, i) => (
                      <div
                        key={i}
                        className="group relative overflow-hidden rounded-xl border border-border/40 bg-muted/30"
                      >
                        <img
                          src={f.preview}
                          alt=""
                          className="aspect-square w-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(i);
                            }}
                            className="rounded-lg bg-white/90 p-1.5 text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {/* Status overlay */}
                        {f.status === "uploading" && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <Loader2 className="h-6 w-6 animate-spin text-white" />
                          </div>
                        )}
                        {f.status === "success" && (
                          <div className="absolute inset-0 flex items-center justify-center bg-green-500/30">
                            <CheckCircle className="h-6 w-6 text-green-500" />
                          </div>
                        )}
                        {f.status === "error" && (
                          <div className="absolute inset-0 flex items-center justify-center bg-red-500/30">
                            <AlertCircle className="h-6 w-6 text-red-500" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Upload result message */}
                  {allDone && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl bg-primary/5 p-4 text-center"
                    >
                      <p className="text-sm font-medium text-primary">
                        {files.filter((f) => f.status === "success").length} of{" "}
                        {files.length} uploaded! Waiting for admin approval.
                      </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your photos will appear in the vault once approved by the admin.
                  </p>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
