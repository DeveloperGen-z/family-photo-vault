import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ─── Likes / Hearts ───

/** Toggle like on a photo. Returns new like count. */
export const toggleLike = mutation({
  args: { photoId: v.id("photos"), visitorId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("photoViews")
      .withIndex("by_photoId", (q) => q.eq("photoId", args.photoId))
      .collect();

    // Check if this visitor already liked this photo
    const existingLike = existing.find(
      (v) => v.action === "like" && v.ip === args.visitorId,
    );

    if (existingLike) {
      // Unlike
      await ctx.db.delete(existingLike._id);
      const remaining = existing.filter((v) => v.action === "like");
      return { liked: false, count: remaining.length };
    } else {
      // Like
      await ctx.db.insert("photoViews", {
        photoId: args.photoId,
        action: "like",
        ip: args.visitorId,
        timestamp: Date.now(),
      });
      const allLikes = existing.filter((v) => v.action === "like");
      return { liked: true, count: allLikes.length + 1 };
    }
  },
});

/** Get like count and whether current visitor liked it. */
export const getLikes = query({
  args: { photoId: v.id("photos"), visitorId: v.string() },
  handler: async (ctx, args) => {
    const views = await ctx.db
      .query("photoViews")
      .withIndex("by_photoId", (q) => q.eq("photoId", args.photoId))
      .collect();

    const likes = views.filter((v) => v.action === "like");
    const liked = likes.some((v) => v.ip === args.visitorId);
    return { count: likes.length, liked };
  },
});

/** Get like counts for multiple photos. */
export const getBulkLikes = query({
  args: { photoIds: v.array(v.id("photos")), visitorId: v.string() },
  handler: async (ctx, args) => {
    const result: Record<string, { count: number; liked: boolean }> = {};
    for (const photoId of args.photoIds) {
      const views = await ctx.db
        .query("photoViews")
        .withIndex("by_photoId", (q) => q.eq("photoId", photoId))
        .collect();
      const likes = views.filter((v) => v.action === "like");
      result[photoId] = {
        count: likes.length,
        liked: likes.some((v) => v.ip === args.visitorId),
      };
    }
    return result;
  },
});

// ─── Comments ───

/** Add a comment to a photo. */
export const addComment = mutation({
  args: {
    photoId: v.id("photos"),
    author: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.text.trim().length === 0) throw new Error("Comment cannot be empty");
    if (args.text.length > 500) throw new Error("Comment too long (max 500 characters)");

    await ctx.db.insert("photoViews", {
      photoId: args.photoId,
      action: "comment",
      ip: JSON.stringify({ author: args.author, text: args.text.trim() }),
      timestamp: Date.now(),
    });

    return true;
  },
});

/** Get comments for a photo. */
export const getComments = query({
  args: { photoId: v.id("photos") },
  handler: async (ctx, args) => {
    const views = await ctx.db
      .query("photoViews")
      .withIndex("by_photoId", (q) => q.eq("photoId", args.photoId))
      .collect();

    return views
      .filter((v) => v.action === "comment")
      .map((v) => {
        try {
          const data = JSON.parse(v.ip);
          return {
            _id: v._id,
            author: data.author,
            text: data.text,
            timestamp: v.timestamp,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => (a?.timestamp ?? 0) - (b?.timestamp ?? 0));
  },
});

/** Delete a comment. */
export const deleteComment = mutation({
  args: { commentId: v.id("photoViews") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.commentId);
  },
});

/** Get comment count for a photo. */
export const getCommentCount = query({
  args: { photoId: v.id("photos") },
  handler: async (ctx, args) => {
    const views = await ctx.db
      .query("photoViews")
      .withIndex("by_photoId", (q) => q.eq("photoId", args.photoId))
      .collect();
    return views.filter((v) => v.action === "comment").length;
  },
});

/** Get comment counts for multiple photos. */
export const getBulkCommentCounts = query({
  args: { photoIds: v.array(v.id("photos")) },
  handler: async (ctx, args) => {
    const result: Record<string, number> = {};
    for (const photoId of args.photoIds) {
      const views = await ctx.db
        .query("photoViews")
        .withIndex("by_photoId", (q) => q.eq("photoId", photoId))
        .collect();
      result[photoId] = views.filter((v) => v.action === "comment").length;
    }
    return result;
  },
});
