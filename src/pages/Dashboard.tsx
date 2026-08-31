import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Camera,
  LogOut,
  CheckCircle,
  XCircle,
  Trash2,
  Upload,
  Clock,
  Image as ImageIcon,
  Activity,
  Shield,
  ChevronLeft,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";

type Tab = "pending" | "photos" | "upload" | "logs";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const navigate = useNavigate();

  // Auth check
  useEffect(() => {
    if (localStorage.getItem("family_admin") !== "true") {
      navigate("/");
    }
  }, [navigate]);

  const pendingPhotos = useQuery(api.photos.listPending);
  const allPhotos = useQuery(api.photos.listAll);
  const stats = useQuery(api.admin.getStats);
  const logs = useQuery(api.admin.getLogs);

  const approvePhoto = useMutation(api.photos.approvePhoto);
  const rejectPhoto = useMutation(api.photos.rejectPhoto);
  const deletePhoto = useMutation(api.photos.deletePhoto);
  const generateUploadUrl = useMutation(api.photos.generateUploadUrl);
  const uploadPhoto = useMutation(api.photos.uploadPhoto);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const handleLogout = () => {
    localStorage.removeItem("family_admin");
    navigate("/");
  };

  const handleAdminUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const fileList = Array.from(files);
    let uploaded = 0;

    for (const file of fileList) {
      setUploadProgress(`Uploading ${uploaded + 1} of ${fileList.length}...`);
      try {
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await response.json();
        await uploadPhoto({
          storageId,
          fileName: file.name,
          uploadedBy: "admin",
          status: "approved",
        });
        uploaded++;
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }

    setIsUploading(false);
    setUploadProgress(null);
    e.target.value = "";
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      id: "pending",
      label: "Pending",
      icon: <Clock className="h-4 w-4" />,
      count: pendingPhotos?.length,
    },
    {
      id: "photos",
      label: "All Photos",
      icon: <ImageIcon className="h-4 w-4" />,
      count: allPhotos?.length,
    },
    { id: "upload", label: "Upload", icon: <Upload className="h-4 w-4" /> },
    { id: "logs", label: "Logs", icon: <Activity className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">Manage the family vault</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="mx-auto max-w-6xl px-6 pt-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            {
              label: "Total Photos",
              value: stats?.totalPhotos ?? 0,
              color: "text-primary",
              bg: "bg-primary/10",
            },
            {
              label: "Approved",
              value: stats?.approvedPhotos ?? 0,
              color: "text-green-600",
              bg: "bg-green-50",
            },
            {
              label: "Pending",
              value: stats?.pendingPhotos ?? 0,
              color: "text-amber-600",
              bg: "bg-amber-50",
            },
            {
              label: "Rejected",
              value: stats?.rejectedPhotos ?? 0,
              color: "text-red-500",
              bg: "bg-red-50",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border/60 bg-card p-4"
            >
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              <p className={cn("mt-1 text-2xl font-bold", stat.color)}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-auto max-w-6xl px-6 pt-6">
        <div className="flex gap-1 rounded-2xl border border-border/60 bg-muted/50 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={cn(
                    "ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white",
                    tab.id === "pending" ? "bg-amber-500" : "bg-primary",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Pending Tab */}
        {activeTab === "pending" && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {pendingPhotos && pendingPhotos.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pendingPhotos.map((photo) => (
                  <div
                    key={photo._id}
                    className="overflow-hidden rounded-2xl border border-border/60 bg-card"
                  >
                    <img
                      src={photo.url}
                      alt={photo.fileName}
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <div className="p-4">
                      <p className="truncate text-sm font-medium text-foreground">
                        {photo.fileName}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Uploaded by {photo.uploadedBy} •{" "}
                        {new Date(photo.uploadedAt).toLocaleDateString()}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => approvePhoto({ photoId: photo._id })}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-500 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-600"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => rejectPhoto({ photoId: photo._id })}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-muted py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Clock className="h-10 w-10" />}
                title="No pending photos"
                description="Photos submitted by family members appear here for review."
              />
            )}
          </motion.div>
        )}

        {/* All Photos Tab */}
        {activeTab === "photos" && (
          <motion.div
            key="photos"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {allPhotos && allPhotos.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {allPhotos.map((photo) => (
                  <div
                    key={photo._id}
                    className="group overflow-hidden rounded-2xl border border-border/60 bg-card"
                  >
                    <div className="relative aspect-square">
                      <img
                        src={photo.url}
                        alt={photo.fileName}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() =>
                            deletePhoto({ photoId: photo._id })
                          }
                          className="rounded-xl bg-red-500 px-4 py-2 text-xs font-semibold text-white shadow-lg transition-colors hover:bg-red-600"
                        >
                          <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                      {/* Status badge */}
                      <span
                        className={cn(
                          "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          photo.status === "approved"
                            ? "bg-green-500/90 text-white"
                            : photo.status === "pending"
                              ? "bg-amber-500/90 text-white"
                              : "bg-red-500/90 text-white",
                        )}
                      >
                        {photo.status}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="truncate text-xs text-muted-foreground">
                        {photo.fileName}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70">
                        by {photo.uploadedBy}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Camera className="h-10 w-10" />}
                title="No photos yet"
                description="Upload the first photo to populate the vault."
              />
            )}
          </motion.div>
        )}

        {/* Upload Tab */}
        {activeTab === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="rounded-3xl border-2 border-dashed border-border/60 bg-card/50 p-12 text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                Admin Upload
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Photos uploaded here are approved immediately and added to the vault.
              </p>
              <label className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md">
                <Camera className="h-4 w-4" />
                Choose Photos
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleAdminUpload}
                  disabled={isUploading}
                />
              </label>
              {uploadProgress && (
                <p className="mt-4 text-sm text-primary">{uploadProgress}</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Logs Tab */}
        {activeTab === "logs" && (
          <motion.div
            key="logs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {logs && logs.length > 0 ? (
              <div className="space-y-2">
                {[...logs].reverse().map((log) => (
                  <div
                    key={log._id}
                    className="flex items-start gap-3 rounded-xl border border-border/40 bg-card px-4 py-3"
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                        log.action.includes("success")
                          ? "bg-green-50 text-green-600"
                          : log.action.includes("failed")
                            ? "bg-red-50 text-red-500"
                            : log.action.includes("upload")
                              ? "bg-blue-50 text-blue-600"
                              : log.action.includes("delete")
                                ? "bg-red-50 text-red-500"
                                : "bg-muted text-muted-foreground",
                      )}
                    >
                      {log.action.includes("success") ? (
                        <CheckCircle className="h-3.5 w-3.5" />
                      ) : log.action.includes("failed") ? (
                        <XCircle className="h-3.5 w-3.5" />
                      ) : (
                        <Activity className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {log.action.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">{log.details}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground/70">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Activity className="h-10 w-10" />}
                title="No activity yet"
                description="All actions are logged here for your reference."
              />
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-border/60 bg-card/50 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground/40">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
