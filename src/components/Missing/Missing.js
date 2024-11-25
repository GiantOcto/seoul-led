import React, { useState, useEffect } from 'react';
import './Missing.css';

const Missing = () => {
  const [missingData, setMissingData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMissingData = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5000/api/missing');
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        const actualData = (data.list || []).filter(person => 
          !person.nm.includes('테스트')
        );
        
        console.log('필터링 후 실종자 수:', actualData.length);
        setMissingData(actualData);
        
      } catch (err) {
        console.error('실종아동 데이터 조회 실패:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMissingData();
  }, []);

  useEffect(() => {
    if (missingData.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === missingData.length - 1 ? 0 : prevIndex + 1
      );
    }, 10000);

    return () => clearInterval(timer);
  }, [missingData]);

  if (loading) {
    return <div>데이터를 불러오는 중...</div>;
  }

  if (error) {
    return <div>오류 발생: {error}</div>;
  }

  if (!missingData.length) {
    return <div>데이터가 없습니다.</div>;
  }

  const currentPerson = missingData[currentIndex];

  return (
    <div className="missing-container">
      <h2>실종신고 정보</h2>
      <div className="missing-single">
        <div className="missing-card">
          <img 
            src={`data:image/jpeg;base64,${currentPerson.tknphotoFile}`} 
            alt={currentPerson.nm} 
            className="missing-photo"
          />
          <div className="missing-info">
            <h3>{currentPerson.nm}</h3>
            <p>실종일: {currentPerson.occrde}</p>
            <p>실종장소: {currentPerson.occrAdres}</p>
            <p>나이: {currentPerson.age}세</p>
            <p>성별: {currentPerson.sexdstnDscd}</p>
            {currentPerson.etcSpfeatr && <p>특징: {currentPerson.etcSpfeatr}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Missing;