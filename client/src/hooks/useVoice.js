import { useEffect } from 'react';

export function useVoice(currentSection) {
  useEffect(() => {
    // 섹션 변경될 때 음성 재생
    if (currentSection !== undefined) {
      let message = "";
      
      // 섹션별 메시지 설정
      switch(currentSection) {
        case 0: message = "문구 섹션입니다."; break;
        case 1: message = "미세먼지 및 오존 정보입니다."; break;
        case 2: message = "수위 데이터 확인하세요. 위험 수준에 주의하십시오."; break;
        case 3: message = "구 이벤트 정보입니다."; break;
        case 4: message = "전체 이벤트 리스트입니다."; break;
        case 5: message = "테스트 섹션입니다."; break;
        default: message = "알 수 없는 섹션입니다.";
      }
      
      // 초기 음성 재생
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'ko-KR'; // 한국어 설정
      window.speechSynthesis.speak(utterance);
      
      // 15초마다 반복 재생
      const intervalId = setInterval(() => {
        const repeatUtterance = new SpeechSynthesisUtterance(message);
        repeatUtterance.lang = 'ko-KR';
        window.speechSynthesis.speak(repeatUtterance);
      }, 3000); // 4초마다 반복
      
      // 컴포넌트 언마운트 또는 섹션 변경 시 타이머 정리
      return () => {
        clearInterval(intervalId);
        window.speechSynthesis.cancel();
      };
    }
    
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [currentSection]);
}