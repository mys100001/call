#!/bin/bash

# 网页电话系统部署脚本

set -e

echo "🚀 开始部署网页电话系统..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先安装Node.js"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm未安装，请先安装npm"
    exit 1
fi

# 安装依赖
echo "📦 安装依赖包..."
npm install

# 创建日志目录
echo "📁 创建日志目录..."
mkdir -p logs

# 检查PM2是否安装
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装PM2进程管理器..."
    npm install -g pm2
fi

# 停止现有进程
echo "🛑 停止现有进程..."
pm2 stop web-phone 2>/dev/null || true
pm2 delete web-phone 2>/dev/null || true

# 启动应用
echo "🚀 启动应用..."
pm2 start ecosystem.config.js

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup

echo "✅ 部署完成！"
echo "📊 查看状态: pm2 status"
echo "📋 查看日志: pm2 logs web-phone"
echo "🌐 访问地址: http://localhost:3000"
echo "📈 监控面板: pm2 monit"

# 显示服务状态
echo ""
echo "📋 服务状态:"
pm2 status