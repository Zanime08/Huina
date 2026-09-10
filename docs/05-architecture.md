# Technical Design / Architecture

## 1. Стек (решение + обоснование)
- **TypeScript + Vite** (vanilla, без Phaser): игра — UI-менеджер; DOM/CSS даёт лучший
  responsive/доступность/скорость разработки, чем канвас-движок. Сборка — статика для Yandex.
- **DOM UI + tiny Canvas** (спарклайны хайпа). SVG-аватары мемов процедурные.
- **WebAudio synth** (`AudioManager`): все SFX/музыка генерируются кодом.
- Тесты: `vitest` для симуляции/экономики (чистые функции).

## 2. Структура проекта
```
index.html                  — точка входа, SDK-лоадер, #app
src/
  main.ts                   — BOOT: platform → saves → audio → game
  config.ts                 — константы баланса (тюнинг в одном месте)
  core/
    Game.ts                 — фасад, владеет StateMachine + экранами
    StateMachine.ts         — BOOT→LOADING→MENU→PLAYING→PAUSED→RESULTS (+HOWTO)
    EventBus.ts             — pub/sub между модулями (развязка)
    rng.ts                  — seedable RNG (mulberry32) для дейликов/тестов
  sim/
    memeRegistry.ts         — типы MemeDefinition (data-driven)
    seasonSim.ts            — ЧИСТАЯ симуляция сезона (без UI!) — тестируема
    events.ts               — пул новостных ивентов
    economy.ts              — цены апгрейдов, награды
  meta/
    saveManager.ts          — версионированные сейвы + миграции (saveVersion)
    upgrades.ts             — ветки прокачки
    achievements.ts         — ачивки
    collection.ts           — альбом мемов
    daily.ts                — дейлик-сид по дате (серверное время)
  platform/
    IPlatform.ts            — интерфейс (ads, saves, leaderboard, lang, time)
    YandexPlatform.ts       — реализация на YaGames SDK
    MockPlatform.ts         — локальная разработка/тесты
  ui/
    screens/ (Menu, Game, Results, Upgrades, Collection, Daily, Settings)
    widgets/ (MemeCard, Ticker, HypeBar, Sparkline, Modal, Toast)
    i18n.ts + locales/ru.json, en.json
  audio/
    audioManager.ts         — synth SFX + loop, master/music/sfx громкости
  debug/
    debugPanel.ts           — только dev-сборка (tree-shaken из прода)
data/
  memes.json                — MemeRegistry (id, names, rarity, stats, seasons)
  events.json               — пул ивентов (условия, эффекты, тексты)
  upgrades.json             — ветки прокачки
  achievements.json
public/
  sw.js                     — Service Worker (офлайн — требование Яндекса)
```

## 3. Ключевые решения
- **Симуляция отделена от UI**: `seasonSim` — чистые функции + иммутабельные стейты.
  UI только рендерит и шлёт команды. Это даёт тесты, детерминизм дейлика, отсутствие race conditions.
- **Платформа — адаптер**: gameplay зависит только от `IPlatform`. SDK грузится асинхронно;
  игра стартует и без него (Mock), фичи деградируют gracefully.
- **Реклама — AdsService**: единая точка; интерстишл только из RESULTS; кулдаун 180с активного геймплея;
  RV-награды только по `onRewarded` колбэку.
- **Сейвы**: `{ saveVersion, coins, upgrades, collection, achievements, best, settings, stats }`.
  localStorage — всегда; cloud — debounce 5с + на важных событиях; конфликт → max по прогрессу.
- **Состояние**: один StateMachine, никаких разрозненных boolean-флагов.
- **Инпут**: Pointer Events (мышь+тач едино) + клавиатура (1–5 выбор мемов, B/S buy/sell, Space пауза).
- **Виральность**: share = копирование текстового результата + системный Share API при наличии.

## 4. Баланс (v1, тюнится в config.ts)
- Сезон: 10 дней × 22с ≈ 3.7 мин + мета ≈ 5 мин на цикл.
- Старт: 100 монет. Цель сезона 1: +150 профита.
- FARM: пакеты +1/+5 долей; SELL: всё/половина. Комиссия 0 (простота).
- Энергия: 3 макс, +1/день, BOOST = +12–20 хайпа.
- Звёзды: цель / ×1.5 / ×2.2.

## 5. QA-план (сводно)
Unit (vitest): жизненный цикл мемов, цены/профит, миграции сейвов, дейлик-сиды, награды.
Сценарные: 28 сценариев из ТЗ (чеклист в docs/08-qa.md), ручной прогон + debug-панель
(simulate ad fail, corrupt save, small viewport эмуляция).

---

## 6. Изменения v1.0

**Платформенный слой**
- `IPlatform` + `onGamePause()/onGameResume()` — подписка на `game_api_pause/resume`
  Yandex SDK; Game глушит/возвращает музыку на платформенной паузе.
- `AdsService` получил hooks `before/after`: перед ЛЮБОЙ рекламой музыка глушится,
  после — восстанавливается (требование модерации «mute sounds during ads»).
  Раньше rewarded из паузы шёл с играющей музыкой.
- Исправлено имя метода проверки доступности: `leaderboards.setScore`
  (было `leaderboards.setLeaderboardScore` — по актуальной документации SDK).
- Rewarded-бейлаут больше НЕ снимает паузу симуляции на время показа: мир не тикает,
  пока рекламa закрывает экран.

**Состояния**
- `PAUSED` теперь реальное состояние SM (был мёртвый boolean): showPause → PAUSED,
  resume → PLAYING, quit из паузы → RESULTS (переход добавлен в таблицу).

**Сохранения/сеть**
- Service Worker переведён на network-first с кэш-фолбэком (был cache-first —
  игроки застревали на старом билде после обновления). Версия кэша v2.
- Аналитика: + `tutorial_start`, + `session_end {sec}` (pagehide/visibilitychange).

**Прочее**
- `esc()` для недоверенных строк: имена игроков из лидерборда рендерятся текстом
  (закрыт XSS через publicName других пользователей).
- Sparkline-графики перерисовываются раз в игровой день, а не 60 раз/сек
  (строковое сравнение `dataset.day` вместо number!==string).
- Мёртвый код удалён: `musicNodes`, пустой блок red-tracking, expr `(lv>=1?0:0)`.
- Удалена неиспользуемая dev-зависимость playwright.
- Magic numbers вынесены в CONFIG: `sellFeePct`, `driftK`.

---

## 7. Изменения v1.1
- `IPlatform.isAuthorized()` — по `player.getMode()` ('full' = облако/лидерборды доступны).
- `SettingsScreen` принимает платформу и рисует строку входа (только на реальной платформе).
- `meta/daily.ts`: `weekKey()` (ISO-8601 неделя, UTC) + `weeklySeed()` — общий сид турнира.
- `Game`: Mode расширен до 'weekly'; reward-once-в-неделю через `weeklyDate`;
  ретраи турнира не влияют на прогрессию и экономику.
- Сохранения: saveVersion 3 (+weeklyBest/weeklyDate), миграция v2→v3.
- `npm run package` — сборка + ZIP для консоли Яндекс Игр.

---

## 8. Изменения v1.2
- `seasonalWeight(e, month)` в seasonSim — чистая функция календаря; `SimCtx.month`.
- `monthForKey(weekKey)` в meta/daily — месяц недели для честного сида турнира.
- `weighted()` в rng — нулевые веса строго исключаются (guard total<=0).
- ResultsScreen: флаг isWeekly в конструкторе, место игрока в недельной таблице.
- MockPlatform.mockBoard — эмуляция заполненного лидерборда в тестах/QA.
- package.json: `npm test` = tsc --noEmit && vitest run.
