FROM ubuntu:26.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    icecast2 \
    liquidsoap \
    netcat-openbsd \
    curl \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy config files
COPY icecast.xml /etc/icecast2/icecast.xml
COPY radio.liq /etc/liquidsoap/radio.liq

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Create directories and fix permissions
RUN mkdir -p /music /jingles /var/log/icecast /var/log/liquidsoap \
    && (chown -R icecast2:icecast /var/log/icecast 2>/dev/null || chown -R nobody:nogroup /var/log/icecast) \
    && chmod 755 /etc/liquidsoap/radio.liq

EXPOSE 8000 8001 1234

CMD ["/start.sh"]
