# 安装nodejs 和 npm
```Shell
sudo apt-get install nodejs npm -y
```
# 安装pm2
```Shell
sudo npm -g pm2
```
# 安装pm2-logrotate
```Shell
pm2 install pm2-logrotate
```
# 配置logrotate
```Shell
pm2 set pm2-logrotate:max_size 100M  // 单个日志文件最大100M
pm2 set pm2-logrotate:retain 2 // 最多保留两个日志文件
```
# 执行脚本
启动对冲脚本
```Shell
pm2 start hedge.js --name hedge
```
其他文件都是直接用node xxx.js执行

# 查看日志和状态
```Shell
pm2 list hedge
pm2 logs hedge
pm2 show hedge
```
