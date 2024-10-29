const zmq = require("zeromq");
const fs = require("fs");
const protobuf = require("protobufjs");
const { scheduleLoopTask, sleep } = require("./utils/run.js");
const { log } = require("./utils/log.js");
const TgService = require("./services/tg.js");
const { hasUncaughtExceptionCaptureCallback } = require("process");
const ipc = "tcp://172.31.16.149:55551";

const pbRoot = protobuf.loadSync("./proto/syncorder.proto");
const root = pbRoot.lookupType("SyncOrder");
const reconnectInterval = 2000; // 初始重连间隔，单位毫秒
let reconnectAttempts = 0; // 重连尝试次数
let lastPingTime = Date.now();
const subscribeMsg = async () => {
    try {
        const subscriber = new zmq.Subscriber();
        subscriber.connect(ipc);
        subscriber.subscribe("");

        for await (const [topic, msg] of subscriber) {
            messageHandler(topic);
        }
    } catch (error) {
        console.error("Connection error:", error.message, error.stack);
        reconnect();
    }
};

function reconnect() {
    reconnectAttempts++;
    const delay = reconnectInterval * reconnectAttempts; // 递增重连间隔
    console.log(`Reconnecting in ${delay / 1000} seconds...`);

    setTimeout(subscribeMsg, delay);
}

const messageHandler = (pbMsg) => {
    const message = root.decode(pbMsg);
    lastPingTime = Date.now();
    log(message.instID, message.price, message.clientOrderID);
};

const main = async () => {
    await subscribeMsg();
};
main();

// 当程序终止时关闭 ZMQ 套接字
process.on("SIGINT", () => {
    //fileStream.end();
    process.exit(0);
});
