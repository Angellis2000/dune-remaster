import css from "./style.css?inline";
import { ACTION, G, SELECTION, STRUCTURE, UNIT, type Structure as EngineStructure, type Unit as EUnit } from "./engine/core.ts";
import { layoutSize, structureInfo } from "./engine/tables.ts";
import { houseAreAllied } from "./engine/house.ts";
import { structureLimitReached } from "./engine/structure.ts";
import { unitSelect } from "./engine/unit.ts";
import { World, type Structure as WorldStructure, type Unit as WorldUnit } from "./game/world.ts";
import { buildCursors } from "./gfx/cursors.ts";
import { dayPhase } from "./gfx/world-atmosphere.ts";
import { IconSet } from "./gfx/icons.ts";
import { ContinuousTerrain } from "./gfx/continuous-terrain.ts";
import { MapEffects } from "./gfx/map-effects.ts";
import { VehicleArt } from "./gfx/vehicle-art.ts";
import { WormArt } from "./gfx/worm-art.ts";
import { ImpactParticles } from "./gfx/impact-particles.ts";
import { InfantryArt } from "./gfx/infantry-art.ts";
import {Portraits} from './gfx/portraits.ts';
import { mapGetLandscapeType, mapIsUnveiledLocal } from "./engine/map.ts";
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
import {NetworkMenu,type LobbyMap} from './ui/network.ts';
import { NetSession, defaultEndpoint, type MatchStart } from './net/session.ts';
import { saveRecording } from './net/replay.ts';
import { ReplayBar, ReplayList } from './ui/replays.ts';
import { installNetControls } from './net/controls.ts';
import { HOUSE_INDEX, MentatScreen } from "./ui/mentat.ts";
import { EndPicture, Flyby, FLYBY_FRAMES } from "./ui/endgame.ts";
import { ScoreScreen, type MissionStats } from "./ui/score.ts";
import { MUSIC, Sound } from "./sound/sound.ts";
import { TutorialScreen } from "./ui/tutorial.ts";
import {BuildingPortraits} from './gfx/building-portraits.ts';
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
  const q = new URLSearchParams(location.search);
  const stored = error ? null : await loadStoredRom();
  if (stored && !q.has("chooseRom")) {
    start(stored.name, stored.bytes, false);
    return;
  }
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
  const screens = new ScreenGfx(rom);
  const [, terrain, mapEffects, vehicles, particles, infantry, , worm] = await Promise.all([
    skins.load(rom, icons), ContinuousTerrain.load(rom, icons), MapEffects.load(),
    VehicleArt.load(rom), ImpactParticles.load(),
    InfantryArt.load(rom), screens.art.load(), WormArt.load(),
  ]);
  const sprites = new SpriteSet(rom);
  sprites.mapEffects = mapEffects;
  sprites.wormArt = worm;
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
  const view = new MapView(canvas, icons, sprites, cursors, pad, skins, terrain, vehicles, particles, infantry);
  G.onUnitShot = (unit, bullet) => {
    vehicles?.shot(unit, bullet, G.timerGame);infantry?.shot(unit, bullet, G.timerGame);
  };
  G.onVisualExplosion = (type, position) => {
    const p = ((position.y >> 8) << 6) | (position.x >> 8);
    if (p < 0 || p > 4095 || (!mapIsUnveiledLocal(p) && !G.revealAll)) return;
    const kind = mapGetLandscapeType(p), x = position.x / 8, y = position.y / 8;
    const surface = kind >= 10 && kind <= 13 ? 'structure' : kind === 8 || kind === 9 ? 'spice' :
      ([4,6,7].includes(kind) || ([1,5].includes(kind) && terrain?.isRockAt(x,y))) ? 'rock' : 'sand';
    particles?.burst(x, y, type, surface, G.timerGame);
    if (type === 11) view.nukes.add(x, y, G.timerGame);
  };
  skins.onChange = () => view.invalidate();
  const minimap = new Minimap(view, icons);
  stage.append(minimap.canvas);
  const world = new World(rom);
  let completedConstructionYard: EngineStructure | null = null;
  let queuedPlacementYard: EngineStructure | null = null;
  const portraits=new Portraits(skins,vehicles,infantry,mapEffects,icons,()=>world.player,worm,new BuildingPortraits(rom,screens));
  const hud = new Hud(rom,portraits);
  stage.append(hud.canvas, hud.warning);
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
    sfx: (id) => sound.sfx(id),
  }, portraits);
  stage.append(panel.root);
  let paused = false;
  let lastButton = "";
  let frame = 0;
  const message = el("div", { className: "message", role: "status" });
  const endBanner = el("div", { className: "paused end" });
  endBanner.hidden = true;
  stage.append(message, endBanner);
  let messageTimer = 0;
  let lastDayPhase = '', lastDayElapsed = 0;
  const DAY_MESSAGES: Record<string, string> = {
    Рассвет: 'Рассвет. Через 2 минуты день.', День: 'Наступил день.',
    Закат: 'Солнце садится. Через 2 минуты ночь.', Ночь: 'Наступила ночь.',
  };
  let networkReplaying = () => false;
  G.onMessage = (text: string) => {
    if (networkReplaying()) return;
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
  void sound.start();
  const unlock = () => sound.unlockAudio();
  window.addEventListener("keydown", unlock, { capture: true });
  window.addEventListener("keyup", unlock, { capture: true });
  window.addEventListener("pointerdown", unlock, { capture: true });
  window.addEventListener("pointerup", unlock, { capture: true });
  window.addEventListener("mousedown", unlock, { capture: true });
  window.addEventListener("mouseup", unlock, { capture: true });
  window.addEventListener("click", unlock, { capture: true });
  window.addEventListener("touchstart", unlock, { capture: true });
  window.addEventListener("touchend", unlock, { capture: true });
  window.addEventListener("wheel", unlock, { capture: true, passive: true });
  window.addEventListener("focus", unlock);
  G.onSound = (id, _position, volume = 1) => { if (!networkReplaying()) sound.sfx(id, volume); };
  G.onFeedback = (id) => { if (!networkReplaying()) sound.feedback(id); };
  // MD $0290A4/$0290AE: accepted order -> SFX $0D; $00C2D8 -> READY feedback 0.
  // Placement also uses SFX $0D ($028486); it must never replace READY feedback.
  G.onConstructionStart = () => { if (!networkReplaying()) sound.sfx(0x0d); };
  G.onConstructionComplete = (yard) => {
    if (networkReplaying()) return;
    sound.feedback(0);
    if (yard) completedConstructionYard = yard;
  };
  hud.credits.onSound = (id) => sound.sfx(id);
  /** брифинг включает музыку дома, кроме первого после выбора дома ($FFC194) */
  let briefingMusic = false;
  let inMission = false;
  let dismissMissionScreens = () => {};
  const loadMission = (code: string): boolean => {
    const match = /^([AOH])([1-9])$/i.exec(code.trim());
    if (!match) {
      select.value = current;
      return false;
    }
    const normalized = `${match[1].toUpperCase()}${match[2]}`;
    try {
      const scenario = rom.scenario(normalized[0], Number(normalized.slice(1)));
      rom.missionMap(scenario.mapIndex);
    } catch (error) {
      select.value = current;
      G.onMessage(`Не удалось загрузить локацию ${normalized}: ${error instanceof Error ? error.message : "ошибка данных миссии"}`, 0);
      return false;
    }
    endNetMatch();
    dismissMissionScreens();
    sound.playMusic(MUSIC.STOP);
    sound.useBank("game");
    current = normalized;
    completedConstructionYard = null;
    queuedPlacementYard = null;
    world.game.difficulty = prefs.difficulty;
    world.load(normalized[0] as HouseCode, Number(normalized.slice(1)));
    const c = world.scenario.cursor;
    view.setWorld(world, c.x * CELL_PX + CELL_PX / 2, c.y * CELL_PX + CELL_PX / 2);
    minimap.setMap(world.map);
    minimap.draw();
    select.value = normalized;
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
    return true;
  };
  // Выпадающий список и ввод пароля уровня используют один и тот же путь загрузки сценария.
  select.addEventListener("change", () => { loadMission(select.value); });
  // конец миссии, как $022AB2: игра идёт ещё 180 кадров, пролетает клин орнитоптеров дома победителя
  // ($026984), затем картинка победы или поражения, текст ментата (на победе — карта следующего уровня)
  // и брифинг следующей миссии или той же заново
  const flyby = new Flyby(rom, vehicles);
  const endPicture = new EndPicture(rom, screens.art);
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
    if (net.inMatch) {
      onNetEnd(result);
      return;
    }
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
  const scoreScreen = new ScoreScreen(rom, (id) => sound.sfx(id), screens.art);
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
  const prefs = { music: true, sound: true, radar: true, difficulty: 2 };
  try {
    Object.assign(prefs, JSON.parse(localStorage.getItem("dune-prefs") ?? "{}"));
  } catch {
    /* настройки по умолчанию */
  }
  prefs.difficulty = Math.max(0, Math.min(2, Math.round(Number(prefs.difficulty) || 0)));
  const savePrefs = () => {
    try {
      localStorage.setItem("dune-prefs", JSON.stringify(prefs));
    } catch {
      /* без сохранения */
    }
  };
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
    restart: () => (net.inMatch ? leaveNetMatch() : loadMission(current)),
    // «ВЫБРАТЬ ДРУГОЙ ДОМ» в оригинале ведёт на экран выбора дома
    chooseHouse: () => {
      endNetMatch();
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
    network:()=>{frontend.close();paused=true;inMission=false;sound.useBank('game');sound.playMusic(MUSIC.HOUSE_SELECT);void networkMenu.open();},
    options: () => {
      sound.useBank("game");
      optionsFromTitle = true;
      frontend.close();
      settings.open();
    },
    difficulty: () => prefs.difficulty,
    difficultyChanged: (level) => {
      prefs.difficulty = level;
      savePrefs();
    },
    // $03067C: ролик обучения, по концу или Start — снова главное меню
    tutorial: () => {
      sound.useBank("game");
      frontend.close();
      tutorial.open(() => frontend.openTitle());
    },
    // $017418: заставка — секвенция 0 (музыка); $017636: корабли — секвенция 10 (звук пролёта)
    introSound: (seq) => sound.play(seq),
    introStop: (seq) => sound.stopSong(seq),
    openingTime: () => sound.customTrackTime("opening"),
    frame: () => sound.frame(),
    ui: (seq) => sound.ui(seq),
    select: (seq) => {
      if (prefs.sound) sound.play(seq);
    },
    screen: (mode) => {
      inMission = false;
      sound.useBank(mode === "house" ? "game" : "intro");
      if (mode === "title") sound.playMusicSequence(0, -1, false);
      else if (mode === "house") sound.playMusic(MUSIC.HOUSE_SELECT);
    },
  });
  stage.append(frontend.root);
  // ---------------------------------------------------------------- сетевая игра (net/session.ts, server/dune-net.mjs)
  /** Карты ROM для лобби: превью — средний цвет иконок клеток (как радар), подпись — миссии, где карта встречается. */
  let romMapCache: LobbyMap[] | null = null;
  const romMapList = (): LobbyMap[] => {
    if (romMapCache) return romMapCache;
    const usedIn = new Map<number, string[]>();
    const houseName: Record<string, string> = { A: "Атрейдесы", O: "Ордосы", H: "Харконнены" };
    for (const h of ["A", "O", "H"]) {
      for (let mission = 1; mission <= 9; mission++) {
        try {
          const sc = rom.scenario(h, mission);
          usedIn.set(sc.mapIndex, [...(usedIn.get(sc.mapIndex) ?? []), `${houseName[h]} ${mission}`]);
        } catch {
          /* миссии нет */
        }
      }
    }
    const list: LobbyMap[] = [];
    for (let n = 1; n <= 27; n++) {
      const map = rom.missionMap(n);
      const b = map.bounds;
      const k = Math.max(4, Math.floor(256 / b.w));
      const c = document.createElement("canvas");
      c.width = b.w * k;
      c.height = b.h * k;
      const g = c.getContext("2d")!;
      for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
        g.fillStyle = icons.averageColor[map.ground[((y + b.y) << 6) | (x + b.x)]] ?? "#000";
        g.fillRect(x * k, y * k, k, k);
      }
      const preview = c.toDataURL();
      const where = usedIn.get(n);
      for (let teamSize = 1; teamSize <= 3; teamSize++) {
        list.push({
          id: `rom-${n}`, name: `Карта ${n} · ${b.w}×${b.h}`, width: b.w, height: b.h, teamSize, capacity: teamSize * 2, preview, data: "",
          description: where ? `Карта кампании: ${where.join(", ")}` : "Карта кампании",
        });
      }
    }
    return (romMapCache = list);
  };
  const net = new NetSession();
  networkReplaying = () => net.replaying;
  let netRestore: (() => void) | null = null;
  let netClock = 0;
  const networkMenu=new NetworkMenu({
    back:()=>{net.close();frontend.openTitle();},
    ui:sequence=>sound.menuUi(sequence??0x28),
    romMaps: romMapList,
    connect: (name) => net.connect(defaultEndpoint(), name),
    refreshRooms: () => net.listRooms(),
    joinRoom: (id, role, password) => net.join(id, password ?? "", role, networkMenu.ownHouse()),
    leaveObservation: () => net.leave(),
    createRoom: (c) => net.create(c.roomName, c.password, { map: c.map, teamSize: c.teamSize, credits: c.credits }, c.house),
    leaveRoom: () => net.leave(),
    setOwn: (c) => net.setOwn(c),
    setConfig: (c) => net.setConfig(c),
    startMatch: () => net.startMatch(),
    bot: (c) => net.bot(c),
    openReplays: () => replayList.open(),
  });
  // записи матчей: сохраняются сами в конце матча и при выходе, смотрятся как наблюдатель (net/replay.ts)
  net.onRecording = (rec) => saveRecording(rec);
  const replayList = new ReplayList((rec) => net.play(rec));
  const replayBar = new ReplayBar({
    paused: () => net.paused, setPaused: (v) => { net.paused = v; },
    speed: () => net.speed, setSpeed: (v) => { net.speed = v; net.paused = false; },
    exit: () => leaveNetMatch(),
  });
  net.onRooms = (rooms) => networkMenu.setServerRooms(rooms);
  net.onRoom = (room, you) => {
    if (!net.inMatch) networkMenu.setRoom(room, you);
  };
  net.onError = (text) => {
    networkMenu.setStatus(text);
    if (net.inMatch) G.onMessage(text, 0);
  };
  net.onStatus = (text) => {
    networkMenu.setStatus(text);
    if (net.inMatch) { message.textContent = text; message.hidden = false; messageTimer = 60 * 6; }
  };
  net.onDesync = (turn) => G.onMessage(`Внимание: игра у игроков разошлась (ход ${turn}). Матч может идти по-разному.`, 0);
  /** Начать матч: у всех одинаковое зерно, карта и состав — дальше игра идёт по ходам сервера. */
  const startNetMatch = (start: MatchStart): void => {
    const local = start.you === null ? -1 : (start.players.find((p) => p.slot === start.you)?.house ?? -1);
    networkMenu.close();
    frontend.close();
    settings.close();
    dismissMissionScreens();
    sound.playMusic(MUSIC.STOP);
    sound.useBank("game");
    completedConstructionYard = null;
    queuedPlacementYard = null;
    clearSelection();
    netRestore?.();
    const res = world.loadNetwork({ map: start.config.map, seed: start.seed, credits: start.config.credits, players: start.players.map((p) => ({ ...p })), local });
    netRestore = installNetControls(world.game, (c) => net.command(c), () => G.playerHouseID);
    net.bind(
      (slot, c) => {
        const p = start.players.find((x) => x.slot === slot);
        if (p) world.game.execNet(p.house, c);
        if (c.k === "left" && p) {
          const to = start.players.find((x) => x.house === world.game.netLastHandOver);
          G.onMessage(`${p.name} покинул матч · база ${to ? `у союзника ${to.name}` : "под управлением компьютера"}`, 0);
        }
      },
      () => world.game.tick(),
      () => world.game.netHash(),
    );
    netClock = performance.now();
    view.setWorld(world, res.cursor.x * CELL_PX + CELL_PX / 2, res.cursor.y * CELL_PX + CELL_PX / 2);
    minimap.setMap(world.map);
    minimap.draw();
    paused = false;
    pausedBanner.hidden = true;
    endBanner.hidden = true;
    ending = null;
    flyby.stop();
    minimap.canvas.hidden = !prefs.radar;
    hud.credits.reset(world.houses.get(world.player)?.credits ?? 0);
    updateHud();
    inMission = true;
    sound.battleMusic();
    replayBar.root.hidden = !net.playback;
    replayBar.update(0, net.playbackFrames);
    G.onMessage(net.playback ? "Запись матча" : start.you === null ? "Вы наблюдаете за матчем" : `Матч начался · игроков: ${start.players.length}`, 0);
  };
  net.onStart = (start) => startNetMatch(start);
  /** Свой результат: победа или поражение; у остальных игра продолжается, поэтому симуляция не останавливается. */
  const onNetEnd = (result: "won" | "lost"): void => {
    net.reportOver(result);
    net.flushRecording();
    if (net.playback) {
      endBanner.textContent = "МАТЧ ОКОНЧЕН · запись можно досмотреть · «Выйти» — в лобби";
      endBanner.hidden = false;
      return;
    }
    endBanner.textContent = result === "won" ? "ПОБЕДА · Start → «Начать сначала» — выйти в лобби" : "ПОРАЖЕНИЕ · Start → «Начать сначала» — выйти в лобби";
    endBanner.hidden = false;
    if (!net.replaying) sound.playMusic((result === "won" ? MUSIC.WIN : MUSIC.LOSE)[world.player] ?? 0);
  };
  /** Выйти из сетевого матча (без перехода куда-либо). */
  const endNetMatch = (): void => {
    if (!net.inMatch && !netRestore) return;
    net.leave();
    netRestore?.();
    netRestore = null;
    endBanner.hidden = true;
    replayBar.root.hidden = true;
  };
  /** Выйти из матча в сетевое лобби. */
  const leaveNetMatch = (): void => {
    endNetMatch();
    settings.close();
    paused = true;
    inMission = false;
    sound.useBank("game");
    sound.playMusic(MUSIC.HOUSE_SELECT);
    void networkMenu.open();
  };
  stage.append(networkMenu.root, replayList.root, replayBar.root);
  const tutorial = new TutorialScreen(rom, sound);
  const finale = new FinaleScreen(rom, sound, screens.art);
  stage.append(tutorial.root, finale.root);
  // ментат: брифинг ($01F3EA) — ПРИНЯТЬ начинает миссию, СОВЕТ — совет на том же экране и снова кнопки
  const mentat = new MentatScreen(rom, sound, screens.art);
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
  }, portraits);
  stage.append(factory.root);
  /** Окно своего здания: с геймпада — оригинальное окно, мышью — правое меню. */
  const openStructure = (st: WorldStructure) => {
    if (view.mouseMode) panel.open();
    else factory.open(st.ref);
  };
  minimap.canvas.hidden = !prefs.radar;

  // ---------------------------------------------------------------- выбор и приказы
  const clearSelection = () => {
    view.selectedUnits.clear();
    view.selectedStructure = null;
    unitSelect(null);
    world.game.selectedStructure = null;
  };
  const selectStructure = (s: WorldStructure, playSfx = true) => {
    clearSelection();
    view.selectedStructure = s;
    world.game.selectedStructure = s.ref;
    // MD $027c76: выбор своего здания — звук $26 (GEMS seq 40)
    if (playSfx && s.house === world.player) sound.sfx(0x26);
  };
  const playerUnitsSelected = () => [...view.selectedUnits].filter((u) => u.house === world.player && u.ref.o.flags.used && !u.ref.o.flags.isNotOnMap);
  /** юниты, которым отдаётся приказ: выделенные свои */
  const commandable = () => playerUnitsSelected().map((u) => u.ref);
  /** Приказ выделенным по щелчку: у каждого своё действие по умолчанию, одинаковые идут одной группой (Game.orderGroup). */
  const orderSelected = (units: EUnit[], packed: number) => {
    const byAction = new Map<number, EUnit[]>();
    for (const u of units) {
      const action = world.game.defaultAction(u, packed);
      byAction.set(action, [...(byAction.get(action) ?? []), u]);
    }
    for (const [action, list] of byAction) world.game.orderGroup(list, action, packed);
  };
  const selectUnits = (list: WorldUnit[]) => {
    clearSelection();
    for (const u of list) view.selectedUnits.add(u);
    if (list.length) unitSelect(list[0].ref);
  };

  /** Готовый заказ строительного двора выбирается по зданию или его значку «ОК». */
  const readyYardAt = (wx: number, wy: number, includeBuilding = false): WorldStructure | null => {
    const ready = (s: WorldStructure | null | undefined) =>
      s && s.type === STRUCTURE.CONSTRUCTION_YARD && s.house === world.player && (world.game.readyBuildings(s.ref).length>0||world.game.production(s.ref)?.ready) ? s : null;
    if (includeBuilding) {
      const s = ready(world.structureAtCell(Math.floor(wx / CELL_PX), Math.floor(wy / CELL_PX)));
      if (s) return s;
    }
    const readyDef = readU32(rom.bytes, ROM.statusIcons.ok + 3 * 4);
    const img = sprites.statusDef(readyDef);
    for (const s of world.structures) {
      const yard = ready(s);
      if (!yard) continue;
      const cx = yard.x * CELL_PX + img.ox + img.canvas.width / 2;
      const cy = yard.y * CELL_PX + img.oy + img.canvas.height / 2;
      if (Math.abs(wx - cx) <= 10 && Math.abs(wy - cy) <= 10) return yard;
    }
    return null;
  };

  /** A / щелчок левой: выбрать то, что под курсором, или отдать приказ выбранным. */
  view.onPrimary = (wx, wy) => {
    if (paused || world.game.ended) return;
    const packed = World.packAt(wx, wy);
    if (G.selectionType === SELECTION.PLACE) {
      const sourceYard = world.structureAtCell(G.structureActivePosition & 63, G.structureActivePosition >> 6);
      if (world.game.place(packed)) {
        view.placement = null;
        const source = sourceYard?.ref;
        queuedPlacementYard = source && ((source.readyBuildings?.length??0)>0||source.prepaidBuildingCost !== undefined || (source.buildingQueue?.length ?? 0) > 0) ? source : null;
      }
      world.sync();
      updateHud();
      return;
    }
    if (G.selectionType === SELECTION.TARGET) {
      const others = commandable().filter((u) => u !== G.unitActive);
      const active = G.unitActive;
      world.game.targetClick(packed, others);
      view.flashOrders(active ? [active, ...others] : others);
      updateHud();
      return;
    }
    // Щелчок по значку «ОК» сразу поднимает готовое здание в предпросмотр размещения.
    const readyYard = readyYardAt(wx, wy);
    if (readyYard && world.game.placeIt(readyYard.ref)) {
      selectStructure(readyYard, false);
      updateHud();
      return;
    }
    const unit = world.unitAt(wx, wy);
    const mine = commandable();
    if (unit && unit.house === world.player) {
      if(mine.includes(unit.ref)&&world.game.activateSelf(unit.ref))updateHud();
      else selectUnits([unit]);
    } else if (mine.length) {
      orderSelected(mine, packed);
      view.flashOrders(mine);
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
      queuedPlacementYard = null;
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
    const readyYard = readyYardAt(wx, wy, true);
    if (readyYard && world.game.placeIt(readyYard.ref)) {
      selectStructure(readyYard, false);
      updateHud();
      return;
    }
    const unit = world.unitAt(wx, wy);
    const mine = commandable();
    if (mine.length) {
      if (unit && mine.includes(unit.ref)) {
        if(!world.game.activateSelf(unit.ref))clearSelection();
      } else {
        // как в MD: A по своему юниту — приказ «двигаться» на его клетку; движок (unitSetDestination) делает из неё
        // цель-юнит, и выбранные едут за ним. Другой юнит выбирают после B (снять выбор).
        orderSelected(mine, packed);
        view.flashOrders(mine);
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
    // MD $0284e8: отмена / сброс выбора — звук $26 (GEMS seq 40)
    sound.sfx(0x26);
    if (G.selectionType === SELECTION.TARGET || G.selectionType === SELECTION.PLACE) {
      if (G.selectionType === SELECTION.PLACE) queuedPlacementYard = null;
      world.game.cancelTarget();
      view.placement = null;
    } else clearSelection();
    view.markedUnit = null;
    updateHud();
  };

  /** Правая кнопка: отменить выбор цели или постановку, иначе снять выделение, как в Red Alert. */
  view.onSecondary = () => {
    sound.sfx(0x26);
    if (G.selectionType === SELECTION.TARGET || G.selectionType === SELECTION.PLACE) {
      if (G.selectionType === SELECTION.PLACE) queuedPlacementYard = null;
      world.game.cancelTarget();
      view.placement = null;
    } else clearSelection();
    updateHud();
  };
  /** Рамка: выбрать все свои юниты внутри. */
  view.onBox = (r) => {
    if (paused) return;
    // летающих рамка не берёт, кроме звеньев дронов — ими управляют как наземными
    const inside = world.units.filter((u) => u.house === world.player && (!u.air || u.type === UNIT.COMBAT_DRONE) && u.x >= r.x0 && u.x <= r.x1 && u.y >= r.y0 && u.y <= r.y1);
    if (!inside.length) return;
    selectUnits(inside);
    updateHud();
  };
  /** Ширина правых панелей поверх карты (HUD, меню мыши, радар) — на неё камера может уйти за край карты. */
  const rightCover = () => {
    const r = canvas.getBoundingClientRect();
    let left = r.right;
    for (const el of [hud.canvas, panel.root, minimap.canvas]) {
      if (el.hidden || !el.isConnected) continue;
      const b = el.getBoundingClientRect();
      if (b.width > 0 && b.height > 0 && b.left > r.left + r.width / 2) left = Math.min(left, b.left);
    }
    return Math.max(0, r.right - left);
  };
  view.onFrame = () => {
    frame++;
    if (frame % 30 === 0) view.setRightInset(rightCover());
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
    // сетевой матч: такты — по ходам сервера и часам, без паузы (у других игроков игра идёт)
    const netActive = net.inMatch;
    if (netActive) {
      const now = performance.now();
      net.advance(Math.min(250, now - netClock));
      netClock = now;
      if (net.playback) replayBar.update(net.frame, net.playbackFrames);
    }
    if (!paused || netActive) {
      if (!netActive) world.step();
      world.sync();
      const readyYard = completedConstructionYard ?? (queuedPlacementYard?.readyBuildings?.length?queuedPlacementYard:null);
      completedConstructionYard = null;
      const queuedPlacementReady = readyYard !== null && queuedPlacementYard === readyYard && (readyYard.readyBuildings?.length??0)>0;
      const hoveredReadyYard = readyYard !== null && readyYardAt(view.cursorX, view.cursorY, true)?.ref === readyYard;
      if (readyYard && G.selectionType !== SELECTION.PLACE && (queuedPlacementReady || hoveredReadyYard || view.selectedStructure?.ref===readyYard)) {
        const yard = world.structures.find((s) => s.ref === readyYard);
        if (yard && world.game.placeIt(readyYard)) {
          selectStructure(yard, false);
          updateHud();
        }
      }
      for (const u of [...view.selectedUnits]) if (!u.ref.o.flags.used || u.ref.o.flags.isNotOnMap || !world.units.includes(u)) view.selectedUnits.delete(u);
      if (view.selectedStructure && !world.structures.includes(view.selectedStructure)) view.selectedStructure = null;
      view.invalidate();
    }
    if (messageTimer > 0 && --messageTimer === 0) message.hidden = true;
    // смена суток — короткое сообщение, как предупреждение ментата (свет — только украшение, в игру не пишет)
    {
      const elapsed = Math.max(0, G.timerGame - G.tickScenarioStart), phase = dayPhase(elapsed).name;
      if (elapsed < lastDayElapsed) lastDayPhase = '';
      if (lastDayPhase && phase !== lastDayPhase && !world.game.ended) G.onMessage(DAY_MESSAGES[phase] ?? phase);
      lastDayPhase = phase; lastDayElapsed = elapsed;
    }
    // значки над своими зданиями, как $00DC9C: у двора и дворца «OK», иначе при ремонте — молоток
    view.structureIcons = [];
    // Preserve original status conditions; animate HD badges continuously instead of hiding frames.
    const icon = (s: WorldStructure, def: number, shown: number) => {
      const kind = def === ROM.statusIcons.lightning ? 'power' : shown === 7 ? 'repair' : 'ready';
      view.structureIcons.push({ s, def, kind });
    };
    const fromTable = (table: number, index: number) => readU32(rom.bytes, table + index * 4);
    for (const s of world.structures) {
      if (s.house !== world.player || s.ref.o.hitpoints === 0) continue;
      const si = structureInfo[s.type];
      if (s.type === STRUCTURE.CONSTRUCTION_YARD) {
        // Keep the completed order in its yard until the player requests placement.
        const prod = world.game.production(s.ref);
        const ok = world.game.readyBuildings(s.ref).length>0||!!prod?.ready;
        if (ok) icon(s, fromTable(ROM.statusIcons.ok, 3), 6);
        else if (s.ref.o.flags.repairing) icon(s, fromTable(ROM.statusIcons.repair, si.layout), 7);
      } else if (s.type === STRUCTURE.PALACE) {
        // $00DCFE: спецоружие готово ($56 = 0), ракета не ждёт цели ($FFDC4C) и нет бита 8
        // (у Атрейдесов — пул наземных юнитов полон, фрименам негде появиться)
        if (s.ref.countDown === 0 && !G.unitHouseMissile && !world.game.missileAiming && !structureLimitReached(s.ref)) icon(s, fromTable(ROM.statusIcons.ok, 6), 6);
        else if (s.ref.o.flags.repairing) icon(s, fromTable(ROM.statusIcons.repair, si.layout), 7);
      } else if (s.type === STRUCTURE.WINDTRAP) {
        // $00DD6A: молния, пока потребление дома больше выработки
        const h = G.houses[world.player];
        if (h.powerUsage > h.powerProduction) icon(s, ROM.statusIcons.lightning, 3);
        else if (s.ref.o.flags.repairing) icon(s, fromTable(ROM.statusIcons.repair, si.layout), 7);
      } else if (s.ref.o.flags.repairing) {
        icon(s, fromTable(ROM.statusIcons.repair, si.layout), 7);
      }
    }
    if (G.selectionType === SELECTION.PLACE && G.structureActiveType !== 0xffff) {
      const si = structureInfo[G.structureActiveType];
      const size = layoutSize[si.layout];
      const detail = world.game.placementDetail(World.packAt(view.cursorX, view.cursorY));
      view.placement = { w: size.width, h: size.height, valid: detail.valid, cells: detail.cells };
    } else view.placement = null;
    const over = world.unitAt(view.cursorX, view.cursorY);
    const overS = world.structureAtCell(Math.floor(view.cursorX / CELL_PX), Math.floor(view.cursorY / CELL_PX));
    const mine = playerUnitsSelected().length > 0;
    const enemyUnit = !!over && !houseAreAllied(world.player, over.house);
    const enemyStructure = !!overS && !houseAreAllied(world.player, overS.house) && (G.revealAll || !!world.map.unveiled[World.packAt(view.cursorX, view.cursorY)]);
    const enemy = enemyUnit || enemyStructure;
    view.aimTarget = enemy && (mine || (G.selectionType === SELECTION.TARGET && G.activeAction !== ACTION.MOVE))
      ? enemyUnit ? { x: over!.x - 15, y: over!.y - 15, w: 30, h: 30 }
        : { x: overS!.x * CELL_PX, y: overS!.y * CELL_PX, w: overS!.w * CELL_PX, h: overS!.h * CELL_PX }
      : null;
    if (G.selectionType === SELECTION.TARGET) view.cursorKind = G.activeAction === ACTION.MOVE ? "move" : "attack";
    else if (G.selectionType === SELECTION.PLACE) view.cursorKind = "select";
    else if (!view.mouseMode) view.cursorKind = mine ? "attack" : "select"; // в оригинале при выбранном юните — прицел
    else view.cursorKind = !mine ? "select" : over && over.house === world.player ? "select" : enemy ? "attack" : "move";
    if (view.markedUnit && !playerUnitsSelected().includes(view.markedUnit)) view.markedUnit = null;
    view.inputLocked = panel.focused;
    if (frame % 10 === 0) panel.update();
    drawHud();
    if (frame % 30 === 0) {
      // здания — только на разведанных клетках (иначе мини-карта выдала бы базу врага)
      const seen = (x: number, y: number) => G.revealAll || !!world.map.unveiled[(y << 6) | x];
      minimap.refresh(
        world.units.map((u) => ({ x: u.x, y: u.y, own: u.house === world.player, air: u.air })),
        world.structures.filter((s) => s.type !== STRUCTURE.WALL && seen(s.x, s.y)).map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h, own: s.house === world.player })),
      );
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

  const cheatButtons = ([
    ['25 000', 'SPLURGEOLA', 'Установить 25 000 кредитов'],
    ['Бессмертие', 'PLAYTESTER', 'Бессмертие своих войск и зданий'],
    ['Открыть карту', 'LOOKAROUND', 'Показать всю карту'],
  ] as const).map(([label, code, title]) => {
    const button=el('button',{type:'button',textContent:label,title});
    button.dataset.cheat=code;
    if(code!=='SPLURGEOLA')button.setAttribute('aria-pressed','false');
    button.addEventListener('click',()=>{world.game.cheat(code);world.sync();view.invalidate();updateHud();});
    return button;
  });

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
    sound.unlockAudio();
    if (!assets.root.hidden) return;
    lastButton = BUTTON_LABEL[b];
    if (ending) return;
    if (networkMenu.handlePad(b) || finale.handlePad(b) || tutorial.handlePad(b) || scoreScreen.handlePad(b) || endPicture.handlePad(b) || mentat.handlePad(b) || frontend.handlePad(b) || settings.handlePad(b) || factory.handlePad(b)) {
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
    ...cheatButtons,
    el("span", { className: "spacer" }),
    romBtn,
  );
  app.replaceChildren(el("div", { className: "game" }, topbar, stage));

  function updateHud(): void {
    cheatButtons.forEach(button=>{
      const code=button.dataset.cheat;
      if(code!=='SPLURGEOLA')button.setAttribute('aria-pressed',String(code==='PLAYTESTER'?G.playtester:G.revealAll));
    });
    zoomVal.value = `${view.zoom}×`;
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
    const buildings=world.structures.filter(item=>item.house===world.player&&item.built).length;
    const units=G.unitFind.filter(item=>item.o.houseID===world.player&&!item.o.flags.isNotOnMap&&item.o.hitpoints>0&&
      (item.o.type<UNIT.MISSILE_HOUSE||item.o.type===UNIT.LASER_TANK||item.o.type===UNIT.COMBAT_DRONE)).length;
    hud.draw(view.mouseMode ? null : hudState(rom, s, unit), {
      buildings, buildingsLost:G.scenario.destroyedAllied, units, unitsLost:G.scenario.unitsLostAllied,
    });
  }

  function renderSelectionInfo(): void {
    info.hidden = true;
    panel.update();
  }
  view.onChange = updateHud;

  window.addEventListener("keydown", (e) => {
    if (e.defaultPrevented||e.target instanceof HTMLSelectElement||e.target instanceof HTMLInputElement) return;
    if (e.code === "KeyG") toggleGrid();
    if (e.code === "KeyM") toggleMouse();
    if (e.code === "Equal" || e.code === "NumpadAdd") view.setZoom(view.zoom + 1);
    if (e.code === "Minus" || e.code === "NumpadSubtract") view.setZoom(view.zoom - 1);
    if (e.code === "KeyR") toggleAssets();
    if (e.code === "Escape") assets.root.hidden = true;
  });

  dismissMissionScreens=()=>{
    // Closing screens also stops their voice/video/RAF work, not just the image.
    optionsFromTitle=false;
    settings.close();factory.close();frontend.close();mentat.close();networkMenu.close();
    endPicture.close();scoreScreen.close();finale.close();tutorial.close();
    assets.root.hidden=true;panel.close();clearSelection();
    briefingMusic=false;
  };
  loadMission("A1");
  const q = new URLSearchParams(location.search);
  // Запуск с заставкой как положено на Sega Mega Drive
  if (!q.has("skipIntro")) {
    paused = true;
    if (q.has("title")) frontend.openTitle();
    else frontend.openIntro();
  }
  canvas.focus();
  void net.restore(defaultEndpoint()).catch(() => {});
  // ?debug открывает мир и вид из консоли
  if (q.has("debug")) Object.assign(window, { dune: { world, view, G, sprites, mentat, endPicture, scoreScreen, frontend, sound, tutorial, finale, net } });
}

showRomScreen();
