FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    icecast2 \
    liquidsoap \
    liquidsoap-plugin-icecast \
    liquidsoap-plugin-mad \
    liquidsoap-plugin-vorbis \
    liquidsoap-plugin-lame \
    netcat-openbsd \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy config files
COPY icecast.xml /etc/icecast2/icecast.xml
COPY radio.liq /etc/liquidsoap/radio.liq

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Create directories
RUN mkdir -p /music /jingles /var/log/icecast /var/log/liquidsoap \
    && chown -R icecast2:icecast /var/log/icecast \
    && chmod 755 /etc/liquidsoap/radio.liq

EXPOSE 8000 8001 1234

CMD ["/start.sh"]
