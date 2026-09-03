const FAVICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#022c22"/>
  <path d="M36 6 14 35h15l-2 23 23-32H35z" fill="#10b981"/>
</svg>
`.trim();

export function createFaviconResponse() {
  return new Response(FAVICON_SVG, {
    headers: {
      'Cache-Control': 'public, max-age=86400, immutable',
      'Content-Type': 'image/svg+xml; charset=utf-8'
    }
  });
}
