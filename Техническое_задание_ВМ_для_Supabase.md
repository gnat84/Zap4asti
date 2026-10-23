# Техническое задание на предоставление виртуальной машины

## Назначение документа

Документ описывает требования к виртуальной машине для развёртывания self-hosted Supabase и переноса приложения «Учёт запчастей» с облачного Supabase на локальный сервер.

---

## 1. Описание приложения «Учёт запчастей»

### 1.1. Что это

Веб-приложение для учёта запчастей на промышленном предприятии. Иерархия данных: **цех → линия → запчасть**. Также打包为 Android APK через Capacitor для использования на планшетах.

### 1.2. Технологический стек

| Компонент | Технология | Версия |
|-----------|-----------|--------|
| Фронтенд | React + TypeScript | 19 / 6.0 |
| Сборщик | Vite | 8.x |
| CSS-фреймворк | Tailwind CSS | 4.x |
| Роутинг | react-router-dom (HashRouter) | 7.x |
| Клиент БД | @supabase/supabase-js | 2.108+ |
| Мобилка | Capacitor (Android) | 8.x |
| PWA | vite-plugin-pwa (workbox) | 1.3+ |

### 1.3. Архитектура подключения к базе данных

Приложение подключается к Supabase **исключительно через HTTPS** с использованием JS SDK:

```
Браузер/приложение
    ↓ HTTPS (REST API)
Kong API Gateway (порт 8000)
    ↓
PostgREST (read/write данных)
GoTrue (аутентификация)
Storage API (файлы)
```

**Ключевой момент**: приложение использует только **anon key** (публичный ключ). Service key на клиенте НЕ используется и заблокирован SDK.

### 1.4. Какие сервисы Supabase используются

| Сервис | Назначение в приложении |
|--------|----------------------|
| **PostgREST** | CRUD-операции с таблицами (profiles, workshops, lines, parts) |
| **GoTrue** | Аутентификация (email/password), управление сессиями |
| **Storage** | Хранение фото и файлов запчастей (публичный бакет `parts-files`) |
| **PostgreSQL** | Хранение данных, триггеры, RPC-функции, RLS-политики |

### 1.5. Структура базы данных

**Таблицы (схема `public`):**

| Таблица | Описание | RLS |
|---------|----------|-----|
| `profiles` | Профили пользователей (id, email, role) | **Отключён** |
| `workshops` | Цеха (id, name) | Включён |
| `lines` | Линии (id, name, workshop_id, фото, файлы) | Включён |
| `parts` | Запчасти (id, name, workshop_id, line_id, фото, файлы) | Включён |

**Таблицы схемы `auth`:**

| Таблица | Назначение |
|---------|-----------|
| `auth.users` | Пользователи аутентификации |
| `auth.identities` | Идентификаторы (email/password) |
| `auth.refresh_tokens` | Токены обновления сессий |

**RPC-функции (SECURITY DEFINER):**

| Функция | Назначение |
|---------|-----------|
| `handle_new_user()` | Триггер: автосоздание profile при signup |
| `confirm_user_email(text)` | Подтверждение email после signup |
| `delete_user_by_admin(uuid)` | Каскадное удаление пользователя |
| `reset_user_password(uuid, text)` | Сброс пароля (bcrypt) |

**Расширения PostgreSQL:**
- `uuid-ossp` — генерация UUID
- `pgcrypto` — хеширование паролей (crypt, gen_salt)

**Storage:**
- Бакет `parts-files` — публичный, для хранения фото/файлов запчастей и линий

### 1.6. Система ролей

- Роли: `admin` и `user` (поле `role` в таблице `profiles`)
- Admin определяется через `profiles.role = 'admin'` (НЕ через user_metadata)
- Admin может: создавать/удалять цеха, линии, запчасти, управлять пользователями
- User может: просматривать, создавать, редактировать запчасти

---

## 2. Требования к виртуальной машине

### 2.1. Аппаратные ресурсы

| Параметр | Минимальные | Рекомендуемые |
|----------|-------------|---------------|
| vCPU | 2 | 4 |
| RAM | 4 GB | 8 GB |
| Диск | 50 GB SSD | 100 GB SSD |
| Сеть | 100 Mbps | 1 Gbps |

**Обоснование:**
- PostgreSQL + GoTrue + PostgREST + Kong + Storage = минимум 5-6 процессов
- При небольшом количестве пользователей (до 20) 4 GB RAM достаточно
- SSD обязателен для производительности PostgreSQL
- Диск 50 GB — с запасом для базы данных + файлов Storage

### 2.2. Операционная система

**Рекомендуется:** Ubuntu Server 22.04 LTS или 24.04 LTS

**Альтернативы:** Debian 12, CentOS Stream 9

**Почему Ubuntu:**
- Официальная документация Supabase написана для Ubuntu/Debian
- Docker и docker-compose работают стабильно
- Поддержка LTS (5 лет обновлений безопасности)

### 2.3. Программное обеспечение (установить на ВМ)

| ПО | Версия | Назначение |
|----|--------|-----------|
| **Docker** | 24+ | Контейнеризация всех сервисов Supabase |
| **Docker Compose** | v2.20+ | Оркестрация контейнеров |
| **Git** | 2.30+ | Клонирование репозиториев |
| **Nginx** (опционально) | 1.24+ | Reverse proxy для доступа к приложению |

### 2.4. Открытые порты

| Порт | Протокол | Сервис | Назначение |
|------|----------|--------|-----------|
| **8000** | TCP | Kong API Gateway | **Основной API Supabase** — REST-запросы от приложения |
| **3000** | TCP | Kong (dashboard) | Supabase Dashboard (Studio) |
| **5432** | TCP | PostgreSQL | Прямой доступ к БД (только с ВМ или VPN) |
| **8443** | TCP | Supabase Studio | Веб-интерфейс управления (HTTPS) |

**Важно:**
- Порт **8000** — критичный. Приложение обращается к `http://<IP_VМ>:8000` для всех операций (данные, аутентификация, файлы)
- Порт **5432** — рекомендуется закрыть снаружи, оставить только localhost
- Если приложение будет доступно извне — потребуется SSL-сертификат и настройка Nginx

### 2.5. Сетевые требования

| Параметр | Требование |
|----------|-----------|
| Статический IP | Обязателен (или DHCP с фиксацией) |
| DNS-имя | Опционально (можно использовать IP) |
| Доступность порта 8000 | Для клиентских приложений (браузеры, APK) |
| Доступность порта 8443 | Для администраторов (Supabase Studio) |

---

## 3. Процесс развёртывания

### 3.1. Установка Docker и Docker Compose

```bash
# Обновление пакетов
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com | sudo sh

# Добавление текущего пользователя в группу docker
sudo usermod -aG docker $USER

# Проверка
docker --version
docker compose version
```

### 3.2. Клонирование Supabase (self-hosted)

```bash
# Клонирование официального репозитория
git clone --depth 1 https://github.com/supabase/supabase.git
cd supabase/docker

# Копирование примера env-файла
cp .env.example .env
```

### 3.3. Конфигурация .env

В файле `.env` необходимо задать:

```env
# Домен / IP сервера (КРИТИЧНО — приложение будет обращаться к этому адресу)
SITE_URL=http://<IP_ВМ>

# Секретный ключ для JWT (сгенерировать новый!)
JWT_SECRET=<сгенерированный_секрет>

# Ключи для API (сгенерировать!)
ANON_KEY=<сгенерированный_anon_key>
SERVICE_ROLE_KEY=<сгенерированный_service_key>

# Пароль PostgreSQL (сгенерировать надёжный!)
POSTGRES_PASSWORD=<надёжный_пароль>

# Домен для API (IP или DNS)
API_EXTERNAL_URL=http://<IP_ВМ>:8000

# Порты (оставить по умолчанию)
KONG_HTTP_PORT=8000
KONG_HTTPS_PORT=8443
```

**Как сгенерировать ключи:**
```bash
# JWT_SECRET (32 символа)
openssl rand -hex 32

# Для ANON_KEY и SERVICE_ROLE_KEY нужно сгенерировать JWT-токены
# Или использовать предустановленные из .env.example (для тестов)
```

### 3.4. Запуск Supabase

```bash
cd supabase/docker
docker compose up -d
```

**Проверка:**
```bash
# Проверить что все контейнеры запущены
docker compose ps

# Проверить доступность API
curl http://localhost:8000/rest/v1/

# Открыть Supabase Studio
# В браузере: http://<IP_ВМ>:8443
```

### 3.5. Инициализация базы данных

После запуска Supabase нужно выполнить SQL-миграцию:

1. Открыть Supabase Studio: `http://<IP_ВМ>:8443`
2. Перейти в SQL Editor
3. Выполнить содержимое файла `999_full_migration.sql` (полная миграция Cloud→Local)

**Или через psql:**
```bash
docker compose exec -T db psql -U postgres -d postgres < /path/to/999_full_migration.sql
```

### 3.6. Настройка приложения

В `.env` приложения изменить URL и ключ:

```env
VITE_SUPABASE_URL=http://<IP_ВМ>:8000
VITE_SUPABASE_ANON_KEY=<ANON_KEY_из_.env_Supabase>
```

**Важно:** Для production (не dev-режим) приложение нужно собрать:
```bash
npm run build
```

И раздать статику через Nginx или Vite preview.

---

## 4. Миграция данных

### 4.1. Экспорт данных из облачного Supabase

Данные нужно экспортировать из облачного Supabase Dashboard:
- Таблицы: profiles, workshops, lines, parts
- Storage: файлы из бакета `parts-files`

### 4.2. Импорт данных

Через Supabase Studio → SQL Editor или psql:
```bash
# Импорт данных (порядок важен из-за внешних ключей!)
# 1. auth.users (через API signup)
# 2. profiles
# 3. workshops
# 4. lines
# 5. parts
# 6. Storage файлы
```

### 4.3. Пересоздание пользователей

Пользователи НЕ мигрируют напрямую из auth.users облачного Supabase. Их нужно создать заново через приложение (signup) или через SQL Editor:
```bash
# Для каждого пользователя:
# 1. Выполнить signup через API или UI
# 2. Подтвердить email через RPC: SELECT confirm_user_email('user@example.com');
# 3. Назначить роль admin (если нужно): UPDATE profiles SET role = 'admin' WHERE email = '...';
```

---

## 5. Конфигурация приложения для работы с локальным Supabase

### 5.1. Переменные окружения

```env
# Локальный Supabase
VITE_SUPABASE_URL=http://<IP_ВМ>:8000
VITE_SUPABASE_ANON_KEY=<ANON_KEY>
```

### 5.2. Сборка приложения

```bash
# Установка зависимостей
npm install

# Сборка production-версии
npm run build

# Результат: папка dist/
```

### 5.3. Развёртывание фронтенда

**Вариант A: Vite preview (для тестов)**
```bash
npx vite preview --host 0.0.0.0 --port 4173
```

**Вариант B: Nginx (для production)**
```nginx
server {
    listen 80;
    server_name <IP_ВМ>;

    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Проксирование API к Supabase
    location /auth/ {
        proxy_pass http://localhost:8000;
    }
    location /rest/ {
        proxy_pass http://localhost:8000;
    }
    location /storage/ {
        proxy_pass http://localhost:8000;
    }
}
```

---

## 6. Важные замечания и нюансы

### 6.1. Авторизация и ключи

- Приложение использует **только anon key** — это публичный JWT-токен
- **Service key** НЕ используется на клиенте (SDK блокирует)
- Аутентификация — email/password через GoTrue
- Токены сессий хранятся в localStorage браузера

### 6.2. Хранение файлов

- Файлы (фото запчастей, файлы линий) хранятся в **Supabase Storage**
- Бакет `parts-files` — **публичный** (доступ по прямому URL)
- При миграции нужно перенести все файлы из облачного Storage в локальный

### 6.3. Триггеры и RPC-функции

- Триггер `handle_new_user` автоматически создаёт профиль при signup
- RPC-функции (`confirm_user_email`, `delete_user_by_admin`, `reset_user_password`) работают через SECURITY DEFINER
- Все функции создаются через `999_full_migration.sql`

### 6.4. RLS (Row Level Security)

- Таблица `profiles` — RLS **отключён** (триггер работает через signup как `anon`)
- Таблицы `workshops`, `lines`, `parts` — RLS **включён**, политики разрешают всё для `authenticated`
- DELETE доступен только для `admin` (через RLS-политики)

### 6.5. HTTPS / SSL

- Приложение поддерживает HTTPS через `cert.pem` / `key.pem` (самоподписанные или LetsEncrypt)
- Для работы на локальном сервере — самоподписанные сертификаты допустимы
- Vite dev server автоматически использует HTTPS если файлы сертификатов найдены

### 6.6. Capacitor (Android APK)

- Приложение打包为 Android APK через Capacitor
- APK обращается к серверу по HTTP/HTTPS
- При смене сервера нужно пересобрать APK с новым `VITE_SUPABASE_URL`
- `capacitor.config.json` → `server.androidScheme: "https"` — WebView использует HTTPS

---

## 7. Порядок действий (чеклист)

### Этап 1: Подготовка ВМ
- [ ] Создать ВМ (Ubuntu 22.04 LTS, 4 vCPU, 8 GB RAM, 100 GB SSD)
- [ ] Настроить статический IP
- [ ] Открыть порты: 8000, 8443, 22 (SSH)
- [ ] Установить Docker и Docker Compose

### Этап 2: Развёртывание Supabase
- [ ] Клонировать supabase/supabase
- [ ] Настроить `.env` (SITE_URL, ключи, пароли)
- [ ] Запустить `docker compose up -d`
- [ ] Проверить доступность Studio: `http://<IP>:8443`

### Этап 3: Инициализация БД
- [ ] Выполнить `999_full_migration.sql` через SQL Editor
- [ ] Проверить наличие таблиц: profiles, workshops, lines, parts
- [ ] Проверить наличие Storage bucket: `parts-files`

### Этап 4: Миграция данных
- [ ] Экспортировать данные из облачного Supabase
- [ ] Импортировать данные в локальный Supabase
- [ ] Перенести файлы из облачного Storage в локальный
- [ ] Пересоздать пользователей (signup + подтверждение email)

### Этап 5: Настройка приложения
- [ ] Изменить `.env` приложения: `VITE_SUPABASE_URL=http://<IP>:8000`
- [ ] Собрать приложение: `npm run build`
- [ ] Развернуть `dist/` через Nginx или Vite preview
- [ ] Проверить работу авторизации

### Этап 6: Тестирование
- [ ] Вход/выход пользователя
- [ ] Создание/редактирование цехов, линий, запчастей
- [ ] Загрузка/просмотр фото и файлов
- [ ] Работа admin-функций (управление пользователями)
- [ ] Проверка на мобильных устройствах

---

## 8. Контактная информация

- **Автор приложения**: (указать)
- **Текущий облачный Supabase**: `pfompchexjtkpxmljlzc.supabase.co`
- **SQL-миграции**: `C:\project\supabase\migrations\`
- **Ключевой файл миграции**: `999_full_migration.sql`
