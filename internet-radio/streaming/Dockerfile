FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    icecast2 \
    liquidsoap \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy config files
COPY icecast.xml /etc/icecast2/icecast.xml
COPY radio.liq /etc/liquidsoap/radio.liq

# Create directories
RUN mkdir -p /music /jingles /var/log/icecast \
    && chown -R icecast2:icecast /var/log/icecast \
    && chmod 755 /etc/liquidsoap/radio.liq

# Create startup script
RUN echo '#!/bin/bash\n\
echo "Starting Icecast2..."\n\
icecast2 -b -c /etc/icecast2/icecast.xml\n\
sleep 2\n\
echo "Starting Liquidsoap..."\n\
liquidsoap /etc/liquidsoap/radio.liq\n\
' > /start.sh && chmod +x /start.sh

EXPOSE 8000 8001 1234

CMD ["/start.sh"]
