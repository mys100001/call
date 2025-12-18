class WebPhone {
    constructor() {
        this.socket = io();
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.isInCall = false;
        this.currentRoom = null;
        this.userId = this.generateUserId();
        
        this.initializeEventListeners();
        this.initializeWebRTC();
        this.connectToServer();
    }

    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9);
    }

    connectToServer() {
        this.socket.on('connect', () => {
            this.updateStatus('connected');
            this.addMessage('已连接到服务器');
        });

        this.socket.on('disconnect', () => {
            this.updateStatus('disconnected');
            this.addMessage('与服务器断开连接');
        });

        this.socket.on('user-joined', (userId) => {
            this.addMessage(`用户 ${userId} 加入房间`);
        });

        this.socket.on('user-left', (userId) => {
            this.addMessage(`用户 ${userId} 离开房间`);
            this.endCall();
        });

        this.socket.on('offer', async (data) => {
            await this.handleOffer(data);
        });

        this.socket.on('answer', async (data) => {
            await this.handleAnswer(data);
        });

        this.socket.on('ice-candidate', async (data) => {
            await this.handleIceCandidate(data);
        });

        this.socket.on('room-joined', (roomId) => {
            this.addMessage(`已加入房间: ${roomId}`);
        });

        this.socket.on('call-ended', () => {
            this.addMessage('通话已结束');
            this.endCall();
        });
    }

    initializeWebRTC() {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { 
                    urls: 'turn:numb.viagenie.ca',
                    username: 'webrtc@live.com',
                    credential: 'muazkh'
                }
            ]
        };

        this.peerConnection = new RTCPeerConnection(configuration);

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('ice-candidate', {
                    candidate: event.candidate,
                    room: this.currentRoom
                });
            }
        };

        this.peerConnection.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            document.getElementById('remoteVideo').srcObject = this.remoteStream;
        };

        this.peerConnection.onconnectionstatechange = () => {
            this.addMessage(`连接状态: ${this.peerConnection.connectionState}`);
        };
    }

    async initializeLocalStream() {
        try {
            const constraints = {
                video: true,
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };

            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            document.getElementById('localVideo').srcObject = this.localStream;
            
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
        } catch (error) {
            this.addMessage(`获取媒体流失败: ${error.message}`);
            throw error;
        }
    }

    initializeEventListeners() {
        // 拨号盘事件
        document.querySelectorAll('.key').forEach(key => {
            key.addEventListener('click', () => {
                const digit = key.dataset.digit;
                const input = document.getElementById('phoneInput');
                input.value += digit;
            });
        });

        // 拨打电话按钮
        document.getElementById('callBtn').addEventListener('click', () => {
            this.makeCall();
        });

        // 挂断按钮
        document.getElementById('hangupBtn').addEventListener('click', () => {
            this.endCall();
        });

        // Enter键拨号
        document.getElementById('phoneInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.makeCall();
            }
        });
    }

    async makeCall() {
        const roomId = document.getElementById('phoneInput').value.trim();
        
        if (!roomId) {
            this.addMessage('请输入房间号');
            return;
        }

        try {
            await this.initializeLocalStream();
            
            this.currentRoom = roomId;
            this.socket.emit('join-room', { room: roomId, userId: this.userId });
            
            document.getElementById('videoContainer').classList.add('active');
            
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            this.socket.emit('offer', {
                offer: offer,
                room: this.currentRoom,
                userId: this.userId
            });

            this.isInCall = true;
            this.updateCallButtons(true);
            this.addMessage(`正在呼叫房间: ${roomId}`);
            
        } catch (error) {
            this.addMessage(`拨号失败: ${error.message}`);
        }
    }

    async handleOffer(data) {
        try {
            if (!this.localStream) {
                await this.initializeLocalStream();
                document.getElementById('videoContainer').classList.add('active');
            }

            await this.peerConnection.setRemoteDescription(data.offer);
            
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            this.socket.emit('answer', {
                answer: answer,
                room: data.room,
                userId: this.userId
            });

            this.currentRoom = data.room;
            this.isInCall = true;
            this.updateCallButtons(true);
            this.addMessage('接听来电');
            
        } catch (error) {
            this.addMessage(`接听失败: ${error.message}`);
        }
    }

    async handleAnswer(data) {
        try {
            await this.peerConnection.setRemoteDescription(data.answer);
            this.addMessage('通话已建立');
        } catch (error) {
            this.addMessage(`建立通话失败: ${error.message}`);
        }
    }

    async handleIceCandidate(data) {
        try {
            await this.peerConnection.addIceCandidate(data.candidate);
        } catch (error) {
            this.addMessage(`添加ICE候选失败: ${error.message}`);
        }
    }

    endCall() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        if (this.peerConnection) {
            this.peerConnection.close();
            this.initializeWebRTC();
        }

        if (this.currentRoom) {
            this.socket.emit('leave-room', { room: this.currentRoom, userId: this.userId });
        }

        document.getElementById('localVideo').srcObject = null;
        document.getElementById('remoteVideo').srcObject = null;
        document.getElementById('videoContainer').classList.remove('active');
        document.getElementById('phoneInput').value = '';

        this.isInCall = false;
        this.currentRoom = null;
        this.updateCallButtons(false);
        this.addMessage('通话已结束');
    }

    updateStatus(status) {
        const statusElement = document.getElementById('connectionStatus');
        statusElement.className = `status ${status}`;
        statusElement.textContent = status === 'connected' ? '已连接' : '未连接';
    }

    updateCallButtons(inCall) {
        document.getElementById('callBtn').disabled = inCall;
        document.getElementById('hangupBtn').disabled = !inCall;
    }

    addMessage(message) {
        const messagesContainer = document.getElementById('messages');
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        messageElement.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new WebPhone();
});