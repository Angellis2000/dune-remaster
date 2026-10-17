import css from "./style.css?inline";
import { GameMap } from "./game/map.ts";
import { buildCursors } from "./gfx/cursors.ts";
import { IconSet } from "./gfx/icons.ts";
import { BUTTON_LABEL, Pad } from "./input/pad.ts";
import { DuneRom, ROM, RomError } from "./rom/dune.ts";
import { AssetViewer } from "./ui/assets.ts";
import { Minimap } from "./ui/minimap.ts";
import { forgetRom, loadStoredRom, storeRom } from "./ui/romstore.ts";
import { MapView } from "./view/mapview.ts";

const style = document.createElement("style");
style.textContent = css;
document.head.append(style);

const app = document.getElementById("app")!;

/** Карты в ROM идут блоками по 9 — по порядку домов на экране выбора дома. */
const HOUSES = ["Атрейдесы", "Ордосы", "Харконнены"];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...children: (Node | string)[]): HTMLElementTagNameMap[K] {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...children);
  return e;
}

// ------------------------------------------------------------------ выбор ROM
async function showRomScreen(error?: string): Promise<void> {
  const stored = error ? null : await loadStoredRom();
  const input = el("input", { type: "file", accept: ".bin,.gen,.md,.smd", hidden: true, id: "rom-file" });
  const pick = el("button", { type: "button", className: "primary", textContent: "Выбрать файл ROM" });
  const actions = el("div", { className: "actions" }, pick);
  if (stored) {
    const cont = el("button", { type: "button", textContent: `Продолжить: ${stored.name}` });
    cont.addEventListener("click", () => start(stored.name, stored.bytes, false));
    const forget = el("button", { type: "button", textContent: "Забыть файл" });
    forget.addEventListener("click", async () => {
      await forgetRom();
      showRomScreen();
    });
    actions.prepend(cont);
    actions.append(forget);
    pick.className = "";
    cont.className = "primary";
  }
  const msg = el("p", { className: error ? "error" : "" }, error ?? "Можно перетащить файл сюда.");
  const drop = el("div", { className: "drop" }, actions, msg, input);
  const card = el(
    "div",
    { className: "rom-card" },
    el("h1", {}, "DUNE", el("small", {}, "Битва за Арракис · свой движок")),
    el("p", {}, "Нужен ROM Mega Drive «Dune: The Battle for Arrakis» (.bin, .gen или .md). Файл читается прямо в браузере и никуда не отправляется. Графика берётся из него как есть."),
    drop,
  );
  app.replaceChildren(el("main", { className: "rom-screen" }, card));

  const readFile = async (f: File) => start(f.name, new Uint8Array(await f.arrayBuffer()), true);
  pick.addEventListener("click", () => input.click());
  input.addEventListener("change", () => input.files?.[0] && readFile(input.files[0]));
  drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    drop.classList.add("over");
  });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("over");
    const f = e.dataTransfer?.files[0];
    if (f) readFile(f);
  });
}

async function start(name: string, bytes: Uint8Array, remember: boolean): Promise<void> {
  let rom: DuneRom;
  try {
    rom = new DuneRom(bytes);
  } catch (e) {
    showRomScreen(e instanceof RomError ? e.message : `Не удалось прочитать файл: ${(e as Error).message}`);
    return;
  }
  if (remember) await storeRom(name, bytes);
  startGame(rom);
}

// ------------------------------------------------------------------ игра
function startGame(rom: DuneRom): void {
  const icons = new IconSet(rom);
  const canvas = el("canvas", { className: "view", tabIndex: 0 });
  canvas.setAttribute("aria-label", "Карта миссии");
  const statusWhere = el("span");
  const statusHelp = el("span", { className: "help" });
  const status = el("div", { className: "status" }, statusWhere, statusHelp);
  const stage = el("div", { className: "stage" }, canvas, status);
  const pad = new Pad();
  const view = new MapView(canvas, icons, buildCursors(rom), pad);
  let lastButton = "";
  const minimap = new Minimap(view, icons);
  stage.append(minimap.canvas);

  // выбор карты
  const select = el("select", { id: "map-select" });
  for (let h = 0; h < 3; h++) {
    const group = el("optgroup", { label: HOUSES[h] });
    for (let i = 1; i <= 9; i++) {
      const idx = h * 9 + i;
      group.append(el("option", { value: String(idx), textContent: `${HOUSES[h]} — карта ${i}` }));
    }
    select.append(group);
  }
  const loadMap = (idx: number) => {
    const map = new GameMap(rom.missionMap(idx));
    view.setMap(map);
    minimap.setMap(map);
    select.value = String(idx);
    updateHud();
  };
  select.addEventListener("change", () => loadMap(Number(select.value)));

  // масштаб
  const zoomOut = el("button", { type: "button", textContent: "−", title: "Отдалить (−)" });
  const zoomIn = el("button", { type: "button", textContent: "+", title: "Приблизить (+)" });
  const zoomVal = el("output", { id: "zoom-value" });
  zoomOut.addEventListener("click", () => view.setZoom(view.zoom - 1));
  zoomIn.addEventListener("click", () => view.setZoom(view.zoom + 1));

  const grid = el("button", { type: "button", textContent: "Сетка", title: "Сетка и номера клеток (G)" });
  grid.setAttribute("aria-pressed", "false");
  const toggleGrid = () => {
    view.showGrid = !view.showGrid;
    grid.setAttribute("aria-pressed", String(view.showGrid));
    view.invalidate();
  };
  grid.addEventListener("click", toggleGrid);

  const assets = new AssetViewer(rom, icons, () => (assets.root.hidden = true));
  stage.append(assets.root);
  const assetsBtn = el("button", { type: "button", textContent: "Ресурсы", title: "Графика из ROM с номерами (R)" });
  const toggleAssets = () => {
    assets.root.hidden = !assets.root.hidden;
    if (!assets.root.hidden) assets.show("icons");
  };
  assetsBtn.addEventListener("click", toggleAssets);

  const mouseBtn = el("button", { type: "button", textContent: "Мышь", title: "Играть мышью: левая кнопка — A, правая — C (M)" });
  mouseBtn.setAttribute("aria-pressed", "false");
  const toggleMouse = () => {
    view.setMouseMode(!view.mouseMode);
    mouseBtn.setAttribute("aria-pressed", String(view.mouseMode));
    canvas.classList.toggle("mouse", view.mouseMode);
  };
  mouseBtn.addEventListener("click", toggleMouse);

  // кнопки геймпада; пока юнитов нет, A отмечает клетку под курсором, C снимает отметку
  pad.onPress((b) => {
    if (!assets.root.hidden) return;
    lastButton = BUTTON_LABEL[b];
    if (b === "a") view.mark(view.cursorCell());
    else if (b === "c") view.mark(null);
    updateHud();
  });

  const romBtn = el("button", { type: "button", textContent: "Другой ROM" });
  romBtn.addEventListener("click", () => location.reload());

  const topbar = el(
    "header",
    { className: "topbar" },
    el("span", { className: "brand" }, "DUNE"),
    el("label", { htmlFor: "map-select" }, "Карта", select),
    el("div", { className: "zoom" }, zoomOut, zoomVal, zoomIn),
    mouseBtn,
    grid,
    assetsBtn,
    el("span", { className: "spacer" }),
    romBtn,
  );
  app.replaceChildren(el("div", { className: "game" }, topbar, stage));

  function updateHud(): void {
    zoomVal.value = `${view.zoom}×`;
    const h = view.cursorCell();
    const where = h ? `Клетка ${h.x}, ${h.y} · иконка ${h.icon}` : `Карта ${select.value} из ${ROM.mapCount}`;
    const help = view.mouseMode
      ? "Мышь: левая — A, правая — C · колесо — масштаб"
      : "Стрелки — курсор · 1 — A · 2 — B · 3 — C · Enter — Start";
    statusWhere.textContent = lastButton ? `${where} · ${lastButton}` : where;
    statusHelp.textContent = help;
    minimap.draw();
  }
  view.onChange = updateHud;

  window.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLSelectElement) return;
    if (e.code === "KeyG") toggleGrid();
    if (e.code === "KeyM") toggleMouse();
    if (e.code === "Equal" || e.code === "NumpadAdd") view.setZoom(view.zoom + 1);
    if (e.code === "Minus" || e.code === "NumpadSubtract") view.setZoom(view.zoom - 1);
    if (e.code === "KeyR") toggleAssets();
    if (e.code === "Escape") assets.root.hidden = true;
  });

  loadMap(1);
  canvas.focus();
}

showRomScreen();
