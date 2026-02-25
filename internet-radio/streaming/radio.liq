#!/usr/bin/liquidsoap

# =============================================
# RadioWave — Liquidsoap Script
# Compatible with Liquidsoap 2.4.0 (Ubuntu 26.04)
# =============================================

# Telnet server for remote control
settings.server.telnet.set(true)
settings.server.telnet.port.set(1234)
settings.server.telnet.bind_addr.set("0.0.0.0")

# Logging
settings.log.file.path.set("/var/log/liquidsoap/radio.log")
settings.log.level.set(3)

# =============================================
# Настройки (редактируйте этот раздел)
# =============================================

# Cooldown: одна и та же песня не будет играть повторно в течение N секунд.
# 7200 = 2 часа, 3600 = 1 час, 0 = без ограничений
cooldown = 7200.0

# Трек-заглушка, когда все песни на cooldown.
# Укажите путь к файлу или оставьте "" для тишины.
# Пример: default_track = "/music/default.mp3"
default_track = ""

# =============================================
# Cooldown-трекер (список недавно сыгранных)
# =============================================

recently_played = ref([])

def rp_cleanup() =
  cutoff = time() - cooldown
  recently_played.set(list.filter(
    fun(item) -> snd(item) > cutoff,
    recently_played()
  ))
end

def rp_mark(file) =
  rp_cleanup()
  recently_played.set(list.append([(file, time())], recently_played()))
end

def rp_was_played(file) =
  rp_cleanup()
  list.exists(fun(item) -> fst(item) == file, recently_played())
end

# check_next для playlist: пропускает треки, сыгранные недавно
def can_play(req) =
  not(rp_was_played(request.uri(req)))
end

# =============================================
# Music Sources
# =============================================

# Основная ротация с cooldown-фильтром
music = playlist(
  mode="randomize",
  reload=3600,
  reload_mode="rounds",
  check_next=can_play,
  "/music"
)

# Fallback когда все треки на cooldown
music_safe = if default_track != "" then
  fallback(
    synchronous=false,
    [music, single(id="default_track", default_track), blank(id="cooldown_silence")]
  )
else
  fallback(synchronous=false, [music, blank(id="cooldown_silence")])
end

# =============================================
# Request Queues
# =============================================

# Приоритетная очередь (premium/VIP)
priority_queue = request.queue(id="priority_queue")

# Обычная очередь заказов
request_queue = request.queue(id="request_queue")

# Очередь джинглов (DJ-бот)
jingle_queue = request.queue(id="jingle_queue")

# =============================================
# Build the Main Stream
# =============================================

# Приоритет: jingle → priority_queue → request_queue → music
# synchronous=false обязателен в Liquidsoap 2.4.0
main = fallback(
  id="main",
  track_sensitive=true,
  synchronous=false,
  [
    jingle_queue,
    priority_queue,
    request_queue,
    music_safe
  ]
)

# =============================================
# Track Change Notification + Cooldown update
# =============================================

main.on_track(synchronous=false, fun(m) -> begin
  title = m["title"]
  artist = m["artist"]
  filename = m["filename"]

  # Отмечаем трек как недавно сыгранный
  if filename != "" then
    rp_mark(filename)
  end

  ignore(
    process.run(
      "curl -s -X POST http://backend:3000/api/stream/now-playing " ^
      "-H 'Content-Type: application/json' " ^
      "-d '{\"title\": \"#{title}\", \"artist\": \"#{artist}\", \"file_path\": \"#{filename}\"}'"
    )
  )
end)

# =============================================
# Audio Processing
# =============================================

main = normalize(main)

# =============================================
# Output to Icecast
# =============================================

output.icecast(
  %mp3(bitrate=192, samplerate=44100, stereo=true),
  host="localhost",
  port=8000,
  password="source_hackme",
  mount="/stream",
  name="RadioWave",
  description="Internet Radio with Song Ordering",
  genre="Various",
  url="http://localhost",
  public=true,
  fallible=true,
  main
)
