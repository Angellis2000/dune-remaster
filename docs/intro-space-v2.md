# Космическая заставка, 2026-10-20

## Планета

- Исходники владельца: `gemini_generated_video_9db4dcdf.mp4` (звёзды → планета, 240 кадров / 10 с)
  и `gemini_generated_video_cb9cf5d0.mp4` (вращение, 720 кадров / 30 с).
- `tools/prepare-planet-loop.py`: 624 кадра / 26 с, движение вперёд; последние 96 кадров
  с двунаправленной компенсацией оптического потока стыкуются с началом. Без обратного вращения.
- `tools/prepare-planet-approach.py`: последние 24 кадра подведены к началу петли.
  Обе MP4 без аудиопотоков; при недоступности видео остаётся прежняя графика.
- `PlanetBackdrop` вписывает приближение в исходные 163 интервала ROM (2,717 с).
  Поэтому десятисекундный исходник идёт быстрее, как потребовал владелец, сохраняя время заставки.
  Вращение продолжается в главном меню; скрытые видео останавливаются.
- `python tools/verify-planet-videos.py`: PASS, все кадры декодируются,
  стык петли MAE 0,902 и подхода 0,970 при максимуме обычного шага 1,012;
  оптический поток вперёд, аудиопотоков 0. В браузере проверены несколько повторов.

## Корабли

- `web/src/gfx/assets/frontend/intro-ships-angles-v2.png`: встроенным image_gen
  сгенерирован RGBA-атлас 5 × 3, 1774 × 887; 52,82% пикселей полностью прозрачны.
  Красный — Харконнены, синий — Атрейдесы, зелёный — Ордосы.
- Ракурсы от −24° до +24° с шагом 12°. Силуэты подрезаются по альфе и центрируются;
  подготовленные кадры кэшируются до пролётов. Старый атлас сохранён.
- `ShipFlight` сглаживает исходную траекторию кубическим B-сплайном,
  непрерывно уменьшает масштаб и смешивает соседние ракурсы на отдельной поверхности.
  Небольшой крен и затухание вдалеке; длительность и последовательность ROM сохранены.
- Браузер: три пролёта ровно по 90 кадров, начало 1351 / 1441 / 1531,
  вся заставка 1825 кадров при тестовой ветке SEGA 180 кадров.
  Запись: `out/intro-refresh/ship-flights.webm` (268 кадров, 60 fps); просмотрены кадры всех домов.
  Сборка TypeScript/Vite проходит.

## Финальный промпт (встроенный image_gen, без CLI)

```text
Use case: stylized-concept.
Asset type: production transparent sprite atlas for the Dune Remaster introduction.
Input image 1 is a design/material reference only: a massive oval armored spacecraft with paired large circular drives, panel seams, dark mechanical recesses, worn silver titanium and small colored running lights.
Generate ONE clean atlas, exactly 5 columns by 3 rows, all 15 cells equal, no cell borders and no text. Each cell contains the SAME spacecraft with consistent shape, armor panels, two main circular drives and four smaller lights; realistic cinematic hard-surface 3D rendering. All views remain near the broad FRONT view where the paired circular drives are visible, NOT top-down gameplay views.
Column camera yaw angles left to right: -24 degrees, -12 degrees, 0 degrees straight-on, +12 degrees, +24 degrees. Pitch is a constant slight 8 degrees above the craft in every view. No roll. The center and physical scale must be identical in every cell so the sprites can animate between neighboring camera angles without jumping. Keep projected ship width visually consistent with true perspective, with enough fully transparent margin (at least 10% cell width) around every ship.
Row 1: dark gunmetal and worn titanium hull with deep RED drive cores and small red running lights, Harkonnen.
Row 2: SAME hull and SAME sequence of five camera angles with vivid BLUE drive cores and small blue running lights, Atreides.
Row 3: SAME hull and SAME sequence of five camera angles with emerald GREEN drive cores and small green running lights, Ordos.
Lighting is fixed soft neutral studio key from upper left, rich mechanical depth, restrained drive glow confined close to the drive openings, realistic metallic highlights. Each craft is isolated on GENUINELY TRANSPARENT alpha, including spaces between all sprites. No black backdrop, no checkerboard pattern, no planet, no stars, no exhaust trail, no shadows outside the ship, no labels, no symbols, no borders. Wide landscape atlas. The entire ship must fit inside each cell. Prioritize structural consistency across all frames over decorative variation.
```
