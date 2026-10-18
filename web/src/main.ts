import css from "./style.css?inline";
import { ACTION, G, SELECTION, STRUCTURE } from "./engine/core.ts";
import { layoutSize, structureInfo } from "./engine/tables.ts";
import { structureLimitReached } from "./engine/structure.ts";
import { unitSelect } from "./engine/unit.ts";
import { World, type Structure as WorldStructure, type Unit as WorldUnit } from "./game/world.ts";
import { buildCursors } from "./gfx/cursors.ts";
import { IconSet } from "./gfx/icons.ts";
import { buildPackZip, importPack, packCanvases } from "./gfx/pack.ts";
import { Skins } from "./gfx/skins.ts";
import { ScreenGfx } from "./gfx/screens.ts";
import { SpriteSet } from "./gfx/sprites.ts";
import { BUTTON_LABEL, Pad } from "./input/pad.ts";
import { CELL_PX, DuneRom, ROM, RomError } from "./rom/dune.ts";
import { readU32 } from "./rom/md.ts";
import { AssetViewer } from "./ui/assets.ts";
import { CommandPanel } from "./ui/command.ts";
import { Minimap } from "./ui/minimap.ts";
import { forgetRom, loadStoredRom, storeRom } from "./ui/romstore.ts";
import { FactoryWindow } from "./ui/factory.ts";
import { FrontEnd } from "./ui/frontend.ts";
import { HOUSE_INDEX, MentatScreen } from "./ui/mentat.ts";
import { EndPicture, Flyby, FLYBY_FRAMES } from "./ui/endgame.ts";
import { ScoreScreen, type MissionStats } from "./ui/score.ts";
import { MUSIC, Sound } from "./sound/sound.ts";
import { TutorialScreen } from "./ui/tutorial.ts";
import { FinaleScreen } from "./ui/finale.ts";
import { Hud, hudState } from "./ui/hud.ts";
import { SettingsMenu, type HouseCode } from "./ui/settings.ts";
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
    el("p", {}, "Нужен ROM Mega Drive «Dune: The Battle for Arrakis» (.bin, .gen или .md). Файл читается прямо в браузере и никуда не отправляется. Ресурсы читаются из ROM, здания на карте отображаются в HD."),
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

async function startGame(rom: DuneRom): Promise<void> {
  const icons = new IconSet(rom);
  const skins = new Skins();
  await skins.load(rom, icons);
  const sprites = new SpriteSet(rom);
  const canvas = el("canvas", { className: "view", tabIndex: 0 });
  canvas.setAttribute("aria-label", "Карта миссии");
  const statusWhere = el("span");
  const statusHelp = el("span", { className: "help" });
  const status = el("div", { className: "status" }, statusWhere, statusHelp);
  // кредиты рисует HUD цифрами ROM; число здесь — для чтения с экрана и автотестов
  const credits = el("output", { className: "credits", id: "credits" });
  const info = el("div", { className: "selection-info" });
  info.hidden = true;
  const pausedBanner = el("div", { className: "paused" }, "Пауза · Start — продолжить");
  pausedBanner.hidden = true;
  const stage = el("div", { className: "stage" }, canvas, status, credits, info, pausedBanner);
  const pad = new Pad();
  sprites.skins = skins;
  const cursors = buildCursors(rom);
  const view = new MapView(canvas, icons, sprites, cursors, pad, skins);
  skins.onChange = () => view.invalidate();
  const minimap = new Minimap(view, icons);
  stage.append(minimap.canvas);
  const hud = new Hud(rom);
  stage.append(hud.canvas, hud.warning);
  const world = new World(rom);
  view.veiledIcon = G.veiledTileID;
  const panel = new CommandPanel(rom, world, {
    selectedUnits: () => commandable(),
    selectedStructure: () => view.selectedStructure?.ref ?? null,
    inspected: () => {
      const u = [...view.selectedUnits][0];
      if (u && u.house !== world.player) return { type: u.type, house: u.house, hp: u.hp, isUnit: true };
      const s = view.selectedStructure;
      if (s && s.house !== world.player) return { type: s.type, house: s.house, hp: s.hp, isUnit: false };
      return null;
    },
    targetMode: (text) => G.onMessage(text),
    changed: () => updateHud(),
    // с геймпада вместо меню — HUD оригинала справа вверху
    visible: () => view.mouseMode,
  });
  stage.append(panel.root);
  let paused = false;
  let lastButton = "";
  let frame = 0;
  const message = el("div", { className: "message", role: "status" });
  const endBanner = el("div", { className: "paused end" });
  endBanner.hidden = true;
  stage.append(message, endBanner);
  let messageTimer = 0;
  G.onMessage = (text: string) => {
    message.textContent = text;
    message.hidden = false;
    messageTimer = 60 * 6;
  };
  message.hidden = true;

  // выбор миссии
  const select = el("select", { id: "mission-select" });
  for (const h of MISSION_HOUSES) {
    const group = el("optgroup", { label: h.name });
    for (let i = 1; i <= 9; i++) group.append(el("option", { value: `${h.code}${i}`, textContent: `${h.name} — миссия ${i}` }));
    select.append(group);
  }
  let current = "A1";
  // звук: драйвер GEMS в AudioWorklet; браузер разрешает звук только после действия игрока
  const sound = new Sound(rom);
  const wake = () => void sound.start();
  window.addEventListener("keydown", wake);
  window.addEventListener("pointerdown", wake);
  G.onSound = (id) => sound.sfx(id);
  G.onFeedback = (id) => sound.feedback(id);
  hud.credits.onSound = (id) => sound.sfx(id);
  /** брифинг включает музыку дома, кроме первого после выбора дома ($FFC194) */
  let briefingMusic = false;
  let inMission = false;
  const loadMission = (code: string) => {
    sound.useBank("game");
    current = code;
    world.load(code[0] as HouseCode, Number(code.slice(1)));
    const c = world.scenario.cursor;
    view.setWorld(world, c.x * CELL_PX + CELL_PX / 2, c.y * CELL_PX + CELL_PX / 2);
    minimap.setMap(world.map);
    select.value = code;
    paused = false;
    pausedBanner.hidden = true;
    endBanner.hidden = true;
    message.hidden = true;
    ending = null;
    flyby.stop();
    minimap.canvas.hidden = !prefs.radar;
    hud.credits.reset(world.houses.get(world.player)?.credits ?? 0);
    updateHud();
    // $021574: случайная боевая мелодия
    inMission = true;
    sound.battleMusic();
  };
  select.addEventListener("change", () => loadMission(select.value));
  // конец миссии, как $022AB2: игра идёт ещё 180 кадров, пролетает клин орнитоптеров дома победителя
  // ($026984), затем картинка победы или поражения, текст ментата (на победе — карта следующего уровня)
  // и брифинг следующей миссии или той же заново
  const flyby = new Flyby(rom);
  const endPicture = new EndPicture(rom);
  stage.append(flyby.canvas, endPicture.root);
  let ending: { result: "won" | "lost"; left: number } | null = null;
  /**
   * Главный враг ($FFC27C): последний дом сценария не под управлением игрока ($016646). В миссии 8, если у него
   * не осталось боевых юнитов, — третий дом ($026A9A).
   */
  const enemyHouse = (): number => {
    const ai = world.scenario.houses.filter((h) => h.brain !== "human");
    let enemy = ai.length ? ai[ai.length - 1].id : (world.player + 1) % 3;
    if (Number(current.slice(1)) === 8 && !world.units.some((u) => u.house === enemy && ![0, 1, 14, 15, 16].includes(u.type))) {
      const p = world.player;
      if (enemy === 0 && p === 2) enemy = 1;
      else if (enemy === 1 && p === 0) enemy = 2;
      else if (enemy === 2 && p === 1) enemy = 0;
    }
    return enemy;
  };
  world.game.onEnd = (result) => {
    message.hidden = true;
    clearSelection();
    world.game.afterEnd = FLYBY_FRAMES;
    minimap.canvas.hidden = true;
    ending = { result, left: FLYBY_FRAMES };
    flyby.start(result === "won" ? world.player : enemyHouse());
    // $022AD2: победа — мелодия стоп; $026984: мелодия победы или поражения по дому игрока
    inMission = false;
    if (result === "won") sound.playMusic(MUSIC.STOP);
    sound.playMusic((result === "won" ? MUSIC.WIN : MUSIC.LOSE)[world.player] ?? 0);
  };
  const scoreScreen = new ScoreScreen(rom, (id) => sound.sfx(id));
  stage.append(scoreScreen.root);
  /** итоги для экрана $0271E2; при поражении очки делятся на 10 ($022C1A) */
  const missionStats = (won: boolean): MissionStats => {
    const sc = G.scenario;
    const score = Math.max(0, sc.score);
    return {
      mission: Number(current.slice(1)),
      house: world.player,
      won,
      score: won ? score : Math.trunc(score / 10),
      time: G.timerGame - G.tickScenarioStart,
      spice: [sc.harvestedAllied, sc.harvestedEnemy],
      units: [sc.killedEnemy, sc.killedAllied],
      structures: [sc.destroyedEnemy, sc.destroyedAllied],
    };
  };
  const afterEnding = (result: "won" | "lost"): void => {
    const house = current[0] as HouseCode;
    const m = Number(current.slice(1));
    const stats = missionStats(result === "won");
    paused = true;
    endPicture.open(result, () => {
      if (result === "won")
        mentat.open({ house, level: m, text: mentat.text(house, m, 1), buttons: "key" }, () =>
          scoreScreen.open(stats, () => {
            briefingMusic = true;
            if (m < 9) briefing(house, m + 1);
            // $022BB6: после 9-й миссии — финал и титры, затем главное меню
            else finale.open(world.player, () => frontend.openTitle());
          }),
        );
      else mentat.open({ house, level: m - 1, text: mentat.text(house, m, 2), buttons: "key" }, () => scoreScreen.open(stats, () => ((briefingMusic = true), briefing(house, m))));
    });
  };

  // ---------------------------------------------------------------- Start: настройки
  const prefs = { music: true, sound: true, radar: true };
  try {
    Object.assign(prefs, JSON.parse(localStorage.getItem("dune-prefs") ?? "{}"));
  } catch {
    /* настройки по умолчанию */
  }
  const savePrefs = () => {
    try {
      localStorage.setItem("dune-prefs", JSON.stringify(prefs));
    } catch {
      /* без сохранения */
    }
  };
  const screens = new ScreenGfx(rom);
  await screens.art.load();
  sound.musicOn = prefs.music;
  sound.soundOn = prefs.sound;
  const settings = new SettingsMenu(screens, {
    music: () => prefs.music,
    setMusic: (on) => {
      prefs.music = on;
      sound.setMusic(on);
      savePrefs();
    },
    sound: () => prefs.sound,
    setSound: (on) => {
      prefs.sound = on;
      sound.setSound(on);
      savePrefs();
    },
    ui: (seq) => sound.menuUi(seq),
    playTrack: (seq) => {
      if (prefs.music) sound.previewMusic(seq);
    },
    playSfx: (seq) => sound.menuUi(seq),
    radar: () => prefs.radar,
    setRadar: (on) => {
      prefs.radar = on;
      minimap.canvas.hidden = !on;
      savePrefs();
    },
    restart: () => loadMission(current),
    // «ВЫБРАТЬ ДРУГОЙ ДОМ» в оригинале ведёт на экран выбора дома
    chooseHouse: () => {
      settings.close();
      paused = true;
      frontend.openHouse();
    },
    password: (r) => {
      if (r.kind === "level") loadMission(`${r.house}${r.mission}`);
      else if (r.cheat === "LOOKAROUND" || r.cheat === "SPLURGEOLA" || r.cheat === "PLAYTESTER") {
        world.game.cheat(r.cheat);
        world.sync();
        view.invalidate();
      } else if (r.cheat === "DUNEFINALE") {
        // код DUNEFINALE — финал за дом текущей миссии
        settings.close();
        paused = true;
        inMission = false;
        finale.open(world.player, () => frontend.openTitle());
      }
    },
    toggled: (open) => {
      if (!open) sound.endPreview();
      paused = open || frontend.isOpen || mentat.isOpen || endPicture.isOpen || scoreScreen.isOpen || finale.isOpen;
      // $020EF4: меню в игре — мелодия стоп и звук 6; по выходу — та же или новая боевая
      if (inMission && !optionsFromTitle) {
        if (open) {
          sound.stopMusic();
          sound.sfx(6);
        } else if (sound.battleLeft < 0) sound.battleMusic();
        else sound.resumeMusic();
      }
      pausedBanner.hidden = true;
      // ОПЦИИ из главного меню — по выходу назад в меню
      if (!open && optionsFromTitle) {
        optionsFromTitle = false;
        frontend.openTitle();
      }
    },
  });
  stage.append(settings.root);
  // главное меню и выбор дома — до игры, как в оригинале
  let optionsFromTitle = false;
  const frontend = new FrontEnd(screens, {
    // $01F346: вступление ментата, ДА — брифинг первой миссии, НЕТ — снова выбор дома
    newGame: (house) => {
      paused = true;
      inMission = false;
      // $01F386: музыка ментата по дому
      sound.playMusic(MUSIC.MENTAT[HOUSE_INDEX[house]]);
      briefingMusic = false;
      mentat.open({ house, level: 0, text: mentat.text(house, null), buttons: "yesno" }, (no) => {
        if (no) frontend.openHouse();
        else briefing(house, 1);
      });
    },
    options: () => {
      sound.useBank("game");
      optionsFromTitle = true;
      frontend.close();
      settings.open();
    },
    // $03067C: ролик обучения, по концу или Start — снова главное меню
    tutorial: () => {
      sound.useBank("game");
      frontend.close();
      tutorial.open(() => frontend.openTitle());
    },
    // $017418: заставка — секвенция 0 (если музыка включена); $026BBA: выбор дома — мелодия $1C
    introSound: (seq) => {
      if (prefs.music) sound.play(seq);
    },
    ui: (seq) => sound.ui(seq),
    select: (seq) => {
      if (prefs.sound) sound.play(seq);
    },
    screen: (mode) => {
      inMission = false;
      sound.useBank(mode === "house" ? "game" : "intro");
      if (mode === "intro" || mode === "title") sound.playMusicSequence(0, -1, mode === "intro");
      else sound.playMusic(MUSIC.HOUSE_SELECT);
    },
  });
  stage.append(frontend.root);
  const tutorial = new TutorialScreen(rom, sound);
  const finale = new FinaleScreen(rom, sound);
  stage.append(tutorial.root, finale.root);
  // ментат: брифинг ($01F3EA) — ПРИНЯТЬ начинает миссию, СОВЕТ — совет на том же экране и снова кнопки
  const mentat = new MentatScreen(rom, sound);
  stage.append(mentat.root);
  const briefing = (house: HouseCode, m: number, again = false): void => {
    paused = true;
    inMission = false;
    // $01F3F2: после итогов — снова музыка ментата
    if (briefingMusic && !again) sound.playMusic(MUSIC.MENTAT[HOUSE_INDEX[house]]);
    briefingMusic = false;
    const text = mentat.text(house, m, again ? 3 : 0);
    mentat.open({ house, level: m - 1, text, buttons: "accept", again, leave: true }, (advice) => {
      if (advice) briefing(house, m, true);
      else {
        paused = false;
        loadMission(`${house}${m}`);
      }
    });
  };
  // окно здания с геймпада — как в оригинале; в режиме мыши остаётся правое меню
  const factory = new FactoryWindow(rom, screens, {
    game: () => world.game,
    credits: () => world.houses.get(world.player)?.credits ?? 0,
    toggled: (open) => {
      paused = open;
      pausedBanner.hidden = true;
      // $0287DC: окно — звук $2C; по выходу истёкшая боевая мелодия сменяется ($02890A)
      if (open) sound.ui(0x2c);
      else sound.windowClosed();
      updateHud();
    },
    placing: () => updateHud(),
    ui: (seq) => sound.ui(seq),
    sfx: (id) => sound.sfx(id),
  });
  stage.append(factory.root);
  /** Окно своего здания: с геймпада — оригинальное окно, мышью — правое меню. */
  const openStructure = (st: WorldStructure) => {
    if (view.mouseMode) panel.open();
    else factory.open(st.ref);
  };
  minimap.canvas.hidden = !prefs.radar;

  // ---------------------------------------------------------------- выбор и приказы
  /** дворы, чьё готовое здание уже предлагалось поставить */
  const offered = new WeakSet<object>();
  const clearSelection = () => {
    view.selectedUnits.clear();
    view.selectedStructure = null;
    unitSelect(null);
    world.game.selectedStructure = null;
  };
  const selectStructure = (s: WorldStructure) => {
    clearSelection();
    view.selectedStructure = s;
    world.game.selectedStructure = s.ref;
  };
  const playerUnitsSelected = () => [...view.selectedUnits].filter((u) => u.house === world.player && u.ref.o.flags.used && !u.ref.o.flags.isNotOnMap);
  /** юниты, которым отдаётся приказ: выделенные свои */
  const commandable = () => playerUnitsSelected().map((u) => u.ref);
  const selectUnits = (list: WorldUnit[]) => {
    clearSelection();
    for (const u of list) view.selectedUnits.add(u);
    if (list.length) unitSelect(list[0].ref);
  };

  /** A / щелчок левой: выбрать то, что под курсором, или отдать приказ выбранным. */
  view.onPrimary = (wx, wy) => {
    if (paused || world.game.ended) return;
    const packed = World.packAt(wx, wy);
    if (G.selectionType === SELECTION.PLACE) {
      if (world.game.place(packed)) view.placement = null;
      world.sync();
      updateHud();
      return;
    }
    if (G.selectionType === SELECTION.TARGET) {
      const action = G.activeAction;
      const others = commandable().filter((u) => u !== G.unitActive);
      world.game.targetClick(packed);
      for (const u of others) world.game.order(u, action, packed);
      updateHud();
      return;
    }
    const unit = world.unitAt(wx, wy);
    const mine = commandable();
    if (unit && unit.house === world.player) {
      selectUnits([unit]);
    } else if (mine.length) {
      for (const u of mine) world.game.order(u, world.game.defaultAction(u, packed), packed);
    } else if (unit) {
      selectUnits([unit]);
    } else {
      clearSelection();
      const s = world.structureAtCell(packed & 63, packed >> 6);
      if (s && world.map.unveiled[packed]) {
        view.selectedStructure = s;
        world.game.selectedStructure = s.ref;
      }
    }
    updateHud();
  };
  /**
   * Кнопка A геймпада — как в оригинале MD (обработчик $027B50):
   * свой юнит — выбрать (курсор становится прицелом); при выбранном юните A в точку — приказ
   * (идти, атаковать, войти в здание), после приказа выбор снимается; A по тому же юниту — снять выбор.
   * Своё здание — выбрать; A по выбранному зданию ещё раз — меню здания.
   */
  const padA = () => {
    if (paused || world.game.ended) return;
    const wx = view.cursorX;
    const wy = view.cursorY;
    const packed = World.packAt(wx, wy);
    const s = world.structureAtCell(packed & 63, packed >> 6);
    if (G.selectionType === SELECTION.PLACE && world.game.canPlaceAt(packed) === 0 && s && s.house === world.player) {
      // в оригинале A по своему зданию при постановке открывает его окно
      world.game.cancelPlace();
      selectStructure(s);
      openStructure(s);
      return;
    }
    if (G.selectionType === SELECTION.PLACE || G.selectionType === SELECTION.TARGET) {
      view.onPrimary(wx, wy);
      view.markedUnit = null;
      return;
    }
    // готовое здание («OK» над строительным двором): A по двору — сразу постановка
    if (s && s.house === world.player && world.game.production(s.ref)?.ready && world.game.placeIt(s.ref)) {
      selectStructure(s);
      updateHud();
      return;
    }
    const unit = world.unitAt(wx, wy);
    const mine = commandable();
    if (mine.length) {
      if (unit && mine.includes(unit.ref)) {
        clearSelection();
      } else if (unit && unit.house === world.player && !unit.air) {
        selectUnits([unit]);
      } else {
        for (const u of mine) world.game.order(u, world.game.defaultAction(u, packed), packed);
        clearSelection();
      }
    } else if (unit && unit.house === world.player && !unit.air) {
      selectUnits([unit]);
    } else if (s && world.map.unveiled[packed]) {
      if (view.selectedStructure === s && s.house === world.player) openStructure(s);
      else selectStructure(s);
    } else if (unit) {
      selectUnits([unit]);
    } else {
      clearSelection();
    }
    view.markedUnit = playerUnitsSelected()[0] ?? null;
    updateHud();
  };
  /** Кнопка B: отмена — постановки здания, выбора цели или выделения. */
  const padB = () => {
    if (G.selectionType === SELECTION.TARGET || G.selectionType === SELECTION.PLACE) {
      world.game.cancelTarget();
      view.placement = null;
    } else clearSelection();
    view.markedUnit = null;
    updateHud();
  };

  /** Правая кнопка: отменить выбор цели или постановку, иначе снять выделение, как в Red Alert. */
  view.onSecondary = () => {
    if (G.selectionType === SELECTION.TARGET || G.selectionType === SELECTION.PLACE) {
      world.game.cancelTarget();
      view.placement = null;
    } else clearSelection();
    updateHud();
  };
  /** Рамка: выбрать все свои юниты внутри. */
  view.onBox = (r) => {
    if (paused) return;
    const inside = world.units.filter((u) => u.house === world.player && !u.air && u.x >= r.x0 && u.x <= r.x1 && u.y >= r.y0 && u.y <= r.y1);
    if (!inside.length) return;
    selectUnits(inside);
    updateHud();
  };
  view.onFrame = () => {
    frame++;
    // звуки, отложенные до кадра ($00182E); время боевой мелодии ($004668)
    sound.frame();
    if (inMission) {
      sound.battleLeft--;
      // $01253E: в основном цикле игры истёкшая боевая мелодия сразу заменяется следующей.
      if (!paused && sound.musicOn && sound.battleLeft < 0) sound.battleMusic();
    }
    // окно игрока — для скриптов (юниты вне окна думают медленнее, как в оригинале)
    const v = view.viewSize();
    G.viewportPacked = World.packAt(Math.max(0, view.camX), Math.max(0, view.camY));
    G.viewportTilesW = Math.ceil(v.w / CELL_PX);
    G.viewportTilesH = Math.ceil(v.h / CELL_PX);
    if (ending && !paused) {
      const v = view.viewSize();
      flyby.tick(v.w, v.h, view.zoom);
      if (--ending.left === 0) {
        const r = ending.result;
        ending = null;
        flyby.stop();
        afterEnding(r);
      }
    }
    if (!paused) {
      world.step();
      world.sync();
      for (const u of [...view.selectedUnits]) if (!u.ref.o.flags.used || u.ref.o.flags.isNotOnMap || !world.units.includes(u)) view.selectedUnits.delete(u);
      if (view.selectedStructure && !world.structures.includes(view.selectedStructure)) view.selectedStructure = null;
      view.invalidate();
    }
    if (messageTimer > 0 && --messageTimer === 0) message.hidden = true;
    // значки над своими зданиями, как $00DC9C: у двора и дворца «OK», иначе при ремонте — молоток
    view.structureIcons = [];
    // спрайт значка мигает ($0010B0): виден `shown` кадров, затем один кадр скрыт (счётчик +4/+5 спрайта)
    const icon = (s: WorldStructure, def: number, shown: number) => {
      if (frame % (shown + 1) !== shown) view.structureIcons.push({ s, def });
    };
    const fromTable = (table: number, index: number) => readU32(rom.bytes, table + index * 4);
    for (const s of world.structures) {
      if (s.house !== world.player || s.ref.o.hitpoints === 0) continue;
      if (s.type === STRUCTURE.CONSTRUCTION_YARD) {
        // MD: готовое здание сразу «прилипает» к курсору; после отмены (B) над двором горит «OK»
        const prod = world.game.production(s.ref);
        if (prod && !prod.ready) offered.delete(s.ref);
        let ok = false;
        if (prod?.ready) {
          if (!offered.has(s.ref) && !paused && G.selectionType !== SELECTION.PLACE && G.selectionType !== SELECTION.TARGET && !panel.focused) {
            offered.add(s.ref);
            if (world.game.placeIt(s.ref)) selectStructure(s);
          }
          // бит 15 слова $6: пока двор выбран для постановки своего заказа, «OK» нет
          ok = !(G.selectionType === SELECTION.PLACE && world.game.selectedStructure === s.ref);
        }
        if (ok) icon(s, fromTable(ROM.statusIcons.ok, 3), 6);
        else if (s.ref.o.flags.repairing) icon(s, fromTable(ROM.statusIcons.repair, 3), 7);
      } else if (s.type === STRUCTURE.PALACE) {
        // $00DCFE: спецоружие готово ($56 = 0), ракета не ждёт цели ($FFDC4C) и нет бита 8
        // (у Атрейдесов — пул наземных юнитов полон, фрименам негде появиться)
        if (s.ref.countDown === 0 && !G.unitHouseMissile && !structureLimitReached(s.ref)) icon(s, fromTable(ROM.statusIcons.ok, 6), 6);
        else if (s.ref.o.flags.repairing) icon(s, fromTable(ROM.statusIcons.repair, 6), 7);
      } else if (s.type === STRUCTURE.WINDTRAP) {
        // $00DD6A: молния, пока потребление дома больше выработки
        const h = G.houses[world.player];
        if (h.powerUsage > h.powerProduction) icon(s, ROM.statusIcons.lightning, 3);
      }
    }
    if (G.selectionType === SELECTION.PLACE && G.structureActiveType !== 0xffff) {
      const si = structureInfo[G.structureActiveType];
      const size = layoutSize[si.layout];
      view.placement = { w: size.width, h: size.height, valid: world.game.canPlaceAt(World.packAt(view.cursorX, view.cursorY)) };
    } else view.placement = null;
    const over = world.unitAt(view.cursorX, view.cursorY);
    const overS = world.structureAtCell(Math.floor(view.cursorX / CELL_PX), Math.floor(view.cursorY / CELL_PX));
    const mine = playerUnitsSelected().length > 0;
    const enemy = (over && over.house !== world.player) || (overS && overS.house !== world.player);
    if (G.selectionType === SELECTION.TARGET) view.cursorKind = G.activeAction === ACTION.MOVE ? "move" : "attack";
    else if (G.selectionType === SELECTION.PLACE) view.cursorKind = "select";
    else if (!view.mouseMode) view.cursorKind = mine ? "attack" : "select"; // в оригинале при выбранном юните — прицел
    else view.cursorKind = !mine ? "select" : over && over.house === world.player ? "select" : enemy ? "attack" : "move";
    if (view.markedUnit && !playerUnitsSelected().includes(view.markedUnit)) view.markedUnit = null;
    view.inputLocked = panel.focused;
    if (frame % 10 === 0) panel.update();
    drawHud();
    if (frame % 30 === 0) {
      minimap.refresh(world.units.map((u) => ({ x: u.x, y: u.y, color: u.house === world.player ? "#7fd0ff" : "#ff6a5a" })));
      updateHud();
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

  let originals: Map<string, HTMLCanvasElement> | null = null;
  const assets = new AssetViewer(rom, icons, skins, () => (assets.root.hidden = true), {
    exportZip: () => buildPackZip(rom, icons, sprites, cursors),
    importFiles: (files) => importPack(files, skins, () => (originals ??= packCanvases(rom, icons, sprites, cursors))),
  });
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
    if (!view.mouseMode) panel.close();
  };
  mouseBtn.addEventListener("click", toggleMouse);

  // кнопки геймпада
  pad.onPress((b) => {
    if (!assets.root.hidden) return;
    lastButton = BUTTON_LABEL[b];
    if (ending) return;
    if (finale.handlePad(b) || tutorial.handlePad(b) || scoreScreen.handlePad(b) || endPicture.handlePad(b) || mentat.handlePad(b) || frontend.handlePad(b) || settings.handlePad(b) || factory.handlePad(b)) {
      updateHud();
      return;
    }
    if (panel.handlePad(b)) {
      updateHud();
      return;
    }
    if (b === "start") {
      settings.open();
    } else if (b === "a") padA();
    else if (b === "b") padB();
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
    hud.setZoom(view.zoom);
    credits.value = String(world.houses.get(world.player)?.credits ?? 0);
    const h = view.cursorCell();
    const where = h ? `Клетка ${h.x}, ${h.y} · иконка ${h.icon}` : "";
    const help = view.mouseMode
      ? "Левая — выбрать или приказ · протянуть — рамка · правая — снять выбор · стрелки — карта · колесо — масштаб"
      : "Стрелки — курсор · C+стрелки — быстро · 1 A · 2 B · 3 C · Enter — Start (меню)";
    statusWhere.textContent = lastButton ? `${where} · ${lastButton}` : where;
    statusHelp.textContent = help;
    renderSelectionInfo();
    minimap.draw();
  }

  /** HUD справа вверху: счётчик кредитов тикает раз в кадр карты ($011F38), выбор — по $0294C2. */
  function drawHud(): void {
    if (!paused) hud.credits.tick(world.houses.get(world.player)?.credits ?? 0);
    const unit = [...view.selectedUnits][0]?.ref ?? null;
    const s = view.selectedStructure?.ref ?? null;
    hud.draw(view.mouseMode ? null : hudState(rom, s, unit));
  }

  function renderSelectionInfo(): void {
    info.hidden = true;
    panel.update();
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
  // ?debug — сразу в игру (для автотестов), иначе — главное меню
  const q = new URLSearchParams(location.search);
  if (!q.has("debug") || q.has("title") || q.has("intro")) {
    paused = true;
    // заставка при включении, как на MD; ?debug&title — сразу меню
    if (q.has("title")) frontend.openTitle();
    else frontend.openIntro();
  }
  canvas.focus();
  // для автотестов: ?debug открывает мир и вид из консоли
  if (new URLSearchParams(location.search).has("debug")) Object.assign(window, { dune: { world, view, G, sprites, mentat, endPicture, scoreScreen, frontend, sound, tutorial, finale } });
}

showRomScreen();
