# SDK/API и внешние ассеты

## 1. Yandex Games SDK (v2, `https://yandex.ru/games/sdk/v2`)

Используемые методы — полный список (адаптер: `src/platform/YandexPlatform.ts`):

| Метод | Зачем |
|---|---|
| `YaGames.init()` | инициализация SDK (таймаут 8с → MockPlatform) |
| `ysdk.features.LoadingAPI.ready()` | сигнал «загрузка завершена» (требование модерации) |
| `ysdk.features.GameplayAPI.start()/stop()` | маркировка активного геймплея (тайминги рекламы) |
| `ysdk.on('game_api_pause' / 'game_api_resume')` | платформенная пауза → глушим музыку |
| `ysdk.adv.showFullscreenAdv({callbacks})` | интерстишл (только на экране результатов, кулдаун 180с активной игры) |
| `ysdk.adv.showRewardedVideo({callbacks})` | rewarded (x2 награда, спасение); награда только по `onRewarded` |
| `ysdk.environment.i18n.lang` | авто-выбор языка (ru/en, +ru-близкие локали) |
| `ysdk.getPlayer({signed:false})` | профиль: `getName`, `getMode` ('full'/'lite'), `getUniqueID` |
| `player.getData()/setData()` | облачные сохранения (конфликт решается по прогрессу) |
| `ysdk.auth.openAuthDialog()` | вход из настроек (включает облако + лидерборды) |
| `ysdk.getLeaderboards()` → `setLeaderboardScore` / `getLeaderboardEntries` | 3 лидерборда; сабмит только при новом личном рекорде; проверка `isAvailableMethod('leaderboards.setScore')` |
| `ysdk.getFlags({defaultFlags})` | Remote Config (5 флагов с клампами, таймаут 5с) |
| `ysdk.serverTime()` | анти-накрутка дейлики/стрика/недельного сида |

**Не используется** (и почему): `ysdk.screen.fullscreen` (браузер Яндекса сам даёт fullscreen
на мобиле; ручной вызов провоцирует отказы), `payments` (нет in-app в v1.3 — план v2),
`getPlayer({scopes})`/`signed:true` (персональные данные не нужны), Events API (GamesAPI —
кросс-промо, добавим после стабилизации метрик).

## 2. Браузерные API
WebAudio (синтез звука), Canvas 2D (спарклайны), localStorage (сохранения + бэкап-слот),
Service Worker (офлайн, network-first), requestAnimationFrame, navigator.share /
clipboard (шеринг результата), URLSearchParams (debug/флаги), CSS env(safe-area-inset).

## 3. Внешние ассеты и лицензии
**Внешних ассетов НЕТ** — ноль файлов графики/звука/шрифтов со стороны:
- Графика: процедурные SVG-аватары мемов (генерируются кодом, `avatarSVG`), CSS-тема.
- Шрифты: системный стек (system-ui/Segoe/Roboto) — без лицензионных рисков.
- Звук: синтез WebAudio (осцилляторы), никаких сэмплов.
- Иконки: юникод-эмодзи.

**Интеллектуальная собственность**: весь код — оригинальный; имена мемов — пародийные
оригиналы («Воздуханчик», «Дрысясися» как нарицательные), реальные персоны и защищённые
образы (итальянские брейнроты 1-в-1, скибиди) не используются. «6-7» используется как число.
Источники исследования трендов — `docs/02` (Медиалогия, Brand Analytics, ТАСС и др.).
Сторонней рекламы нет; монетизация только через Яндекс (требование платформы соблюдено).

## 4. Зависимости сборки (devDependencies, не попадают в бандл)
typescript, vite, vitest, happy-dom. Runtime-зависимостей ноль.
