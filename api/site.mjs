import { createHash, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const html = "text/html; charset=utf-8";
const files = new Map([
  ["home", ["index.html", html]],
  ["ashes", ["ashes/index.html", html]],
  ["summoner-wars", ["summoner-wars/index.html", html]],
  ["lord-of-the-rings-lcg", ["lord-of-the-rings-lcg/index.html", html]],
  ["cards", ["ashes/cards.html", html]],
  ["catalog", ["ashes/catalog.html", html]],
  ["deck", ["ashes/deck.html", html]],
  ["data", ["ashes/decks.mjs", "text/javascript; charset=utf-8"]],
]);
const legacyPaths = new Map([
  ["legacy-cards", "/ashes/cards.html"],
  ["legacy-deck", "/ashes/deck.html"],
  ["legacy-data", "/ashes/decks.js"],
]);

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function digest(value) {
  return createHash("sha256").update(value).digest();
}

function errorResponse(request, status, message) {
  return new Response(request.method === "HEAD" ? null : message, {
    status,
    headers: { ...privateHeaders, "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET(request) {
  const expected = process.env.key;
  if (!expected) {
    return errorResponse(request, 500, "Site access is unavailable.");
  }

  const { searchParams } = new URL(request.url);
  const keys = searchParams.getAll("key");
  if (keys.length !== 1 || !timingSafeEqual(digest(keys[0]), digest(expected))) {
    return errorResponse(request, 403, "Access denied.");
  }

  const view = searchParams.get("view");
  const legacyPath = legacyPaths.get(view);
  if (legacyPath) {
    searchParams.delete("view");
    return new Response(null, {
      status: 302,
      headers: { ...privateHeaders, Location: `${legacyPath}?${searchParams}` },
    });
  }

  const file = files.get(view);
  if (!file) return errorResponse(request, 404, "Page not found.");

  const [filename, contentType] = file;
  try {
    const content = await readFile(join(process.cwd(), "site", filename));
    return new Response(request.method === "HEAD" ? null : content, {
      headers: { ...privateHeaders, "Content-Type": contentType },
    });
  } catch {
    return errorResponse(request, 500, "The requested page is unavailable.");
  }
}

export const HEAD = GET;
