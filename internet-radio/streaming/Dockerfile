FROM ubuntu:26.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    icecast2 \
    liquidsoap \
    netcat-openbsd \
    curl \
    ffmpeg \
    mime-support \
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

# Create mime.types for icecast if missing
RUN if [ ! -f /usr/share/icecast2/mime.types ]; then \
      cp /etc/mime.types /usr/share/icecast2/mime.types 2>/dev/null || \
      echo "audio/mpeg mp3\naudio/ogg ogg\napplication/ogg ogg" > /usr/share/icecast2/mime.types; \
    fi

# Create directories and fix permissions
RUN mkdir -p /music /jingles /var/log/icecast /var/log/liquidsoap \
    && chown -R icecast2:icecast /var/log/icecast 2>/dev/null || true \
    && chmod 755 /etc/liquidsoap/radio.liq

EXPOSE 8000 8001 1234

CMD ["/start.sh"]
