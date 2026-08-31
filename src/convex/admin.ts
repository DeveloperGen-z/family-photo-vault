import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DEFAULT_ADMIN_PASSWORD = "admin123";

/** Initialize or update admin password. */
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
      await ctx.db.insert("siteSettings", {
        key: "admin_password",
        value: args.password,
      });
    }
  },
});

/** Verify admin password. Returns true if valid. */
export const verifyAdminPassword = mutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "admin_password"))
      .first();

    // If no password set yet, initialize with default
    const storedPassword = setting?.value ?? DEFAULT_ADMIN_PASSWORD;
    if (!setting) {
      await ctx.db.insert("siteSettings", {
        key: "admin_password",
        value: DEFAULT_ADMIN_PASSWORD,
      });
    }

    const isValid = args.password === storedPassword;

    await ctx.db.insert("adminLogs", {
      action: isValid ? "admin_login_success" : "admin_login_failed",
      details: isValid
        ? "Admin logged in successfully"
        : "Failed admin login attempt",
      timestamp: Date.now(),
    });

    return isValid;
  },
});

/** Change admin password. */
export const changeAdminPassword = mutation({
  args: { currentPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "admin_password"))
      .first();

    const storedPassword = setting?.value ?? DEFAULT_ADMIN_PASSWORD;
    if (args.currentPassword !== storedPassword) {
      throw new Error("Current password is incorrect");
    }

    if (setting) {
      await ctx.db.patch(setting._id, { value: args.newPassword });
    } else {
      await ctx.db.insert("siteSettings", {
        key: "admin_password",
        value: args.newPassword,
      });
    }

    await ctx.db.insert("adminLogs", {
      action: "admin_password_changed",
      details: "Admin password was changed",
      timestamp: Date.now(),
    });
  },
});

/** Get admin logs. */
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

/** Get dashboard stats. */
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
