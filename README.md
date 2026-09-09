# HYPE FACTORY — Мемная фабрика

Менеджер мем-трендов для Яндекс Игр. Покупай доли растущих мемов, продавай на пике хайпа,
не держи кринж. Сезон = 10 дней ≈ 4 минуты. Чистый TypeScript + Vite, ноль внешних ассетов.

## Запуск

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 22 теста: sim / economy / balance / smoke
npm run build    # production в dist/ (~84 КБ)
```

Debug-панель (только dev): `http://localhost:3000/?debug=1`

## Публикация на Яндекс Играх

Кратко: собери `dist/`, залей ZIP в [черновик](https://games.yandex.ru/console),
подключи монетизацию и лидерборды. Полная инструкция: `docs/07-publish.md`.

## Документы

- `docs/01-market-research.md` — исследование рынка
- `docs/02-meme-research.md` — исследование мемов
- `docs/03-concepts.md` — 10 концепций и выбор
- `docs/04-gdd.md` — Game Design Document
- `docs/05-architecture.md` — архитектура
- `docs/06-qa.md` — QA-чеклист
- `docs/07-publish.md` — инструкция публикации
- `docs/08-roadmap.md` — план обновлений

## Лидерборды (создать в консоли)

- `hype_season_profit` — лучший профит сезона
- `hype_daily_profit` — лучший профит дейлика

## Лицензии

Весь код, графика (процедурная SVG), звуки (синтез WebAudio) — оригинальные, созданы для проекта.
Внешних ассетов нет. Meme-имена — пародийные оригиналы.
