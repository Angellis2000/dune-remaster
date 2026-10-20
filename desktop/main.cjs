// Dune Remaster для Windows (бета): окно Electron с собранной веб-игрой (web/dist → desktop/app).
// Игра отдаётся по своему защищённому протоколу app:// — так работают fetch музыки и видео, IndexedDB (сохранённый
// ROM и настройки) и WebSocket к серверу сетевой игры. ROM в сборку не входит: игра попросит файл при первом запуске.
const { app, BrowserWindow, Menu, protocol, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } },
]);

const root = path.join(__dirname, "app");
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".mp4": "video/mp4", ".webm": "video/webm",
  ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".wasm": "application/wasm",
};

/** Файл игры по адресу app://dune/…; поддерживает Range — видео и музыка перематываются. */
async function serve(request) {
  const url = new URL(request.url);
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/" || rel === "") rel = "/index.html";
  const file = path.normalize(path.join(root, rel));
  if (!file.startsWith(root)) return new Response("forbidden", { status: 403 });
  let data;
  try {
    data = await fs.readFile(file);
  } catch {
    return new Response("not found", { status: 404 });
  }
  const type = MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const size = data.length;
    let start = range[1] ? Number(range[1]) : size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    start = Math.max(0, Math.min(start, size - 1));
    end = Math.max(start, Math.min(end, size - 1));
    return new Response(data.subarray(start, end + 1), {
      status: 206,
      headers: { "content-type": type, "content-range": `bytes ${start}-${end}/${size}`, "accept-ranges": "bytes", "content-length": String(end - start + 1) },
    });
  }
  return new Response(data, { headers: { "content-type": type, "accept-ranges": "bytes", "content-length": String(data.length) } });
}

app.whenReady().then(() => {
  protocol.handle("app", serve);
  Menu.setApplicationMenu(null);
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 800, minHeight: 600, backgroundColor: "#000000", title: "Dune Remaster (бета)",
    autoHideMenuBar: true, webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  // внешние ссылки — в обычном браузере, не в окне игры
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => { if (!url.startsWith("app://")) event.preventDefault(); });
  // F11 — во весь экран
  win.webContents.on("before-input-event", (event, input) => {
    if (input.type === "keyDown" && input.key === "F11") {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });
  void win.loadURL("app://dune/index.html");
});

app.on("window-all-closed", () => app.quit());
