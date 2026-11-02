# Память проекта bb-deepseek-plugin

## Задача и договорённости

Пользователь попросил создать отдельный плагин DeepSeek для bb по образцу `/Users/torquemada163/dev/bb-kimicode-plugin`, с таким же уровнем оформления и проверок. Ключ уже был в локальном `.env`. Пользователь пока готовит удалённый GitHub-репозиторий; публикацию и push не запрашивал. Предполагаемый адрес в документации: `https://github.com/torquemada163/bb-deepseek-plugin`; remote ещё не назначен.

Общение на русском. Правила продолжения и завершения сессии в `AGENTS.md`. Эта память не содержит ключей.

## Реализация 2026-11-02

- Пакет `bb-plugin-deepseek` 0.1.0, независимый provider id `deepseek`.
- BB 0.48.1; публичный Plugin SDK 0.6.104. Использован skill bb-plugin-authoring и актуальные SDK declarations.
- Архитектура: сервер регистрирует провайдера; host.ts оборачивает публичный ACP bridge; OpenCode CLI исполняет инструменты, DeepSeek предоставляет модель через HTTPS API.
- Ключ читается только в host bridge из абсолютного envFile. В настройки/server provider options попадает только путь. Сгенерированный конфиг содержит env-ссылку; ключ только в окружении дочернего процесса.
- Отдельные XDG config/data/cache/state в dataDir плагина. Глобальные настройки Kimi/Claude/Codex/OpenCode не менялись. Project OpenCode config отключён; AGENTS.md доступен агенту.
- Доступность ключа проверена GET /models: `deepseek-flash`, `deepseek-v4-pro`.
- Установленный глобальный OpenCode был 1.14.20. Для проверки установлен локальный devDependency `opencode-ai` 1.19.5. В npm postinstall сначала не нашёл платформенный пакет; установили `opencode-darwin-arm64@1.19.5` локально и запустили postinstall. Локальный `node_modules/opencode-ai/bin/opencode.exe` на macOS — Mach-O binary, несмотря на расширение.
- Изначальный `@ai-sdk/deepseek` в конфиге требовал динамической установки и не запускался. Исправлено на встроенный в OpenCode `@ai-sdk/openai-compatible`; реальный Flash/high ответил маркером через dist/host.js.
- Каталог ограничен двумя актуальными моделями. Автоматический Low вариант OpenCode отключён; проверяются High/Max. Лимиты из официальной страницы: 1M context, 384K output. Фактические ограничения исполнения зависят от OpenCode.
- README, PLUGIN_OVERVIEW, docs, CHANGELOG, skill, MIT license, DeepSeek SVG с атрибуцией Lobe Icons, CI Ubuntu/macOS Node22, release workflow и Dependabot подготовлены.
- Плагин установлен локально в bb как path install; envFile направлен на .env проекта, executable на локальный OpenCode 1.19.5. Живой `bb provider models deepseek --json` подтвердил обе модели и High/Max; `bb provider list --json` показывает DeepSeek available=true и собственный logoUrl.

## Проверки и оставшаяся работа

Уже проходили typecheck, 6 unit tests (конфиг/секреты/public SDK/регистрация), 18 bridge conformance сценариев, сборка, production-only clean install и npm package contents. `.env` исключён Git и публикацией. Runtime-only audit в чистой установке: 0 vulnerabilities. Общий dev dependency tree имеет уязвимости в транзитивных зависимостях инструментария bb; не обновляли вслепую SDK/build-tool.

Завершены реальные проверки собранного dist/host.js: Flash/high — чтение input.txt и запись output.txt с проверкой фактического содержимого; завершение хода, release/resume и второй ход с воспроизведением случайного маркера из истории. V4 Pro/max — реальный завершённый ответ, release/resume и второй ход с сохранением контекста. Терминальные команды отдельно не гоняли; их поддержка предоставляется OpenCode/общим ACP bridge.

Повторный итоговый прогон typecheck, всех 6 unit tests, 18 conformance сценариев, build, clean install, package contents и git diff --check успешен. Ключ не найден в исходниках или dist; .env chmod 600 и gitignored. Release-notes v0.1.0 генерируются успешно. CI/workflows подготовлены, но GitHub Actions ещё не запускались, так как remote не подключён. Плагин после окончательной сборки перезагружен и работает.

Нужен реальный URL удалённого репозитория от пользователя перед назначением remote/push. Никаких push/tag/release не делалось. Git-репозиторий изначально был пустой. Готовая базовая реализация сохранена первым коммитом; посмотреть `git log -1`. До получения URL от пользователя работа по плагину завершена, remote не настроен.

## Команды

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run check:install`
- `npm run check:package`
- `DEEPSEEK_SMOKE_TOOLS=1 npm run smoke`
- `DEEPSEEK_SMOKE_MODEL=deepseek/deepseek-v4-pro DEEPSEEK_SMOKE_REASONING=max npm run smoke`
- `bb provider models deepseek --json`

У npm cache в домашней папке есть root-owned файлы. Не исправлять чужие права: использовать `--cache /private/tmp/bb-deepseek-npm-cache`. Проверочные скрипты теперь берут отдельный writable tmp cache (переопределение BB_DEEPSEEK_NPM_CACHE). Дочернему OpenCode тоже выставлен отдельный npm_config_cache.
