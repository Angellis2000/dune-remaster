/**
 * Просмотр ресурсов из ROM с их номерами. Номера — это ключи, под которыми потом
 * подменяется графика (см. IconSet.setOverride).
 */
import { STRUCTURE_NAMES, UNIT_NAMES } from "../game/names.ts";
import type { IconSet } from "../gfx/icons.ts";
import type { Skins } from "../gfx/skins.ts";
import { CELL_PX, type DuneRom, type Picture } from "../rom/dune.ts";

type Tab = "icons" | "units" | "structures" | "palette";

export class AssetViewer {
  readonly root = document.createElement("section");
  private body = document.createElement("div");
  private tabs = new Map<Tab, HTMLButtonElement>();

  constructor(
    private rom: DuneRom,
    private icons: IconSet,
    private skins: Skins,
    onClose: () => void,
  ) {
    this.root.className = "assets";
    this.root.hidden = true;
    this.root.setAttribute("aria-label", "Ресурсы игры");
    const head = document.createElement("header");
    const title = document.createElement("h2");
    title.textContent = "Ресурсы из ROM";
    const nav = document.createElement("nav");
    const names: [Tab, string][] = [
      ["icons", "Клетки карты"],
      ["units", "Юниты"],
      ["structures", "Здания"],
      ["palette", "Палитра"],
    ];
    for (const [tab, label] of names) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.addEventListener("click", () => this.show(tab));
      this.tabs.set(tab, b);
      nav.append(b);
    }
    const close = document.createElement("button");
    close.type = "button";
    close.className = "close";
    close.textContent = "Закрыть";
    close.addEventListener("click", onClose);
    head.append(title, nav, close);
    this.body.className = "assets-body";
    this.root.append(head, this.body);
  }

  show(tab: Tab): void {
    for (const [t, b] of this.tabs) b.setAttribute("aria-pressed", String(t === tab));
    this.body.replaceChildren();
    if (tab === "icons") this.renderIcons();
    if (tab === "units") this.renderPictures(this.rom.unitPictures(), UNIT_NAMES);
    if (tab === "structures") {
      const note = document.createElement("p");
      note.className = "note";
      note.textContent =
        "Свою картинку здания можно перетащить на карточку или выбрать кнопкой. Она рисуется на карте вместо оригинальных клеток, на всю площадь здания (2×2, 3×3 и т. д.), и хранится только в этом браузере.";
      this.body.append(note);
      this.renderPictures(this.rom.structurePictures(), STRUCTURE_NAMES, true);
    }
    if (tab === "palette") this.renderPalette();
  }

  private renderIcons(): void {
    const note = document.createElement("p");
    note.className = "note";
    note.textContent = `${this.icons.count} клеток 32×32. Номер под картинкой — то же число, что хранится в карте миссии.`;
    const grid = document.createElement("div");
    grid.className = "grid icons";
    for (let id = 0; id < this.icons.count; id++) {
      const fig = document.createElement("figure");
      const c = document.createElement("canvas");
      c.width = CELL_PX;
      c.height = CELL_PX;
      const s = this.icons.source(id);
      c.getContext("2d")!.drawImage(s.image, s.sx, s.sy, s.sw, s.sh, 0, 0, CELL_PX, CELL_PX);
      const cap = document.createElement("figcaption");
      cap.textContent = String(id);
      fig.append(c, cap);
      grid.append(fig);
    }
    this.body.append(note, grid);
  }

  private renderPictures(list: Picture[], names: string[], skinnable = false): void {
    const grid = document.createElement("div");
    grid.className = "grid pictures";
    for (const p of list) {
      const fig = document.createElement("figure");
      const c = document.createElement("canvas");
      c.width = p.width;
      c.height = p.height;
      c.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(p.pixels), p.width, p.height), 0, 0);
      const cap = document.createElement("figcaption");
      cap.textContent = `${p.id} · ${names[p.id] ?? "?"}`;
      fig.append(c, cap);
      if (skinnable) this.addSkinControls(fig, p.id, names[p.id] ?? String(p.id));
      grid.append(fig);
    }
    this.body.append(grid);
  }

  /** Кнопки «своя картинка / сбросить» и приём файла перетаскиванием. */
  private addSkinControls(fig: HTMLElement, type: number, name: string): void {
    const preview = document.createElement("img");
    preview.className = "skin-preview";
    preview.alt = `Своя картинка: ${name}`;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.hidden = true;
    const pick = document.createElement("button");
    pick.type = "button";
    pick.textContent = "Своя картинка…";
    const reset = document.createElement("button");
    reset.type = "button";
    reset.textContent = "Сбросить";
    const row = document.createElement("div");
    row.className = "skin-actions";
    row.append(pick, reset, input);

    const refresh = () => {
      const img = this.skins.structureImage(type);
      reset.hidden = !img;
      preview.hidden = !img;
      fig.classList.toggle("skinned", !!img);
      if (img) {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        c.getContext("2d")!.drawImage(img, 0, 0);
        preview.src = c.toDataURL();
      }
    };
    const apply = async (f: File | undefined) => {
      if (!f || !f.type.startsWith("image/")) return;
      await this.skins.setStructure(type, f);
      refresh();
    };
    pick.addEventListener("click", () => input.click());
    input.addEventListener("change", () => apply(input.files?.[0]));
    reset.addEventListener("click", async () => {
      await this.skins.clearStructure(type);
      refresh();
    });
    fig.addEventListener("dragover", (e) => {
      e.preventDefault();
      fig.classList.add("over");
    });
    fig.addEventListener("dragleave", () => fig.classList.remove("over"));
    fig.addEventListener("drop", (e) => {
      e.preventDefault();
      fig.classList.remove("over");
      apply(e.dataTransfer?.files[0]);
    });
    fig.append(preview, row);
    refresh();
  }

  private renderPalette(): void {
    const pal = this.rom.gamePalette();
    const table = document.createElement("div");
    table.className = "palette";
    for (let line = 0; line < 4; line++) {
      const row = document.createElement("div");
      row.className = "pal-row";
      const name = document.createElement("span");
      name.textContent = `Строка ${line}`;
      row.append(name);
      for (let c = 0; c < 16; c++) {
        const v = pal[line * 16 + c];
        const sw = document.createElement("span");
        sw.className = "swatch";
        sw.style.background = `rgb(${v & 255},${(v >> 8) & 255},${(v >> 16) & 255})`;
        sw.title = `${line}:${c}`;
        row.append(sw);
      }
      table.append(row);
    }
    const note = document.createElement("p");
    note.className = "note";
    note.textContent = "Игровая палитра. Цвета 13–15 каждой строки — цвета домов на юнитах и зданиях.";
    this.body.append(note, table);
  }
}
