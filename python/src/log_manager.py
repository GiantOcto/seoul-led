# python/src/log_manager.py

import os
import logging
from datetime import datetime
from logging.handlers import RotatingFileHandler
from PyQt5.QtWidgets import QTextEdit
from PyQt5.QtGui import QTextCursor, QColor
from PyQt5.QtCore import Qt

class LogManager:
    """로그를 관리하는 클래스
    
    특징:
    - 로그 레벨별 색상 구분 (INFO=검정, WARNING=주황, ERROR=빨강)
    - 파일 로그와 GUI 로그 동시 관리
    - 로그 파일 자동 로테이션 (크기 제한)
    - QTextEdit 버퍼 크기 제한
    """
    
    def __init__(self, text_edit: QTextEdit, log_dir: str = "logs"):
        self.text_edit = text_edit
        self.log_dir = log_dir
        self.max_lines = 1000  # GUI에 표시할 최대 로그 라인 수
        self.setup_logger()
        
    def setup_logger(self):
        """로거 초기 설정"""
        # 로그 디렉토리 생성
        if not os.path.exists(self.log_dir):
            os.makedirs(self.log_dir)
            
        # 로거 생성
        self.logger = logging.getLogger('SerialMonitor')
        self.logger.setLevel(logging.INFO)
        
        # 포맷터 설정
        formatter = logging.Formatter(
            '[%(asctime)s] %(levelname)s: %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S.%f'
        )
        
        # 파일 핸들러 설정 (일별 로그 파일, 최대 10MB)
        today = datetime.now().strftime('%Y%m%d')
        file_handler = RotatingFileHandler(
            filename=os.path.join(self.log_dir, f'serial_log_{today}.txt'),
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5,  # 최대 5개 파일 유지
            encoding='utf-8'
        )
        file_handler.setFormatter(formatter)
        self.logger.addHandler(file_handler)

    def _get_color(self, level: int) -> QColor:
        """로그 레벨에 따른 색상 반환"""
        color_map = {
            logging.INFO: QColor(0, 0, 0),  # 검정
            logging.WARNING: QColor(255, 165, 0),  # 주황
            logging.ERROR: QColor(255, 0, 0)  # 빨강
        }
        return color_map.get(level, QColor(0, 0, 0))

    def _update_text_edit(self, msg: str, level: int):
        """QTextEdit에 컬러 로그 추가"""
        # 커서를 끝으로 이동
        self.text_edit.moveCursor(QTextCursor.End)
        
        # 현재 색상 저장
        current_color = self.text_edit.textColor()
        
        # 새 로그 색상 설정 및 추가
        self.text_edit.setTextColor(self._get_color(level))
        self.text_edit.insertPlainText(msg + '\n')
        
        # 원래 색상 복원
        self.text_edit.setTextColor(current_color)
        
        # 스크롤을 항상 최신 로그로
        self.text_edit.verticalScrollBar().setValue(
            self.text_edit.verticalScrollBar().maximum()
        )
        
        # 최대 라인 수 제한
        if self.text_edit.document().lineCount() > self.max_lines:
            cursor = QTextCursor(self.text_edit.document())
            cursor.movePosition(QTextCursor.Start)
            cursor.movePosition(QTextCursor.Down, QTextCursor.KeepAnchor, 
                              self.text_edit.document().lineCount() - self.max_lines)
            cursor.removeSelectedText()

    def log(self, msg: str, level: int = logging.INFO):
        """로그 메시지 기록
        
        Args:
            msg: 로그 메시지
            level: 로그 레벨 (logging.INFO/WARNING/ERROR)
        """
        # 로거에 기록
        self.logger.log(level, msg)
        
        # GUI 업데이트는 메인 스레드에서 실행
        formatted_msg = f'[{datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]}] {msg}'
        self._update_text_edit(formatted_msg, level)

    def info(self, msg: str):
        """정보 로그"""
        self.log(msg, logging.INFO)
        
    def warning(self, msg: str):
        """경고 로그"""
        self.log(msg, logging.WARNING)
        
    def error(self, msg: str):
        """에러 로그"""
        self.log(msg, logging.ERROR)