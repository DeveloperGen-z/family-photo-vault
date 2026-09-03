import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** Record a visitor. */
export const recordVisitor = mutation({
  args: {
    ip: v.string(),
    userAgent: v.string(),
    page: v.string(),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    device: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("visitors", {
      ip: args.ip,
      userAgent: args.userAgent,
      page: args.page,
      country: args.country,
      city: args.city,
      device: args.device,
      timestamp: Date.now(),
    });
  },
});

/** Record a photo view. */
export const recordPhotoView = mutation({
  args: {
    photoId: v.id("photos"),
    action: v.string(),
    ip: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("photoViews", {
      photoId: args.photoId,
      action: args.action,
      ip: args.ip,
      timestamp: Date.now(),
    });
  },
});

/** Get total visitor count. */
export const getVisitorCount = query({
  args: {},
  handler: async (ctx) => {
    const visitors = await ctx.db.query("visitors").collect();
    return visitors.length;
  },
});

/** Get unique visitor count (by IP). */
export const getUniqueVisitorCount = query({
  args: {},
  handler: async (ctx) => {
    const visitors = await ctx.db.query("visitors").collect();
    const uniqueIPs = new Set(visitors.map((v) => v.ip));
    return uniqueIPs.size;
  },
});

/** Get today's visitor count. */
export const getTodayVisitorCount = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toDateString();
    const visitors = await ctx.db.query("visitors").collect();
    return visitors.filter((v) => new Date(v.timestamp).toDateString() === today).length;
  },
});

/** Get total photo views. */
export const getPhotoViewCount = query({
  args: {},
  handler: async (ctx) => {
    const views = await ctx.db.query("photoViews").collect();
    return {
      total: views.length,
      views: views.filter((v) => v.action === "view").length,
      downloads: views.filter((v) => v.action === "download").length,
    };
  },
});

/** Get today's photo views. */
export const getTodayPhotoViews = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toDateString();
    const views = await ctx.db.query("photoViews").collect();
    const todayViews = views.filter((v) => new Date(v.timestamp).toDateString() === today);
    return {
      total: todayViews.length,
      views: todayViews.filter((v) => v.action === "view").length,
      downloads: todayViews.filter((v) => v.action === "download").length,
    };
  },
});

/** Get geographic breakdown (country counts). */
export const getGeoBreakdown = query({
  args: {},
  handler: async (ctx) => {
    const visitors = await ctx.db.query("visitors").collect();
    const countryMap = new Map<string, number>();
    const cityMap = new Map<string, number>();

    for (const v of visitors) {
      if (v.country) {
        countryMap.set(v.country, (countryMap.get(v.country) ?? 0) + 1);
      }
      if (v.city) {
        cityMap.set(v.city, (cityMap.get(v.city) ?? 0) + 1);
      }
    }

    const countries = [...countryMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    const cities = [...cityMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return { countries, cities };
  },
});

/** Get device breakdown. */
export const getDeviceBreakdown = query({
  args: {},
  handler: async (ctx) => {
    const visitors = await ctx.db.query("visitors").collect();
    const deviceMap = new Map<string, number>();

    for (const v of visitors) {
      const device = v.device ?? "unknown";
      deviceMap.set(device, (deviceMap.get(device) ?? 0) + 1);
    }

    return [...deviceMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  },
});

/** Get hourly traffic (last 24 hours). */
export const getHourlyTraffic = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const visitors = await ctx.db.query("visitors").collect();

    const hourly = new Array(24).fill(0);
    for (const v of visitors) {
      if (v.timestamp >= oneDayAgo) {
        const hour = new Date(v.timestamp).getHours();
        hourly[hour]++;
      }
    }

    return hourly.map((count, hour) => ({
      hour,
      count,
      label: `${hour.toString().padStart(2, "0")}:00`,
    }));
  },
});

/** Get recent visitors. */
export const getRecentVisitors = query({
  args: {},
  handler: async (ctx) => {
    const visitors = await ctx.db
      .query("visitors")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();
    return visitors.slice(0, 50);
  },
});

/** Get most viewed photos. */
export const getMostViewedPhotos = query({
  args: {},
  handler: async (ctx) => {
    const views = await ctx.db.query("photoViews").collect();
    const photoMap = new Map<string, { views: number; downloads: number }>();

    for (const v of views) {
      const existing = photoMap.get(v.photoId) ?? { views: 0, downloads: 0 };
      if (v.action === "view") existing.views++;
      if (v.action === "download") existing.downloads++;
      photoMap.set(v.photoId, existing);
    }

    const results = [];
    for (const [photoId, stats] of photoMap) {
      const photo = await ctx.db.get(photoId as any);
      if (photo && "fileName" in photo) {
        results.push({
          photoId,
          fileName: photo.fileName,
          status: photo.status,
          ...stats,
          total: stats.views + stats.downloads,
        });
      }
    }

    return results.sort((a, b) => b.total - a.total).slice(0, 20);
  },
});

/** Get daily traffic for last 7 days. */
export const getDailyTraffic = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const visitors = await ctx.db.query("visitors").collect();

    const daily = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      daily.set(d.toDateString(), 0);
    }

    for (const v of visitors) {
      if (v.timestamp >= sevenDaysAgo) {
        const day = new Date(v.timestamp).toDateString();
        daily.set(day, (daily.get(day) ?? 0) + 1);
      }
    }

    return [...daily.entries()].map(([date, count]) => ({
      date,
      count,
      label: new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    }));
  },
});

/** Clear all visitor data. */
export const clearVisitors = mutation({
  args: {},
  handler: async (ctx) => {
    const visitors = await ctx.db.query("visitors").collect();
    for (const v of visitors) {
      await ctx.db.delete(v._id);
    }

    await ctx.db.insert("adminLogs", {
      action: "visitors_cleared",
      details: `${visitors.length} visitor records cleared`,
      timestamp: Date.now(),
    });

    return visitors.length;
  },
});

/** Clear all photo view data. */
export const clearPhotoViews = mutation({
  args: {},
  handler: async (ctx) => {
    const views = await ctx.db.query("photoViews").collect();
    for (const v of views) {
      await ctx.db.delete(v._id);
    }

    await ctx.db.insert("adminLogs", {
      action: "photo_views_cleared",
      details: `${views.length} photo view records cleared`,
      timestamp: Date.now(),
    });

    return views.length;
  },
});
