# 安装nodejs 和 npm
sudo apt-get install nodejs npm -y

# 安装pm2
sudo npm -g pm2

# 安装pm2-logrotate
pm2 install pm2-logrotate

# 配置logrotate
pm2 set pm2-logrotate:max_size 100M  // 单个日志文件最大100M
pm2 set pm2-logrotate:retain 2 // 最多保留两个日志文件

# 执行脚本
启动对冲脚本
pm2 start hedge.js --name hedge

其他文件都是直接用node xxx.js执行

# 查看日志和状态
pm2 list hedge
pm2 logs hedge
pm2 show hedge
