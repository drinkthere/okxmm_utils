const fs = require("fs");
const path = require("path");

// 读取文件
const filePath = path.join(__dirname, "ticker.result");
fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
        console.error("Error reading the file:", err);
        return;
    }

    // 处理文件内容
    const lines = data.trim().split("\n");
    const differences = lines.map((line) => {
        const [start, end] = line.split(" ").map(Number);
        return end - start;
    });

    // 计算平均值
    const average =
        differences.reduce((sum, value) => sum + value, 0) / differences.length;

    // 计算中位数
    const median = (arr) => {
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    // 计算第 90 百分位数
    const percentile = (arr, p) => {
        const sorted = [...arr].sort((a, b) => a - b);
        const index = (p / 100) * (sorted.length - 1);
        return sorted[Math.round(index)];
    };

    // 计算中位数和 P90
    const medianValue = median(differences);
    const p90Value = percentile(differences, 90);

    // 输出结果
    console.log(`Average: ${average}`);
    console.log(`Median: ${medianValue}`);
    console.log(`P90: ${p90Value}`);
});
