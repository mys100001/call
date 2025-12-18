# 网页免费电话系统

基于WebRTC技术的网页版免费电话系统，支持音视频通话功能。

## 功能特点

- 📞 网页端音视频通话
- 🌐 实时通信（WebRTC）
- 🎛️ 直观的拨号界面
- 🔄 房间管理系统
- 📱 响应式设计
- 🔒 安全连接

## 技术栈

- **前端**: HTML5, CSS3, JavaScript (WebRTC)
- **后端**: Node.js, Express, Socket.IO
- **通信协议**: WebRTC, Socket.IO

## 快速开始

### 本地部署

1. 安装依赖
```bash
npm install
```

2. 启动服务器
```bash
npm start
```

3. 访问应用
打开浏览器访问: `http://localhost:3000`

### 开发模式
```bash
npm run dev
```

## 使用说明

### 拨打电话
1. 在拨号盘输入房间号
2. 点击绿色拨号按钮
3. 等待对方接听

### 接听电话
1. 当有来电时，系统会自动提示
2. 视频通话会自动建立连接

### 结束通话
点击红色挂断按钮结束通话

## 房间系统

- 用户可以创建或加入任意房间
- 同一房间的用户可以进行通话
- 支持多人房间（需要扩展）

## 服务器配置

### 环境变量
```bash
PORT=3000                    # 服务器端口
NODE_ENV=production          # 环境模式
```

### STUN/TURN服务器
系统已配置免费STUN/TURN服务器:
- stun:stun.l.google.com:19302
- turn:numb.viagenie.ca

如需更好的通话质量，建议配置自己的TURN服务器。

## 生产部署

### 使用PM2部署
```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start server.js --name "web-phone"

# 查看状态
pm2 status

# 查看日志
pm2 logs web-phone
```

### 使用Docker部署
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

构建和运行:
```bash
docker build -t web-phone .
docker run -p 3000:3000 web-phone
```

### 使用Nginx反向代理
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 云服务器部署

### 腾讯云CVM部署
1. 创建CVM实例
2. 配置安全组（开放3000端口）
3. 上传代码
4. 安装Node.js
5. 安装依赖并启动服务

### 阿里云ECS部署
1. 创建ECS实例
2. 配置安全组规则
3. 部署应用
4. 配置域名解析

## API接口

### 获取房间列表
```
GET /api/rooms
```

### 获取服务器统计
```
GET /api/stats
```

## 注意事项

1. **HTTPS要求**: WebRTC需要在HTTPS环境下运行，生产环境请配置SSL证书
2. **防火墙**: 确保服务器防火墙开放相应端口
3. **浏览器兼容性**: 建议使用Chrome、Firefox、Safari等现代浏览器
4. **网络环境**: 在某些受限网络环境下可能无法正常使用

## 常见问题

### Q: 无法获取摄像头权限？
A: 确保浏览器有摄像头和麦克风权限，使用HTTPS协议访问。

### Q: 通话质量差？
A: 检查网络连接，或配置专用的TURN服务器。

### Q: 无法连接？
A: 检查服务器是否正常运行，网络是否通畅。

## 扩展功能

- [ ] 群组通话
- [ ] 文字聊天
- [ ] 屏幕共享
- [ ] 通话录制
- [ ] 用户认证
- [ ] 通话历史

## 许可证

MIT License