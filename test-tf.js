const zmq = require("zeromq");
const fs = require("fs");
const protobuf = require("protobufjs");
const { scheduleLoopTask, sleep } = require("./utils/run.js");
const { log } = require("./utils/log.js");
const TgService = require("./services/tg.js");
const { hasUncaughtExceptionCaptureCallback } = require("process");

const maxNotUpdateTime = 10000; // 10s
const maxP99DelayTime = 50; // 35
const ipcMap = {
    tickerIPC: "tcp://172.31.16.161:35554",
};
const pbRoot = protobuf.loadSync("./proto/ticker.proto");
const ticker = pbRoot.lookupType("MarketData");

const subscribeArr = [];
const subscribeMsg = async () => {
    for (let key of Object.keys(ipcMap)) {
        const ipc = ipcMap[key];

        const subscriber = new zmq.Subscriber();
        subscriber.connect(ipc);
        subscriber.subscribe("");

        for await (const [topic, msg] of subscriber) {
            messageHandler(key, topic);
        }
        subscribeArr.push(subscriber);
    }
};

const messageHandler = (key, pbMsg) => {
    if (key == "tickerIPC") {
        const message = ticker.decode(pbMsg);
        console.log(
            message.instID,
            message.bestBid,
            message.bestAsk,
            message.eventTs.toNumber(),
            message.updateID.toNumber()
        );
    }
};

const main = async () => {
    await subscribeMsg();
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
