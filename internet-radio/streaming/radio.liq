#!/usr/bin/liquidsoap

# =============================================
# RadioWave — Liquidsoap Script
# Compatible with Liquidsoap 2.x (Ubuntu 26.04)
# =============================================

# Telnet server for remote control
settings.server.telnet.set(true)
settings.server.telnet.port.set(1234)
settings.server.telnet.bind_addr.set("0.0.0.0")

# Logging
settings.log.file.path.set("/var/log/liquidsoap/radio.log")
settings.log.level.set(3)

# =============================================
# Music Sources
# =============================================

# Main rotation — all music files from /music directory
music = playlist(mode="randomize", reload=3600, reload_mode="rounds", "/music")

# Safety fallback — silence if nothing plays
safety = blank(id="silence")

# Make music safe (won't crash if /music is empty)
music = mksafe(music)

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
# Track Change Callback
# =============================================

def on_track_change(m)
  title = m["title"]
  artist = m["artist"]
  filename = m["filename"]

  # Notify backend about track change
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

# Priority: jingle → priority_queue → request_queue → music rotation
main = fallback(
  id="main",
  track_sensitive=true,
  [
    jingle_queue,
    priority_queue,
    request_queue,
    music,
    safety
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
  fallible=true,
  main
)
