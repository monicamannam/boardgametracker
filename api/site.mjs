import { createHash, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const files = new Map([
  ["index", ["index.html", "text/html; charset=utf-8"]],
  ["cards", ["cards.html", "text/html; charset=utf-8"]],
  ["deck", ["deck.html", "text/html; charset=utf-8"]],
  ["data", ["decks.mjs", "text/javascript; charset=utf-8"]],
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

  const file = files.get(searchParams.get("view"));
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
