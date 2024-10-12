const zmq = require("zeromq");
const protobuf = require("protobufjs");
const { scheduleLoopTask, sleep } = require("./utils/run.js");
const ipc = "tcp://127.0.0.1:10001";
const pbRoot = protobuf.loadSync("./proto/control-signal.proto");
const controlSignal = pbRoot.lookupType("ControlSignal");

const main = async () => {
    const socket = new zmq.Publisher();
    await socket.bind(ipc);
    console.log("Publisher bound to port 10001");
    while (true) {
        await sleep(30 * 1000);
        let message = controlSignal.create({
            account: "zhangsan",
            signal: "STOP",
        });
        let buffer = controlSignal.encode(message).finish();
        await socket.send(buffer);
        console.log("send msg", message);
        await sleep(10 * 1000);
        message = controlSignal.create({
            account: "zhangsan",
            signal: "START",
        });
        buffer = controlSignal.encode(message).finish();
        await socket.send(buffer);
        console.log("send msg", message);
        await sleep(30 * 1000);
        message = controlSignal.create({
            account: "will",
            signal: "STOP",
        });
        buffer = controlSignal.encode(message).finish();
        await socket.send(buffer);
        console.log("send msg", message);
        await sleep(10 * 1000);
        message = controlSignal.create({
            account: "will",
            signal: "START",
        });
        buffer = controlSignal.encode(message).finish();
        await socket.send(buffer);
        console.log("send msg", message);
    }
};
main();
