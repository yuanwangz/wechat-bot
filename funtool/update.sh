#!/bin/bash
# 更新脚本

# 停止应用程序
pm2 stop wechatBot

# 进入应用程序目录（根据您的项目路径修改）
cd /home/app

# 从 GitHub 更新代码
git pull https://github.com/yuanwangz/wechat-bot.git

# 编译项目
npm install

# 重启应用程序
pm2 restart wechatBot
