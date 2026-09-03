import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** Generate a signed upload URL for a file to be stored in Convex. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/** Save a photo record after the file has been uploaded to Convex storage. */
export const uploadPhoto = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    uploadedBy: v.string(),
    status: v.union(
      v.literal("approved"),
      v.literal("pending"),
      v.literal("rejected"),
    ),
  },
  handler: async (ctx, args) => {
    const photoId = await ctx.db.insert("photos", {
      storageId: args.storageId,
      fileName: args.fileName,
      status: args.status,
      uploadedBy: args.uploadedBy,
      uploadedAt: Date.now(),
    });

    await ctx.db.insert("adminLogs", {
      action: "photo_upload",
      details: `Photo "${args.fileName}" uploaded by ${args.uploadedBy} (status: ${args.status})`,
      timestamp: Date.now(),
    });

    return photoId;
  },
});

/** List all approved photos with their storage URLs. */
export const listApproved = query({
  args: {},
  handler: async (ctx) => {
    const photos = await ctx.db
      .query("photos")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .order("desc")
      .collect();

    const results = [];
    for (const photo of photos) {
      const url = await ctx.storage.getUrl(photo.storageId);
      if (url) {
        results.push({ ...photo, url });
      }
    }
    return results;
  },
});

/** List all photos (admin view). */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const photos = await ctx.db.query("photos").order("desc").collect();

    const results = [];
    for (const photo of photos) {
      const url = await ctx.storage.getUrl(photo.storageId);
      results.push({ ...photo, url: url ?? "" });
    }
    return results;
  },
});

/** List pending photos (admin view). */
export const listPending = query({
  args: {},
  handler: async (ctx) => {
    const photos = await ctx.db
      .query("photos")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();

    const results = [];
    for (const photo of photos) {
      const url = await ctx.storage.getUrl(photo.storageId);
      results.push({ ...photo, url: url ?? "" });
    }
    return results;
  },
});

/** Approve a pending photo. */
export const approvePhoto = mutation({
  args: { photoId: v.id("photos") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.photoId, {
      status: "approved",
      approvedAt: Date.now(),
    });

    const photo = await ctx.db.get(args.photoId);
    await ctx.db.insert("adminLogs", {
      action: "photo_approved",
      details: `Photo "${photo?.fileName ?? "unknown"}" approved`,
      timestamp: Date.now(),
    });
  },
});

/** Reject a pending photo. */
export const rejectPhoto = mutation({
  args: { photoId: v.id("photos") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.photoId, { status: "rejected" });

    const photo = await ctx.db.get(args.photoId);
    await ctx.db.insert("adminLogs", {
      action: "photo_rejected",
      details: `Photo "${photo?.fileName ?? "unknown"}" rejected`,
      timestamp: Date.now(),
    });
  },
});

/** Delete a photo from the database and storage. */
export const deletePhoto = mutation({
  args: { photoId: v.id("photos") },
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.photoId);
    if (photo) {
      await ctx.storage.delete(photo.storageId);
      await ctx.db.delete(args.photoId);

      await ctx.db.insert("adminLogs", {
        action: "photo_deleted",
        details: `Photo "${photo.fileName}" deleted`,
        timestamp: Date.now(),
      });
    }
  },
});

/** Get total photo counts. */
export const getPhotoCount = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("photos").collect();
    return {
      total: all.length,
      approved: all.filter((p) => p.status === "approved").length,
      pending: all.filter((p) => p.status === "pending").length,
      rejected: all.filter((p) => p.status === "rejected").length,
    };
  },
});

/** Verify user upload password and return upload URL. */
export const verifyUploadAndGenerateUrl = mutation({
  args: {
    password: v.string(),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    // Hardcoded upload password for family members
    const UPLOAD_PASSWORD = "121520";
    if (args.password !== UPLOAD_PASSWORD) {
      throw new Error("Invalid upload password");
    }

    const uploadUrl = await ctx.storage.generateUploadUrl();
    return uploadUrl;
  },
});

/** Approve all pending photos at once. */
export const approveAll = mutation({
  args: {},
  handler: async (ctx) => {
    const pending = await ctx.db
      .query("photos")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    let count = 0;
    for (const photo of pending) {
      await ctx.db.patch(photo._id, {
        status: "approved",
        approvedAt: Date.now(),
      });
      count++;
    }

    if (count > 0) {
      await ctx.db.insert("adminLogs", {
        action: "bulk_approved",
        details: `${count} photo${count !== 1 ? "s" : ""} approved in bulk`,
        timestamp: Date.now(),
      });
    }

    return count;
  },
});
