const zmq = require("zeromq");
const fs = require("fs");
const protobuf = require("protobufjs");
const { scheduleLoopTask, sleep } = require("./utils/run");
const { log } = require("./utils/log");
const TgService = require("./services/tg.js");
const tgBot = new TgService();
let lastAlertTime = 0;
const alertCooldown = 5 * 60 * 1000; // 5 minutes in milliseconds

const maxNotUpdateTime = 10000; // 10s
const maxP99DelayTime = 50; // 35
const ipcMap = {
    btcEthFuturesIPC: "tcp://127.0.0.1:21001",
    altcoinFuturesIPC: "tcp://127.0.0.1:21002",
    btcEthSpotIPC: "tcp://127.0.0.1:20001",
    altcoinSpotIPC: "tcp://127.0.0.1:21002",
};
const pbRoot = protobuf.loadSync("./proto/newticker.proto");
const tickerInfo = pbRoot.lookupType("TickerInfo");

let subscribeArr = [];
let lastUpdateTime = {};
let delayData = {}; // 存储每个通道的延迟数据
// const filePath = "/data/delay.csv";
// const fileStream = fs.createWriteStream(filePath, { flags: "a" });

const sendAlert = (msg) => {
    const currentTime = Date.now();

    if (currentTime - lastAlertTime >= alertCooldown) {
        tgBot.sendMsg(msg);
        lastAlertTime = Date.now();
    }
};

const init = () => {
    for (let key of Object.keys(ipcMap)) {
        lastUpdateTime[key] = Date.now();
        delayData[key] = [];
    }
};
const subscribeMsg = async (key) => {
    const ipc = ipcMap[key];

    const subscriber = new zmq.Subscriber();
    subscriber.connect(ipc);
    subscriber.subscribe("");
    subscribeArr.push(subscriber);

    for await (const [topic, msg] of subscriber) {
        messageHandler(key, topic);
    }
};

const messageHandler = (key, pbMsg) => {
    const message = tickerInfo.decode(pbMsg);
    const currentTimestamp = Date.now();
    lastUpdateTime[key] = currentTimestamp;

    const delayMs = currentTimestamp - message.eventTs.toNumber();
    // if (["btcSpotIPC", "btcFuturesIPC"].includes(key)) {
    //     const currentDate = new Date();
    //     const formattedDate = currentDate
    //         .toISOString()
    //         .slice(0, 19)
    //         .replace("T", " ");

    //     if (key == "btcSpotIPC") {
    //         key = "BTCSPOT";
    //     } else {
    //         key = "BTCPERP";
    //     }
    //     const row = `${formattedDate},${key},${delayMs}`;

    //     fileStream.write(row + "\n");
    // }

    delayData[key].push({ delayMs, timestamp: currentTimestamp });

    const oneMinuteAgo = currentTimestamp - 60000;
    delayData[key] = delayData[key].filter(
        (item) => item.timestamp >= oneMinuteAgo
    );
};

const checkTimeouts = () => {
    scheduleLoopTask(async () => {
        try {
            let msg = "";
            for (let key of Object.keys(lastUpdateTime)) {
                const now = Date.now();
                if (now - lastUpdateTime[key] > maxNotUpdateTime) {
                    msg += `No message received for ${key} for ${
                        (now - lastUpdateTime[key]) / 1000
                    }s\n`;
                }
            }
            if (msg != "") {
                log(msg);
                sendAlert(msg);
            }
        } catch (e) {
            console.error(e);
        }
        await sleep(10 * 1000);
    });
};

const calculateP99Delay = () => {
    scheduleLoopTask(async () => {
        try {
            for (let key of Object.keys(delayData)) {
                const delayArray = delayData[key].map((item) => item.delayMs);
                if (delayArray.length > 0) {
                    delayArray.sort((a, b) => a - b);
                    const p99Index = Math.floor(delayArray.length * 0.99);
                    const p99Delay = delayArray[p99Index];
                    if (p99Delay > maxP99DelayTime) {
                        log(
                            `P99 delay for ${key} exceeds ${maxP99DelayTime}ms: ${p99Delay}ms`
                        );
                    } else {
                        log(`P99 delay is OK`);
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
        await sleep(60 * 1000);
    });
};

const main = async () => {
    init();
    for (let key of Object.keys(ipcMap)) {
        subscribeMsg(key);
    }

    // 每 1 秒检查一次超时和延迟
    checkTimeouts(); // 每10s计算一次延时
    calculateP99Delay(); // 每分钟计算一次 P99 延迟
};
main();

// 当程序终止时关闭 ZMQ 套接字
process.on("SIGINT", () => {
    for (let sub of subscribeArr) {
        sub.close();
    }
    //fileStream.end();
    process.exit(0);
});
