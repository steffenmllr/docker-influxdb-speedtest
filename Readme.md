# docker-influxdb-speedtest
> Runs speedtest-net and fast.com speed test and pushs it into a influxdb, every 30mmin

## Automated Build

[![steffenmllr/docker-influxdb-speedtest](http://dockeri.co/image/steffenmllr/docker-influxdb-speedtest)](https://registry.hub.docker.com/u/steffenmllr/docker-influxdb-speedtest/)


## Usage

```
docker run --restart=always -d \
-e INFLUXDB_HOST=localhost \
-e INFLUXDB_DB=speedtests \
steffenmllr/docker-influxdb-speedtest
```
