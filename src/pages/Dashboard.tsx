import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  CheckCheck,
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
  Images,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";

type Tab = "pending" | "photos" | "upload" | "logs" | "settings";

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
  const approveAll = useMutation(api.photos.approveAll);
  const generateUploadUrl = useMutation(api.photos.generateUploadUrl);
  const uploadPhoto = useMutation(api.photos.uploadPhoto);
  const changeAdminPassword = useMutation(api.admin.changeAdminPassword);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<"approve" | "reject" | null>(null);

  // Password change state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("family_admin");
    navigate("/");
  };

  const toggleSelect = (id: string) => {
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!pendingPhotos) return;
    if (selectedPhotos.size === pendingPhotos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(pendingPhotos.map((p) => p._id)));
    }
  };

  const handleBulkAction = async (action: "approve" | "reject") => {
    const fn = action === "approve" ? approvePhoto : rejectPhoto;
    for (const id of selectedPhotos) {
      await fn({ photoId: id as any });
    }
    setSelectedPhotos(new Set());
    setBulkAction(null);
  };

  const handleApproveAll = async () => {
    await approveAll({});
    setSelectedPhotos(new Set());
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

  const handleDelete = async (photoId: string) => {
    await deletePhoto({ photoId: photoId as any });
    setDeleteConfirm(null);
  };

  const handleChangePassword = async () => {
    setPwError("");
    setPwSuccess(false);
    setPwLoading(true);
    try {
      await changeAdminPassword({
        currentPassword: currentPw,
        newPassword: newPw,
      });
      setPwSuccess(true);
      setCurrentPw("");
      setNewPw("");
    } catch (err: any) {
      setPwError(err.message || "Failed to change password");
    } finally {
      setPwLoading(false);
    }
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
    { id: "settings", label: "Settings", icon: <Key className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate("/")}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:rounded-xl sm:p-2"
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 sm:h-9 sm:w-9 sm:rounded-xl">
              <Shield className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-bold text-foreground sm:text-lg" style={{ fontFamily: "var(--font-serif)" }}>Admin Dashboard</h1>
              <p className="text-[10px] text-muted-foreground sm:text-xs">Manage the family vault</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
          >
            <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {[
            {
              label: "Total Photos",
              value: stats?.totalPhotos ?? 0,
              icon: <Images className="h-4 w-4" />,
              color: "text-primary",
              bg: "bg-primary/10",
            },
            {
              label: "Approved",
              value: stats?.approvedPhotos ?? 0,
              icon: <CheckCircle className="h-4 w-4" />,
              color: "text-green-600",
              bg: "bg-green-50",
            },
            {
              label: "Pending",
              value: stats?.pendingPhotos ?? 0,
              icon: <Clock className="h-4 w-4" />,
              color: "text-amber-600",
              bg: "bg-amber-50",
            },
            {
              label: "Rejected",
              value: stats?.rejectedPhotos ?? 0,
              icon: <XCircle className="h-4 w-4" />,
              color: "text-red-500",
              bg: "bg-red-50",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border/60 bg-card p-3 sm:rounded-2xl sm:p-4"
            >
              <div className="flex items-center gap-2">
                <div className={cn("flex h-6 w-6 items-center justify-center rounded-md", stat.bg, stat.color)}>
                  {stat.icon}
                </div>
                <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">{stat.label}</p>
              </div>
              <p className={cn("mt-1.5 text-xl font-bold sm:text-2xl", stat.color)}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="flex gap-0.5 rounded-xl border border-border/60 bg-muted/50 p-0.5 sm:gap-1 sm:rounded-2xl sm:p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-all sm:gap-2 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm",
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
                    "inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white sm:h-5 sm:min-w-[20px] sm:px-1.5 sm:text-[10px]",
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

      {/* Bulk actions bar (visible when photos selected in pending tab) */}
      <AnimatePresence>
        {activeTab === "pending" && selectedPhotos.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-auto max-w-6xl overflow-hidden px-4 pt-3 sm:px-6"
          >
            <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5">
              <span className="text-xs font-medium text-primary sm:text-sm">
                {selectedPhotos.size} photo{selectedPhotos.size !== 1 ? "s" : ""} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction("approve")}
                  className="inline-flex items-center gap-1 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-600"
                >
                  <CheckCircle className="h-3 w-3" />
                  Approve
                </button>
                <button
                  onClick={() => handleBulkAction("reject")}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600"
                >
                  <XCircle className="h-3 w-3" />
                  Reject
                </button>
                <button
                  onClick={() => setSelectedPhotos(new Set())}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  Clear
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Content */}
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
        {/* Pending Tab */}
        {activeTab === "pending" && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {pendingPhotos && pendingPhotos.length > 0 ? (
              <>
                {/* Quick actions */}
                <div className="mb-4 flex items-center justify-between">
                  <button
                    onClick={toggleSelectAll}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    {selectedPhotos.size === pendingPhotos.length ? "Deselect All" : "Select All"}
                  </button>
                  <button
                    onClick={handleApproveAll}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-600"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Approve All ({pendingPhotos.length})
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pendingPhotos.map((photo) => (
                    <div
                      key={photo._id}
                      className={cn(
                        "overflow-hidden rounded-xl border bg-card transition-all sm:rounded-2xl",
                        selectedPhotos.has(photo._id)
                          ? "border-primary/50 ring-1 ring-primary/20"
                          : "border-border/60",
                      )}
                    >
                      <div className="relative">
                        <img
                          src={photo.url}
                          alt={photo.fileName}
                          className="aspect-[4/3] w-full object-cover"
                        />
                        {/* Selection checkbox */}
                        <button
                          onClick={() => toggleSelect(photo._id)}
                          className={cn(
                            "absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all",
                            selectedPhotos.has(photo._id)
                              ? "border-primary bg-primary text-white"
                              : "border-white/60 bg-black/30 text-white/0 hover:border-white/80",
                          )}
                        >
                          {selectedPhotos.has(photo._id) && (
                            <CheckCircle className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      <div className="p-3">
                        <p className="truncate text-xs font-medium text-foreground sm:text-sm">
                          {photo.fileName}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">
                          Uploaded by {photo.uploadedBy} •{" "}
                          {new Date(photo.uploadedAt).toLocaleDateString()}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => approvePhoto({ photoId: photo._id })}
                            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-500 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-green-600 sm:rounded-xl sm:py-2 sm:text-xs"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Approve
                          </button>
                          <button
                            onClick={() => rejectPhoto({ photoId: photo._id })}
                            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-muted py-1.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive sm:rounded-xl sm:py-2 sm:text-xs"
                          >
                            <XCircle className="h-3 w-3" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {allPhotos.map((photo) => (
                  <div
                    key={photo._id}
                    className="group overflow-hidden rounded-xl border border-border/60 bg-card sm:rounded-2xl"
                  >
                    <div className="relative aspect-square">
                      <img
                        src={photo.url}
                        alt={photo.fileName}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <a
                          href={photo.url}
                          download={photo.fileName}
                          className="rounded-lg bg-white/90 px-3 py-1.5 text-[10px] font-semibold text-black transition-colors hover:bg-white sm:rounded-xl sm:text-xs"
                        >
                          Download
                        </a>
                        <button
                          onClick={() => setDeleteConfirm(photo._id)}
                          className="rounded-lg bg-red-500 px-3 py-1.5 text-[10px] font-semibold text-white shadow-lg transition-colors hover:bg-red-600 sm:rounded-xl sm:text-xs"
                        >
                          <Trash2 className="mr-0.5 inline h-3 w-3" />
                          Delete
                        </button>
                      </div>
                      {/* Status badge */}
                      <span
                        className={cn(
                          "absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase sm:right-2 sm:top-2 sm:px-2 sm:text-[10px]",
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
                    <div className="p-2 sm:p-3">
                      <p className="truncate text-[10px] text-muted-foreground sm:text-xs">
                        {photo.fileName}
                      </p>
                      <p className="text-[9px] text-muted-foreground/70 sm:text-[10px]">
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
            <div className="rounded-2xl border-2 border-dashed border-border/60 bg-card/50 p-8 text-center sm:rounded-3xl sm:p-12">
              <Upload className="mx-auto h-10 w-10 text-muted-foreground/40 sm:h-12 sm:w-12" />
              <h3 className="mt-3 text-base font-semibold text-foreground sm:mt-4 sm:text-lg">
                Admin Upload
              </h3>
              <p className="mt-1.5 text-xs text-muted-foreground sm:mt-2 sm:text-sm">
                Photos uploaded here are approved immediately and added to the vault.
              </p>
              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md sm:mt-6 sm:px-6 sm:py-3 sm:text-sm">
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
                <p className="mt-3 text-xs text-primary sm:mt-4 sm:text-sm">{uploadProgress}</p>
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
              <div className="space-y-1.5 sm:space-y-2">
                {[...logs].reverse().map((log) => (
                  <div
                    key={log._id}
                    className="flex items-start gap-2.5 rounded-xl border border-border/40 bg-card px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3"
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md sm:h-7 sm:w-7 sm:rounded-lg",
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
                        <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      ) : log.action.includes("failed") ? (
                        <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      ) : (
                        <Activity className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground sm:text-sm">
                        {log.action.replace(/_/g, " ")}
                      </p>
                      <p className="text-[10px] text-muted-foreground sm:text-xs">{log.details}</p>
                    </div>
                    <span className="shrink-0 text-[9px] text-muted-foreground/70 sm:text-[10px]">
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

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mx-auto max-w-md space-y-6">
              {/* Change Password */}
              <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                    <Key className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
                    <p className="text-xs text-muted-foreground">Update the admin access password</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPw ? "text" : "password"}
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 pr-10 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPw(!showCurrentPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                      >
                        {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPw ? "text" : "password"}
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 pr-10 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                      >
                        {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {pwError && (
                    <p className="text-xs text-destructive">{pwError}</p>
                  )}
                  {pwSuccess && (
                    <p className="text-xs text-green-600">Password updated successfully</p>
                  )}
                  <button
                    onClick={handleChangePassword}
                    disabled={pwLoading || !currentPw || !newPw}
                    className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pwLoading ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </div>

              {/* Vault Info */}
              <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Vault Info</h3>
                    <p className="text-xs text-muted-foreground">Current vault configuration</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2.5">
                  <InfoRow label="Upload Password" value="121520" />
                  <InfoRow label="Total Photos" value={String(stats?.totalPhotos ?? 0)} />
                  <InfoRow label="Pending Reviews" value={String(stats?.pendingPhotos ?? 0)} />
                  <InfoRow label="Total Activity Logs" value={String(stats?.totalLogs ?? 0)} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Delete Photo</h3>
                  <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 rounded-xl border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-xs font-medium text-foreground">{value}</span>
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
    <div className="rounded-2xl border-2 border-dashed border-border/60 bg-card/50 py-12 text-center sm:rounded-3xl sm:py-16">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground/40 sm:h-16 sm:w-16 sm:rounded-2xl">
        {icon}
      </div>
      <h3 className="mt-3 text-base font-semibold text-foreground sm:mt-4 sm:text-lg">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{description}</p>
    </div>
  );
}
