import { useState, useEffect, useMemo } from "react";
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
  Search,
  BarChart3,
  Calendar,
  X,
  Copy,
  RotateCcw,
  Wrench,
  Link,
  RefreshCw,
  Power,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";

type Tab = "pending" | "photos" | "upload" | "logs" | "settings";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("family_admin") !== "true") {
      navigate("/");
    }
  }, [navigate]);

  const pendingPhotos = useQuery(api.photos.listPending);
  const allPhotos = useQuery(api.photos.listAll);
  const stats = useQuery(api.admin.getStats);
  const logs = useQuery(api.admin.getLogs);
  const passwordStatus = useQuery(api.admin.getPasswordStatus);

  const approvePhoto = useMutation(api.photos.approvePhoto);
  const rejectPhoto = useMutation(api.photos.rejectPhoto);
  const restorePhoto = useMutation(api.photos.restorePhoto);
  const deletePhoto = useMutation(api.photos.deletePhoto);
  const approveAll = useMutation(api.photos.approveAll);
  const rejectAll = useMutation(api.photos.rejectAll);
  const bulkDelete = useMutation(api.photos.bulkDelete);
  const generateUploadUrl = useMutation(api.photos.generateUploadUrl);
  const uploadPhoto = useMutation(api.photos.uploadPhoto);
  const changeAdminPassword = useMutation(api.admin.changeAdminPassword);
  const removeAdminPassword = useMutation(api.admin.removeAdminPassword);
  const clearLogs = useMutation(api.admin.clearLogs);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedAllPhotos, setSelectedAllPhotos] = useState<Set<string>>(new Set());
  const [photoDetail, setPhotoDetail] = useState<any | null>(null);

  // Search & filter
  const [photoSearch, setPhotoSearch] = useState("");
  const [photoFilter, setPhotoFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");
  const [logFilter, setLogFilter] = useState<"all" | "login" | "upload" | "delete" | "approve">("all");

  // Password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  // Confirmations
  const [clearLogsConfirm, setClearLogsConfirm] = useState(false);
  const [removePwConfirm, setRemovePwConfirm] = useState(false);
  const [rejectAllConfirm, setRejectAllConfirm] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

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

  const toggleSelectAllPhotos = () => {
    if (!filteredPhotos) return;
    if (selectedAllPhotos.size === filteredPhotos.length) {
      setSelectedAllPhotos(new Set());
    } else {
      setSelectedAllPhotos(new Set(filteredPhotos.map((p) => p._id)));
    }
  };

  const handleBulkAction = async (action: "approve" | "reject") => {
    const fn = action === "approve" ? approvePhoto : rejectPhoto;
    for (const id of selectedPhotos) {
      await fn({ photoId: id as any });
    }
    setSelectedPhotos(new Set());
  };

  const handleApproveAll = async () => {
    const count = await approveAll({});
    showToast(`${count} photos approved`);
  };

  const handleRejectAll = async () => {
    const count = await rejectAll({});
    setRejectAllConfirm(false);
    showToast(`${count} photos rejected`);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedAllPhotos);
    await bulkDelete({ photoIds: ids as any });
    setSelectedAllPhotos(new Set());
    setBulkDeleteConfirm(false);
    showToast(`${ids.length} photos deleted`);
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
    if (uploaded > 0) showToast(`${uploaded} photo${uploaded !== 1 ? "s" : ""} uploaded`);
  };

  const handleDelete = async (photoId: string) => {
    await deletePhoto({ photoId: photoId as any });
    setDeleteConfirm(null);
    setPhotoDetail(null);
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

  const handleRemovePassword = async () => {
    try {
      await removeAdminPassword({ currentPassword: currentPw });
      setRemovePwConfirm(false);
      setCurrentPw("");
      showToast("Password protection removed");
    } catch (err: any) {
      setPwError(err.message || "Failed to remove password");
    }
  };

  const handleClearLogs = async () => {
    try {
      await clearLogs({ password: currentPw || "" });
      setClearLogsConfirm(false);
      showToast("Activity logs cleared");
    } catch (err: any) {
      setPwError(err.message || "Failed to clear logs");
    }
  };

  const handleCopyLinks = async () => {
    if (!allPhotos) return;
    const links = allPhotos
      .filter((p) => p.status === "approved" && p.url)
      .map((p) => p.url)
      .join("\n");
    await navigator.clipboard.writeText(links);
    showToast(`${allPhotos.filter((p) => p.status === "approved").length} links copied`);
  };

  const filteredPhotos = useMemo(() => {
    if (!allPhotos) return [];
    return allPhotos.filter((p) => {
      const matchesFilter = photoFilter === "all" || p.status === photoFilter;
      const matchesSearch = photoSearch === "" ||
        p.fileName.toLowerCase().includes(photoSearch.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [allPhotos, photoFilter, photoSearch]);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return [...logs].reverse().filter((log) => {
      if (logFilter === "all") return true;
      if (logFilter === "login") return log.action.includes("login");
      if (logFilter === "upload") return log.action.includes("upload");
      if (logFilter === "delete") return log.action.includes("delete");
      if (logFilter === "approve") return log.action.includes("approve") || log.action.includes("bulk");
      return true;
    });
  }, [logs, logFilter]);

  const todayUploads = useMemo(() => {
    if (!allPhotos) return 0;
    const today = new Date().toDateString();
    return allPhotos.filter((p) => new Date(p.uploadedAt).toDateString() === today).length;
  }, [allPhotos]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "pending", label: "Pending", icon: <Clock className="h-4 w-4" />, count: pendingPhotos?.length },
    { id: "photos", label: "All Photos", icon: <ImageIcon className="h-4 w-4" />, count: allPhotos?.length },
    { id: "upload", label: "Upload", icon: <Upload className="h-4 w-4" /> },
    { id: "logs", label: "Logs", icon: <Activity className="h-4 w-4" /> },
    { id: "settings", label: "Settings", icon: <Key className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => navigate("/")} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:rounded-xl sm:p-2">
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 sm:h-9 sm:w-9 sm:rounded-xl">
              <Shield className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-bold text-foreground sm:text-lg" style={{ fontFamily: "var(--font-serif)" }}>Admin Dashboard</h1>
              <p className="text-[10px] text-muted-foreground sm:text-xs">Manage the family&apos;s photos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/")} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-muted sm:px-4 sm:py-2 sm:text-sm">
              <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">View Site</span>
            </button>
            <button onClick={handleLogout} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm">
              <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5">
          {[
            { label: "Total", value: stats?.totalPhotos ?? 0, icon: <Images className="h-4 w-4" />, color: "text-primary", bg: "bg-primary/10" },
            { label: "Approved", value: stats?.approvedPhotos ?? 0, icon: <CheckCircle className="h-4 w-4" />, color: "text-green-600", bg: "bg-green-50" },
            { label: "Pending", value: stats?.pendingPhotos ?? 0, icon: <Clock className="h-4 w-4" />, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Rejected", value: stats?.rejectedPhotos ?? 0, icon: <XCircle className="h-4 w-4" />, color: "text-red-500", bg: "bg-red-50" },
            { label: "Today", value: todayUploads, icon: <Calendar className="h-4 w-4" />, color: "text-blue-600", bg: "bg-blue-50" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border/60 bg-card p-3 sm:rounded-2xl sm:p-4">
              <div className="flex items-center gap-2">
                <div className={cn("flex h-6 w-6 items-center justify-center rounded-md", stat.bg, stat.color)}>{stat.icon}</div>
                <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">{stat.label}</p>
              </div>
              <p className={cn("mt-1.5 text-xl font-bold sm:text-2xl", stat.color)}>{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="flex gap-0.5 rounded-xl border border-border/60 bg-muted/50 p-0.5 sm:gap-1 sm:rounded-2xl sm:p-1">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-all sm:gap-2 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm", activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn("inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white sm:h-5 sm:min-w-[20px] sm:px-1.5 sm:text-[10px]", tab.id === "pending" ? "bg-amber-500" : "bg-primary")}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Pending Bulk Actions */}
      <AnimatePresence>
        {activeTab === "pending" && selectedPhotos.size > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mx-auto max-w-6xl overflow-hidden px-4 pt-3 sm:px-6">
            <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5">
              <span className="text-xs font-medium text-primary sm:text-sm">{selectedPhotos.size} selected</span>
              <div className="flex gap-2">
                <button onClick={() => handleBulkAction("approve")} className="inline-flex items-center gap-1 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600"><CheckCircle className="h-3 w-3" /> Approve</button>
                <button onClick={() => handleBulkAction("reject")} className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"><XCircle className="h-3 w-3" /> Reject</button>
                <button onClick={() => setSelectedPhotos(new Set())} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">Clear</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* All Photos Bulk Actions */}
      <AnimatePresence>
        {activeTab === "photos" && selectedAllPhotos.size > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mx-auto max-w-6xl overflow-hidden px-4 pt-3 sm:px-6">
            <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-2.5">
              <span className="text-xs font-medium text-red-600 sm:text-sm">{selectedAllPhotos.size} selected</span>
              <div className="flex gap-2">
                <button onClick={() => { Array.from(selectedAllPhotos).forEach((id) => approvePhoto({ photoId: id as any })); setSelectedAllPhotos(new Set()); showToast("Photos approved"); }} className="inline-flex items-center gap-1 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600"><CheckCircle className="h-3 w-3" /> Approve</button>
                <button onClick={() => { Array.from(selectedAllPhotos).forEach((id) => rejectPhoto({ photoId: id as any })); setSelectedAllPhotos(new Set()); showToast("Photos rejected"); }} className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"><XCircle className="h-3 w-3" /> Reject</button>
                <button onClick={() => setBulkDeleteConfirm(true)} className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"><Trash2 className="h-3 w-3" /> Delete</button>
                <button onClick={() => setSelectedAllPhotos(new Set())} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">Clear</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Content */}
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
        {/* ── Pending Tab ── */}
        {activeTab === "pending" && (
          <motion.div key="pending" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {pendingPhotos && pendingPhotos.length > 0 ? (
              <>
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <button onClick={toggleSelectAll} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
                    <CheckCheck className="h-3.5 w-3.5" />
                    {selectedPhotos.size === pendingPhotos.length ? "Deselect All" : "Select All"}
                  </button>
                  <div className="flex gap-2">
                    <button onClick={handleApproveAll} className="inline-flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600">
                      <CheckCircle className="h-3.5 w-3.5" /> Approve All ({pendingPhotos.length})
                    </button>
                    <button onClick={() => setRejectAllConfirm(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600">
                      <XCircle className="h-3.5 w-3.5" /> Reject All
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pendingPhotos.map((photo) => (
                    <div key={photo._id} className={cn("overflow-hidden rounded-xl border bg-card transition-all sm:rounded-2xl", selectedPhotos.has(photo._id) ? "border-primary/50 ring-1 ring-primary/20" : "border-border/60")}>
                      <div className="relative">
                        <img src={photo.url} alt={photo.fileName} className="aspect-[4/3] w-full object-cover" />
                        <button onClick={() => toggleSelect(photo._id)} className={cn("absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all", selectedPhotos.has(photo._id) ? "border-primary bg-primary text-white" : "border-white/60 bg-black/30 text-white/0 hover:border-white/80")}>
                          {selectedPhotos.has(photo._id) && <CheckCircle className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      <div className="p-3">
                        <p className="truncate text-xs font-medium text-foreground sm:text-sm">{photo.fileName}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">by {photo.uploadedBy} • {new Date(photo.uploadedAt).toLocaleDateString()}</p>
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => approvePhoto({ photoId: photo._id })} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-500 py-1.5 text-[10px] font-semibold text-white hover:bg-green-600 sm:rounded-xl sm:py-2 sm:text-xs"><CheckCircle className="h-3 w-3" /> Approve</button>
                          <button onClick={() => rejectPhoto({ photoId: photo._id })} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-muted py-1.5 text-[10px] font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:rounded-xl sm:py-2 sm:text-xs"><XCircle className="h-3 w-3" /> Reject</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState icon={<Clock className="h-10 w-10" />} title="No pending photos" description="Photos submitted by family members appear here for review." />
            )}
          </motion.div>
        )}

        {/* ── All Photos Tab ── */}
        {activeTab === "photos" && (
          <motion.div key="photos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Search + Filter + Actions */}
            <div className="mb-4 space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                  <input type="text" placeholder="Search photos..." value={photoSearch} onChange={(e) => setPhotoSearch(e.target.value)} className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 sm:text-sm" />
                </div>
                <div className="flex gap-0.5 rounded-lg border border-border/60 bg-muted/50 p-0.5">
                  {(["all", "approved", "pending", "rejected"] as const).map((f) => (
                    <button key={f} onClick={() => setPhotoFilter(f)} className={cn("rounded-md px-2.5 py-1 text-[10px] font-medium transition-all sm:text-xs", photoFilter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground sm:text-xs">{filteredPhotos.length} photo{filteredPhotos.length !== 1 ? "s" : ""}</span>
                <div className="flex gap-2">
                  <button onClick={handleCopyLinks} className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted sm:text-xs"><Copy className="h-3 w-3" /> Copy Links</button>
                  {selectedAllPhotos.size === 0 ? (
                    <button onClick={toggleSelectAllPhotos} className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted sm:text-xs"><CheckCheck className="h-3 w-3" /> Select</button>
                  ) : (
                    <button onClick={() => setSelectedAllPhotos(new Set())} className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted sm:text-xs">Clear ({selectedAllPhotos.size})</button>
                  )}
                </div>
              </div>
            </div>

            {filteredPhotos.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {filteredPhotos.map((photo) => (
                  <div key={photo._id} className={cn("group overflow-hidden rounded-xl border bg-card transition-all sm:rounded-2xl", selectedAllPhotos.has(photo._id) ? "border-red-400 ring-1 ring-red-200" : "border-border/60")}>
                    <div className="relative aspect-square cursor-pointer" onClick={() => setPhotoDetail(photo)}>
                      <img src={photo.url} alt={photo.fileName} className="h-full w-full object-cover" />
                      {selectedAllPhotos.size > 0 && (
                        <button onClick={(e) => { e.stopPropagation(); setSelectedAllPhotos((prev) => { const next = new Set(prev); if (next.has(photo._id)) next.delete(photo._id); else next.add(photo._id); return next; }); }} className={cn("absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all", selectedAllPhotos.has(photo._id) ? "border-red-500 bg-red-500 text-white" : "border-white/60 bg-black/30 text-white/0 hover:border-white/80")}>
                          {selectedAllPhotos.has(photo._id) && <CheckCircle className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        {photo.status !== "approved" && <button onClick={(e) => { e.stopPropagation(); approvePhoto({ photoId: photo._id }); }} className="rounded-lg bg-green-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-green-600"><CheckCircle className="mr-0.5 inline h-3 w-3" /> Approve</button>}
                        {photo.status !== "rejected" && <button onClick={(e) => { e.stopPropagation(); rejectPhoto({ photoId: photo._id }); }} className="rounded-lg bg-amber-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-amber-600"><XCircle className="mr-0.5 inline h-3 w-3" /> Reject</button>}
                        {photo.status === "rejected" && <button onClick={(e) => { e.stopPropagation(); restorePhoto({ photoId: photo._id }); }} className="rounded-lg bg-blue-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-blue-600"><RotateCcw className="mr-0.5 inline h-3 w-3" /> Restore</button>}
                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(photo._id); }} className="rounded-lg bg-red-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-600"><Trash2 className="mr-0.5 inline h-3 w-3" /> Delete</button>
                      </div>
                      <span className={cn("absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase sm:right-2 sm:top-2 sm:px-2 sm:text-[10px]", photo.status === "approved" ? "bg-green-500/90 text-white" : photo.status === "pending" ? "bg-amber-500/90 text-white" : "bg-red-500/90 text-white")}>{photo.status}</span>
                    </div>
                    <div className="p-2 sm:p-3">
                      <p className="truncate text-[10px] text-muted-foreground sm:text-xs">{photo.fileName}</p>
                      <p className="text-[9px] text-muted-foreground/70 sm:text-[10px]">by {photo.uploadedBy} • {new Date(photo.uploadedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<Camera className="h-10 w-10" />} title="No photos found" description={photoSearch || photoFilter !== "all" ? "Try adjusting your search or filter." : "Upload the first photo to populate the vault."} />
            )}
          </motion.div>
        )}

        {/* ── Upload Tab ── */}
        {activeTab === "upload" && (
          <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-2xl border-2 border-dashed border-border/60 bg-card/50 p-8 text-center sm:rounded-3xl sm:p-12">
              <Upload className="mx-auto h-10 w-10 text-muted-foreground/40 sm:h-12 sm:w-12" />
              <h3 className="mt-3 text-base font-semibold text-foreground sm:mt-4 sm:text-lg">Admin Upload</h3>
              <p className="mt-1.5 text-xs text-muted-foreground sm:mt-2 sm:text-sm">Photos uploaded here are approved immediately and added to the vault.</p>
              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md sm:mt-6 sm:px-6 sm:py-3 sm:text-sm">
                <Camera className="h-4 w-4" /> Choose Photos
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleAdminUpload} disabled={isUploading} />
              </label>
              {uploadProgress && <p className="mt-3 text-xs text-primary sm:mt-4 sm:text-sm">{uploadProgress}</p>}
            </div>
          </motion.div>
        )}

        {/* ── Logs Tab ── */}
        {activeTab === "logs" && (
          <motion.div key="logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-0.5 rounded-lg border border-border/60 bg-muted/50 p-0.5">
                {(["all", "login", "upload", "delete", "approve"] as const).map((f) => (
                  <button key={f} onClick={() => setLogFilter(f)} className={cn("rounded-md px-2.5 py-1 text-[10px] font-medium transition-all sm:text-xs", logFilter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground sm:text-xs">{filteredLogs.length} logs</span>
                <button onClick={() => setClearLogsConfirm(true)} className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:text-xs"><Trash2 className="h-3 w-3" /> Clear All</button>
              </div>
            </div>
            {filteredLogs.length > 0 ? (
              <div className="space-y-1.5 sm:space-y-2">
                {filteredLogs.map((log) => (
                  <div key={log._id} className="flex items-start gap-2.5 rounded-xl border border-border/40 bg-card px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
                    <div className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md sm:h-7 sm:w-7 sm:rounded-lg", log.action.includes("success") ? "bg-green-50 text-green-600" : log.action.includes("failed") ? "bg-red-50 text-red-500" : log.action.includes("upload") ? "bg-blue-50 text-blue-600" : log.action.includes("delete") ? "bg-red-50 text-red-500" : "bg-muted text-muted-foreground")}>
                      {log.action.includes("success") ? <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : log.action.includes("failed") ? <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <Activity className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground sm:text-sm">{log.action.replace(/_/g, " ")}</p>
                      <p className="text-[10px] text-muted-foreground sm:text-xs">{log.details}</p>
                    </div>
                    <span className="shrink-0 text-[9px] text-muted-foreground/70 sm:text-[10px]">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<Activity className="h-10 w-10" />} title="No activity yet" description="All actions are logged here for your reference." />
            )}
          </motion.div>
        )}

        {/* ── Settings Tab ── */}
        {activeTab === "settings" && (
          <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mx-auto max-w-md space-y-6">
              {/* Change Password */}
              <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><Key className="h-4 w-4 text-primary" /></div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
                    <p className="text-xs text-muted-foreground">Update the admin access password</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Current Password</label>
                    <div className="relative">
                      <input type={showCurrentPw ? "text" : "password"} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 pr-10 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" placeholder="Enter current password" />
                      <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground">{showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">New Password</label>
                    <div className="relative">
                      <input type={showNewPw ? "text" : "password"} value={newPw} onChange={(e) => setNewPw(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 pr-10 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" placeholder="Enter new password" />
                      <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground">{showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                    </div>
                  </div>
                  {pwError && <p className="text-xs text-destructive">{pwError}</p>}
                  {pwSuccess && <p className="text-xs text-green-600">Password updated successfully</p>}
                  <button onClick={handleChangePassword} disabled={pwLoading || !currentPw || !newPw} className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
                    {pwLoading ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </div>

              {/* Remove Password */}
              <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50"><Power className="h-4 w-4 text-red-500" /></div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Remove Password Protection</h3>
                    <p className="text-xs text-muted-foreground">Anyone can access admin without a password</p>
                  </div>
                </div>
                <div className="mt-4">
                  <button onClick={() => setRemovePwConfirm(true)} className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-100">
                    Remove Password
                  </button>
                </div>
              </div>

              {/* Vault Info */}
              <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50"><AlertTriangle className="h-4 w-4 text-amber-600" /></div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Vault Info</h3>
                    <p className="text-xs text-muted-foreground">Current vault configuration</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2.5">
                  <InfoRow label="Upload Password" value="121520" />
                  <InfoRow label="Admin Password" value={passwordStatus?.hasPassword ? `Set (${passwordStatus.passwordLength} chars)` : "None"} />
                  <InfoRow label="Total Photos" value={String(stats?.totalPhotos ?? 0)} />
                  <InfoRow label="Approved" value={String(stats?.approvedPhotos ?? 0)} />
                  <InfoRow label="Pending" value={String(stats?.pendingPhotos ?? 0)} />
                  <InfoRow label="Rejected" value={String(stats?.rejectedPhotos ?? 0)} />
                  <InfoRow label="Activity Logs" value={String(stats?.totalLogs ?? 0)} />
                  <InfoRow label="Today's Uploads" value={String(todayUploads)} />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50"><Wrench className="h-4 w-4 text-blue-600" /></div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
                    <p className="text-xs text-muted-foreground">Common admin operations</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button onClick={() => navigate("/")} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-medium text-foreground hover:bg-muted"><Camera className="h-3.5 w-3.5" /> View Site</button>
                  <button onClick={handleApproveAll} disabled={!pendingPhotos || pendingPhotos.length === 0} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"><CheckCircle className="h-3.5 w-3.5" /> Approve All</button>
                  <button onClick={() => setActiveTab("upload")} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-medium text-foreground hover:bg-muted"><Upload className="h-3.5 w-3.5" /> Upload Photos</button>
                  <button onClick={handleCopyLinks} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-medium text-foreground hover:bg-muted"><Copy className="h-3.5 w-3.5" /> Copy All Links</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Photo Detail Modal ── */}
      <AnimatePresence>
        {photoDetail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setPhotoDetail(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <img src={photoDetail.url} alt={photoDetail.fileName} className="w-full object-cover max-h-[50vh]" />
              <div className="p-4">
                <p className="text-sm font-semibold text-foreground">{photoDetail.fileName}</p>
                <p className="text-xs text-muted-foreground">by {photoDetail.uploadedBy} • {new Date(photoDetail.uploadedAt).toLocaleString()}</p>
                <span className={cn("mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", photoDetail.status === "approved" ? "bg-green-500/10 text-green-600" : photoDetail.status === "pending" ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-500")}>{photoDetail.status}</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {photoDetail.status !== "approved" && <button onClick={() => { approvePhoto({ photoId: photoDetail._id }); setPhotoDetail(null); }} className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-green-500 py-2 text-xs font-semibold text-white hover:bg-green-600"><CheckCircle className="h-3.5 w-3.5" /> Approve</button>}
                  {photoDetail.status !== "rejected" && <button onClick={() => { rejectPhoto({ photoId: photoDetail._id }); setPhotoDetail(null); }} className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-amber-500 py-2 text-xs font-semibold text-white hover:bg-amber-600"><XCircle className="h-3.5 w-3.5" /> Reject</button>}
                  {photoDetail.status === "rejected" && <button onClick={() => { restorePhoto({ photoId: photoDetail._id }); setPhotoDetail(null); }} className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-blue-500 py-2 text-xs font-semibold text-white hover:bg-blue-600"><RotateCcw className="h-3.5 w-3.5" /> Restore</button>}
                  <button onClick={() => { navigator.clipboard.writeText(photoDetail.url); showToast("Link copied"); }} className="inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"><Link className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { setDeleteConfirm(photoDetail._id); setPhotoDetail(null); }} className="inline-flex items-center justify-center gap-1 rounded-xl bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setPhotoDetail(null)} className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation ── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50"><AlertTriangle className="h-5 w-5 text-red-500" /></div>
                <div><h3 className="text-sm font-semibold text-foreground">Delete Photo</h3><p className="text-xs text-muted-foreground">This action cannot be undone.</p></div>
              </div>
              <div className="mt-5 flex gap-2">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-xl border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reject All Confirm ── */}
      <AnimatePresence>
        {rejectAllConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setRejectAllConfirm(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50"><AlertTriangle className="h-5 w-5 text-amber-500" /></div>
                <div><h3 className="text-sm font-semibold text-foreground">Reject All Pending?</h3><p className="text-xs text-muted-foreground">This will reject {pendingPhotos?.length ?? 0} photos.</p></div>
              </div>
              <div className="mt-5 flex gap-2">
                <button onClick={() => setRejectAllConfirm(false)} className="flex-1 rounded-xl border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted">Cancel</button>
                <button onClick={handleRejectAll} className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600">Reject All</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bulk Delete Confirm ── */}
      <AnimatePresence>
        {bulkDeleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setBulkDeleteConfirm(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50"><AlertTriangle className="h-5 w-5 text-red-500" /></div>
                <div><h3 className="text-sm font-semibold text-foreground">Delete {selectedAllPhotos.size} Photos?</h3><p className="text-xs text-muted-foreground">This action cannot be undone.</p></div>
              </div>
              <div className="mt-5 flex gap-2">
                <button onClick={() => setBulkDeleteConfirm(false)} className="flex-1 rounded-xl border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted">Cancel</button>
                <button onClick={handleBulkDelete} className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600">Delete All</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Remove Password Confirm ── */}
      <AnimatePresence>
        {removePwConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setRemovePwConfirm(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50"><Power className="h-5 w-5 text-red-500" /></div>
                <div><h3 className="text-sm font-semibold text-foreground">Remove Password?</h3><p className="text-xs text-muted-foreground">Anyone can access admin without a password.</p></div>
              </div>
              <div className="mt-4">
                <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary" placeholder="Enter current password to confirm" />
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => { setRemovePwConfirm(false); setCurrentPw(""); }} className="flex-1 rounded-xl border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted">Cancel</button>
                <button onClick={handleRemovePassword} disabled={!currentPw} className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50">Remove</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Clear Logs Confirm ── */}
      <AnimatePresence>
        {clearLogsConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setClearLogsConfirm(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50"><Trash2 className="h-5 w-5 text-amber-500" /></div>
                <div><h3 className="text-sm font-semibold text-foreground">Clear All Logs?</h3><p className="text-xs text-muted-foreground">This will permanently delete {logs?.length ?? 0} log entries.</p></div>
              </div>
              <div className="mt-5 flex gap-2">
                <button onClick={() => setClearLogsConfirm(false)} className="flex-1 rounded-xl border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted">Cancel</button>
                <button onClick={handleClearLogs} className="flex-1 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600">Clear All</button>
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

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border/60 bg-card/50 py-12 text-center sm:rounded-3xl sm:py-16">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground/40 sm:h-16 sm:w-16 sm:rounded-2xl">{icon}</div>
      <h3 className="mt-3 text-base font-semibold text-foreground sm:mt-4 sm:text-lg">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{description}</p>
    </div>
  );
}
