import css from "./style.css?inline";
import { STRUCTURE_NAMES, UNIT_NAMES } from "./game/names.ts";
import { HOUSE_NAMES } from "./game/tables.ts";
import { World } from "./game/world.ts";
import { buildCursors } from "./gfx/cursors.ts";
import { IconSet } from "./gfx/icons.ts";
import { SpriteSet } from "./gfx/sprites.ts";
import { BUTTON_LABEL, Pad } from "./input/pad.ts";
import { CELL_PX, DuneRom, RomError } from "./rom/dune.ts";
import { AssetViewer } from "./ui/assets.ts";
import { Minimap } from "./ui/minimap.ts";
import { forgetRom, loadStoredRom, storeRom } from "./ui/romstore.ts";
import { MapView } from "./view/mapview.ts";

const style = document.createElement("style");
style.textContent = css;
document.head.append(style);

const app = document.getElementById("app")!;

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
const MISSION_HOUSES: { code: "A" | "O" | "H"; name: string }[] = [
  { code: "A", name: "Атрейдесы" },
  { code: "O", name: "Ордосы" },
  { code: "H", name: "Харконнены" },
];

function startGame(rom: DuneRom): void {
  const icons = new IconSet(rom);
  const sprites = new SpriteSet(rom);
  const canvas = el("canvas", { className: "view", tabIndex: 0 });
  canvas.setAttribute("aria-label", "Карта миссии");
  const statusWhere = el("span");
  const statusHelp = el("span", { className: "help" });
  const status = el("div", { className: "status" }, statusWhere, statusHelp);
  const credits = el("output", { className: "credits", id: "credits" });
  const info = el("div", { className: "selection-info" });
  info.hidden = true;
  const pausedBanner = el("div", { className: "paused" }, "Пауза · Start — продолжить");
  pausedBanner.hidden = true;
  const stage = el("div", { className: "stage" }, canvas, status, credits, info, pausedBanner);
  const pad = new Pad();
  const view = new MapView(canvas, icons, sprites, buildCursors(rom), pad);
  const minimap = new Minimap(view, icons);
  stage.append(minimap.canvas);
  let world: World | null = null;
  let paused = false;
  let lastButton = "";

  // выбор миссии
  const select = el("select", { id: "mission-select" });
  for (const h of MISSION_HOUSES) {
    const group = el("optgroup", { label: h.name });
    for (let i = 1; i <= 9; i++) group.append(el("option", { value: `${h.code}${i}`, textContent: `${h.name} — миссия ${i}` }));
    select.append(group);
  }
  const loadMission = (code: string) => {
    const scenario = rom.scenario(code[0] as "A" | "O" | "H", Number(code.slice(1)));
    world = new World(rom, scenario);
    const c = scenario.cursor;
    view.setWorld(world, c.x * CELL_PX + CELL_PX / 2, c.y * CELL_PX + CELL_PX / 2);
    minimap.setMap(world.map);
    select.value = code;
    paused = false;
    pausedBanner.hidden = true;
    updateHud();
  };
  select.addEventListener("change", () => loadMission(select.value));

  // ---------------------------------------------------------------- выбор и приказы
  const clearSelection = () => {
    view.selectedUnits.clear();
    view.selectedStructure = null;
  };
  const playerUnitsSelected = () => [...view.selectedUnits].filter((u) => u.house === world!.player);

  /** A / щелчок левой: выбрать то, что под курсором, или отдать приказ выбранным. */
  view.onPrimary = (wx, wy) => {
    if (!world || paused) return;
    const unit = world.unitAt(wx, wy);
    const mine = playerUnitsSelected();
    if (unit && (unit.house === world.player || !mine.length)) {
      clearSelection();
      view.selectedUnits.add(unit);
    } else if (mine.length) {
      // приказ: пока только движение по прямой (механика движения OpenDUNE — следующий этап)
      const target = unit ? { x: unit.x, y: unit.y } : { x: wx, y: wy };
      mine.forEach((u, i) => {
        const ring = i === 0 ? 0 : 14 + Math.floor((i - 1) / 6) * 14;
        const a = (i * Math.PI) / 3;
        u.target = { x: target.x + Math.cos(a) * ring, y: target.y + Math.sin(a) * ring };
      });
    } else {
      clearSelection();
      const s = world.structureAtCell(Math.floor(wx / CELL_PX), Math.floor(wy / CELL_PX));
      if (s) view.selectedStructure = s;
    }
    updateHud();
  };
  /** Правая кнопка: снять выделение, как в Red Alert. */
  view.onSecondary = () => {
    clearSelection();
    updateHud();
  };
  /** Рамка: выбрать все свои юниты внутри. */
  view.onBox = (r) => {
    if (!world || paused) return;
    const inside = world.units.filter((u) => u.house === world!.player && u.x >= r.x0 && u.x <= r.x1 && u.y >= r.y0 && u.y <= r.y1);
    if (!inside.length) return;
    clearSelection();
    for (const u of inside) view.selectedUnits.add(u);
    updateHud();
  };
  view.onFrame = () => {
    if (world && !paused) world.step();
    if (world) {
      const over = world.unitAt(view.cursorX, view.cursorY);
      const mine = playerUnitsSelected().length > 0;
      view.cursorKind = !mine ? "select" : over && over.house !== world.player ? "attack" : over ? "select" : "move";
    }
  };

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

  const mouseBtn = el("button", { type: "button", textContent: "Мышь", title: "Играть мышью, как в Red Alert (M)" });
  mouseBtn.setAttribute("aria-pressed", "false");
  const toggleMouse = () => {
    view.setMouseMode(!view.mouseMode);
    mouseBtn.setAttribute("aria-pressed", String(view.mouseMode));
    canvas.classList.toggle("mouse", view.mouseMode);
  };
  mouseBtn.addEventListener("click", toggleMouse);

  // кнопки геймпада
  pad.onPress((b) => {
    if (!assets.root.hidden) return;
    lastButton = BUTTON_LABEL[b];
    if (b === "start") {
      paused = !paused;
      pausedBanner.hidden = !paused;
    } else if (b === "a") view.onPrimary(view.cursorX, view.cursorY);
    else if (b === "c") clearSelection(); // в оригинале C открывает меню приказов/строительства — будет следующим этапом
    updateHud();
  });

  const romBtn = el("button", { type: "button", textContent: "Другой ROM" });
  romBtn.addEventListener("click", () => location.reload());

  const topbar = el(
    "header",
    { className: "topbar" },
    el("span", { className: "brand" }, "DUNE"),
    el("label", { htmlFor: "mission-select" }, "Миссия", select),
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
    if (world) credits.value = String(world.houses.get(world.player)?.credits ?? 0);
    const h = view.cursorCell();
    const where = h ? `Клетка ${h.x}, ${h.y} · иконка ${h.icon}` : "";
    const help = view.mouseMode
      ? "Левая — выбрать или приказ · протянуть — рамка · правая — снять выбор · колесо — масштаб"
      : "Стрелки — курсор · B+стрелки — быстро · 1 A · 2 B · 3 C · Enter — Start";
    statusWhere.textContent = lastButton ? `${where} · ${lastButton}` : where;
    statusHelp.textContent = help;
    renderSelectionInfo();
    minimap.draw();
  }

  function renderSelectionInfo(): void {
    if (!world) return;
    const units = [...view.selectedUnits];
    const s = view.selectedStructure;
    if (!units.length && !s) {
      info.hidden = true;
      return;
    }
    info.hidden = false;
    if (s) {
      info.replaceChildren(
        el("strong", {}, STRUCTURE_NAMES[s.type] ?? "?"),
        el("span", {}, `${HOUSE_NAMES[s.house] ?? "?"} · прочность ${Math.round((s.hp / 256) * 100)}%`),
      );
    } else if (units.length === 1) {
      const u = units[0];
      info.replaceChildren(
        el("strong", {}, UNIT_NAMES[u.type] ?? `Тип ${u.type}`),
        el("span", {}, `${HOUSE_NAMES[u.house] ?? "?"} · прочность ${Math.round((u.hp / 256) * 100)}%`),
      );
    } else {
      info.replaceChildren(el("strong", {}, `Выбрано юнитов: ${units.length}`));
    }
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

  loadMission("A1");
  canvas.focus();
}

showRomScreen();
