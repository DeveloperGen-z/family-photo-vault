import { useState } from "react";
import { motion } from "framer-motion";
import { X, Shield, Lock, Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import Logo from "@/components/Logo";

interface AdminLoginModalProps { onClose: () => void; }

export default function AdminLoginModal({ onClose }: AdminLoginModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const verifyAdmin = useMutation(api.admin.verifyAdminPassword);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!password.trim()) return;
    setIsLoading(true); setError("");
    try {
      const isValid = await verifyAdmin({ password });
      if (isValid) { localStorage.setItem("family_admin", "true"); navigate("/dashboard"); }
      else { setError("Invalid password. Please try again."); setPassword(""); }
    } catch { setError("Something went wrong."); }
    finally { setIsLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2 }} className="modal-card" style={{ maxWidth: "380px" }} onClick={(e) => e.stopPropagation()}>

        <div className="modal-head">
          <div className="modal-head-left">
            <div className="modal-head-icon" style={{ background: "rgba(0,113,227,0.12)" }}><Shield className="h-4 w-4" style={{ color: "#0071E3" }} /></div>
            <div>
              <div className="modal-head-title">Admin Access</div>
              <div className="modal-head-sub">Enter password to continue</div>
              <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.2)", marginTop: 2 }}>For password, contact developer Rajnish</div>
            </div>
          </div>
          <button onClick={onClose} className="modal-close"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Logo size={40} variant="light" showText className="justify-center" />
            <div>
              <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Password</label>
              <div style={{ position: "relative" }}>
                <Lock className="h-4 w-4" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.2)" }} />
                <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Enter admin password" autoFocus className="admin-input" />
              </div>
            </div>
            {error && <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="admin-error">{error}</motion.div>}
            <button type="submit" disabled={isLoading || !password.trim()} className="admin-submit">
              {isLoading ? (<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</span>) : "Sign In"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
