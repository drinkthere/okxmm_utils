const WebSocket = require("ws");
// 创建 WebSocket 客户端
const ws = new WebSocket("wss://fstream-mm.binance.com/ws");

ws.on("open", () => {
    // 订阅期货市场的 bookTicker 数据
    const subscriptionMessage = {
        method: "SUBSCRIBE",
        params: [
            "btcusdt@bookTicker", // 订阅 BTC/USDT 的 bookTicker 数据
            "ethusdt@bookTicker", // 订阅 ETH/USDT 的 bookTicker 数据
        ],
        id: 1,
    };

    ws.send(JSON.stringify(subscriptionMessage));
    console.log("Subscribed to futures bookTicker for BTC/USDT and ETH/USDT");
});

ws.on("message", (data) => {
    // 接收到消息后打印
    const message = JSON.parse(data);
    console.log("Received message:", message);
});

ws.on("error", (error) => {
    console.error("WebSocket error:", error);
});

ws.on("close", () => {
    console.log("WebSocket connection closed");
});

// 处理程序退出时的清理工作
process.on("SIGINT", () => {
    ws.close();
    console.log("Closed WebSocket connection");
    process.exit();
});
