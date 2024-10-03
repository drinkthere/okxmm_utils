const OkxClient = require("./clients/okx");
const { sleep, fileExists } = require("./utils/run");
const { log } = require("./utils/log");
const cfgFile = `./configs/config.json`;
if (!fileExists(cfgFile)) {
    log(`config file ${cfgFile} does not exits`);
    process.exit();
}
const configs = require(cfgFile);

const { account } = require("minimist")(process.argv.slice(2));
if (account == null) {
    log("node getAccountInfo.js --account=xxx");
    process.exit();
}

const keyIndex = configs.keyIndexMap[account];
// 加载.env文件
const dotenv = require("dotenv");
dotenv.config();
const apiKeyArr = process.env.OKX_STAT_API_KEY.split(",");
const apiSecretArr = process.env.OKX_STAT_API_SECRET.split(",");
const apiPasswordArr = process.env.OKX_STAT_API_PASSWORD.split(",");

let options = {
    API_KEY: apiKeyArr[keyIndex],
    API_SECRET: apiSecretArr[keyIndex],
    API_PASSWORD: apiPasswordArr[keyIndex],
    market: configs.market[account],
    localAddress: configs.okxLocalAddress[account],
};
const exchangeClient = new OkxClient(options);

const main = async () => {
    try {
        // 设置转出权限
        // const result = await exchangeClient.setSubAccountTransferOutPermission('wangxiaoer1')
        // console.log(result)

        // 获取子账户资金账户余额
        // const balances = await exchangeClient.getSubAccountBalances('wangxiaoer1');
        // for(let bal of balances[0].details) {
        //     console.log(bal.ccy, bal.availBal)
        // }
        // console.log("Funding Account Balance:");
        // if (balances && balances[0] && balance[0].length > 0) {
        //      for(let bal of balances[0].details) {
        //          if (bal.availBal != 0) {
        //              console.log(bal.ccy, bal.availBal)
        //          }
        //          console.log(bal.ccy, bal.availBal)
        //      }
        // } else {
        //     console.log(`No balance`);
        // }
        // console.log();

        // 划转子账户资金账户中的币到母账户
        const transferResult =
            await exchangeClient.trasferAssetFromSubAccountToMainAccount(
                "wangxiaoer1",
                "USDT",
                0.1
            );
        console.log(transferResult);
    } catch (e) {
        console.error(e);
    }
};
main();
