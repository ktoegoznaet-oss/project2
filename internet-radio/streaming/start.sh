#!/bin/bash
set -e

echo "=== RadioWave Streaming Server ==="

# Check for music files
MUSIC_COUNT=$(find /music -type f \( -name '*.mp3' -o -name '*.ogg' -o -name '*.wav' -o -name '*.flac' \) 2>/dev/null | wc -l)
echo "Found $MUSIC_COUNT music files in /music"

if [ "$MUSIC_COUNT" -eq 0 ]; then
    echo "WARNING: No music files found in /music!"
    echo "Generating placeholder audio tracks so the radio can start..."

    # Generate several short ambient tracks with different tones
    # so the radio has something to play 24/7 until real music is added
    ffmpeg -f lavfi -i "sine=frequency=440:duration=30" -af "volume=0.1" \
        -metadata title="Waiting for Music" -metadata artist="RadioWave System" \
        -q:a 5 /music/placeholder_01_waiting.mp3 2>/dev/null || true

    ffmpeg -f lavfi -i "sine=frequency=523:duration=30" -af "volume=0.08" \
        -metadata title="Station Standby" -metadata artist="RadioWave System" \
        -q:a 5 /music/placeholder_02_standby.mp3 2>/dev/null || true

    ffmpeg -f lavfi -i "anullsrc=r=44100:cl=stereo" -t 60 \
        -metadata title="Silent Interlude" -metadata artist="RadioWave System" \
        -q:a 9 /music/placeholder_03_silence.mp3 2>/dev/null || true

    MUSIC_COUNT=$(find /music -type f -name '*.mp3' 2>/dev/null | wc -l)
    echo "Created $MUSIC_COUNT placeholder tracks"
    echo "NOTE: Upload real music via Admin Panel or copy MP3 files to /music volume"
fi

echo "Starting Icecast2..."
icecast2 -b -c /etc/icecast2/icecast.xml
sleep 3

echo "Verifying Icecast is running..."
for i in 1 2 3; do
    if nc -z localhost 8000 2>/dev/null; then
        echo "Icecast is running on port 8000"
        break
    fi
    echo "Waiting for Icecast (attempt $i/3)..."
    sleep 2
done

if ! nc -z localhost 8000 2>/dev/null; then
    echo "ERROR: Icecast failed to start. Checking logs..."
    cat /var/log/icecast/error.log 2>/dev/null || echo "No error log found"
    echo "Trying one more time..."
    icecast2 -b -c /etc/icecast2/icecast.xml
    sleep 3
fi

echo "Starting Liquidsoap..."
exec liquidsoap /etc/liquidsoap/radio.liq
