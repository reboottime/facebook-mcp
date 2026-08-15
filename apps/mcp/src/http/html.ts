const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ESCAPES[character] as string);
}

// One inline stylesheet, no scripts, no external assets: these three pages exist to complete an
// OAuth flow, and a Content-Security-Policy of "default-src 'none'" is only honest if the page
// really does load nothing.
const STYLES = `
  :root { color-scheme: light dark; }
  body { font: 16px/1.55 ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 3rem 1.5rem; display: flex; justify-content: center; }
  main { max-width: 34rem; width: 100%; }
  h1 { font-size: 1.4rem; margin: 0 0 0.5rem; }
  h2 { font-size: 1rem; margin: 2rem 0 0.5rem; }
  p { margin: 0 0 1rem; }
  dl { margin: 0 0 1rem; }
  dt { font-size: 0.8rem; opacity: 0.7; }
  dd { margin: 0 0 0.75rem; }
  code { font-family: ui-monospace, monospace; font-size: 0.9em; word-break: break-all; }
  ul { padding-left: 1.2rem; }
  .actions { display: flex; gap: 0.75rem; align-items: center; margin-top: 1.5rem; }
  button, .button { font: inherit; padding: 0.6rem 1rem; border-radius: 0.4rem; border: 1px solid currentColor; background: transparent; color: inherit; cursor: pointer; text-decoration: none; }
  button.primary { background: #1877f2; border-color: #1877f2; color: #fff; }
  .note { opacity: 0.75; font-size: 0.9rem; }
`;

export function renderPage(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; form-action 'self'">
<title>${escapeHtml(title)}</title>
<style>${STYLES}</style>
</head>
<body><main>${body}</main></body>
</html>`;
}
