import React, { useState, useEffect, useRef } from 'react';
import './News.css';

const News = ({ keyword = '서울' }) => {
  const [newsData, setNewsData] = useState([]);
  const [visibleNews, setVisibleNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef(null);
  const keywordRef = useRef(keyword);
  const fetchingRef = useRef(false);

  const startNewsRotation = (items) => {
    // 이전 interval 정리
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // 새로운 interval 시작
    intervalRef.current = setInterval(() => {
      // 현재 keyword가 변경되었다면 rotation 중지
      if (keywordRef.current !== keyword) {
        clearInterval(intervalRef.current);
        return;
      }

      setCurrentIndex(prevIndex => {
        const nextIndex = (prevIndex + 3) % items.length;
        setVisibleNews(items.slice(nextIndex, Math.min(nextIndex + 3, items.length)));
        return nextIndex;
      });
    }, 5000);
  };

  const fetchNews = async (searchKeyword) => {
    // 이미 fetch 중이면 중단
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    // 이전 interval 정리
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setNewsData([]);
    setVisibleNews([]);
    setLoading(true);
    setCurrentIndex(0);

    try {
      const encodedKeyword = encodeURIComponent(searchKeyword);
      const apiUrl = `http://localhost:5000/api/news?query=${encodedKeyword}`;
      
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (keywordRef.current !== searchKeyword) {
        return;
      }

      if (data.items && Array.isArray(data.items)) {
        console.log('뉴스 데이터 받음:', {
          검색어: searchKeyword,
          개수: data.items.length
        });
        
        setNewsData(data.items);
        setVisibleNews(data.items.slice(0, 3));
        startNewsRotation(data.items);
      }
    } catch (error) {
      console.error('뉴스 검색 실패:', error);
      setNewsData([]);
      setVisibleNews([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    keywordRef.current = keyword;
    fetchNews(keyword);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [keyword]);

  // 5초마다 다음 3개 뉴스 표시
  useEffect(() => {
    if (!newsData.length) return;

    const interval = setInterval(() => {
      setCurrentIndex(prevIndex => {
        const nextIndex = (prevIndex + 3) % newsData.length;
        const endIndex = Math.min(nextIndex + 3, newsData.length);
        
        setVisibleNews(newsData.slice(nextIndex, endIndex));
        return nextIndex;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [newsData]);

  const cleanText = (text) => {
    return text
      .replace(/<[^>]*>/g, '') // HTML 태그 제거
      .replace(/&quot;/g, '"') // 큰따옴표 변환
      .replace(/&amp;/g, '&')  // 앰퍼샌드 변환
      .replace(/&lt;/g, '<')   // 작은따옴표 변환
      .replace(/&gt;/g, '>')   // 큰따옴표 변환
      .replace(/&nbsp;/g, ' '); // 공백 변환
  };

  if (loading) {
    return <div className="news-container">뉴스를 불러오는 중...</div>;
  }

  if (!visibleNews.length) {
    return <div className="news-container">뉴스가 없습니다.</div>;
  }

  return (
    <div className="news-container">
      <div className="news-list">
        {visibleNews.map((item, index) => (
          <div key={`${item.link}-${index}`} className="news-item">
            <h3>{cleanText(item.title)}</h3>
            <div className="news-meta">
              <span>{new Date(item.pubDate).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default News;