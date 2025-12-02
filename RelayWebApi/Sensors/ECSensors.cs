using System;
using System.IO.Ports;
using System.Threading;

namespace RelayWebApi.Sensors
{
    public class ECSensor : IDisposable
    {
        private SerialPort _serialPort;

        public void Connect(string portName)
        {
            _serialPort = new SerialPort(portName, 9600, Parity.None, 8, StopBits.One);
            _serialPort.Open();
        }

        public (float h2s, float humidity, float temperature) ReadData()
        {
            // 포트가 열려있는지 확인
            if (_serialPort == null || !_serialPort.IsOpen)
            {
                throw new InvalidOperationException("The port is closed.");
            }

            // 1단계: 가스 농도 읽기 (Command 5)
            byte[] gasCommand = { 0xFF, 0x01, 0x86, 0x00, 0x00, 0x00, 0x00, 0x00, 0x79 };
            _serialPort.DiscardInBuffer();
            _serialPort.Write(gasCommand, 0, 9);
            Console.WriteLine($"[가스] 송신: {BitConverter.ToString(gasCommand)}");
            Thread.Sleep(200);

            byte[] gasResponse = new byte[9];
            int gasBytes = _serialPort.Read(gasResponse, 0, 9);
            Console.WriteLine($"[가스] 수신: {BitConverter.ToString(gasResponse, 0, gasBytes)}");

            // 2단계: 온습도 읽기 (Command 7)
            byte[] tempCommand = { 0xFF, 0x00, 0x87, 0x00, 0x00, 0x00, 0x00, 0x00, 0x79 };
            _serialPort.DiscardInBuffer();
            _serialPort.Write(tempCommand, 0, 9);
            Console.WriteLine($"[온습도] 송신: {BitConverter.ToString(tempCommand)}");
            Thread.Sleep(200);

            byte[] tempResponse = new byte[13];
            int tempBytes = _serialPort.Read(tempResponse, 0, 13);
            Console.WriteLine($"[온습도] 수신 ({tempBytes}바이트): {BitConverter.ToString(tempResponse, 0, tempBytes)}");

            // 파싱
            int gasPpb = (gasResponse[6] << 8) | gasResponse[7];
            Console.WriteLine($"가스 ppb raw: {gasPpb}");

            short tempRaw = (short)((tempResponse[8] << 8) | tempResponse[9]);
            Console.WriteLine($"온도 raw: {tempRaw}");
            float temperature = tempRaw / 100.0f;

            ushort humRaw = (ushort)((tempResponse[10] << 8) | tempResponse[11]);
            Console.WriteLine($"습도 raw: {humRaw}");
            float humidity = humRaw / 100.0f;

            float h2sPpm = gasPpb / 1000.0f;

            return (h2sPpm, humidity, temperature);
        }

        public void Dispose()
        {
            _serialPort?.Close();
            _serialPort?.Dispose();
        }
    }
}