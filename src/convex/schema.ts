import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator),
    }).index("email", ["email"]),

    // Photo storage table
    photos: defineTable({
      storageId: v.id("_storage"),
      fileName: v.string(),
      status: v.union(
        v.literal("approved"),
        v.literal("pending"),
        v.literal("rejected"),
      ),
      uploadedBy: v.string(), // "admin" or "family"
      uploadedAt: v.number(),
      approvedAt: v.optional(v.number()),
    }).index("by_status", ["status"]),

    // Admin activity logs
    adminLogs: defineTable({
      action: v.string(),
      details: v.string(),
      timestamp: v.number(),
    }).index("by_timestamp", ["timestamp"]),

    // Site settings (admin password, upload password, etc.)
    siteSettings: defineTable({
      key: v.string(),
      value: v.string(),
    }).index("by_key", ["key"]),

    // Visitor tracking
    visitors: defineTable({
      ip: v.string(),
      userAgent: v.string(),
      page: v.string(),
      country: v.optional(v.string()),
      city: v.optional(v.string()),
      device: v.optional(v.string()), // "mobile" | "desktop" | "tablet"
      browser: v.optional(v.string()), // e.g. "Chrome 120"
      os: v.optional(v.string()), // e.g. "Android 14"
      screen: v.optional(v.string()), // e.g. "390x844"
      timestamp: v.number(),
    }).index("by_timestamp", ["timestamp"])
      .index("by_ip", ["ip"]),

    // Blocked devices/IPs (admin can block a person by IP)
    blocks: defineTable({
      ip: v.string(),
      reason: v.optional(v.string()),
      timestamp: v.number(),
    }).index("by_ip", ["ip"]),

    // Photo view/download tracking
    photoViews: defineTable({
      photoId: v.id("photos"),
      action: v.string(), // "view" | "download"
      ip: v.string(),
      timestamp: v.number(),
    }).index("by_photoId", ["photoId"])
      .index("by_timestamp", ["timestamp"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
