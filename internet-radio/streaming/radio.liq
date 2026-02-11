#!/usr/bin/liquidsoap

# =============================================
# RadioWave — Liquidsoap Script
# =============================================

settings.server.telnet.set(true)
settings.server.telnet.port.set(1234)
settings.server.telnet.bind_addr.set("0.0.0.0")

# =============================================
# Music Sources
# =============================================

# Main rotation — all music files
music = playlist(
  mode="randomize",
  reload=3600,
  reload_mode="rounds",
  "/music"
)

# Fallback — silence if no music
silence = blank(id="silence")

# =============================================
# Request Queues
# =============================================

# Priority queue (for premium/VIP users)
priority_queue = request.queue(id="priority_queue")

# Regular request queue (for song orders)
request_queue = request.queue(id="request_queue")

# Jingle queue (for DJ bot announcements)
jingle_queue = request.queue(id="jingle_queue")

# =============================================
# Jingle Insertion Logic
# =============================================

# Counter for jingle insertion every 3 songs
song_count = ref(0)

def on_track_change(m) =
  song_count := !song_count + 1

  # Notify backend about track change
  title = m["title"]
  artist = m["artist"]
  filename = m["filename"]

  ignore(
    thread.run(
      fun() -> begin
        ignore(
          process.run(
            "curl -s -X POST http://backend:3000/api/stream/now-playing " ^
            "-H 'Content-Type: application/json' " ^
            "-d '{\"title\": \"#{title}\", \"artist\": \"#{artist}\", \"file_path\": \"#{filename}\"}'"
          )
        )
      end
    )
  )
end

# =============================================
# Build the Main Stream
# =============================================

# Priority: jingle → priority_queue → request_queue → music rotation → silence
main = fallback(
  id="main",
  track_sensitive=true,
  [
    jingle_queue,
    priority_queue,
    request_queue,
    music,
    silence
  ]
)

# Apply on_track callback
main = on_track(on_track_change, main)

# =============================================
# Audio Processing
# =============================================

# Normalize volume
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
  main
)
