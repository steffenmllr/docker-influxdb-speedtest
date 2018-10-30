const speedTest = require('speedtest-net');
const puppeteer = require('puppeteer');
const Influx = require('influx');
const cron = require('node-cron');

const evaluateFast = async (page, cb, prev, hasUpload = false) => {
    try {
        const result = await page.evaluate(() => {
            const $ = document.querySelector.bind(document);
            return {
                download: Number($('#speed-value').textContent),
                downloadUnit: $('#speed-units').textContent.trim(),

                latency: Number($('#latency-value').textContent),

                upload: Number($('#upload-value').textContent),
                uploadUnit: $('#upload-units').textContent.trim(),

                isDone: Boolean($('#speed-progress-indicator.succeeded'))
            };
        });
        if (result.isDone && !hasUpload) {
            hasUpload = true;
            result.isDone = false;
            await page.waitFor(2000);
            try {
                // This fails but works
                await page.click('#show-more-details-link');
            } catch (e) {}
        }

        if (result.isDone && hasUpload) {
            page.close();
            cb(null, result);
        } else {
            setTimeout(evaluateFast, 500, page, cb, result, hasUpload);
        }
    } catch (err) {
        cb(err);
    }
};

const getFast = async cb => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto('https://fast.com');
    evaluateFast(page, cb);
};

const getFastValues = () => {
    return new Promise((resolve, reject) => {
        getFast((err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

const getSpeedTestValues = () => {
    const test = speedTest({ maxTime: 5000 });
    return new Promise((resolve, reject) => {
        test.on('data', data => {
            resolve(data);
        });
        test.on('error', reject);
    });
};

const measurement = 'speedtest';
const messureAndWrite = async influx => {
    try {
        const stv = await getSpeedTestValues();
        const { speeds } = await getSpeedTestValues();
        console.log(
            `${new Date()} - speedtest.com - DOWN: ${speeds.download} // UP: ${speeds.upload}`
        );
        await influx.writePoints([
            {
                measurement: measurement,
                tags: { provider: 'speedtest.net' },
                fields: { upload: speeds.upload, download: speeds.download }
            }
        ]);
    } catch (err) {
        console.warn('Could not get speedtest-net', err);
    }

    try {
        const fastResult = await getFastValues();
        console.log(
            `${new Date()} - fast.com - DOWN: ${fastResult.download} ${
                fastResult.uploadUnit
            } // UP: ${fastResult.upload} ${fastResult.uploadUnit}`
        );
        await influx.writePoints([
            {
                measurement: measurement,
                tags: { provider: 'fast.com' },
                fields: { upload: fastResult.upload, download: fastResult.download }
            }
        ]);
    } catch (err) {
        console.warn('Could not get fast.com', err);
    }
};

const main = async () => {
    const influxHost = process.env['INFLUXDB_HOST'];
    const influxDB = process.env['INFLUXDB_DB'];
    const interval = process.env['INTERVAL'];

    if (!influxHost) {
        throw Error('Please set INFLUXDB_HOST');
    }

    if (!influxDB) {
        throw Error('Please set INFLUXDB_DB');
    }

    if (!interval) {
        throw Error('Please set INTERVAL as cron');
    }
    const tags = ['provider'];
    console.log(
        `Starting up with '${influxHost}', writing to '${influxDB}', using interval: '${interval}'`
    );

    const influx = new Influx.InfluxDB({
        host: influxHost,
        database: influxDB,
        schema: [
            {
                measurement,
                fields: {
                    upload: Influx.FieldType.FLOAT,
                    download: Influx.FieldType.FLOAT,
                    latency: Influx.FieldType.FLOAT
                },
                tags
            }
        ]
    });

    try {
        await influx.createDatabase(influxDB);
    } catch (err) {
        throw Error('Cloud not create database, please check credentials');
        process.exit(1);
    }

    cron.schedule(interval, () => messureAndWrite(influx));
};

main().catch(console.error)
