const pageKey = new URLSearchParams(window.location.search).get("key");

export function siteUrl(path) {
  const url = new URL(path, window.location.href);
  if (url.origin === window.location.origin && pageKey !== null) {
    url.searchParams.set("key", pageKey);
  }
  return url.href;
}

for (const link of document.querySelectorAll("a[href]")) {
  link.href = siteUrl(link.href);
}
