# connection_manager.py
from PyQt5.QtCore import QTimer, QObject, pyqtSignal
from collections import deque
import time
import logging

class ConnectionManager(QObject):
    """연결 상태 관리 및 자동 복구"""
    
    # 시그널
    connection_state_changed = pyqtSignal(str)
    retry_attempt = pyqtSignal(int, int)  # (현재시도, 대기시간)
    
    def __init__(self, name="Connection", parent=None):
        super().__init__(parent)
        self.name = name
        self.retry_count = 0
        self.max_retries = 10
        self.is_connected = False
        
        # 재연결 타이머
        self.reconnect_timer = QTimer()
        self.reconnect_timer.timeout.connect(self._do_reconnect)
        
        # 콜백 함수들
        self.connect_func = None
        self.disconnect_func = None
        
    def set_callbacks(self, connect_func, disconnect_func=None):
        """연결/해제 함수 설정"""
        self.connect_func = connect_func
        self.disconnect_func = disconnect_func
        
    def get_retry_delay(self):
        """지수 백오프 딜레이 계산"""
        delays = [1, 2, 4, 8, 16, 32, 60]
        if self.retry_count >= len(delays):
            return 60
        return delays[self.retry_count]
        
    def handle_disconnect(self):
        """연결 끊김 처리"""
        self.is_connected = False
        self.connection_state_changed.emit(f"{self.name} 연결 끊김")
        
        if self.retry_count < self.max_retries:
            delay = self.get_retry_delay()
            self.retry_count += 1
            self.retry_attempt.emit(self.retry_count, delay)
            self.reconnect_timer.start(delay * 1000)
        else:
            self.connection_state_changed.emit(f"{self.name} 재연결 포기")
            
    def _do_reconnect(self):
        """실제 재연결 시도"""
        self.reconnect_timer.stop()
        
        try:
            # 기존 연결 정리
            if self.disconnect_func:
                self.disconnect_func()
                
            # 재연결 시도
            if self.connect_func:
                self.connect_func()
                
            # 성공!
            self.is_connected = True
            self.retry_count = 0
            self.connection_state_changed.emit(f"{self.name} 재연결 성공!")
            
        except Exception as e:
            self.connection_state_changed.emit(f"{self.name} 재연결 실패: {str(e)}")
            self.handle_disconnect()
            
    def reset(self):
        """상태 초기화"""
        self.retry_count = 0
        self.reconnect_timer.stop()
        self.is_connected = True


class DataQueueManager:
    """연결 끊김시 데이터 보관"""
    
    def __init__(self, max_size=10000):
        self.queue = deque(maxlen=max_size)
        self.lost_count = 0
        
    def push(self, data):
        """데이터 추가"""
        old_len = len(self.queue)
        self.queue.append(data)
        if old_len == self.queue.maxlen:
            self.lost_count += 1
            
    def pop_all(self):
        """모든 데이터 꺼내기"""
        result = list(self.queue)
        self.queue.clear()
        return result
        
    def size(self):
        return len(self.queue)