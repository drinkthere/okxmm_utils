const WebSocket = require("ws");
const http = require("http");

// 创建 HTTP 服务器
const server = http.createServer();

// 创建 WebSocket 服务器
const wss = new WebSocket.Server({ server });

// 处理 WebSocket 连接
wss.on("connection", (ws, req) => {
    // 获取客户端的 IPv4 地址
    const clientIp = req.socket.remoteAddress;

    // 打印客户端的 IPv4 地址
    console.log(`Client connected: ${clientIp}`);

    // 发送欢迎消息给客户端
    ws.send(`Welcome! Your IP address is ${clientIp}`);

    // 处理接收到的消息
    ws.on("message", (message) => {
        console.log(`Received message: ${message}`);
    });

    // 处理连接关闭
    ws.on("close", () => {
        console.log(`Client disconnected: ${clientIp}`);
    });
});

// 启动服务器
const PORT = 55551;
server.listen(PORT, () => {
    console.log(`WebSocket server is running on ws://localhost:${PORT}`);
});
