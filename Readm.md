# docker-influxdb-speedtest
> Runs speedtest-net and fast.com speed test and pushs it into a influxdb, every 30mmin

## Usage

```
docker run --restart=Never -d \
-e INFLUXDB_HOST=localhost \
-e INFLUXDB_DB=speedtests \
-e INFLUXDB_TAGS=foo,bar \
steffenmllr/docker-influxdb-speedtest
```
