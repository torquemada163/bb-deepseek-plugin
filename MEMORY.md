# Память проекта bb-deepseek-plugin

## Задача и договорённости

Пользователь попросил создать отдельный плагин DeepSeek для bb по образцу `/Users/torquemada163/dev/bb-kimicode-plugin`, с таким же уровнем оформления и проверок. Ключ уже был в локальном `.env`. Пользователь пока готовит удалённый GitHub-репозиторий; публикацию и push не запрашивал. Подтверждённый remote origin: `https://github.com/torquemada163/bb-deepseek-plugin.git` (пользователь подключил его после реализации).

Общение на русском. Правила продолжения и завершения сессии в `AGENTS.md`. Эта память не содержит ключей.

## Реализация 2026-11-02

- Исходный пакет `bb-plugin-deepseek` 0.1.0, независимый provider id `deepseek`. Текущее исправление 0.1.1 описано ниже.
- BB 0.48.1; публичный Plugin SDK 0.6.104. Использован skill bb-plugin-authoring и актуальные SDK declarations.
- Архитектура: сервер регистрирует провайдера; host.ts оборачивает публичный ACP bridge; OpenCode CLI исполняет инструменты, DeepSeek предоставляет модель через HTTPS API.
- Ключ читается только в host bridge из абсолютного envFile. В настройки/server provider options попадает только путь. Сгенерированный конфиг содержит env-ссылку; ключ только в окружении дочернего процесса.
- Отдельные XDG config/data/cache/state в dataDir плагина. Глобальные настройки Kimi/Claude/Codex/OpenCode не менялись. Project OpenCode config отключён; AGENTS.md доступен агенту.
- Доступность ключа проверена GET /models: `deepseek-flash`, `deepseek-v4-pro`.
- Установленный глобальный OpenCode был 1.14.20. Для проверки установлен локальный devDependency `opencode-ai` 1.19.5. В npm postinstall сначала не нашёл платформенный пакет; установили `opencode-darwin-arm64@1.19.5` локально и запустили postinstall. Локальный `node_modules/opencode-ai/bin/opencode.exe` на macOS — Mach-O binary, несмотря на расширение.
- Изначальный `@ai-sdk/deepseek` в конфиге требовал динамической установки и не запускался. Исправлено на встроенный в OpenCode `@ai-sdk/openai-compatible`; реальный Flash/high ответил маркером через dist/host.js.
- Каталог ограничен двумя актуальными моделями. В 0.1.0 Low ошибочно отключили; исправлено в 0.1.1 (см. ниже). Исходно проверяли только High/Max. Лимиты из официальной страницы: 1M context, 384K output. Фактические ограничения исполнения зависят от OpenCode.
- README, PLUGIN_OVERVIEW, docs, CHANGELOG, skill, MIT license, DeepSeek SVG с атрибуцией Lobe Icons, CI Ubuntu/macOS Node22, release workflow и Dependabot подготовлены.
- Плагин установлен локально в bb как path install; envFile направлен на .env проекта, executable на локальный OpenCode 1.19.5. Живой `bb provider models deepseek --json` подтвердил обе модели и High/Max; `bb provider list --json` показывает DeepSeek available=true и собственный logoUrl.

## Проверки и оставшаяся работа

Уже проходили typecheck, 6 unit tests (конфиг/секреты/public SDK/регистрация), 18 bridge conformance сценариев, сборка, production-only clean install и npm package contents. `.env` исключён Git и публикацией. Runtime-only audit в чистой установке: 0 vulnerabilities. Общий dev dependency tree имеет уязвимости в транзитивных зависимостях инструментария bb; не обновляли вслепую SDK/build-tool.

Завершены реальные проверки собранного dist/host.js: Flash/high — чтение input.txt и запись output.txt с проверкой фактического содержимого; завершение хода, release/resume и второй ход с воспроизведением случайного маркера из истории. V4 Pro/max — реальный завершённый ответ, release/resume и второй ход с сохранением контекста. Терминальные команды отдельно не гоняли; их поддержка предоставляется OpenCode/общим ACP bridge.

Повторный итоговый прогон typecheck, всех 6 unit tests, 18 conformance сценариев, build, clean install, package contents и git diff --check успешен. Ключ не найден в исходниках или dist; .env chmod 600 и gitignored. Release-notes v0.1.0 генерируются успешно. CI/workflows подготовлены, но GitHub Actions ещё не запускались, так как remote не подключён. Плагин после окончательной сборки перезагружен и работает.

Пользователь подключил origin; URL подтверждён командой git remote -v. Никаких push/tag/release не делалось. Git-репозиторий изначально был пустой. Готовая базовая реализация сохранена первым коммитом; посмотреть `git log -1`. После исходной реализации пользователь сообщил об ошибке уровней размышлений; продолжение ниже.

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


## Исправление уровней размышлений 2026-11-02, версия 0.1.1

Пользователь прислал скриншот: `Provider deepseek does not support medium reasoning level. Supported reasoning levels: high, max`. Просил исправить и самостоятельно проверить обе модели на всех уровнях. Публикацию по-прежнему не запрашивал.

Причина: сервер bb по умолчанию подставляет medium до запуска host bridge и проверяет capabilities провайдера. Только нормализации в host.ts недостаточно: medium надо объявить в server.ts. Сверили источник в checkout BB (`apps/server/src/services/threads/thread-execution-plan.ts`) и актуальную документацию https://api-docs.deepseek.com/guides/thinking_mode/.

Реализовано:

- `src/reasoning.ts` — единая таблица: none → none (thinking disabled), minimal/low → low, default/medium/high/xhigh → high, max/ultra → max.
- BB provider capabilities принимают none/low/medium/high/xhigh/max/ultra. Minimal — API alias, отсутствует в enum BB picker, но host нормализует его для совместимости.
- `host.ts` нормализует params.options перед ACP dispatch, в том числе start/resume/turn.
- OpenCode catalog: Default, Off/None, Low, High, Max. Default явно задан как High. Живой каталог показывает defaultReasoningEffort=default; actual API default = High.
- В thinking disabled запрос может содержать reasoning_effort=high, унаследованный из model options; DeepSeek успешно отвечает, уровень игнорируется при disabled. Включённые режимы передают low/high/max точно.
- `scripts/api-observer.ts`: только opt-in live test, временный локальный HTTPS reverse proxy с временным доверенным сертификатом и проверкой TLS на обоих соединениях. Forward только на официальный DeepSeek API. Проверяет настоящие model/thinking/reasoning_effort и HTTP status, не записывает ключ/заголовки/промпты/ответы. Служебные title/summary запросы OpenCode отделяются по точному началу system prompt — у них собственный reasoning effort.
- `scripts/smoke-matrix.ts` запускает обе модели по всем 9 уровням/алиасам (18 сценариев), максимум два процесса одновременно. Каждый сценарий проверяет два завершённых хода с release/resume и воспроизведением случайного маркера из истории. None/Low/High/Max и Medium также реально читают и записывают файл.
- Исправлена ошибка smoke.ts: нельзя вызывать bridge.onClose() перед process.exit, потому что общий ACP bridge сам может завершить процесс кодом 0 даже после проваленной проверки. Теперь неуспешный smoke возвращает ненулевой exit code.
- Обновлены README, docs, skill, CHANGELOG, package/lockfile до 0.1.1. Unit regression проверяет все mappings на start/resume/turn и наличие medium в регистрации. Conformance использует medium, providerId теперь правильный deepseek.

Первый полный промежуточный прогон дал 16/16 PASS. Окончательный прогон 0.1.1: **18/18 PASS** (обе модели × default/none/minimal/low/medium/high/xhigh/max/ultra), **36 завершённых ходов**, 18 release/resume, 10 сценариев с file read/write. В каждом проверены actual HTTPS thinking/reasoning_effort и успешные ответы. Отчёт без секретов сохранён в `docs/reasoning-verification.json`. Итоговый bb provider list показывает medium с меткой Medium → High; плагин 0.1.1 перезагружен и available=true.

Итоговые проверки 0.1.1: typecheck, 8 unit tests, 18 offline conformance, build, clean production install, package contents и release-notes generator успешны. Браузерный UI/thread creation напрямую не автоматизировали; исправление pre-dispatch medium подтверждено регистрацией живого провайдера и SDK-тестом. Код и память сохранены отдельным локальным коммитом, без push/tag/release.


## Уточнение зависимости OpenCode 2026-11-02

Пользователь проверил, что агент представляется OpenCode. Объяснили архитектуру: DeepSeek — модель/API, OpenCode — agent runtime с собственными системными инструкциями, инструментами и сессиями, bb — интерфейс. Обсудили возможность прямого агента без OpenCode; пользователь явно решил оставить OpenCode.

По его просьбе уточнены README, marketplace overview, configuration и development docs: отдельная установка OpenCode 1.19.5+ обязательна на каждом execution host; установка плагина не ставит CLI; браузерному устройству он не нужен; отдельная подписка или логин OpenCode для этого провайдера не требуются; запросы оплачиваются в DeepSeek. Объяснено самопредставление OpenCode и различие локального devDependency с пользовательской установкой.

origin уже подключён пользователем и проверен: https://github.com/torquemada163/bb-deepseek-plugin.git. В рамках этого уточнения выполнялись только локальные изменения документации; push/tag/release не запрашивались.

Проверки после уточнения документации: typecheck, 8 unit tests, 18 conformance, build, clean install, package contents и diff --check прошли. Платные API-проверки повторно не запускались, исполняемый код не менялся. Изменения документации сохранены локальным коммитом.


## Первая публикация на GitHub 2026-11-02

Пользователь явно разрешил push и релизы: «Отправляй. Сделай все красиво, как ты Kimi делал. Со всеми этими релизами и прочим». Разрешение включает загрузку main, оформление репозитория, CI и GitHub Release; публикацию в npm или Community marketplace отдельно не запрашивал. Первый публичный релиз — v0.1.1, без выпуска устаревшей исходной 0.1.0.

origin публичный, изначально пустой. gh auth не настроен, но Git credential helper osxkeychain имеет рабочие credentials. Для gh используется временный /private/tmp/bb-deepseek-gh.py: читает credential fill в память, передаёт токен только окружением дочернего gh, не печатает и не сохраняет токен. В проекте credentials отсутствуют.

Добавлены README release badge и установка/обновление по semver range. Release notes расширены описанием моделей, режимов, OpenCode, настройки и проверок; ссылка сравнения формируется только при существующем предыдущем теге. Идёт публикация и проверка Actions.
