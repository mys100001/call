const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 中间件
app.use(cors());
app.use(express.static(__dirname));

// 存储房间和用户信息
const rooms = new Map();
const users = new Map();

// Socket.IO 连接处理
io.on('connection', (socket) => {
    console.log(`用户连接: ${socket.id}`);

    // 用户加入房间
    socket.on('join-room', (data) => {
        const { room, userId } = data;
        
        // 加入房间
        socket.join(room);
        
        // 存储用户信息
        users.set(socket.id, { userId, room, socketId: socket.id });
        
        // 更新房间信息
        if (!rooms.has(room)) {
            rooms.set(room, new Set());
        }
        rooms.get(room).add(socket.id);
        
        // 通知房间内其他用户
        socket.to(room).emit('user-joined', userId);
        
        // 通知用户成功加入
        socket.emit('room-joined', room);
        
        console.log(`用户 ${userId} 加入房间 ${room}`);
        console.log(`房间 ${room} 当前用户数: ${rooms.get(room).size}`);
    });

    // 处理offer
    socket.on('offer', (data) => {
        const { offer, room, userId } = data;
        
        // 转发offer给房间内其他用户
        socket.to(room).emit('offer', {
            offer: offer,
            room: room,
            userId: userId
        });
        
        console.log(`转发offer from ${userId} in room ${room}`);
    });

    // 处理answer
    socket.on('answer', (data) => {
        const { answer, room, userId } = data;
        
        // 转发answer给房间内其他用户
        socket.to(room).emit('answer', {
            answer: answer,
            room: room,
            userId: userId
        });
        
        console.log(`转发answer from ${userId} in room ${room}`);
    });

    // 处理ICE候选
    socket.on('ice-candidate', (data) => {
        const { candidate, room } = data;
        
        // 转发ICE候选给房间内其他用户
        socket.to(room).emit('ice-candidate', {
            candidate: candidate,
            room: room
        });
    });

    // 用户离开房间
    socket.on('leave-room', (data) => {
        const { room, userId } = data;
        
        handleUserLeave(socket, room, userId);
    });

    // 处理断开连接
    socket.on('disconnect', () => {
        const userInfo = users.get(socket.id);
        if (userInfo) {
            handleUserLeave(socket, userInfo.room, userInfo.userId);
        }
        
        users.delete(socket.id);
        console.log(`用户断开连接: ${socket.id}`);
    });

    // 获取房间信息
    socket.on('get-room-info', (room, callback) => {
        if (rooms.has(room)) {
            callback({
                exists: true,
                userCount: rooms.get(room).size
            });
        } else {
            callback({
                exists: false,
                userCount: 0
            });
        }
    });
});

// 处理用户离开房间
function handleUserLeave(socket, room, userId) {
    if (room && rooms.has(room)) {
        socket.leave(room);
        rooms.get(room).delete(socket.id);
        
        // 如果房间为空，删除房间
        if (rooms.get(room).size === 0) {
            rooms.delete(room);
            console.log(`房间 ${room} 已删除`);
        }
        
        // 通知房间内其他用户
        socket.to(room).emit('user-left', userId);
        socket.to(room).emit('call-ended');
        
        console.log(`用户 ${userId} 离开房间 ${room}`);
    }
}

// API路由
app.get('/api/rooms', (req, res) => {
    const roomList = [];
    for (const [roomName, userSet] of rooms.entries()) {
        roomList.push({
            name: roomName,
            userCount: userSet.size
        });
    }
    res.json(roomList);
});

app.get('/api/stats', (req, res) => {
    res.json({
        totalUsers: users.size,
        totalRooms: rooms.size,
        activeConnections: io.engine.clientsCount
    });
});

// 根路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
    console.log(`访问地址: http://localhost:${PORT}`);
});