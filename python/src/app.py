import sys
from PyQt5.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
                           QLabel, QComboBox, QPushButton, QCheckBox, QTextEdit, QStatusBar,
                           QGroupBox, QGridLayout, QMessageBox, QLineEdit)
from PyQt5.QtCore import Qt, QThread, pyqtSignal, QTimer
from datetime import datetime, timedelta
import serial
import serial.tools.list_ports
from datetime import datetime
import socketio
import json
import time
import os
import logging
from logging.handlers import RotatingFileHandler
import gc
from log_manager import LogManager

class ServerThread(QThread):
    """웹소켓 서버 연결을 관리하는 스레드
    
    시리얼 데이터를 실시간으로 서버에 전송하기 위한 웹소켓 연결을 관리합니다.

    Attributes:
        connection_error (pyqtSignal): 연결 오류 발생 시 신호 발생
        connection_success (pyqtSignal): 연결 성공 시 신호 발생
        sio (socketio.Client): Socket.IO 클라이언트 인스턴스
        url (str): 연결할 서버 URL
        running (bool): 스레드 실행 상태
    """

    connection_error = pyqtSignal(str)
    connection_success = pyqtSignal(str)

    def __init__(self, url='http://localhost:8000'):
        super().__init__()
        self.sio = socketio.Client(logger=True, engineio_logger=True)
        self.sio.reconnection = True
        self.sio.reconnection_attempts = 5
        self.sio.reconnection_delay = 1
        self.url = url
        self.running = True

        @self.sio.event
        def connect():
            print("Connected to server")
            self.connection_success.emit("서버 연결 성공")
        @self.sio.event
        def disconnect():
            print("Disconnected from server")
            self.connection_error.emit("서버 연결 끊김")

    def run(self):
        while self.running:
            try:
                if not self.sio.connected:
                    # 연결 옵션 추가
                    self.sio.connect(self.url, 
                        transports=['websocket'],
                        wait_timeout=10)
                    break
            except Exception as e:
                self.connection_error.emit(f'서버 연결 실패: {str(e)}')
                time.sleep(5)  # 재시도 전 대기

    def stop(self):
        self.running = False
        if self.sio.connected:
            self.sio.disconnect()

    def send_data(self, data):
        if self.sio.connected:
            try:
                self.sio.emit('serial_data', data)
            except Exception as e:
                self.connection_error.emit(f'데이터 전송 실패: {str(e)}')

class SerialThread(QThread):
    """시리얼 통신을 관리하는 스레드
    
    시리얼 포트로부터 데이터를 지속적으로 읽어오고 파싱하는 작업을 수행합니다.

    Attributes:
        data_received (pyqtSignal): 데이터 수신 시 신호 발생
        error_occurred (pyqtSignal): 오류 발생 시 신호 발생
        serial (serial.Serial): 시리얼 포트 인스턴스
        running (bool): 스레드 실행 상태
    """

    data_received = pyqtSignal(str)
    error_occurred = pyqtSignal(str)

    def __init__(self, serial_port):
        super().__init__()
        self.serial = serial_port
        self.running = True

    def run(self):
        while self.running and self.serial.is_open:
            try:
                if self.serial.in_waiting:
                    data = self.serial.readline()  # 한 줄 읽기
                    try:
                        # ASCII로 디코딩
                        decoded_data = data.decode('ascii').strip()
                        
                        # 데이터 파싱
                        parsed_data = self.parse_serial_data(decoded_data)
                        
                        # 현재 시간
                        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]

                        # 로그 메시지 생성
                        output = f"[{timestamp}] 수신: {decoded_data}\n"
                        output += f"  수위: {parsed_data['water_level']}mm, "
                        output += f"기계 상태: {'작동중' if parsed_data['machine_status'] == 1 else '멈춤'}"
                
                        self.data_received.emit(output)

                    except UnicodeDecodeError as e:
                        # ASCII 디코딩 실패 시
                        hex_data = ' '.join([f"{byte:02X}" for byte in data])
                        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
                        output = f"[{timestamp}] 잘못된 데이터 형식 (HEX): {hex_data}"
                        self.data_received.emit(output)

            except serial.SerialException as e:
                self.error_occurred.emit(str(e))
                break

    def parse_serial_data(self, data_string):

        """시리얼 데이터 문자열을 파싱하여 수위와 기계 상태를 추출
    
        Args:
             data_string (str): 파싱할 데이터 문자열 (예: "WL:0123,MS:1")
          
        Returns:
             dict: 파싱된 데이터를 담은 딕셔너리
            {
                'water_level': int,  # 수위값 (mm)
                'machine_status': int  # 기계 상태 (1=작동중, 0=멈춤)
            }
        """
        
        try:
            # ASCII 데이터 예시: "WL:0123,MS:1"
            # WL = Water Level (수위)
            # MS = Machine Status (1=작동중, 0=멈춤)
            parts = data_string.strip().split(',')  # 쉼표로 구분
            
            # 첫 4바이트는 수위 데이터 파싱
            water_level_str = parts[0]
            if len(water_level_str) != 4:
                raise ValueError("수위 데이터는 4자리여야 합니다")
            water_level = int(water_level_str)
            
            # 마지막 1바이트는 기계 상태 파싱
            machine_status_str = parts[1]
            if machine_status_str not in ['0', '1']:
                raise ValueError("기계 상태는 0 또는 1이어야 합니다")
            machine_status = int(machine_status_str)


            return {
                'water_level': water_level,
                'machine_status': machine_status
            }
        except Exception as e:
            print(f"데이터 파싱 오류: {e}")
            return {
                'water_level': -1, # 에러 시 기본값
                'machine_status': 0
            }

    def stop(self):
        self.running = False

class SerialGUI(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle('시리얼 통신 모니터')
        self.setGeometry(100, 100, 1000, 600)
        
        self.setup_logging() #로깅 설정

        #메모리 관리를 위한 타이머 설정
        self.cleanup_timer = QTimer()
        self.cleanup_timer.timeout.connect(self.perform_cleanup)
        self.cleanup_timer.start(3600000)  # 1시간마다 실행


        self.serial = None
        self.serial_thread = None
        self.server_thread = None
        self.filename = None
        self.threads = [] # 스레드 관리를 위한 리스트 추가
        
        # 서버 연결 초기화
        self.server_thread = ServerThread()
        self.server_thread.connection_error.connect(self.show_error)
        self.server_thread.connection_success.connect(self.show_status)
        self.start_thread(self.server_thread)
        
        self.init_ui()
        self.update_ports()
    
        
    def init_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        
        # 상단 설정 영역
        settings_group = QGroupBox("통신 설정")
        settings_layout = QGridLayout()
        
        # 포트 설정
        settings_layout.addWidget(QLabel('포트:'), 0, 0)
        self.port_cb = QComboBox()
        settings_layout.addWidget(self.port_cb, 0, 1)
        
        refresh_btn = QPushButton('새로고침')
        refresh_btn.clicked.connect(self.update_ports)
        settings_layout.addWidget(refresh_btn, 0, 2)
        
        # Baudrate 설정
        settings_layout.addWidget(QLabel('Baudrate:'), 1, 0)
        self.baud_cb = QComboBox()
        self.baud_cb.addItems(['300', '1200', '2400', '4800', '9600', '19200', '38400', '57600', '115200'])
        self.baud_cb.setCurrentText('9600')
        settings_layout.addWidget(self.baud_cb, 1, 1)
        
        # Data bits 설정
        settings_layout.addWidget(QLabel('Data bits:'), 2, 0)
        self.data_bits_cb = QComboBox()
        self.data_bits_cb.addItems(['5', '6', '7', '8'])
        self.data_bits_cb.setCurrentText('8')
        settings_layout.addWidget(self.data_bits_cb, 2, 1)
        
        # Stop bits 설정
        settings_layout.addWidget(QLabel('Stop bits:'), 3, 0)
        self.stop_bits_cb = QComboBox()
        self.stop_bits_cb.addItems(['1', '1.5', '2'])
        settings_layout.addWidget(self.stop_bits_cb, 3, 1)
        
        # Parity 설정
        settings_layout.addWidget(QLabel('Parity:'), 4, 0)
        self.parity_cb = QComboBox()
        self.parity_cb.addItems(['None', 'Even', 'Odd', 'Mark', 'Space'])
        settings_layout.addWidget(self.parity_cb, 4, 1)
        
        settings_group.setLayout(settings_layout)
        main_layout.addWidget(settings_group)
        
        # 제어 버튼 영역
        control_layout = QHBoxLayout()
        
        # 연결 버튼
        self.connect_btn = QPushButton('연결')
        self.connect_btn.clicked.connect(self.toggle_connection)
        control_layout.addWidget(self.connect_btn)
        
        # 파일 저장 체크박스
        self.save_cb = QCheckBox('파일 저장')
        self.save_cb.setChecked(True)
        control_layout.addWidget(self.save_cb)
        
        # 서버 상태 표시
        self.server_status_label = QLabel('서버: 연결 중...')
        control_layout.addWidget(self.server_status_label)
        
        control_layout.addStretch()
        main_layout.addLayout(control_layout)
        
        # 로그 영역
        self.log_text = QTextEdit()
        self.log_text.setReadOnly(True)
        main_layout.addWidget(self.log_text)
        
        # 상태바
        self.statusBar().showMessage('준비')

        # 서버 설정 그룹
        server_group = QGroupBox("서버 설정")
        server_layout = QGridLayout()

        server_layout.addWidget(QLabel('서버 URL:'), 0, 0)
        self.server_url = QLineEdit('http://localhost:8000')
        server_layout.addWidget(self.server_url, 0, 1)

        reconnect_btn = QPushButton('서버 재연결')
        reconnect_btn.clicked.connect(self.reconnect_server)
        server_layout.addWidget(reconnect_btn, 0, 2)

        server_group.setLayout(server_layout)
        main_layout.addWidget(server_group)
    
    def setup_logging(self):
        """로깅 시스템 설정"""
        log_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        
        # 파일 핸들러 설정 (최대 10MB, 30일치 보관)
        log_file = 'serial_monitor.log'
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=10*1024*1024,  # 10MB
            backupCount=30  # 30일치 보관
        )
        file_handler.setFormatter(log_formatter)
        
        # 로거 설정
        self.logger = logging.getLogger('SerialMonitor')
        self.logger.setLevel(logging.INFO)
        self.logger.addHandler(file_handler)

    def perform_cleanup(self):
        """주기적인 메모리 정리 수행"""
        # GUI 로그 정리
        if self.log_text.document().lineCount() > 1000:
            cursor = self.log_text.textCursor()
            cursor.movePosition(cursor.Start)
            cursor.movePosition(cursor.Down, cursor.KeepAnchor, 
                              self.log_text.document().lineCount() - 500)
            cursor.removeSelectedText()
        
        # 가비지 컬렉션 강제 실행
        gc.collect()
        
        # 연결 상태 확인 및 필요시 재연결
        self.check_connections()

    def check_connections(self):
        """연결 상태 확인 및 복구"""
        try:
            if self.serial and self.serial.is_open:
                # 시리얼 연결 테스트
                self.serial.write(b'\x00')
        except Exception as e:
            self.logger.error(f"시리얼 연결 오류 감지: {e}")
            self.reconnect_serial()

        if self.server_thread and not self.server_thread.sio.connected:
            self.logger.warning("서버 연결 끊김 감지")
            self.reconnect_server()

    def update_log(self, output):
        """로그 업데이트 최적화"""
        # 로그 파일에 기록
        self.logger.info(output)
        
        # GUI에는 최근 로그만 표시
        self.log_text.append(output)
        
        # 서버 전송
        if self.server_thread and self.server_thread.sio.connected:
            try:
                # 데이터 파싱 및 전송
                parsed_data = self.parse_log_data(output)
                self.server_thread.send_data(parsed_data)
            except Exception as e:
                self.logger.error(f"데이터 전송 오류: {e}")

    def parse_log_data(self, output):
        """로그 데이터 파싱 최적화"""
        try:
            # 기존 파싱 로직을 더 견고하게 수정
            parts = output.split("수위: ")
            if len(parts) < 2:
                raise ValueError("잘못된 로그 형식")
                
            water_level_str = parts[1].split("mm")[0].strip()
            water_level = int(water_level_str)
            
            machine_status = "작동중" in output
            
            return {
                'timestamp': datetime.now().isoformat(),
                'water_level': water_level,
                'machine_status': machine_status,
                'raw_data': output
            }
            
        except Exception as e:
            self.logger.error(f"데이터 파싱 오류: {e}")
            return None

    def reconnect_serial(self):
        """시리얼 연결 복구 시도"""
        try:
            self.disconnect()
            time.sleep(1)
            self.connect()
        except Exception as e:
            self.logger.error(f"시리얼 재연결 실패: {e}") 

    def reconnect_server(self):
        if self.server_thread:
            self.server_thread.stop()
            self.server_thread.wait()
        
        self.server_thread = ServerThread(url=self.server_url.text())
        self.server_thread.connection_error.connect(self.show_error)
        self.server_thread.connection_success.connect(self.show_status)
        self.start_thread(self.server_thread)


        
    def update_ports(self):
        self.port_cb.clear()
        available_ports = []
    
        for port in serial.tools.list_ports.comports():
            available_ports.append({
                'device': port.device,
                'description': port.description,
                'active': True
             })
    
         # COM1~COM10 중 연결되지 않은 포트 추가
        for i in range(1, 11):
             port_name = f'COM{i}'
             if not any(p['device'] == port_name for p in available_ports):
                available_ports.append({
                   'device': port_name,
                   'description': '연결 안됨',
                   'active': False
                 })
     
         # 포트 정렬 및 ComboBox에 추가
        for port in sorted(available_ports, key=lambda x: x['device']):
            self.port_cb.addItem(f"{port['device']} - {port['description']}")
          # 비활성 포트는 회색으로 표시
            if not port['active']:
                 index = self.port_cb.count() - 1
                 self.port_cb.setItemData(index, Qt.lightGray, Qt.ForegroundRole)
    
    def start_thread(self, thread):
        self.threads.append(thread)
        thread.finished.connect(lambda: self.thread_finished(thread))
        thread.start()
    
    def thread_finished(self, thread):
        if thread in self.threads:
            self.threads.remove(thread)
    
    def closeEvent(self, event):
        # 모든 스레드 정리
        for thread in self.threads:
            if hasattr(thread, 'stop'):
                thread.stop()
            thread.wait(1000)  # 1초 대기
            if thread.isRunning():
                thread.terminate()  # 강제 종료
        event.accept()

    def toggle_connection(self):
        if self.serial is None or not self.serial.is_open:
            self.connect()
        else:
            self.disconnect()
            
    def connect(self):
        """시리얼 포트 연결을 시도
    
          선택된 포트와 통신 설정으로 시리얼 연결을 수립합니다.
          연결 성공 시 데이터 수신 스레드를 시작하고, 
          실패 시 오류 메시지를 표시합니다.
        """


        try:
            port = self.port_cb.currentText().split(' ')[0]  # "(연결됨)" 텍스트 제거
            baudrate = int(self.baud_cb.currentText())
            
            # Data bits 매핑
            data_bits_map = {
                '5': serial.FIVEBITS,
                '6': serial.SIXBITS,
                '7': serial.SEVENBITS,
                '8': serial.EIGHTBITS
            }
            
            # Stop bits 매핑
            stop_bits_map = {
                '1': serial.STOPBITS_ONE,
                '1.5': serial.STOPBITS_ONE_POINT_FIVE,
                '2': serial.STOPBITS_TWO
            }
            
            # Parity 매핑
            parity_map = {
                'None': serial.PARITY_NONE,
                'Even': serial.PARITY_EVEN,
                'Odd': serial.PARITY_ODD,
                'Mark': serial.PARITY_MARK,
                'Space': serial.PARITY_SPACE
            }
            
            self.serial = serial.Serial(
                port=port,
                baudrate=baudrate,
                bytesize=data_bits_map[self.data_bits_cb.currentText()],
                stopbits=stop_bits_map[self.stop_bits_cb.currentText()],
                parity=parity_map[self.parity_cb.currentText()],
                timeout=1
            )
            
            self.connect_btn.setText('해제')
            status = f"연결됨: {port} @ {baudrate} baud"
            self.statusBar().showMessage(status)
            
            if self.save_cb.isChecked():
                self.filename = f"serial_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
                full_path = os.path.abspath(self.filename)
                print(f"파일 저장 시작: {full_path}")
                self.log_text.append(f"데이터를 {full_path}에 저장합니다.")
            
            self.serial_thread = SerialThread(self.serial)
            self.serial_thread.data_received.connect(self.update_log)
            self.serial_thread.error_occurred.connect(self.show_error)
            self.serial_thread.start()
            
        except serial.SerialException as e:
            self.show_error(str(e))
            
    def disconnect(self):
        if self.serial_thread:
            self.serial_thread.stop()
            self.serial_thread.wait()
            self.serial_thread = None
            
        if self.serial and self.serial.is_open:
            self.serial.close()
            self.serial = None
            
        self.connect_btn.setText('연결')
        self.statusBar().showMessage('연결 해제됨')
        
    def update_log(self, output):
        """로그 데이터를 업데이트하고 필요한 처리를 수행
    
           Args:
                output (str): 로그에 추가할 출력 문자열
        
           Notes:
                - GUI 로그 창에 데이터를 추가
                - 서버로 데이터 전송
                - 파일 저장 옵션이 켜져 있을 경우 파일에 저장
                - 오래된 로그 파일 정리
        """



        self.log_text.append(output)
        
        # 서버로 데이터 전송
        if self.server_thread and self.server_thread.sio.connected:
            try:
                # 출력에서 파싱된 데이터 추출
                timestamp = output[1:24]  # [YYYY-MM-DD HH:MM:SS.mmm] 형식
                water_level = int(output.split("수위: ")[1].split("mm")[0])
                machine_status = "작동중" in output
                ascii_values = output.split("ASCII: ")[1].split("\n")[0] if "ASCII: " in output else ""
                
                data = {
                    'timestamp': datetime.now().isoformat(),
                    'water_level': water_level,
                    'machine_status': machine_status,
                    'ascii_data': ascii_values,
                    'raw_data': output
                }
                self.server_thread.send_data(data)
                print(f"서버로 전송된 데이터: {data}")  # 전송 확인용 로그

            except Exception as e:
                print(f"데이터 처리 오류: {e}")
        
        if self.save_cb.isChecked() and self.filename:
            try:
                # 오늘 날짜로 파일명 생성
                today = datetime.now().strftime('%Y%m%d')
                self.filename = f"serial_data_{today}.txt"

                # 파일 저장
                full_path = os.path.abspath(self.filename)
                with open(self.filename, 'a', encoding='utf-8') as f:
                    f.write(output + '\n')
                print(f"데이터가 {full_path}에 저장되었습니다.")

                # 오래된 파일 정리 (3개월 이상된 파일 삭제)
                self.cleanup_old_files()

            except Exception as e:
                print(f"파일 저장 중 오류 발생: {e}")
    

    def cleanup_old_files(self):
        """오래된 로그 파일들을 정리
    
           3개월(90일) 이상 된 로그 파일들을 자동으로 삭제합니다.
           파일명의 날짜를 기준으로 판단합니다.
        """



        try:
            # 3개월 전 날짜 계산
            three_months_ago = datetime.now() - timedelta(days=90)

            # 로그 파일이 있는 디렉토리 검사
            current_dir = os.path.dirname(os.path.abspath(self.filename))

            for filename in os.listdir(current_dir):
                if filename.startswith("serial_data_") and filename.endswith(".txt"):
                    try:
                        # 파일명에서 날짜 추출 (serial_data_20240121.txt 형식)
                        file_date_str = filename.split('_')[2].split('.')[0]
                        file_date = datetime.strptime(file_date_str, '%Y%m%d')
                        
                        # 3개월 이상 된 파일 삭제
                        if file_date < three_months_ago:
                            file_path = os.path.join(current_dir, filename)
                            os.remove(file_path)
                            print(f"오래된 파일 삭제됨: {filename}")

                    except ValueError:
                        continue # 날짜 형식이 잘못된 파일은 무시
        
        except Exception as e :
            print(f"파일 정리 중 오류 발생: {e}")


    def log_error(self, error_msg):
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
        error_log = f"[{timestamp}] 오류: {error_msg}"
        self.log_text.append(f'<span style="color: red">{error_log}</span>')
        print(f"Error: {error_log}")  # 콘솔에도 출력

        if self.save_cb.isChecked() and self.filename:
            with open(self.filename, 'a', encoding='utf-8') as f:
                f.write(error_log + '\n')


    def show_error(self, error_msg):
        QMessageBox.critical(self, '오류', error_msg)
        self.log_error(error_msg)  # 에러 로그에도 기록
        
    def show_status(self, status_msg):
        if "성공" in status_msg:
            self.server_status_label.setStyleSheet("color: green")
        elif "실패" in status_msg or "끊김" in status_msg:
            self.server_status_label.setStyleSheet("color: red")
        else:
            self.server_status_label.setStyleSheet("")
        self.server_status_label.setText(f'서버: {status_msg}')
        
    def closeEvent(self, event):
        self.disconnect()
        if self.server_thread:
            self.server_thread.stop()
            self.server_thread.wait()
        event.accept()

def main():
    app = QApplication(sys.argv)
    window = SerialGUI()
    window.show()
    sys.exit(app.exec_())

if __name__ == '__main__':
    main()