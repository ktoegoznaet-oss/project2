#!/bin/bash
set -e

echo "=== RadioWave Streaming Server ==="

# Check for music files
MUSIC_COUNT=$(find /music -type f \( -name '*.mp3' -o -name '*.ogg' -o -name '*.wav' -o -name '*.flac' \) 2>/dev/null | wc -l)
echo "Found $MUSIC_COUNT music files in /music"

if [ "$MUSIC_COUNT" -eq 0 ]; then
    echo "WARNING: No music files found in /music!"
    echo "Creating a silent placeholder so Liquidsoap can start..."
    # Generate 10 seconds of silence as a placeholder MP3
    # This lets Liquidsoap start; real music should be added later
    if command -v ffmpeg &> /dev/null; then
        ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 10 -q:a 9 /music/silence_placeholder.mp3 2>/dev/null || true
    fi
fi

echo "Starting Icecast2..."
icecast2 -b -c /etc/icecast2/icecast.xml
sleep 3

echo "Verifying Icecast is running..."
if nc -z localhost 8000 2>/dev/null; then
    echo "Icecast is running on port 8000"
else
    echo "WARNING: Icecast may not have started correctly"
    echo "Trying to start again..."
    icecast2 -b -c /etc/icecast2/icecast.xml
    sleep 2
fi

echo "Starting Liquidsoap..."
exec liquidsoap /etc/liquidsoap/radio.liq
