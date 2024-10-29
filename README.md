# 安装 nodejs 和 npm

```Shell
sudo apt-get install nodejs npm -y
```

# 安装 pm2

```Shell
sudo npm -g pm2
```

# 安装 pm2-logrotate

```Shell
pm2 install pm2-logrotate
```

# 配置 logrotate

```Shell
pm2 set pm2-logrotate:max_size 100M  // 单个日志文件最大100M
pm2 set pm2-logrotate:retain 2 // 最多保留两个日志文件
```

# 执行脚本

启动对冲脚本

```Shell
pm2 start hedge.js --name hedge
```

其他文件都是直接用 node xxx.js 执行

# 查看日志和状态

```Shell
pm2 list hedge
pm2 logs hedge
pm2 show hedge
```

# 查看运行在某个 cpu index （16）上的进程

ps -e -o pid,psr,comm | grep ' 16 '

# 测试

node testTickerSpeed.js --account=xxx --market=colo > ticker.result
node testTickerDelayResult.js

node testWsOrderSpeed.js --account=xxx --market=colo > private.log
node testOrderSpeedResult.js
