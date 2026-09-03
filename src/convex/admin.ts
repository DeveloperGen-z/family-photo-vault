import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DEFAULT_ADMIN_PASSWORD = "admin123";
const DEFAULT_UPLOAD_PASSWORD = "121520";

// ─── Helper ───
async function getPassword(ctx: any, key: string, defaultVal: string) {
  const setting = await ctx.db
    .query("siteSettings")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();
  return setting?.value ?? defaultVal;
}

// ─── Admin Password ───
export const setAdminPassword = mutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "admin_password"))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.password });
    } else {
      await ctx.db.insert("siteSettings", { key: "admin_password", value: args.password });
    }
  },
});

export const verifyAdminPassword = mutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    const stored = await getPassword(ctx, "admin_password", DEFAULT_ADMIN_PASSWORD);
    if (!stored) {
      // No password set — allow access
      await ctx.db.insert("adminLogs", {
        action: "admin_login_success",
        details: "Admin logged in (no password set)",
        timestamp: Date.now(),
      });
      return true;
    }
    const isValid = args.password === stored;
    await ctx.db.insert("adminLogs", {
      action: isValid ? "admin_login_success" : "admin_login_failed",
      details: isValid ? "Admin logged in successfully" : "Failed admin login attempt",
      timestamp: Date.now(),
    });
    return isValid;
  },
});

export const changeAdminPassword = mutation({
  args: { currentPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    const stored = await getPassword(ctx, "admin_password", DEFAULT_ADMIN_PASSWORD);
    if (stored && args.currentPassword !== stored) {
      throw new Error("Current password is incorrect");
    }
    const existing = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "admin_password"))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.newPassword });
    } else {
      await ctx.db.insert("siteSettings", { key: "admin_password", value: args.newPassword });
    }
    await ctx.db.insert("adminLogs", {
      action: "admin_password_changed",
      details: "Admin password was changed",
      timestamp: Date.now(),
    });
  },
});

export const removeAdminPassword = mutation({
  args: { currentPassword: v.string() },
  handler: async (ctx, args) => {
    const stored = await getPassword(ctx, "admin_password", DEFAULT_ADMIN_PASSWORD);
    if (stored && args.currentPassword !== stored) {
      throw new Error("Current password is incorrect");
    }
    const existing = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "admin_password"))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value: "" });
    }
    await ctx.db.insert("adminLogs", {
      action: "admin_password_removed",
      details: "Admin password protection was removed",
      timestamp: Date.now(),
    });
  },
});

// ─── Upload Password ───
export const getUploadPassword = query({
  args: {},
  handler: async (ctx) => {
    const val = await getPassword(ctx, "upload_password", DEFAULT_UPLOAD_PASSWORD);
    return { password: val, isSet: true };
  },
});

export const changeUploadPassword = mutation({
  args: { newPassword: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "upload_password"))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.newPassword });
    } else {
      await ctx.db.insert("siteSettings", { key: "upload_password", value: args.newPassword });
    }
    await ctx.db.insert("adminLogs", {
      action: "upload_password_changed",
      details: "Upload password was changed",
      timestamp: Date.now(),
    });
  },
});

export const removeUploadPassword = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "upload_password"))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value: "" });
    } else {
      await ctx.db.insert("siteSettings", { key: "upload_password", value: "" });
    }
    await ctx.db.insert("adminLogs", {
      action: "upload_password_removed",
      details: "Upload password protection was removed — anyone can upload",
      timestamp: Date.now(),
    });
  },
});

// ─── Auto Approve ───
export const getAutoApprove = query({
  args: {},
  handler: async (ctx) => {
    const val = await getPassword(ctx, "auto_approve", "false");
    return val === "true";
  },
});

export const setAutoApprove = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "auto_approve"))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.enabled ? "true" : "false" });
    } else {
      await ctx.db.insert("siteSettings", { key: "auto_approve", value: args.enabled ? "true" : "false" });
    }
    await ctx.db.insert("adminLogs", {
      action: args.enabled ? "auto_approve_enabled" : "auto_approve_disabled",
      details: `Auto-approve ${args.enabled ? "enabled" : "disabled"}`,
      timestamp: Date.now(),
    });
  },
});

// ─── Site Title ───
export const getSiteTitle = query({
  args: {},
  handler: async (ctx) => {
    const title = await getPassword(ctx, "site_title", "Sweet Family Photos");
    const tagline = await getPassword(ctx, "site_tagline", "Browse, download, and share your family's beautiful moments");
    return { title, tagline };
  },
});

export const setSiteTitle = mutation({
  args: { title: v.string(), tagline: v.string() },
  handler: async (ctx, args) => {
    const titleExisting = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "site_title"))
      .first();
    if (titleExisting) {
      await ctx.db.patch(titleExisting._id, { value: args.title });
    } else {
      await ctx.db.insert("siteSettings", { key: "site_title", value: args.title });
    }

    const taglineExisting = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "site_tagline"))
      .first();
    if (taglineExisting) {
      await ctx.db.patch(taglineExisting._id, { value: args.tagline });
    } else {
      await ctx.db.insert("siteSettings", { key: "site_tagline", value: args.tagline });
    }

    await ctx.db.insert("adminLogs", {
      action: "site_title_changed",
      details: `Site title changed to "${args.title}"`,
      timestamp: Date.now(),
    });
  },
});

// ─── Logs ───
export const getLogs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("adminLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();
  },
});

export const clearLogs = mutation({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("adminLogs").collect();
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }
    // Re-insert the clear action
    await ctx.db.insert("adminLogs", {
      action: "logs_cleared",
      details: `${logs.length} log entries cleared`,
      timestamp: Date.now(),
    });
  },
});

// ─── Stats ───
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const photos = await ctx.db.query("photos").collect();
    const logs = await ctx.db.query("adminLogs").collect();
    return {
      totalPhotos: photos.length,
      approvedPhotos: photos.filter((p) => p.status === "approved").length,
      pendingPhotos: photos.filter((p) => p.status === "pending").length,
      rejectedPhotos: photos.filter((p) => p.status === "rejected").length,
      totalLogs: logs.length,
      recentActivity: logs.slice(-10).reverse(),
    };
  },
});

// ─── Password Status ───
export const getPasswordStatus = query({
  args: {},
  handler: async (ctx) => {
    const adminPw = await getPassword(ctx, "admin_password", DEFAULT_ADMIN_PASSWORD);
    const uploadPw = await getPassword(ctx, "upload_password", DEFAULT_UPLOAD_PASSWORD);
    return {
      hasAdminPassword: !!adminPw,
      adminPasswordLength: adminPw?.length ?? 0,
      hasUploadPassword: !!uploadPw,
      uploadPassword: uploadPw,
    };
  },
});
