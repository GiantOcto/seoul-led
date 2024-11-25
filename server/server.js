<<<<<<< HEAD

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling']  // 추가된 부분
    },
    allowEIO3: true  // Engine.IO 버전 3 허용
});
const cors = require('cors');

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 연결된 클라이언트 관리
let connectedClients = new Set();

// 시리얼 데이터 저장
let serialData = [];
const MAX_DATA_POINTS = 1000; // 최대 데이터 포인트 수

// Socket.IO 연결 처리
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    connectedClients.add(socket.id);

    // 클라이언트에 현재 데이터 전송
    socket.emit('initial_data', serialData);

    // 파이썬에서 보낸 시리얼 데이터 처리
    socket.on('serial_data', (data) => {
        console.log('Received serial data:', data);
        
        // 데이터 저장
        serialData.push(data);
        if (serialData.length > MAX_DATA_POINTS) {
            serialData.shift(); // 오래된 데이터 제거
        }

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
    res.json(serialData);
});

// 현재 연결 상태 확인
app.get('/api/status', (req, res) => {
    res.json({
        connectedClients: Array.from(connectedClients),
        dataPoints: serialData.length
    });
});

// 서버 시작
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
=======
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

// 디버그용 미들웨어 추가
app.use((req, res, next) => {
  console.log('\n=== 요청 받음 ===');
  console.log('URL:', req.url);
  console.log('쿼리:', req.query);
  next();
});

app.get('/api/news', async (req, res) => {
  try {
    // 요청 정보 자세히 출력
    console.log('\n=== 뉴스 API 요청 ===');
    console.log('전체 URL:', req.originalUrl);
    console.log('쿼리 문자열:', req.url.split('?')[1]);
    console.log('파싱된 쿼리:', req.query);
    console.log('검색어:', req.query.query);

    const query = req.query.query;
    
    if (!query) {
      console.log('검색어 누락 - 요청 데이터:', {
        url: req.url,
        query: req.query,
        headers: req.headers
      });
      return res.status(400).json({ 
        error: '검색어가 필요합니다.',
        receivedData: {
          url: req.url,
          query: req.query
        }
      });
    }

    console.log('뉴스 검색 시작:', query);

    const response = await axios.get('https://openapi.naver.com/v1/search/news.json', {
      headers: {
        'X-Naver-Client-Id': '3cl_o2OjDBi1ML4LKy4A',
        'X-Naver-Client-Secret': '6h1NZlRsmP'
      },
      params: {
        query: query,
        display: 15,
        sort: 'sim'
      }
    });
    
    console.log('검색 완료:', {
      검색어: query,
      결과수: response.data.items.length
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('API 오류:', error.message);
    res.status(500).json({ error: '뉴스 데이터 조회 실패' });
  }
});

// 실종아동 API 엔드포인트
app.get('/api/missing', async (req, res) => {
  try {
    console.log('\n=== 실종아동 API 요청 ===');

    const response = await axios.get('https://www.safe182.go.kr/api/lcm/findChildList.do', {
      params: {
        esntlId: '10000702',
        authKey: '63b59188da6b4012',
        rowSize: '20'
      }
    });
    
    console.log('검색 완료:', {
      결과수: response.data.length || 0,
      데이터: response.data
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('실종아동 API 오류:', error);
    res.status(500).json({ error: '실종아동 데이터 조회 실패' });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log('\n=== 서버 시작 ===');
  console.log(`포트: ${PORT}`);
  console.log('==================\n');
>>>>>>> 30a4e4b76583cdc9d9835db9b44762c09dace3b6
});