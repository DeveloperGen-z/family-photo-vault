import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, LogOut, CheckCircle, XCircle, Trash2, Upload, Clock, Image as ImageIcon, Activity, Shield, ChevronLeft, CheckCheck, Key, Eye, EyeOff, AlertTriangle, Images, Search, BarChart3, Calendar, X, Copy, RotateCcw, Wrench, Link, Power, Users, Globe, Smartphone, Monitor, Tablet, TrendingUp, Download } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";

type Tab = "pending" | "photos" | "upload" | "analytics" | "logs" | "settings";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const navigate = useNavigate();
  useEffect(() => { if (localStorage.getItem("family_admin") !== "true") navigate("/"); }, [navigate]);

  // Data
  const pendingPhotos = useQuery(api.photos.listPending);
  const allPhotos = useQuery(api.photos.listAll);
  const stats = useQuery(api.admin.getStats);
  const logs = useQuery(api.admin.getLogs);
  const passwordStatus = useQuery(api.admin.getPasswordStatus);

  // Analytics
  const visitorCount = useQuery(api.traffic.getVisitorCount);
  const uniqueVisitors = useQuery(api.traffic.getUniqueVisitorCount);
  const todayVisitors = useQuery(api.traffic.getTodayVisitorCount);
  const photoViewCount = useQuery(api.traffic.getPhotoViewCount);
  const todayPhotoViews = useQuery(api.traffic.getTodayPhotoViews);
  const geoBreakdown = useQuery(api.traffic.getGeoBreakdown);
  const deviceBreakdown = useQuery(api.traffic.getDeviceBreakdown);
  const dailyTraffic = useQuery(api.traffic.getDailyTraffic);
  const mostViewedPhotos = useQuery(api.traffic.getMostViewedPhotos);
  const recentVisitors = useQuery(api.traffic.getRecentVisitors);
  const hourlyTraffic = useQuery(api.traffic.getHourlyTraffic);

  // Mutations
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
  const clearVisitors = useMutation(api.traffic.clearVisitors);
  const clearPhotoViews = useMutation(api.traffic.clearPhotoViews);
  const changeUploadPassword = useMutation(api.admin.changeUploadPassword);
  const removeUploadPassword = useMutation(api.admin.removeUploadPassword);

  // UI State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedAllPhotos, setSelectedAllPhotos] = useState<Set<string>>(new Set());
  const [photoDetail, setPhotoDetail] = useState<any | null>(null);
  const [photoSearch, setPhotoSearch] = useState("");
  const [photoFilter, setPhotoFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");
  const [logFilter, setLogFilter] = useState<"all" | "login" | "upload" | "delete" | "approve">("all");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [newUploadPw, setNewUploadPw] = useState("");
  const [uploadPwSuccess, setUploadPwSuccess] = useState(false);
  const [clearLogsConfirm, setClearLogsConfirm] = useState(false);
  const [removePwConfirm, setRemovePwConfirm] = useState(false);
  const [rejectAllConfirm, setRejectAllConfirm] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // Handlers
  const handleLogout = () => { localStorage.removeItem("family_admin"); navigate("/"); };
  const toggleSelect = (id: string) => { setSelectedPhotos((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const toggleSelectAll = () => { if (!pendingPhotos) return; setSelectedPhotos(selectedPhotos.size === pendingPhotos.length ? new Set() : new Set(pendingPhotos.map((p) => p._id))); };
  const toggleSelectAllPhotos = () => { if (!filteredPhotos) return; setSelectedAllPhotos(selectedAllPhotos.size === filteredPhotos.length ? new Set() : new Set(filteredPhotos.map((p) => p._id))); };
  const handleBulkAction = async (action: "approve" | "reject") => { const fn = action === "approve" ? approvePhoto : rejectPhoto; for (const id of selectedPhotos) await fn({ photoId: id as any }); setSelectedPhotos(new Set()); };
  const handleApproveAll = async () => { const c = await approveAll({}); showToast(`${c} photos approved`); };
  const handleRejectAll = async () => { const c = await rejectAll({}); setRejectAllConfirm(false); showToast(`${c} photos rejected`); };
  const handleBulkDelete = async () => { const ids = Array.from(selectedAllPhotos); await bulkDelete({ photoIds: ids as any }); setSelectedAllPhotos(new Set()); setBulkDeleteConfirm(false); showToast(`${ids.length} photos deleted`); };

  const handleAdminUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files || files.length === 0) return;
    setIsUploading(true); let uploaded = 0;
    for (const file of Array.from(files)) {
      setUploadProgress(`Uploading ${uploaded + 1} of ${files.length}...`);
      try {
        const url = await generateUploadUrl(); const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
        const { storageId } = await res.json(); await uploadPhoto({ storageId, fileName: file.name, uploadedBy: "admin", status: "approved" }); uploaded++;
      } catch (err) { console.error(err); }
    }
    setIsUploading(false); setUploadProgress(null); e.target.value = "";
    if (uploaded > 0) showToast(`${uploaded} photo${uploaded !== 1 ? "s" : ""} uploaded`);
  };

  const handleDelete = async (id: string) => { await deletePhoto({ photoId: id as any }); setDeleteConfirm(null); setPhotoDetail(null); };
  const handleChangePassword = async () => { setPwError(""); setPwSuccess(false); setPwLoading(true); try { await changeAdminPassword({ currentPassword: currentPw, newPassword: newPw }); setPwSuccess(true); setCurrentPw(""); setNewPw(""); } catch (e: any) { setPwError(e.message); } finally { setPwLoading(false); } };
  const handleRemovePassword = async () => { try { await removeAdminPassword({ currentPassword: currentPw }); setRemovePwConfirm(false); setCurrentPw(""); showToast("Admin password removed"); } catch (e: any) { setPwError(e.message); } };
  const handleChangeUploadPw = async () => { try { await changeUploadPassword({ newPassword: newUploadPw }); setUploadPwSuccess(true); setNewUploadPw(""); showToast("Upload password changed"); } catch {} };
  const handleRemoveUploadPw = async () => { await removeUploadPassword({}); showToast("Upload password removed"); };
  const handleClearLogs = async () => { await clearLogs({}); setClearLogsConfirm(false); showToast("Logs cleared"); };
  const handleClearVisitors = async () => { await clearVisitors({}); showToast("Visitor data cleared"); };
  const handleClearPhotoViews = async () => { await clearPhotoViews({}); showToast("Photo view data cleared"); };
  const handleCopyLinks = async () => { if (!allPhotos) return; const links = allPhotos.filter((p) => p.status === "approved" && p.url).map((p) => p.url).join("\n"); await navigator.clipboard.writeText(links); showToast("Links copied"); };

  const filteredPhotos = useMemo(() => { if (!allPhotos) return []; return allPhotos.filter((p) => (photoFilter === "all" || p.status === photoFilter) && (photoSearch === "" || p.fileName.toLowerCase().includes(photoSearch.toLowerCase()))); }, [allPhotos, photoFilter, photoSearch]);
  const filteredLogs = useMemo(() => { if (!logs) return []; return [...logs].reverse().filter((l) => logFilter === "all" || l.action.includes(logFilter === "approve" ? "approve" : logFilter)); }, [logs, logFilter]);
  const todayUploads = useMemo(() => { if (!allPhotos) return 0; const t = new Date().toDateString(); return allPhotos.filter((p) => new Date(p.uploadedAt).toDateString() === t).length; }, [allPhotos]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "pending", label: "Pending", icon: <Clock className="h-4 w-4" />, count: pendingPhotos?.length },
    { id: "photos", label: "Photos", icon: <ImageIcon className="h-4 w-4" />, count: allPhotos?.length },
    { id: "upload", label: "Upload", icon: <Upload className="h-4 w-4" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "logs", label: "Logs", icon: <Activity className="h-4 w-4" /> },
    { id: "settings", label: "Settings", icon: <Key className="h-4 w-4" /> },
  ];

  const maxDaily = Math.max(...(dailyTraffic?.map((d) => d.count) ?? [1]), 1);
  const maxHourly = Math.max(...(hourlyTraffic?.map((h) => h.count) ?? [1]), 1);

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence>{toast && <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-4 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-xl">{toast}</motion.div>}</AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => navigate("/")} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground sm:rounded-xl sm:p-2"><ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" /></button>
            <Logo size={32} variant="dark" />
            <div className="hidden sm:block"><h1 className="text-base font-bold text-foreground sm:text-lg" style={{ fontFamily: "var(--font-serif)" }}>Admin Dashboard</h1><p className="text-[10px] text-muted-foreground sm:text-xs">Manage the family vault</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/")} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted sm:px-4 sm:py-2 sm:text-sm"><Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="hidden sm:inline">View Site</span></button>
            <button onClick={handleLogout} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"><LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="hidden sm:inline">Sign Out</span></button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="grid grid-cols-3 gap-3 sm:gap-4 md:grid-cols-6">
          {[
            { label: "Photos", value: stats?.totalPhotos ?? 0, icon: <Images className="h-4 w-4" />, color: "text-primary", bg: "bg-primary/10" },
            { label: "Approved", value: stats?.approvedPhotos ?? 0, icon: <CheckCircle className="h-4 w-4" />, color: "text-green-600", bg: "bg-green-50" },
            { label: "Pending", value: stats?.pendingPhotos ?? 0, icon: <Clock className="h-4 w-4" />, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Visitors", value: uniqueVisitors ?? 0, icon: <Users className="h-4 w-4" />, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Views", value: photoViewCount?.views ?? 0, icon: <Eye className="h-4 w-4" />, color: "text-purple-600", bg: "bg-purple-50" },
            { label: "Downloads", value: photoViewCount?.downloads ?? 0, icon: <Download className="h-4 w-4" />, color: "text-emerald-600", bg: "bg-emerald-50" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border/60 bg-card p-3 sm:rounded-2xl sm:p-4">
              <div className="flex items-center gap-2"><div className={cn("flex h-6 w-6 items-center justify-center rounded-md", s.bg, s.color)}>{s.icon}</div><p className="text-[10px] font-medium text-muted-foreground sm:text-xs">{s.label}</p></div>
              <p className={cn("mt-1.5 text-xl font-bold sm:text-2xl", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="flex gap-0.5 rounded-xl border border-border/60 bg-muted/50 p-0.5 sm:gap-1 sm:rounded-2xl sm:p-1">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg px-1.5 py-2 text-[10px] font-medium transition-all sm:gap-2 sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-sm", activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {tab.icon}<span className="hidden sm:inline">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && <span className={cn("inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white sm:h-5 sm:min-w-[20px] sm:px-1.5 sm:text-[10px]", tab.id === "pending" ? "bg-amber-500" : "bg-primary")}>{tab.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {activeTab === "pending" && selectedPhotos.size > 0 && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mx-auto max-w-6xl overflow-hidden px-4 pt-3 sm:px-6"><div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5"><span className="text-xs font-medium text-primary">{selectedPhotos.size} selected</span><div className="flex gap-2"><button onClick={() => handleBulkAction("approve")} className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600">Approve</button><button onClick={() => handleBulkAction("reject")} className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600">Reject</button><button onClick={() => setSelectedPhotos(new Set())} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">Clear</button></div></div></motion.div>}
        {activeTab === "photos" && selectedAllPhotos.size > 0 && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mx-auto max-w-6xl overflow-hidden px-4 pt-3 sm:px-6"><div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-2.5"><span className="text-xs font-medium text-red-600">{selectedAllPhotos.size} selected</span><div className="flex gap-2"><button onClick={() => { Array.from(selectedAllPhotos).forEach((id) => approvePhoto({ photoId: id as any })); setSelectedAllPhotos(new Set()); showToast("Approved"); }} className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600">Approve</button><button onClick={() => { Array.from(selectedAllPhotos).forEach((id) => rejectPhoto({ photoId: id as any })); setSelectedAllPhotos(new Set()); showToast("Rejected"); }} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600">Reject</button><button onClick={() => setBulkDeleteConfirm(true)} className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600">Delete</button><button onClick={() => setSelectedAllPhotos(new Set())} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">Clear</button></div></div></motion.div>}
      </AnimatePresence>

      {/* Tab Content */}
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
        {/* Pending */}
        {activeTab === "pending" && <motion.div key="pending" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {pendingPhotos && pendingPhotos.length > 0 ? (<>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button onClick={toggleSelectAll} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"><CheckCheck className="h-3.5 w-3.5" />{selectedPhotos.size === pendingPhotos.length ? "Deselect All" : "Select All"}</button>
              <div className="flex gap-2"><button onClick={handleApproveAll} className="inline-flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600"><CheckCircle className="h-3.5 w-3.5" /> Approve All ({pendingPhotos.length})</button><button onClick={() => setRejectAllConfirm(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"><XCircle className="h-3.5 w-3.5" /> Reject All</button></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pendingPhotos.map((photo) => (<div key={photo._id} className={cn("overflow-hidden rounded-xl border bg-card transition-all sm:rounded-2xl", selectedPhotos.has(photo._id) ? "border-primary/50 ring-1 ring-primary/20" : "border-border/60")}><div className="relative"><img src={photo.url} alt={photo.fileName} className="aspect-[4/3] w-full object-cover" /><button onClick={() => toggleSelect(photo._id)} className={cn("absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all", selectedPhotos.has(photo._id) ? "border-primary bg-primary text-white" : "border-white/60 bg-black/30 text-white/0 hover:border-white/80")}>{selectedPhotos.has(photo._id) && <CheckCircle className="h-3.5 w-3.5" />}</button></div><div className="p-3"><p className="truncate text-xs font-medium text-foreground sm:text-sm">{photo.fileName}</p><p className="mt-0.5 text-[10px] text-muted-foreground">by {photo.uploadedBy} • {new Date(photo.uploadedAt).toLocaleDateString()}</p><div className="mt-2 flex gap-2"><button onClick={() => approvePhoto({ photoId: photo._id })} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-500 py-1.5 text-[10px] font-semibold text-white hover:bg-green-600 sm:text-xs"><CheckCircle className="h-3 w-3" /> Approve</button><button onClick={() => rejectPhoto({ photoId: photo._id })} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-muted py-1.5 text-[10px] font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:text-xs"><XCircle className="h-3 w-3" /> Reject</button></div></div></div>))}
            </div>
          </>) : <EmptyState icon={<Clock className="h-10 w-10" />} title="No pending photos" description="Photos submitted by family appear here." />}
        </motion.div>}

        {/* Photos */}
        {activeTab === "photos" && <motion.div key="photos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-4 space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" /><input type="text" placeholder="Search..." value={photoSearch} onChange={(e) => setPhotoSearch(e.target.value)} className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 sm:text-sm" /></div>
              <div className="flex gap-0.5 rounded-lg border border-border/60 bg-muted/50 p-0.5">{(["all", "approved", "pending", "rejected"] as const).map((f) => <button key={f} onClick={() => setPhotoFilter(f)} className={cn("rounded-md px-2.5 py-1 text-[10px] font-medium transition-all sm:text-xs", photoFilter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{f[0].toUpperCase() + f.slice(1)}</button>)}</div>
            </div>
            <div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground sm:text-xs">{filteredPhotos.length} photos</span><div className="flex gap-2"><button onClick={handleCopyLinks} className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted sm:text-xs"><Copy className="h-3 w-3" /> Copy Links</button>{selectedAllPhotos.size === 0 ? <button onClick={toggleSelectAllPhotos} className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted sm:text-xs"><CheckCheck className="h-3 w-3" /> Select</button> : <button onClick={() => setSelectedAllPhotos(new Set())} className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted sm:text-xs">Clear</button>}</div></div>
          </div>
          {filteredPhotos.length > 0 ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{filteredPhotos.map((photo) => (<div key={photo._id} className={cn("group overflow-hidden rounded-xl border bg-card transition-all sm:rounded-2xl", selectedAllPhotos.has(photo._id) ? "border-red-400 ring-1 ring-red-200" : "border-border/60")}><div className="relative aspect-square cursor-pointer" onClick={() => setPhotoDetail(photo)}><img src={photo.url} alt={photo.fileName} className="h-full w-full object-cover" />{selectedAllPhotos.size > 0 && <button onClick={(e) => { e.stopPropagation(); setSelectedAllPhotos((p) => { const n = new Set(p); n.has(photo._id) ? n.delete(photo._id) : n.add(photo._id); return n; }); }} className={cn("absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all", selectedAllPhotos.has(photo._id) ? "border-red-500 bg-red-500 text-white" : "border-white/60 bg-black/30 text-white/0 hover:border-white/80")}>{selectedAllPhotos.has(photo._id) && <CheckCircle className="h-3.5 w-3.5" />}</button>}<div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">{photo.status !== "approved" && <button onClick={(e) => { e.stopPropagation(); approvePhoto({ photoId: photo._id }); }} className="rounded-lg bg-green-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-green-600">Approve</button>}{photo.status !== "rejected" && <button onClick={(e) => { e.stopPropagation(); rejectPhoto({ photoId: photo._id }); }} className="rounded-lg bg-amber-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-amber-600">Reject</button>}{photo.status === "rejected" && <button onClick={(e) => { e.stopPropagation(); restorePhoto({ photoId: photo._id }); }} className="rounded-lg bg-blue-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-blue-600">Restore</button>}<button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(photo._id); }} className="rounded-lg bg-red-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-600">Delete</button></div><span className={cn("absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase sm:right-2 sm:top-2 sm:px-2 sm:text-[10px]", photo.status === "approved" ? "bg-green-500/90 text-white" : photo.status === "pending" ? "bg-amber-500/90 text-white" : "bg-red-500/90 text-white")}>{photo.status}</span></div><div className="p-2 sm:p-3"><p className="truncate text-[10px] text-muted-foreground sm:text-xs">{photo.fileName}</p><p className="text-[9px] text-muted-foreground/70">by {photo.uploadedBy} • {new Date(photo.uploadedAt).toLocaleDateString()}</p></div></div>))}</div> : <EmptyState icon={<Camera className="h-10 w-10" />} title="No photos" description={photoSearch || photoFilter !== "all" ? "Try different search." : "Upload the first photo."} />}
        </motion.div>}

        {/* Upload */}
        {activeTab === "upload" && <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="rounded-2xl border-2 border-dashed border-border/60 bg-card/50 p-8 text-center sm:rounded-3xl sm:p-12">
            <Upload className="mx-auto h-10 w-10 text-muted-foreground/40 sm:h-12 sm:w-12" />
            <h3 className="mt-3 text-base font-semibold text-foreground sm:mt-4 sm:text-lg">Admin Upload</h3>
            <p className="mt-1.5 text-xs text-muted-foreground sm:mt-2 sm:text-sm">Photos are approved immediately.</p>
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 sm:mt-6 sm:px-6 sm:py-3 sm:text-sm"><Camera className="h-4 w-4" /> Choose Photos<input type="file" multiple accept="image/*" className="hidden" onChange={handleAdminUpload} disabled={isUploading} /></label>
            {uploadProgress && <p className="mt-3 text-xs text-primary sm:text-sm">{uploadProgress}</p>}
          </div>
        </motion.div>}

        {/* Analytics */}
        {activeTab === "analytics" && <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Total Visitors", value: visitorCount ?? 0, icon: <Users className="h-4 w-4" />, color: "text-blue-600" },
                { label: "Unique Visitors", value: uniqueVisitors ?? 0, icon: <Globe className="h-4 w-4" />, color: "text-purple-600" },
                { label: "Today's Visitors", value: todayVisitors ?? 0, icon: <TrendingUp className="h-4 w-4" />, color: "text-green-600" },
                { label: "Today's Views", value: todayPhotoViews?.views ?? 0, icon: <Eye className="h-4 w-4" />, color: "text-amber-600" },
              ].map((s) => <div key={s.label} className="rounded-xl border border-border/60 bg-card p-3 sm:p-4"><div className="flex items-center gap-2"><span className={s.color}>{s.icon}</span><span className="text-[10px] text-muted-foreground sm:text-xs">{s.label}</span></div><p className={cn("mt-1 text-xl font-bold sm:text-2xl", s.color)}>{s.value}</p></div>)}
            </div>

            {/* Daily Traffic (7 days) */}
            <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-semibold text-foreground">Daily Traffic (7 Days)</h3><div className="flex gap-2"><button onClick={handleClearVisitors} className="text-[10px] text-muted-foreground hover:text-destructive sm:text-xs">Clear</button></div></div>
              <div className="flex items-end gap-1.5 h-32 sm:h-40">
                {dailyTraffic?.map((d, i) => (<div key={i} className="flex flex-col items-center flex-1 gap-1"><span className="text-[8px] text-muted-foreground sm:text-[10px]">{d.count}</span><div className="w-full rounded-t-md bg-primary/20 transition-all" style={{ height: `${(d.count / maxDaily) * 100}%`, minHeight: d.count > 0 ? "4px" : "0" }} /><span className="text-[7px] text-muted-foreground/60 sm:text-[9px]">{d.label.split(" ")[0]}</span></div>))}
              </div>
            </div>

            {/* Hourly Traffic */}
            <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Hourly Traffic (24h)</h3>
              <div className="flex items-end gap-[2px] h-24 sm:h-32">
                {hourlyTraffic?.map((h, i) => (<div key={i} className="flex flex-col items-center flex-1 gap-0.5" title={`${h.label}: ${h.count}`}><div className="w-full rounded-t-sm bg-blue-500/30 hover:bg-blue-500/50 transition-colors" style={{ height: `${(h.count / maxHourly) * 100}%`, minHeight: h.count > 0 ? "2px" : "0" }} /></div>))}
              </div>
              <div className="flex justify-between mt-1"><span className="text-[7px] text-muted-foreground/50">00:00</span><span className="text-[7px] text-muted-foreground/50">06:00</span><span className="text-[7px] text-muted-foreground/50">12:00</span><span className="text-[7px] text-muted-foreground/50">18:00</span><span className="text-[7px] text-muted-foreground/50">23:00</span></div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Device Breakdown */}
              <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Devices</h3>
                {deviceBreakdown && deviceBreakdown.length > 0 ? <div className="space-y-3">{deviceBreakdown.map((d) => { const total = deviceBreakdown.reduce((a, b) => a + b.count, 0); const pct = total > 0 ? Math.round((d.count / total) * 100) : 0; return <div key={d.name} className="flex items-center gap-3"><span className="text-muted-foreground">{d.name === "mobile" ? <Smartphone className="h-4 w-4" /> : d.name === "tablet" ? <Tablet className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}</span><div className="flex-1"><div className="flex items-center justify-between mb-1"><span className="text-xs text-foreground capitalize">{d.name}</span><span className="text-[10px] text-muted-foreground">{d.count} ({pct}%)</span></div><div className="h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-primary/30" style={{ width: `${pct}%` }} /></div></div></div>})}</div> : <p className="text-xs text-muted-foreground">No data yet</p>}
              </div>

              {/* Top Countries */}
              <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Top Locations</h3>
                {geoBreakdown?.countries && geoBreakdown.countries.length > 0 ? <div className="space-y-2">{geoBreakdown.countries.slice(0, 5).map((c) => (<div key={c.name} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"><div className="flex items-center gap-2"><Globe className="h-3 w-3 text-muted-foreground" /><span className="text-xs text-foreground">{c.name}</span></div><span className="text-[10px] text-muted-foreground">{c.count}</span></div>))}</div> : <p className="text-xs text-muted-foreground">No geo data yet</p>}
              </div>
            </div>

            {/* Most Viewed Photos */}
            {mostViewedPhotos && mostViewedPhotos.length > 0 && (
              <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Most Viewed Photos</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs"><thead><tr className="border-b border-border/40 text-left"><th className="pb-2 font-medium text-muted-foreground">Photo</th><th className="pb-2 font-medium text-muted-foreground">Status</th><th className="pb-2 font-medium text-muted-foreground text-right">Views</th><th className="pb-2 font-medium text-muted-foreground text-right">Downloads</th><th className="pb-2 font-medium text-muted-foreground text-right">Total</th></tr></thead><tbody>{mostViewedPhotos.slice(0, 10).map((p) => (<tr key={p.photoId} className="border-b border-border/20"><td className="py-2 truncate max-w-[200px]">{p.fileName}</td><td className="py-2"><span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase", p.status === "approved" ? "bg-green-500/10 text-green-600" : p.status === "pending" ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-500")}>{p.status}</span></td><td className="py-2 text-right text-muted-foreground">{p.views}</td><td className="py-2 text-right text-muted-foreground">{p.downloads}</td><td className="py-2 text-right font-medium">{p.total}</td></tr>))}</tbody></table>
                </div>
                <div className="mt-3 flex justify-end"><button onClick={handleClearPhotoViews} className="text-[10px] text-muted-foreground hover:text-destructive sm:text-xs">Clear view data</button></div>
              </div>
            )}

            {/* Recent Visitors */}
            {recentVisitors && recentVisitors.length > 0 && (
              <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Recent Visitors</h3>
                <div className="space-y-1.5">{recentVisitors.slice(0, 15).map((v) => (<div key={v._id} className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2"><div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary"><Users className="h-3 w-3" /></div><div className="flex-1 min-w-0"><p className="text-[10px] text-foreground truncate sm:text-xs">{v.ip}</p><p className="text-[9px] text-muted-foreground">{v.device} • {v.page}</p></div><span className="text-[8px] text-muted-foreground/60 sm:text-[9px]">{new Date(v.timestamp).toLocaleString()}</span></div>))}</div>
              </div>
            )}
          </div>
        </motion.div>}

        {/* Logs */}
        {activeTab === "logs" && <motion.div key="logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-0.5 rounded-lg border border-border/60 bg-muted/50 p-0.5">{(["all", "login", "upload", "delete", "approve"] as const).map((f) => <button key={f} onClick={() => setLogFilter(f)} className={cn("rounded-md px-2.5 py-1 text-[10px] font-medium transition-all sm:text-xs", logFilter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{f[0].toUpperCase() + f.slice(1)}</button>)}</div>
            <div className="flex items-center gap-2"><span className="text-[10px] text-muted-foreground sm:text-xs">{filteredLogs.length} logs</span><button onClick={() => setClearLogsConfirm(true)} className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:text-xs"><Trash2 className="h-3 w-3" /> Clear</button></div>
          </div>
          {filteredLogs.length > 0 ? <div className="space-y-1.5">{filteredLogs.map((log) => (<div key={log._id} className="flex items-start gap-2.5 rounded-xl border border-border/40 bg-card px-3 py-2.5 sm:px-4 sm:py-3"><div className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md sm:h-7 sm:w-7 sm:rounded-lg", log.action.includes("success") ? "bg-green-50 text-green-600" : log.action.includes("failed") ? "bg-red-50 text-red-500" : log.action.includes("upload") ? "bg-blue-50 text-blue-600" : log.action.includes("delete") ? "bg-red-50 text-red-500" : "bg-muted text-muted-foreground")}>{log.action.includes("success") ? <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : log.action.includes("failed") ? <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <Activity className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}</div><div className="flex-1 min-w-0"><p className="text-xs font-medium text-foreground sm:text-sm">{log.action.replace(/_/g, " ")}</p><p className="text-[10px] text-muted-foreground sm:text-xs">{log.details}</p></div><span className="shrink-0 text-[9px] text-muted-foreground/70 sm:text-[10px]">{new Date(log.timestamp).toLocaleString()}</span></div>))}</div> : <EmptyState icon={<Activity className="h-10 w-10" />} title="No activity" description="Actions are logged here." />}
        </motion.div>}

        {/* Settings */}
        {activeTab === "settings" && <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mx-auto max-w-md space-y-5">
            {/* Change Admin Password */}
            <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
              <div className="flex items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><Key className="h-4 w-4 text-primary" /></div><div><h3 className="text-sm font-semibold text-foreground">Change Admin Password</h3><p className="text-xs text-muted-foreground">Update admin access password</p></div></div>
              <div className="mt-5 space-y-3">
                <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Current Password</label><div className="relative"><input type={showCurrentPw ? "text" : "password"} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 pr-10 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" placeholder="Current password" /><button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground">{showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                <div><label className="mb-1 block text-xs font-medium text-muted-foreground">New Password</label><div className="relative"><input type={showNewPw ? "text" : "password"} value={newPw} onChange={(e) => setNewPw(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 pr-10 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" placeholder="New password" /><button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground">{showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                {pwError && <p className="text-xs text-destructive">{pwError}</p>}{pwSuccess && <p className="text-xs text-green-600">Password updated!</p>}
                <button onClick={handleChangePassword} disabled={pwLoading || !currentPw || !newPw} className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{pwLoading ? "Updating..." : "Update Password"}</button>
              </div>
            </div>

            {/* Remove Admin Password */}
            <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
              <div className="flex items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50"><Power className="h-4 w-4 text-red-500" /></div><div><h3 className="text-sm font-semibold text-foreground">Remove Admin Password</h3><p className="text-xs text-muted-foreground">No password needed for admin</p></div></div>
              <button onClick={() => setRemovePwConfirm(true)} className="mt-4 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100">Remove Password</button>
            </div>

            {/* Upload Password Management */}
            <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
              <div className="flex items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50"><Key className="h-4 w-4 text-amber-600" /></div><div><h3 className="text-sm font-semibold text-foreground">Upload Password</h3><p className="text-xs text-muted-foreground">Password for family uploads</p></div></div>
              <div className="mt-4 space-y-3">
                <InfoRow label="Current" value={passwordStatus?.hasUploadPassword ? passwordStatus.uploadPassword : "None (open)"} />
                <div><label className="mb-1 block text-xs font-medium text-muted-foreground">New Upload Password</label><input type="text" value={newUploadPw} onChange={(e) => setNewUploadPw(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary" placeholder="Enter new upload password" /></div>
                {uploadPwSuccess && <p className="text-xs text-green-600">Upload password changed!</p>}
                <div className="flex gap-2">
                  <button onClick={handleChangeUploadPw} disabled={!newUploadPw} className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Change</button>
                  <button onClick={handleRemoveUploadPw} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100">Remove</button>
                </div>
              </div>
            </div>

            {/* Vault Info */}
            <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
              <div className="flex items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50"><BarChart3 className="h-4 w-4 text-blue-600" /></div><div><h3 className="text-sm font-semibold text-foreground">Vault Info</h3></div></div>
              <div className="mt-4 space-y-2">
                <InfoRow label="Admin Password" value={passwordStatus?.hasAdminPassword ? "Set" : "None"} />
                <InfoRow label="Upload Password" value={passwordStatus?.hasUploadPassword ? "Set" : "None (open)"} />
                <InfoRow label="Total Photos" value={String(stats?.totalPhotos ?? 0)} />
                <InfoRow label="Total Visitors" value={String(uniqueVisitors ?? 0)} />
                <InfoRow label="Total Views" value={String(photoViewCount?.views ?? 0)} />
                <InfoRow label="Total Downloads" value={String(photoViewCount?.downloads ?? 0)} />
                <InfoRow label="Today Uploads" value={String(todayUploads)} />
                <InfoRow label="Today Visitors" value={String(todayVisitors ?? 0)} />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
              <div className="flex items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50"><Wrench className="h-4 w-4 text-purple-600" /></div><div><h3 className="text-sm font-semibold text-foreground">Quick Actions</h3></div></div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => navigate("/")} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-medium text-foreground hover:bg-muted"><Camera className="h-3.5 w-3.5" /> View Site</button>
                <button onClick={handleApproveAll} disabled={!pendingPhotos?.length} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"><CheckCircle className="h-3.5 w-3.5" /> Approve All</button>
                <button onClick={handleCopyLinks} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-medium text-foreground hover:bg-muted"><Copy className="h-3.5 w-3.5" /> Copy Links</button>
                <button onClick={() => setActiveTab("upload")} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-medium text-foreground hover:bg-muted"><Upload className="h-3.5 w-3.5" /> Upload</button>
              </div>
            </div>
          </div>
        </motion.div>}
      </div>

      {/* Modals */}
      {photoDetail && <AnimatePresence><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setPhotoDetail(null)}><motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}><img src={photoDetail.url} alt={photoDetail.fileName} className="w-full object-cover max-h-[50vh]" /><div className="p-4"><p className="text-sm font-semibold text-foreground">{photoDetail.fileName}</p><p className="text-xs text-muted-foreground">by {photoDetail.uploadedBy} • {new Date(photoDetail.uploadedAt).toLocaleString()}</p><span className={cn("mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", photoDetail.status === "approved" ? "bg-green-500/10 text-green-600" : photoDetail.status === "pending" ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-500")}>{photoDetail.status}</span><div className="mt-3 flex flex-wrap gap-2">{photoDetail.status !== "approved" && <button onClick={() => { approvePhoto({ photoId: photoDetail._id }); setPhotoDetail(null); }} className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-green-500 py-2 text-xs font-semibold text-white hover:bg-green-600">Approve</button>}{photoDetail.status !== "rejected" && <button onClick={() => { rejectPhoto({ photoId: photoDetail._id }); setPhotoDetail(null); }} className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-amber-500 py-2 text-xs font-semibold text-white hover:bg-amber-600">Reject</button>}{photoDetail.status === "rejected" && <button onClick={() => { restorePhoto({ photoId: photoDetail._id }); setPhotoDetail(null); }} className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-blue-500 py-2 text-xs font-semibold text-white hover:bg-blue-600">Restore</button>}<button onClick={() => { navigator.clipboard.writeText(photoDetail.url); showToast("Copied"); }} className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"><Link className="h-3.5 w-3.5" /></button><button onClick={() => { setDeleteConfirm(photoDetail._id); setPhotoDetail(null); }} className="inline-flex items-center justify-center rounded-xl bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600"><Trash2 className="h-3.5 w-3.5" /></button><button onClick={() => setPhotoDetail(null)} className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"><X className="h-3.5 w-3.5" /></button></div></div></motion.div></motion.div></AnimatePresence>}

      {deleteConfirm && <ConfirmModal title="Delete Photo?" desc="This cannot be undone." onConfirm={() => handleDelete(deleteConfirm)} onCancel={() => setDeleteConfirm(null)} />}
      {rejectAllConfirm && <ConfirmModal title={`Reject All (${pendingPhotos?.length ?? 0})?`} desc="All pending photos will be rejected." onConfirm={handleRejectAll} onCancel={() => setRejectAllConfirm(false)} btnLabel="Reject All" btnColor="bg-red-500 hover:bg-red-600" />}
      {bulkDeleteConfirm && <ConfirmModal title={`Delete ${selectedAllPhotos.size} Photos?`} desc="This cannot be undone." onConfirm={handleBulkDelete} onCancel={() => setBulkDeleteConfirm(false)} btnLabel="Delete All" btnColor="bg-red-500 hover:bg-red-600" />}
      {removePwConfirm && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setRemovePwConfirm(false)}><motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50"><Power className="h-5 w-5 text-red-500" /></div><div><h3 className="text-sm font-semibold text-foreground">Remove Admin Password?</h3><p className="text-xs text-muted-foreground">No password needed for admin access.</p></div></div><input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary" placeholder="Current password to confirm" /><div className="mt-4 flex gap-2"><button onClick={() => { setRemovePwConfirm(false); setCurrentPw(""); }} className="flex-1 rounded-xl border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted">Cancel</button><button onClick={handleRemovePassword} disabled={!currentPw} className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50">Remove</button></div></motion.div></motion.div>}
      {clearLogsConfirm && <ConfirmModal title="Clear All Logs?" desc="All activity logs will be deleted." onConfirm={handleClearLogs} onCancel={() => setClearLogsConfirm(false)} btnLabel="Clear" btnColor="bg-amber-500 hover:bg-amber-600" />}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"><span className="text-xs text-muted-foreground">{label}</span><span className="font-mono text-xs font-medium text-foreground">{value}</span></div>;
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return <div className="rounded-2xl border-2 border-dashed border-border/60 bg-card/50 py-12 text-center sm:rounded-3xl sm:py-16"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground/40 sm:h-16 sm:w-16 sm:rounded-2xl">{icon}</div><h3 className="mt-3 text-base font-semibold text-foreground sm:mt-4 sm:text-lg">{title}</h3><p className="mt-1 text-xs text-muted-foreground sm:text-sm">{description}</p></div>;
}

function ConfirmModal({ title, desc, onConfirm, onCancel, btnLabel = "Confirm", btnColor = "bg-red-500 hover:bg-red-600" }: { title: string; desc: string; onConfirm: () => void; onCancel: () => void; btnLabel?: string; btnColor?: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onCancel}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50"><AlertTriangle className="h-5 w-5 text-red-500" /></div><div><h3 className="text-sm font-semibold text-foreground">{title}</h3><p className="text-xs text-muted-foreground">{desc}</p></div></div>
        <div className="mt-5 flex gap-2"><button onClick={onCancel} className="flex-1 rounded-xl border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted">Cancel</button><button onClick={onConfirm} className={cn("flex-1 rounded-xl px-4 py-2 text-xs font-semibold text-white", btnColor)}>{btnLabel}</button></div>
      </motion.div>
    </motion.div>
  );
}
