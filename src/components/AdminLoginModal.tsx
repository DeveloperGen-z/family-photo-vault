import { useState } from "react";
import { motion } from "framer-motion";
import { X, Shield, Lock, Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";

interface AdminLoginModalProps { onClose: () => void; }

export default function AdminLoginModal({ onClose }: AdminLoginModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const verifyAdmin = useMutation(api.admin.verifyAdminPassword);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setIsLoading(true); setError("");
    try {
      const isValid = await verifyAdmin({ password });
      if (isValid) { localStorage.setItem("family_admin", "true"); navigate("/dashboard"); }
      else { setError("Invalid password. Please try again."); setPassword(""); }
    } catch { setError("Something went wrong."); }
    finally { setIsLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10"><Shield className="h-4 w-4 text-indigo-500" /></div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Admin Access</h2>
              <p className="text-[11px] text-muted-foreground">Enter password to continue</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground/50">For password, contact developer Rajnish</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5">
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/35" />
                <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Enter admin password" autoFocus
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/30 focus:border-ring/30 focus:outline-none focus:ring-2 focus:ring-ring/10 transition-all duration-200" />
              </div>
            </div>

            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</motion.p>
            )}

            <button type="submit" disabled={isLoading || !password.trim()}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]">
              {isLoading ? (<span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</span>) : "Sign In"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
