import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

/** Report the visitor's real IP (from proxy headers) so the admin can block a person's device. */
http.route({
  path: "/client-info",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const fwd = request.headers.get("x-forwarded-for");
    const ip =
      (fwd ? fwd.split(",")[0].trim() : null) ??
      request.headers.get("x-real-ip") ??
      "unknown";
    return new Response(JSON.stringify({ ip }), {
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  }),
});

export default http;