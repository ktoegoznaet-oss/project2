-- ========================================
-- Internet Radio — Full Database Schema
-- ========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================
-- USERS
-- =====================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    balance DECIMAL(12, 2) DEFAULT 0.00,
    subscription_type VARCHAR(20) DEFAULT NULL CHECK (subscription_type IN (NULL, 'basic', 'premium', 'vip')),
    subscription_expires TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    free_orders_remaining INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- =====================
-- SONGS
-- =====================
CREATE TABLE songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    genre VARCHAR(100) DEFAULT 'other',
    duration INT DEFAULT 0,
    file_path VARCHAR(500) NOT NULL,
    file_hash VARCHAR(64),
    cover_url VARCHAR(500) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_custom BOOLEAN DEFAULT FALSE,
    order_price DECIMAL(10, 2) DEFAULT 100.00,
    play_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_songs_genre ON songs(genre);
CREATE INDEX idx_songs_artist ON songs(artist);
CREATE INDEX idx_songs_active ON songs(is_active);
CREATE INDEX idx_songs_play_count ON songs(play_count DESC);

-- =====================
-- SONG ORDERS
-- =====================
CREATE TABLE song_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    message TEXT DEFAULT '',
    price_paid DECIMAL(10, 2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'queued', 'playing', 'played', 'cancelled')),
    priority INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE INDEX idx_song_orders_user ON song_orders(user_id);
CREATE INDEX idx_song_orders_status ON song_orders(status);
CREATE INDEX idx_song_orders_created ON song_orders(created_at DESC);

-- =====================
-- CUSTOM SONG ORDERS
-- =====================
CREATE TABLE custom_song_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lyrics TEXT NOT NULL,
    style_description TEXT DEFAULT '',
    reference_song_id UUID DEFAULT NULL REFERENCES songs(id) ON DELETE SET NULL,
    price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'paid', 'in_production', 'review', 'approved', 'aired', 'cancelled')),
    result_song_id UUID DEFAULT NULL REFERENCES songs(id) ON DELETE SET NULL,
    air_count INT DEFAULT 1,
    aired_count INT DEFAULT 0,
    admin_notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE INDEX idx_custom_orders_user ON custom_song_orders(user_id);
CREATE INDEX idx_custom_orders_status ON custom_song_orders(status);

-- =====================
-- SUBSCRIPTIONS (plans)
-- =====================
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(20) UNIQUE NOT NULL,
    price_monthly DECIMAL(10, 2) NOT NULL,
    price_yearly DECIMAL(10, 2) NOT NULL,
    features JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default subscription plans
INSERT INTO subscriptions (name, slug, price_monthly, price_yearly, features) VALUES
(
    'Basic',
    'basic',
    199.00,
    1990.00,
    '{
        "discount_percent": 10,
        "free_orders_monthly": 2,
        "priority_queue": false,
        "no_ads": false,
        "custom_song_discount": 0,
        "description": "Скидка 10% на заказы, 2 бесплатных заказа в месяц"
    }'::jsonb
),
(
    'Premium',
    'premium',
    499.00,
    4990.00,
    '{
        "discount_percent": 25,
        "free_orders_monthly": 10,
        "priority_queue": true,
        "no_ads": true,
        "custom_song_discount": 15,
        "description": "Без рекламы, приоритетная очередь, скидка 25%, 10 бесплатных заказов, скидка 15% на кастомные песни"
    }'::jsonb
),
(
    'VIP',
    'vip',
    999.00,
    9990.00,
    '{
        "discount_percent": 40,
        "free_orders_monthly": 30,
        "priority_queue": true,
        "no_ads": true,
        "custom_song_discount": 30,
        "description": "Всё из Premium + скидка 40%, 30 бесплатных заказов, скидка 30% на кастомные песни"
    }'::jsonb
);

-- =====================
-- PAYMENTS
-- =====================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    payment_type VARCHAR(30) NOT NULL CHECK (payment_type IN ('balance_topup', 'song_order', 'custom_song', 'subscription')),
    payment_method VARCHAR(30) DEFAULT 'yookassa',
    external_id VARCHAR(255) DEFAULT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'waiting_for_capture', 'succeeded', 'cancelled', 'refunded')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_external ON payments(external_id);
CREATE INDEX idx_payments_status ON payments(status);

-- =====================
-- LISTENING STATS
-- =====================
CREATE TABLE listening_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
    song_id UUID DEFAULT NULL REFERENCES songs(id) ON DELETE SET NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_listened INT DEFAULT 0,
    ip_address INET DEFAULT NULL,
    user_agent TEXT DEFAULT ''
);

CREATE INDEX idx_listening_stats_song ON listening_stats(song_id);
CREATE INDEX idx_listening_stats_started ON listening_stats(started_at);
CREATE INDEX idx_listening_stats_user ON listening_stats(user_id);

-- =====================
-- CHAT MESSAGES
-- =====================
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_bot BOOLEAN DEFAULT FALSE,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'dj', 'order')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_created ON chat_messages(created_at DESC);

-- =====================
-- SCHEDULE
-- =====================
CREATE TABLE schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    hour_start INT NOT NULL CHECK (hour_start BETWEEN 0 AND 23),
    hour_end INT NOT NULL CHECK (hour_end BETWEEN 0 AND 23),
    genre VARCHAR(100) DEFAULT 'mixed',
    mood VARCHAR(100) DEFAULT 'neutral',
    description TEXT DEFAULT ''
);

CREATE INDEX idx_schedule_day ON schedule(day_of_week, hour_start);

-- Default schedule
INSERT INTO schedule (day_of_week, hour_start, hour_end, genre, mood, description) VALUES
(0, 8, 12, 'pop', 'cheerful', 'Утреннее шоу — поп и позитив'),
(0, 12, 18, 'mixed', 'neutral', 'Дневной эфир — все жанры'),
(0, 18, 23, 'rock', 'energetic', 'Вечерний рок-марафон'),
(1, 8, 12, 'pop', 'cheerful', 'Утреннее шоу'),
(1, 12, 18, 'electronic', 'chill', 'Электронный полдень'),
(1, 18, 23, 'hip-hop', 'energetic', 'Вечерний хип-хоп'),
(2, 8, 12, 'pop', 'cheerful', 'Утреннее шоу'),
(2, 12, 18, 'indie', 'neutral', 'Инди-дневник'),
(2, 18, 23, 'rock', 'energetic', 'Рок-вечер'),
(3, 8, 12, 'pop', 'cheerful', 'Утреннее шоу'),
(3, 12, 18, 'jazz', 'chill', 'Джазовый полдень'),
(3, 18, 23, 'electronic', 'energetic', 'Электронный вечер'),
(4, 8, 12, 'pop', 'cheerful', 'Утреннее шоу'),
(4, 12, 18, 'mixed', 'neutral', 'Дневной микс'),
(4, 18, 23, 'rock', 'energetic', 'Пятничный рок'),
(5, 10, 18, 'mixed', 'cheerful', 'Субботний микс'),
(5, 18, 23, 'electronic', 'energetic', 'Субботняя вечеринка'),
(6, 10, 18, 'chill', 'chill', 'Воскресный чилл'),
(6, 18, 22, 'pop', 'neutral', 'Вечерний поп');
