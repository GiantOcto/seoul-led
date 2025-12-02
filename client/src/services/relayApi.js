import axios from 'axios';

const API_BASE_URL = 'http://localhost:5130/api';

// 센서 데이터 조회
export const getSensorData = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/SensorApi/data`);
    return response.data;
  } catch (error) {
    console.error('센서 데이터 조회 실패:', error);
    throw error;
  }
};

// 릴레이 켜기
export const turnOnRelay = async (relayNumber) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/RelayApi/on/${relayNumber}`);
    return response.data;
  } catch (error) {
    console.error(`릴레이 ${relayNumber + 1}번 켜기 실패:`, error);
    throw error;
  }
};

// 릴레이 끄기
export const turnOffRelay = async (relayNumber) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/RelayApi/off/${relayNumber}`);
    return response.data;
  } catch (error) {
    console.error(`릴레이 ${relayNumber + 1}번 끄기 실패:`, error);
    throw error;
  }
};

