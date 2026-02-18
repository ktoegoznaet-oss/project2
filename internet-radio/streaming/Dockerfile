FROM ubuntu:26.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    icecast2 \
    liquidsoap \
    netcat-openbsd \
    curl \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Ensure icecast2 user/group exist (needed for <changeowner>)
RUN (id -u icecast2 >/dev/null 2>&1 || useradd -r -s /bin/false icecast2) \
    && (getent group icecast >/dev/null 2>&1 || groupadd icecast) \
    && usermod -aG icecast icecast2 2>/dev/null || true

# Copy config files
COPY icecast.xml /etc/icecast2/icecast.xml
COPY radio.liq /etc/liquidsoap/radio.liq

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Create mime.types for icecast (the package may not exist on Ubuntu 26.04)
RUN mkdir -p /usr/share/icecast2 && printf '%s\n' \
    "audio/mpeg mp3" \
    "audio/ogg ogg oga" \
    "audio/wav wav" \
    "audio/flac flac" \
    "audio/aac aac" \
    "audio/mp4 m4a" \
    "application/ogg ogg" \
    "application/xspf+xml xspf" \
    "video/mp2t ts" \
    "application/vnd.apple.mpegurl m3u8" \
    "text/html html htm" \
    "text/css css" \
    "text/xml xml xsl" \
    "application/javascript js" \
    "application/json json" \
    "image/png png" \
    "image/jpeg jpg jpeg" \
    "image/gif gif" \
    "image/svg+xml svg" \
    > /usr/share/icecast2/mime.types

# Create directories and fix permissions
RUN mkdir -p /music /jingles /var/log/icecast /var/log/liquidsoap \
    && chown -R icecast2:icecast /var/log/icecast 2>/dev/null || true \
    && chown -R icecast2:icecast /usr/share/icecast2 2>/dev/null || true \
    && chmod 755 /etc/liquidsoap/radio.liq

EXPOSE 8000 8001 1234

CMD ["/start.sh"]
