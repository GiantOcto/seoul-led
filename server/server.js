const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling']
    },
    allowEIO3: true
});

const cors = require('cors');

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 연결된 클라이언트 관리
let connectedClients = new Set();

const DataStore = {
    data: [], // 메인 데이터 저장소
    lastCleanupTimestamp: null,
    
    // 데이터 추가 시 타임스탬프 기준으로 정렬된 상태 유지
    addData(newData) {
        this.data.push(newData);
        // 타임스탬프 기준 정렬
        this.data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // 데이터 개수가 임계값을 넘으면 정리 수행
        if (this.data.length > 1000) { // MAX_DATA_POINTS 값
            this.cleanup();
        }
    },
    
    cleanup() {
        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        
        // 이진 검색으로 삭제 시작점 찾기
        const startIndex = this.binarySearchTimestamp(oneDayAgo);
        
        // 시작점 이전의 모든 데이터 제거
        if (startIndex > 0) {
            this.data = this.data.slice(startIndex);
        }
        
        this.lastCleanupTimestamp = now;
    },
    
    // 이진 검색으로 특정 타임스탬프의 위치 찾기
    binarySearchTimestamp(timestamp) {
        let left = 0;
        let right = this.data.length - 1;
        
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const midTimestamp = new Date(this.data[mid].timestamp).getTime();
            
            if (midTimestamp === timestamp) {
                return mid;
            } else if (midTimestamp < timestamp) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        
        return left;
    },
    
    // 데이터 조회 메서드
    getData() {
        return this.data;
    },
    
    // 특정 기간의 데이터 조회
    getDataInRange(startTime, endTime) {
        const startIndex = this.binarySearchTimestamp(startTime);
        const endIndex = this.binarySearchTimestamp(endTime);
        return this.data.slice(startIndex, endIndex + 1);
    }
};

function isValidSerialData(data) {
    try {
        if (!data || typeof data !== 'object') return false;

        if (!data.timestamp || isNaN(new Date(data.timestamp).getTime())) {
            return false;
        }

        if (!Number.isInteger(data.water_level) || 
            data.water_level < 0 ||
            data.water_level > 9999) {
            return false;
        }

        if (typeof data.machine_status !== 'boolean') {
            return false;
        }

        return true;
    } catch (error) {
        console.error('Data validation error', error);
        return false;
    }
}

// Socket.IO 연결 처리
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    connectedClients.add(socket.id);

    // 클라이언트에 현재 데이터 전송
    socket.emit('initial_data', DataStore.getData());

    // 파이썬에서 보낸 시리얼 데이터 처리
    socket.on('serial_data', (data) => {
        if (!isValidSerialData(data)) {
            console.error('Invalid serial data received:', data);
            return;
        }

        console.log('Received serial data:', data);
        
        // 데이터 저장
        DataStore.addData(data);

        // 연결된 모든 클라이언트에 데이터 브로드캐스트
        io.emit('new_data', data);
    });

    // 연결 해제 처리
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        connectedClients.delete(socket.id);
    });
});

// REST API 엔드포인트
app.get('/api/data', (req, res) => {
    try {
        res.json(DataStore.getData());
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: '데이터 조회 중 오류가 발생했습니다.' });
    }
});

// 최신 데이터 조회
app.get('/api/current-status', (req, res) => {
    try {
        const data = DataStore.getData();
        const latestData = data[data.length - 1] || {
            water_level: 0,
            machine_status: false,
            timestamp: new Date()
        };
        res.json(latestData);
    } catch (error) {
        console.error('Error fetching current status:', error);
        res.status(500).json({ error: '현재 상태 조회 중 오류가 발생했습니다.' });    
    }
});

// 특정 기간 데이터 조회
app.get('/api/data-history', (req, res) => {
    try {
        let hours = parseInt(req.query.hours) || 1;

        if (hours < 1) hours = 1;
        if (hours > 24) hours = 24;
    
        const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
        const filteredData = DataStore.getDataInRange(cutoff.getTime(), Date.now());

        res.json(filteredData);
    } catch(error) {
        console.error('Error fetching data history:', error);
        res.status(500).json({ error: '데이터 히스토리 조회 중 오류가 발생했습니다.' });
    }
});

// 현재 연결 상태 확인
app.get('/api/status', (req, res) => {
    try {
        res.json({
            connectedClients: Array.from(connectedClients),
            dataPoints: DataStore.getData().length
        });
    } catch (error) {
        console.error('Error fetching status:', error);
        res.status(500).json({ error: '상태 조회 중 오류가 발생했습니다.' });
    }
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: '서버 오류가 발생했습니다.',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.use((req, res) => {
    res.status(404).json({ error: '요청하신 리소스를 찾을 수 없습니다.' });
});

// 서버 시작
const PORT = process.env.PORT || 8000;
http.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});