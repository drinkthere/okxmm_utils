const redis = require("redis");
const { log } = require("./utils/log.js");
const { scheduleLoopTask, sleep } = require("./utils/run.js");
const dotenv = require("dotenv");
dotenv.config();
const publisher = redis.createClient({
    url: `redis://default:${process.env.REDIS_PASS}@${process.env.REDIS_IPC}`,
});
publisher.on("error", (err) => {
    console.error("Redis error:", err);
});

const sendSignal = async (account, signal) => {
    const channel = "control_signal";
    const message = `${account}|${signal}`;

    try {
        const reply = await publisher.publish(channel, message);
        log(`Message published to ${channel}: ${message} (Replies: ${reply})`);
    } catch (e) {
        console.error("Error publishing message:", channel, message, e);
    }
};

const main = async () => {
    await publisher.connect(); // 确保连接到 Redis
    await sendSignal("zhangsan", "STOP");
    await sleep(10 * 1000);
    await sendSignal("zhangsan", "START");
    await sleep(30 * 1000);
    await sendSignal("will", "STOP");
    await sleep(10 * 1000);
    await sendSignal("will", "START");
    while (true) {
        await sleep(300000);
    }
};
main();
