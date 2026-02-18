# RadioWave — Руководство по управлению

## Содержание
1. [Управление пользователями](#1-управление-пользователями)
2. [Музыка и звук на сайте](#2-музыка-и-звук-на-сайте)
3. [Заказ песен и постановка в эфир](#3-заказ-песен-и-постановка-в-эфир)
4. [Логотип и название радиостанции](#4-логотип-и-название-радиостанции)
5. [Полезные команды](#5-полезные-команды)

---

## 1. Управление пользователями

### Где смотреть пользователей

1. Войдите на сайт под учётной записью администратора (`admin@radio.local` / `admin123`)
2. Нажмите на свой аватар в правом верхнем углу → **Админка**
3. На главной странице админки нажмите карточку **Пользователи**
4. Или откройте напрямую: `https://ваш-домен/admin/users`

### Что можно делать

- **Просмотр всех пользователей**: имя, email, роль, подписка, баланс, дата регистрации, последняя активность
- **Поиск**: введите имя или email в строку поиска
- **Фильтр по роли**: Все / Админы / Модераторы / Пользователи
- **Управление** (кнопка «Управлять» напротив пользователя):
  - **Изменить роль**: user → moderator → admin
  - **Начислить/списать баланс**: положительное число — начисление, отрицательное — списание
  - Просмотр полной информации: ID, подписка, дата регистрации

### API для управления пользователями

| Действие | Метод | URL |
|----------|-------|-----|
| Список пользователей | `GET` | `/api/admin/users` |
| Обновить пользователя | `PUT` | `/api/admin/users/:id` |

Тело запроса для обновления:
```json
{
  "role": "moderator",
  "balance_add": 500
}
```

---

## 2. Музыка и звук на сайте

### Почему нет звука?

Звук отсутствует по одной или нескольким причинам:

**Причина 1: Нет музыкальных файлов**

В Docker-контейнере с потоковым вещанием (icecast) папка `/music` пустая. Liquidsoap не может воспроизводить то, чего нет.

**Решение** — загрузите MP3-файлы в volume `music_data`:

```bash
# Узнаём путь к Docker volume
docker volume inspect radio_music_data

# Копируем файлы из папки на сервере в volume
# Вариант 1: через docker cp
docker cp /путь/к/вашим/песням/. radio_icecast:/music/

# Вариант 2: если файлы уже на сервере, используем volume mount path
# Путь обычно: /var/lib/docker/volumes/internet-radio_music_data/_data/
sudo cp /путь/к/вашим/песням/*.mp3 /var/lib/docker/volumes/internet-radio_music_data/_data/
```

Или загрузите через админ-панель:
1. Перейдите на `https://ваш-домен/admin/upload`
2. Перетащите MP3-файлы в зону загрузки
3. Заполните метаданные (название, исполнитель, жанр)
4. Нажмите «Загрузить»

**Причина 2: Контейнер icecast не запущен**

```bash
# Проверяем статус контейнеров
docker compose ps

# Если icecast не запущен — запускаем
docker compose up -d icecast

# Смотрим логи потока
docker compose logs -f icecast
```

**Причина 3: Liquidsoap не подключился к Icecast**

```bash
# Проверяем логи liquidsoap внутри контейнера
docker exec radio_icecast cat /var/log/liquidsoap/*.log

# Перезапускаем потоковое вещание
docker compose restart icecast
```

**Причина 4: Nginx не проксирует поток**

Проверьте, доступен ли поток напрямую:
```bash
curl -I http://localhost:8000/stream
```
Если ответ 200 — поток работает, проблема в Nginx. Если нет — проблема в Icecast/Liquidsoap.

### Пошаговый чеклист запуска звука

1. Скопируйте MP3-файлы в `/music` volume (см. выше)
2. Перезапустите icecast: `docker compose restart icecast`
3. Подождите 5-10 секунд
4. Проверьте: `curl -I http://localhost:8000/stream` — должен быть статус 200
5. Откройте сайт и нажмите кнопку Play в плеере внизу страницы

---

## 3. Заказ песен и постановка в эфир

### Как работает система заказов

Система заказов **автоматическая**. Когда пользователь заказывает песню:

1. Пользователь выбирает песню в каталоге → нажимает «Заказать»
2. С его баланса списывается стоимость (с учётом скидки по подписке)
3. Песня **автоматически** ставится в очередь Liquidsoap
4. Liquidsoap воспроизводит её в порядке очереди

### Приоритеты очередей

Liquidsoap играет в таком порядке приоритетов:

| Приоритет | Очередь | Что в ней |
|-----------|---------|-----------|
| 1 (высший) | `jingle_queue` | DJ-анонсы (автоматические) |
| 2 | `priority_queue` | Заказы Premium/VIP пользователей |
| 3 | `request_queue` | Заказы обычных пользователей |
| 4 | `music` | Фоновая ротация из /music |
| 5 (низший) | `silence` | Тишина (если вообще ничего нет) |

### Как работает в реальности

- Если **нет заказов** — играет фоновая ротация (все MP3 из папки `/music`)
- Если **пришёл заказ** — после текущего трека играется заказанная песня
- **Premium/VIP заказы** играются перед обычными
- **DJ-анонс** (если настроен OpenAI) автоматически произносит «Для вас играет...»

### Управление заказами через админку

1. Перейдите в `https://ваш-домен/admin/orders`
2. Вкладка **Заказы песен** — просмотр всех заказов из каталога (статус: queued → playing → played)
3. Вкладка **Кастомные заказы** — управление заказами на создание песен:
   - `paid` → `in_production` → `review` → `approved` → `aired`
   - Можно оставить заметку и прикрепить готовую песню

### Добавление песен в каталог

Через админку (`/admin/upload`):
1. Перетащите MP3-файлы или нажмите для выбора
2. Укажите название, исполнителя, жанр, цену заказа
3. Песня появится в каталоге — пользователи смогут её заказывать

---

## 4. Логотип и название радиостанции

### Изменение названия

Название «RadioWave» находится в нескольких местах. Нужно изменить все:

#### 1. Навигация (шапка сайта)

Файл: `frontend/src/components/Navbar.jsx`

Найдите строку:
```jsx
<span className="text-lg font-bold text-white">RadioWave</span>
```
Замените `RadioWave` на ваше название.

#### 2. Заголовок вкладки браузера

Файл: `frontend/src/app/layout.js`

Найдите:
```jsx
<title>RadioWave — Интернет-радио</title>
```
Замените на ваше название.

#### 3. Icecast метаданные

Файл: `streaming/icecast.xml`

Найдите:
```xml
<stream-name>RadioWave</stream-name>
```
Замените на ваше название.

#### 4. Liquidsoap настройки

Файл: `streaming/radio.liq`

Найдите:
```
name="RadioWave",
```
Замените на ваше название.

### Добавление логотипа

#### Шаг 1: Загрузите файл логотипа

Положите файл логотипа (PNG или SVG, рекомендуется 200x200 px) в папку:
```
frontend/public/images/logo.png
```

#### Шаг 2: Замените иконку в навигации

Файл: `frontend/src/components/Navbar.jsx`

Замените блок с иконкой:
```jsx
<div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center">
  <HiMusicNote className="text-white text-sm" />
</div>
```

На:
```jsx
<img src="/images/logo.png" alt="Логотип" className="w-8 h-8 rounded-full object-cover" />
```

#### Шаг 3: Добавьте favicon

Замените файл `frontend/public/favicon.ico` на ваш favicon.

### После изменений

Перестройте и перезапустите контейнеры:
```bash
cd /путь/к/internet-radio
docker compose build frontend icecast
docker compose up -d
```

---

## 5. Полезные команды

### Управление Docker

```bash
# Статус всех контейнеров
docker compose ps

# Перезапуск всего
docker compose restart

# Перезапуск отдельного сервиса
docker compose restart icecast
docker compose restart backend
docker compose restart frontend

# Логи сервиса (следить в реальном времени)
docker compose logs -f backend
docker compose logs -f icecast

# Пересборка после изменения кода
docker compose build frontend
docker compose up -d frontend
```

### Управление базой данных

```bash
# Подключение к PostgreSQL
docker exec -it radio_postgres psql -U radio_user -d radio

# Посмотреть пользователей
SELECT id, username, email, role, balance FROM users;

# Сделать пользователя админом
UPDATE users SET role = 'admin' WHERE username = 'имя_пользователя';

# Начислить баланс
UPDATE users SET balance = balance + 1000 WHERE username = 'имя_пользователя';
```

### Управление потоком

```bash
# Проверить работает ли поток
curl -I http://localhost:8000/stream

# Подключиться к Liquidsoap через telnet
docker exec -it radio_icecast bash -c "echo 'help' | nc localhost 1234"

# Пропустить текущий трек
docker exec -it radio_icecast bash -c "echo 'main.skip' | nc localhost 1234"

# Посмотреть очередь
docker exec -it radio_icecast bash -c "echo 'request_queue.queue' | nc localhost 1234"
```

### Добавление музыки через командную строку

```bash
# Скопировать файлы в контейнер
docker cp /home/user/music/. radio_icecast:/music/

# Или напрямую в Docker volume
sudo cp *.mp3 /var/lib/docker/volumes/internet-radio_music_data/_data/

# Перезапустить Liquidsoap чтобы обновить плейлист
docker compose restart icecast
```
