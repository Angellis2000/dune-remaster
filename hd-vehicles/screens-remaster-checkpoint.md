# HD-графика: экраны и оставшиеся спрайты

Дата: 2026-10-18. Генерация: встроенный image_gen, без CLI/API.

## Готово и подключено

- Три ментата: отдельные атласы по четыре выражения, неподвижное тело и мягкое наложение рта/глаз.
- Карта кампании: HD-поверхность, исходные формы и цвета владений, падение регионов и приближение.
- Победа и поражение: новые иллюстрации, гладкие надписи, лёгкая пыль/угольки.
- Итоги: нативные шкалы, счётчики, звание и пароль из ROM; исходные тайминги и переходы.
- Финал: HD-планета, титры в разрешении экрана.
- Стены: соединения 16 направлений/углов, бетонная текстура; собственные загруженные иконки приоритетны.
- Червь: HD-рябь песка и анимация появления; ракета дворца использует HD-снаряд.
- Итоги и пароль: отдельный детализированный корпус пульта, утопленный экран, шкалы цветов домов.
- Карта кампании: отдельный орбитальный рельеф вместо щебёнки; исходные коды владения 0/1/2/3, чёткий синий у Атрейдесов.
- Финальные титры: убраны полосы под каждой строкой; плавная прокрутка на треть пикселя и затухание у краёв.
- Производство/космопорт: HD-корпус с исходной компоновкой, металлические клавиши, отдельные символы цены/урона/брони.
- Все 19 изображений зданий: отдельные большие иллюстрации и отдельные значки по оригинальным ракурсам. Проекции с поля боя больше не используются для этих меню. Общие изображения сохранены там, где их повторно использует ROM.
- Значки показываются крупно в исходных пропорциях 4:3; пять видимых строк, колесо мыши и корректный выбор при прокрутке.
- Строительные площадки: отдельная HD-иллюстрация и сварочные искры; прежние сроки строительства и поклеточное скрытие туманом.
- Пролёт после боя: семь HD-орнитоптеров, исходные четыре траектории/строй и плавный цикл крыльев.
- Главное меню продолжает фон вступления: звёзды/планета не замирают после перехода; название не пересобирается после опций.
- Меню приказов: металлическая рамка, убрано пиксельное масштабирование HD-портретов; обновлён значок улучшения в HUD.
- Карта кампании: усилена направленная светотень орбитального рельефа и насыщенность цветов домов. Маски, границы, расположение и владение областями сохранены; цветные поверхности кешируются.
- Ментат Харконненов: пользовательское видео с прозрачным фоном, без аудиодорожки; движение во время реплик, сохранение последней фактической позы в паузах без двоения с неподвижным постером. Существующая игровая озвучка сохранена. Видео не обеспечивает фонемную синхронизацию с ней.
- Символы и подписи производства выровнены по фактическим ячейкам корпуса; пользователь подтвердил пульт, дальнейший редизайн не нужен.

## Файлы

`web/src/gfx/assets/frontend/{victory-hd,defeat-hd,mentat-atreides-hd,mentat-ordos-hd,mentat-harkonnen-hd}.png`

`web/src/gfx/assets/vehicles-hd/sandworm-hd.png`

Новые ресурсы: `web/src/gfx/assets/frontend/{operations-console-hd,production-console-hd,strategic-relief-hd,building-portraits-a,building-portraits-b,building-portraits-c,building-portraits-d,building-icons-a,building-icons-b}.png`; `web/src/gfx/assets/map-hd/construction-site-hd.png`.

Последние превью: `hd-vehicles/previews/screens-v5/`, в том числе `production.png`, `building-portraits.png`, `hud-building.png`, `campaign-atreides.png`, `harkonnen-video-speaking.png`, `harkonnen-video-idle.png`, `score.png`, `password.png`, `finale.png`, `construction-fog.png`, `title.png`.

Видео: `web/public/video/mentat-harkonnen-alpha.webm` (VP9 alpha, 512×384, 9,75 секунды / 234 кадра, без аудио) и `mentat-harkonnen-idle.png`. Исправлены просветы в светлых волосах; конец совмещён с началом в спокойной позе, постер совпадает с первым кадром. Исходник `C:/Users/Admin/Downloads/gemini_generated_video_a2627296.mp4` сохранён. Повторная подготовка: `powershell -File tools/prepare-harkonnen-video.ps1`; фильтр `tools/harkonnen-cutout.ffgraph`. Интеграция: `web/src/gfx/mentat-motion.ts`, `web/src/ui/mentat.ts`.

## Исправления 2026-10-19

- Ментат Атрейдесов: пользовательский `C:/Users/Admin/Downloads/gemini_generated_video_c86f6336.mp4` вырезан в `web/public/video/mentat-atreides-alpha.webm` и `mentat-atreides-idle.png`. Бесшумный VP9 alpha, 512×384, 24 fps, цикл 466 кадров / 19,417 секунды: прямой и обратный проход без наложения разных поз рук. Постер совпадает с первым кадром. Сохранены блики глаз (непрозрачная центральная маска лица), убрана светлая кайма по контуру альфа-канала. Исходное видео не изменено. Подготовка: `powershell -File tools/prepare-atreides-video.ps1`, фильтр `tools/atreides-cutout.ffgraph`.
- `MentatMotion` выбирает имя ресурса по дому. В `MentatScreen` отдельные проигрыватели Атрейдесов, Харконненов и Ордосов; все останавливаются при закрытии/смене дома. Настоящая озвучка игры не менялась, фонемная синхронизация не добавлялась.
- Ментат Ордосов: `C:/Users/Admin/Downloads/gemini_generated_video_29a1a161.mp4` → `web/public/video/mentat-ordos-alpha.webm`, `mentat-ordos-idle.png`. Тёмный фон отделён от зелёной одежды локальным [Robust Video Matting](https://github.com/PeterL1n/RobustVideoMatting), с последовательным переносом recurrent states по [официальной документации ONNX](https://github.com/PeterL1n/RobustVideoMatting/blob/master/documentation/inference.md#onnx). Модель MobileNetV3 v1.0.0 — только инструмент подготовки, не ресурс игры; SHA-256 `88d4531297118f595bf2fd60f6f566aec2e559393802d1f436c380f0cbbd2828`. Непрозрачные участки сохраняют исходные цвета лица, одежды и украшений; foreground correction используется на краях. Исходный MP4 сохранён.
- Повторная подготовка Ордосов: `powershell -File tools/prepare-ordos-video.ps1`; Python: `tools/prepare-ordos-matte.py` (существующие OpenCV, numpy, ONNX Runtime), 240 RGBA-кадров в `scratch/mentat-ordos-video/frames/`, фильтр `tools/ordos-loop.ffgraph`. Выход: бесшумный VP9 alpha, 512×384, 24 fps, 466 кадров / 19,417 с, прямой/обратный проход без наложения поз.
- Ордосы PASS: `node tools/verify-mentat-video.mjs ordos` (все 466 кадров, прозрачные внешние точки, лицо alpha 255, нет аудио, стык повтора); `node tools/verify-screen-remaster.mjs --mentat-only` (самостоятельные ресурсы Атрейдесов и Ордосов, паузы, переключение всех трёх домов, советы первой миссии); `npm --prefix web run build`. Просмотрены контактные листы всех 234 исходных кадров прямого прохода и итоговый экран `hd-vehicles/previews/screens-v5/ordos-video-speaking.png`. HTTP 200 видео/постера; dist совпадает с проверенным видео по SHA-256. Браузерная вкладка не автоматизировалась.
- Целевые проверки Атрейдесов PASS: `node tools/verify-mentat-video.mjs atreides` (все 466 кадров, прозрачный фон, лицо alpha 255, без аудио, непрерывный стык); `node tools/verify-screen-remaster.mjs --mentat-only` (URL ресурсов, muted, речь/пауза без смены позы, переход между домами и существующий Харконнен); `npm --prefix web run build`. HTTP 200 видео и постера; SHA-256 видео в dist совпадает с проверенным исходником. Превью: `hd-vehicles/previews/screens-v5/atreides-video-speaking.png`. Проверки используют настоящий Canvas/кадры, не автоматизацию активной вкладки.
- Приближение карты: `web/src/gfx/campaign-zoom.ts`, непрерывная монотонная интерполяция через исходные позы и тайминги ROM; учитываются доли кадра экрана. Масштаб, перемещение и затухание больше не меняются ступенями. Падающие области сохраняют дробную координату.
- Толщина: отдельная нижняя кромка по исходной маске каждой области; верхняя поверхность не сдвигается. Превью `campaign-atreides.png`, `map-zoom-{0,32,64,96}.png`.
- Звук: автоматический `placeIt(cy,false)` больше не включает «Установка» поверх READY. Ручной переход сохраняет SFX $14 / seq 70, готовность — feedback 0 / seq 65, заказ и установка — SFX $0D / seq 82. Проверено дизассемблированием ROM: $00C2D8, $027E0C, $028486, $0290A4.
- Бугры спайса: новые `bloom-transparent.png`, `bloom-alt-transparent.png`, без квадратного фона. Воронки ID 1–19, 33 и 125 используют цельный `crater-hd.png` с безопасными полями вместо обрезанных частей атласа. Варианты стадий масштабируются отдельно при загрузке. Старые изображения сохранены. Промпты и пути: `hd-vehicles/graphics-fixes-2026-10-19.json`, встроенный image_gen. Превью `decals-sand-spice.png`.
- Проверки PASS: `node --experimental-strip-types --test web/test/campaign-zoom.test.ts` (10 регионов, ключевые позы/доли кадра/непрерывная скорость); `node tools/verify-mentat-video.mjs` (234 кадра, лицо alpha 255, прозрачный фон, нет звука, стык повтора); `node tools/verify-construction-audio.mjs` (настоящий цикл заказ → READY → автоматическое/ручное размещение → установка); `node tools/verify-screen-remaster.mjs` (прозрачные края всех новых следов, толщина областей и существующие сценарии); `npm --prefix web run build`.

Промпты портретов и значков: `hd-vehicles/graphics-prompts-2026-10-18.json`. Встроенный image_gen; исходные ракурсы извлечены из ROM в `scratch/building-portrait-references/`.

Повторное извлечение оригинальных иллюстраций: `node tools/extract-building-portrait-references.mjs`.

Проверки: `node tools/verify-screen-remaster.mjs` и `cd web; npm run build` — PASS после правки светотени и полного кадрирования плеч видео. Проверены запуск/остановка видеопортрета и прозрачность декодированных кадров, центры символов пульта, 19 больших/малых изображений и HUD, клики прокрученного производства, туман над строительством, непрерывность фоновой анимации, 27 раскладок/цветов карты, все кадры взрывов и 24 кадра пыли, 12 вариантов пролёта и переходы миссий. Полные логи: `hd-screen-tests.log`, `hd-build.log`.

## Оставшееся

- Внутренние ROM-ресурсы сохранены как fallback и для экспорта оригиналов. Встроенный удалённый из меню учебный ролик остаётся оригинальным.
- Браузерная проверка активной вкладки в текущих настройках недоступна; проверены настоящие методы отрисовки и сценарии переходов с ROM через нативный Canvas.

## Покрытие видимой графики

- Поле боя: цельный ландшафт/спайс, кратеры и разрушения, бетон/стены, стройплощадки, готовые здания/площадки сдачи, все 27 типов юнитов/снарядов, пехота, червь, взрывы/дым/пыль/следы, статусные значки и курсоры используют HD-ресурсы или нативную графику.
- Игровые экраны: вступление/планета/корабли/название, дома, опции/ввод пароля, ментаты/карта кампании, производство/космопорт, HUD/приказы, победа/поражение/итоги/пароль/титры обновлены.
- Растровые ROM-ветки оставлены для аварийного восстановления при отсутствии HD-ресурсов. Мини-карта представляет состояние игры условными цветами; обзорщик и экспорт оригиналов намеренно показывают исходники. Удалённое из пользовательского меню обучение доступно только через внутренний debug-интерфейс.
- Нельзя считать визуальную приёмку всех игровых состояний завершённой без просмотра пользователем: автоматическая проверка покрывает отрисовку и перечисленные переходы, но активную вкладку не проверяет.
- Vite перезапущен скрытым процессом на `http://127.0.0.1:5187/`; HTTP 200 у страницы, модуля портретов и нового атласа значков. Логи: `vite-5187.log`, `vite-5187-errors.log`.

## Промпты принятых изображений

### victory

Use case: style-transfer. Asset type: final HD game cinematic background, wide 16:9 landscape, ideally 1920x1080. Reference image is the original Dune Battle for Arrakis mission VICTORY screen. Faithfully repaint the scene in crisp, sophisticated realistic painted science-fiction concept art, consistent with detailed remastered RTS assets. Preserve the key composition: a large helmeted armored soldier at the left foreground holding a long rifle upright diagonally, two defeated enemy soldiers with raised hands in the middle distance, a disabled tracked tank on the right, hazy desert battlefield and smoke behind, warm ochre Arrakis sand and pale hazy sky. Retain silhouettes and narrative; extend the landscape organically across the frame, no black letterboxing. Detailed brushed metal, dust, material wear, natural lighting, restrained cinematic contrast. No text, no logos, no UI, no borders, no pixel art. This is a clean full frame production game background, not a mockup.

### defeat

Use case: style-transfer. Asset type: final HD game cinematic background, wide 16:9 landscape, ideally 1920x1080. The attached reference is a screenshot of the original Dune Battle for Arrakis DEFEAT picture. Repaint ONLY the battlefield illustration as a clean full frame HD image; do not include the browser toolbar, black letterbox or any UI. Faithfully preserve the composition and narrative: a destroyed heavy tracked tank dominates the left and middle foreground, its long barrel extends out to the left, torn and scorched steel armor, orange fire and a thick dark smoke column rise from the breached turret into the upper middle; another ruined vehicle and scattered metal wreckage sit in the right background on ochre sand under a pale hazy desert sky. Sophisticated realistic painted science-fiction concept art, sharp fine detail, metal seams, heat staining, ash and sand, natural desert lighting, restrained cinematic palette to match modern remastered RTS game assets. Extend scene naturally to wide 16:9. No text, no logos, no borders, no pixel art, no people close up.

### mentat-1

Repaint the fictional adult science-fiction advisor shown in the reference as a crisp highly detailed realistic illustrated GAME PORTRAIT SPRITE SHEET. Preserve face, hair, outfit color, pose and hands of the reference character. The file is a square 2x2 atlas containing four equal square cells with identical portrait placement and scale: top left neutral eyes open mouth closed, top right speaking mouth slightly parted, bottom left blink eyes closed mouth closed, bottom right speaking mouth slightly wider. All four chest-up portraits must be registered at the same coordinates inside their cells, heads and hands fully visible, body cropped at cell bottom. Genuine transparent background. No words, no labels, no logos, no borders, no violence, no extra accessories. Refined painted materials, natural warm face lighting with soft cool rim light, clean silhouette, no pixelated texture. Reference description: fair-haired handsome middle-aged man, short swept blond hair, stern dignified angular face, tall navy-blue uniform collar and gold fastener, hand near chest holding a red book.

### mentat-2

Repaint the fictional adult science-fiction advisor shown in the reference as a crisp highly detailed realistic illustrated GAME PORTRAIT SPRITE SHEET. Preserve face, hair, outfit color, pose and hands of the reference character. The file is a square 2x2 atlas containing four equal square cells with identical portrait placement and scale: top left neutral eyes open mouth closed, top right speaking mouth slightly parted, bottom left blink eyes closed mouth closed, bottom right speaking mouth slightly wider. All four chest-up portraits must be registered at the same coordinates inside their cells, heads and hands fully visible, body cropped at cell bottom. Genuine transparent background. No words, no labels, no logos, no borders, no violence, no extra accessories. Refined painted materials, natural warm face lighting with soft cool rim light, clean silhouette, no pixelated texture. Reference description: slim pale man with slicked back short brown hair, calculating stern long face, dark green high collar uniform with olive scarf, right hand gripping a strap at chest.

### mentat-0

Production portrait sprite atlas for a science-fiction strategy game. A fictional elderly male council advisor, bald, thoughtful serious expression, fair weathered face, pronounced brows and nose, head angled gently down and toward viewer, high stiff dark burgundy uniform collar and clasped hands in front of his chest. Realistic finely painted game concept art, crisp skin detail and rich cloth, soft warm light with a cool edge. Four identical chest-up portraits registered in a square 2x2 grid of equal square cells: upper left lips closed and eyes open, upper right lips slightly parted while speaking, lower left blink eyes closed and lips closed, lower right mouth a little wider while speaking. Same outfit, face, lighting, scale and position across all four cells. The chest is cut at the bottom edge, head and hands kept fully within each cell. Transparent background, no labels or words, no border, no extra objects.

### sandworm

Use case: stylized-concept. Asset type: transparent TOP DOWN sprite atlas for a modern remaster of a classic desert RTS. A giant desert sandworm emerging vertically out of ochre sand, seen strictly from above in the same orthographic top down game camera as vehicles and terrain. Create square 2x2 atlas with four equal square cells and no grid gutters, same center and scale in every cell. Top left low mound of moving sand with concentric dune ripples and almost no creature visible. Top right circular sand eruption with a small dark center, worm barely surfacing. Bottom left worm circular tri-lobed mouth opening surrounded by brown segmented leathery armored skin and a ring of inward teeth, ring of natural sand around it. Bottom right same mouth fully open, dark center, sand sprayed outward. Fine realistic painted game asset, photoreal materials, natural warm desert sunlight from upper left, subdued ochre and brown colors matching detailed sandstone RTS terrain. Entire circular subject within each cell, transparent beyond its softly tapering dust/sand edges. No gore, no blood, no people, no objects, no typography, no scene background, no perspective horizon, no watermark.

