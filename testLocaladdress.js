const axios = require("axios");
const https = require("https");

const httpsAgent = new https.Agent({
    localAddress: "192.168.14.44",
});

// 在 Axios 实例中使用自定义 httpsAgent
const instance = axios.create({
    timeout: 3000,
    httpsAgent,
});

// 使用自定义 Axios 实例发送 HTTPS 请求
instance
    .get("https://ifconfig.me")
    .then((response) => {
        console.log(response.data);
    })
    .catch((error) => {
        console.error(error);
    });
