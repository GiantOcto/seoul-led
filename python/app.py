import sys
from PyQt5.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
                           QLabel, QComboBox, QPushButton, QCheckBox, QTextEdit, QStatusBar,
                           QGroupBox, QGridLayout, QMessageBox)
from PyQt5.QtCore import Qt, QThread, pyqtSignal
import serial
import serial.tools.list_ports
from datetime import datetime
import socketio
import json

class ServerThread(QThread):
    connection_error = pyqtSignal(str)
    connection_success = pyqtSignal(str)

    def __init__(self, url='http://localhost:3000'):
        super().__init__()
        # Socket.IO 클라이언트 설정 수정
        self.sio = socketio.Client(logger=True, engineio_logger=True)
        self.sio.reconnection = True
        self.sio.reconnection_attempts = 5
        self.sio.reconnection_delay = 1
        self.url = url
        self.running = True

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
                    data = self.serial.readline()
                    try:
                        decoded_data = data.decode('utf-8').strip()
                    except UnicodeDecodeError:
                        decoded_data = data.hex()
                    
                    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
                    output = f"[{timestamp}] {decoded_data}"
                    self.data_received.emit(output)
            except serial.SerialException as e:
                self.error_occurred.emit(str(e))
                break

    def stop(self):
        self.running = False

class SerialGUI(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle('시리얼 통신 모니터')
        self.setGeometry(100, 100, 1000, 600)
        
        self.serial = None
        self.serial_thread = None
        self.server_thread = None
        self.filename = None
        
        # 서버 연결 초기화
        self.server_thread = ServerThread()
        self.server_thread.connection_error.connect(self.show_error)
        self.server_thread.connection_success.connect(self.show_status)
        self.server_thread.start()
        
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
        
    def update_ports(self):
        self.port_cb.clear()
        # 실제 연결된 포트 검색
        available_ports = [port.device for port in serial.tools.list_ports.comports()]
        
        # COM1부터 COM10까지 포트 목록 생성
        all_ports = [f'COM{i}' for i in range(1, 11)]
        
        # 실제 연결된 포트를 먼저 표시하고, 나머지 포트도 추가
        for port in all_ports:
            if port in available_ports:
                self.port_cb.addItem(f'{port} (연결됨)')
            else:
                self.port_cb.addItem(port)

    def toggle_connection(self):
        if self.serial is None or not self.serial.is_open:
            self.connect()
        else:
            self.disconnect()
            
    def connect(self):
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
                self.log_text.append(f"데이터를 {self.filename}에 저장합니다.")
            
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
        self.log_text.append(output)
        
        # 서버로 데이터 전송
        if self.server_thread and self.server_thread.sio.connected:
            data = {
                'timestamp': datetime.now().isoformat(),
                'data': output
            }
            self.server_thread.send_data(data)
        
        if self.save_cb.isChecked() and self.filename:
            with open(self.filename, 'a', encoding='utf-8') as f:
                f.write(output + '\n')
                
    def show_error(self, error_msg):
        QMessageBox.critical(self, '오류', error_msg)
        
    def show_status(self, status_msg):
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