/**
 * Экраны до игры, как в оригинале MD: главное меню («DUNE», НОВАЯ ИГРА / ОПЦИИ / ОБУЧЕНИЕ) и выбор дома.
 * Графика — gfx/screens.ts (данные ROM), навигация — по эмулятору:
 * - меню: ↑/↓ по кругу, стрелка в x 120, y 160 + 8·пункт, A или Start — выбрать;
 * - выбор дома: ←/→ без перехода через край (Атрейдесы, Ордосы, Харконнены), A — выбрать.
 */
import type { ScreenGfx } from "../gfx/screens.ts";
import { SCREEN_H, SCREEN_W } from "../gfx/screens.ts";
import type { Button } from "../input/pad.ts";
import type { HouseCode } from "./settings.ts";
import { Intro } from "./intro.ts";
import { menuArrow, menuPoint, menuText, prepareMenu } from "../gfx/menu-canvas.ts";

const MENU_ITEMS = 3;
const ARROW = { x: 120, y: 160, step: 8 };
/** дома слева направо */
const HOUSES: HouseCode[] = ["A", "O", "H"];
const HOUSE_FRAME = { x: 32, step: 88, y: 136 };
/** рамка выбора дома едет к соседнему по 4 точки за кадр ($00480C) */
const HOUSE_SLIDE = 4;

export interface FrontEndHost {
  newGame(house: HouseCode): void;
  /** экран сменился: для музыки (заставка — секвенция 0, выбор дома — мелодия $1C) */
  screen?(mode: "intro" | "title" | "house"): void;
  /** звук заставки ($02DD26) */
  introSound?(seq: number): void;
  /** остановка звука заставки ($02DDCC) */
  introStop?(seq: number): void;
  /** звук пролёта корабля-матки в заставке: дом и длительность, с */
  introFlyby?(house: number, seconds: number): void;
  openingTime?(): number;
  /** звук интерфейса ($02DDB6) */
  ui?(seq: number): void;
  /** звук выбора пункта: $02DD26, только если звуки включены ($017980) */
  select?(seq: number): void;
  options(): void;
  network?():void;
  tutorial?(): void;
  frame?(): void;
}

export class FrontEnd {
  readonly root: HTMLElement;
  private canvas = document.createElement("canvas");
  private mode: "intro" | "title" | "house" = "title";
  private intro: Intro;
  private item = 0;
  private house = 0;
  /** сколько точек рамке ещё ехать до выбранного дома ($FFBF02), знак — направление */
  private slide = 0;
  private frame = 0;
  private titleStartFrame = 0;
  private raf = 0;

  constructor(
    private gfx: ScreenGfx,
    private host: FrontEndHost,
  ) {
    this.root = document.createElement("section");
    this.root.className = "settings frontend hd-menu";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", "Главное меню");
    this.root.hidden = true;
    this.canvas.width = SCREEN_W;
    this.canvas.height = SCREEN_H;
    this.root.append(this.canvas);
    this.canvas.addEventListener("click", (e) => this.onClick(e));
    this.intro = new Intro(
      gfx,
      (seq) => this.host.introSound?.(seq),
      (seq) => this.host.introStop?.(seq),
      () => this.host.openingTime?.() ?? this.frame / 60,
      (house, seconds) => this.host.introFlyby?.(house, seconds),
    );
  }

  /** Заставка при включении; кончится или любая кнопка — главное меню. */
  openIntro(): void {
    this.mode = "intro";
    this.intro.start();
    this.show();
    this.host.screen?.("intro");
  }

  /** Для автотестов: прогнать n кадров заставки. */
  stepIntro(n: number): void {
    cancelAnimationFrame(this.raf);
    for (let i = 0; i < n && this.mode === "intro"; i++) if (!this.intro.tick()) this.openTitle();
    this.draw();
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  openTitle(): void {
    if (this.mode === "intro") {
      const titleElapsed = this.intro.titleElapsedSeconds();
      this.titleStartFrame = this.frame - Math.round(titleElapsed * 60);
    }
    this.intro.stopVideo();
    this.mode = "title";
    this.item = 0;
    this.show();
    this.host.screen?.("title");
  }

  openHouse(): void {
    this.intro.pauseBackdrop();
    this.mode = "house";
    this.house = 0;
    this.slide = 0;
    this.show();
    this.host.screen?.("house");
  }

  private show(): void {
    this.root.hidden = false;
    this.root.setAttribute("aria-label", this.mode === "title" ? "Главное меню" : "Выбор дома");
    cancelAnimationFrame(this.raf);
    this.loop();
  }

  close(): void {
    this.intro.stopVideo();
    this.intro.pauseBackdrop();
    this.root.hidden = true;
    cancelAnimationFrame(this.raf);
  }

  /** Кнопка геймпада, пока экран открыт. true — обработана. */
  handlePad(b: Button): boolean {
    if (this.root.hidden) return false;
    if (this.mode === "intro") {
      this.openTitle();
      return true;
    }
    if (this.mode === "title") {
      // $017A9E: стрелка — звук $0B, выбор — $0C
      if (b === "up") (this.item = (this.item + MENU_ITEMS - 1) % MENU_ITEMS), this.host.ui?.(0x0b);
      else if (b === "down") (this.item = (this.item + 1) % MENU_ITEMS), this.host.ui?.(0x0b);
      else if (b === "a" || b === "c" || b === "start") (this.host.select?.(0x0c), this.chooseItem());
    } else {
      // $004934: пока рамка едет, кнопки не действуют
      if (this.slide) return true;
      if (b === "left" && this.house > 0) (this.house--, (this.slide = -HOUSE_FRAME.step));
      else if (b === "right" && this.house < HOUSES.length - 1) (this.house++, (this.slide = HOUSE_FRAME.step));
      else if (b === "a" || b === "c" || b === "start") {
        this.close();
        this.host.newGame(HOUSES[this.house]);
      } else if (b === "b") this.openTitle();
    }
    return true;
  }

  private chooseItem(): void {
    if (this.item === 0) this.openHouse();
    else if (this.item === 1) this.host.network?.();
    else if (this.item === 2) this.host.options();
  }

  private onClick(e: MouseEvent): void {
    const { x, y } = menuPoint(this.canvas, e);
    if (this.mode === "intro") this.openTitle();
    else if (this.mode === "title") {
      const i = Math.floor((y - ARROW.y) / ARROW.step);
      if (i >= 0 && i < MENU_ITEMS && x >= ARROW.x) {
        this.item = i;
        this.host.select?.(0x0c);
        this.chooseItem();
      }
    } else {
      const i = Math.floor((x - HOUSE_FRAME.x + 4) / HOUSE_FRAME.step);
      if (i >= 0 && i < HOUSES.length && y >= 56 && y < HOUSE_FRAME.y + 16) {
        this.house = i;
        this.close();
        this.host.newGame(HOUSES[i]);
      }
    }
  }

  private loop(): void {
    this.frame++;
    this.host.frame?.();
    if (this.mode === "intro" && !this.intro.tick()) this.openTitle();
    if (this.mode === "house" && this.slide) {
      this.slide -= Math.sign(this.slide) * HOUSE_SLIDE;
      // рамка доехала — звук $19
      if (!this.slide) this.host.ui?.(0x19);
    }
    this.draw();
    if (!this.root.hidden) this.raf = requestAnimationFrame(() => this.loop());
  }

  private draw(): void {
    const g = prepareMenu(this.canvas);
    if (this.mode === "intro") {
      this.intro.draw(g);
    } else if (this.mode === "title") {
      if (this.intro.drawBackdrop(g, this.frame)) this.gfx.drawTitleLettering(
        g, (this.frame - this.titleStartFrame) / 60, this.host.openingTime?.() ?? this.frame / 60,
      );
      else g.drawImage(this.gfx.titleScreen(), 0, 0);
      menuArrow(g, ARROW.x, ARROW.y + this.item * ARROW.step, this.frame);
    } else {
      const image = this.gfx.art.get("houses");
      if (image) {
        const backdrop=this.gfx.art.get('houseHall');
        if(backdrop){
          const m=g.getTransform(),w=this.canvas.width/m.a,h=this.canvas.height/m.d;
          const size=Math.max(w/backdrop.width,h/backdrop.height),bw=backdrop.width*size,bh=backdrop.height*size;
          g.drawImage(backdrop,160-bw/2,112-bh/2,bw,bh);
        }
        g.save();g.globalCompositeOperation='screen';g.drawImage(image,0,0,SCREEN_W,SCREEN_H);g.restore();
        const strings = this.gfx.menuStrings();
        const russian = /[А-Я]/.test(strings.houses.join(""));
        menuText(g, russian ? "ВЫБЕРИ СЕБЕ ДОМ" : "CHOOSE YOUR HOUSE", 160, 36,
          { size: 10, color: "#f7d479", align: "center", serif: true });
        [1, 2, 0].forEach((id, i) => menuText(g, strings.houses[id], 72 + i * 88, 139,
          { size: 7.4, color: "#f5db9d", align: "center", maxWidth: 72, shadow: true }));
        g.strokeStyle = ["#fff1ad", "#e8b63c", "#a86d16", "#e8b63c"][(this.frame & 31) >> 3];
        g.lineWidth = 0.8;
        g.shadowColor='#ffd67c';g.shadowBlur=2;
        g.strokeRect(HOUSE_FRAME.x + this.house * HOUSE_FRAME.step - this.slide, 134.5, 79.5, 16.2);
        g.shadowBlur=0;
      } else {
        g.drawImage(this.gfx.houseScreen(), 0, 0);
        g.drawImage(this.gfx.houseFrame(((this.frame & 31) >> 3) + 1), HOUSE_FRAME.x + this.house * HOUSE_FRAME.step - this.slide, HOUSE_FRAME.y);
      }
    }
  }
}
