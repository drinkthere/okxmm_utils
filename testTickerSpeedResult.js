const fs = require("fs");

// 读取public.log文件内容
const publicData = fs.readFileSync("bcolo.log", "utf-8").trim().split("\n");
// 读取private.log文件内容
const privateData = fs.readFileSync("ccolo.log", "utf-8").trim().split("\n");

// 将文件内容解析为行数据
const publicLines = publicData.map((line) => line.split(" "));
const privateLines = privateData.map((line) => line.split(" "));

// 创建一个对象用于存储差值
const diffMap = {};

// 遍历public.log的每一行
for (const publicLine of publicLines) {
    // 获取当前行的第一列值
    const key = publicLine[0];

    // 在private.log中查找与当前行第一列相等的行
    const matchingLine = privateLines.find((line) => line[0] === key);

    if (matchingLine) {
        // 找到匹配的行，计算第二列的差值
        const diff = matchingLine[1] - publicLine[1];
        diffMap[key] = diff;
    }
}

// 计算平均差值
const diffValues = Object.values(diffMap);
const averageDiff =
    diffValues.reduce((sum, val) => sum + val, 0) / diffValues.length;

// 打印结果
console.log("差值评估:");
for (const key in diffMap) {
    const diff = diffMap[key];
    const evaluation = diff > 0 ? "公共文件效果较好" : "私有文件效果较好";
    console.log(`Key ${key}: 差值 ${diff}, 评估: ${evaluation}`);
}
console.log("平均差值:", averageDiff);
