FROM debian:buster-slim as stage0

COPY deliverymetrics /usr/bin

ENTRYPOINT ["deliverymetrics"]
