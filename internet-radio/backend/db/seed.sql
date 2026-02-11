-- ========================================
-- Seed Data — Test Users, Songs, Orders
-- ========================================

-- Admin user (password: admin123)
INSERT INTO users (username, email, password_hash, role, balance) VALUES
('admin', 'admin@radio.local', '$2a$12$LJ3m4ys3OzfNSGONIWx0/.xyEhFGA/vHWMoGDBuXj0KJVrFMbxVYK', 'admin', 10000.00);

-- Test users (password: test123)
INSERT INTO users (username, email, password_hash, role, balance, subscription_type, subscription_expires, free_orders_remaining) VALUES
('dj_lover', 'dj@test.com', '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 500.00, 'premium', NOW() + INTERVAL '30 days', 8),
('music_fan', 'fan@test.com', '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 200.00, 'basic', NOW() + INTERVAL '15 days', 1),
('rocker', 'rock@test.com', '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 1500.00, 'vip', NOW() + INTERVAL '60 days', 25);

-- Test songs
INSERT INTO songs (title, artist, genre, duration, file_path, order_price, play_count) VALUES
('Солнечный день', 'Радио Бэнд', 'pop', 210, '/music/sunny_day.mp3', 100.00, 150),
('Ночной город', 'Электро Волна', 'electronic', 245, '/music/night_city.mp3', 100.00, 98),
('Рок-н-ролл жив', 'Гитарный Гром', 'rock', 195, '/music/rock_lives.mp3', 150.00, 220),
('Джазовый вечер', 'Smooth Quartet', 'jazz', 320, '/music/jazz_evening.mp3', 120.00, 65),
('Танцуй со мной', 'DJ Pulse', 'electronic', 198, '/music/dance_with_me.mp3', 100.00, 310),
('Дорога домой', 'Акустик Соул', 'indie', 275, '/music/road_home.mp3', 100.00, 87),
('Летний бриз', 'Тропик Бит', 'pop', 225, '/music/summer_breeze.mp3', 100.00, 175),
('Битва титанов', 'Metal Core', 'rock', 260, '/music/titan_battle.mp3', 200.00, 145),
('Мечтатель', 'Dream Synth', 'electronic', 310, '/music/dreamer.mp3', 100.00, 56),
('Старый блюз', 'Blues Brothers RU', 'blues', 290, '/music/old_blues.mp3', 120.00, 42),
('Хип-хоп волна', 'MC Flow', 'hip-hop', 205, '/music/hiphop_wave.mp3', 100.00, 188),
('Утренний кофе', 'Chill Vibes', 'chill', 240, '/music/morning_coffee.mp3', 80.00, 95),
('Гроза', 'Thunder Rock', 'rock', 185, '/music/thunderstorm.mp3', 150.00, 133),
('Космос', 'Space Ambient', 'ambient', 360, '/music/cosmos.mp3', 100.00, 28),
('Праздник каждый день', 'Party People', 'pop', 200, '/music/party_everyday.mp3', 100.00, 267);

-- Test song orders
INSERT INTO song_orders (user_id, song_id, message, price_paid, status, created_at, played_at)
SELECT
    u.id,
    s.id,
    'Привет всем слушателям! Отличная песня!',
    s.order_price,
    'played',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1 hour'
FROM users u, songs s
WHERE u.username = 'dj_lover' AND s.title = 'Танцуй со мной';

INSERT INTO song_orders (user_id, song_id, message, price_paid, status, created_at)
SELECT
    u.id,
    s.id,
    'Для моей любимой!',
    s.order_price,
    'queued',
    NOW() - INTERVAL '30 minutes'
FROM users u, songs s
WHERE u.username = 'music_fan' AND s.title = 'Летний бриз';

-- Test chat messages
INSERT INTO chat_messages (user_id, message, is_bot, message_type) VALUES
((SELECT id FROM users WHERE username = 'admin'), 'Добро пожаловать на наше радио!', TRUE, 'system'),
((SELECT id FROM users WHERE username = 'dj_lover'), 'Привет всем! Классная музыка сегодня!', FALSE, 'text'),
((SELECT id FROM users WHERE username = 'music_fan'), 'Можно заказать что-нибудь из попсы?', FALSE, 'text'),
(NULL, 'DJ Bot: Следующая песня по заказу слушателя dj_lover — "Танцуй со мной"!', TRUE, 'dj');

-- Test listening stats
INSERT INTO listening_stats (user_id, song_id, started_at, duration_listened, ip_address)
SELECT u.id, s.id, NOW() - (random() * INTERVAL '48 hours'), (random() * s.duration)::int, '192.168.1.1'::inet
FROM users u
CROSS JOIN songs s
WHERE u.username = 'dj_lover'
LIMIT 20;

INSERT INTO listening_stats (user_id, song_id, started_at, duration_listened, ip_address)
SELECT u.id, s.id, NOW() - (random() * INTERVAL '48 hours'), (random() * s.duration)::int, '192.168.1.2'::inet
FROM users u
CROSS JOIN songs s
WHERE u.username = 'music_fan'
LIMIT 15;
