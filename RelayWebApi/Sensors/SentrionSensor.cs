using System;
using System.IO.Ports;
using System.Threading;

namespace RelayWebApi.Sensors
{
    public class SentrionSensor : IDisposable
    {
        private SerialPort _serialPort;
        private readonly byte _address = 0x01;

        public void Connect(string portName)
        {
            _serialPort = new SerialPort(portName, 9600, Parity.None, 8, StopBits.One);
            _serialPort.Open();
        }

        public (float humidity, float temperature) ReadData()
        {
            // 포트가 열려있는지 확인
            if (_serialPort == null || !_serialPort.IsOpen)
            {
                throw new InvalidOperationException("The port is closed.");
            }

            byte[] command = { _address, 0x03, 0x01 };
            _serialPort.DiscardInBuffer();
            _serialPort.Write(command, 0, 3);

            Thread.Sleep(100);

            byte[] response = new byte[7];
            int bytesRead = _serialPort.Read(response, 0, 7);

            if (bytesRead != 7 || response[0] != 0x01 || response[1] != 0x07)
            {
                throw new Exception("Invalid response from Sentrion sensor");
            }

            int humidityRaw = (response[3] << 8) | response[4];
            int temperatureRaw = (response[5] << 8) | response[6];

            float humidity = humidityRaw / 10.0f;
            float temperature = (temperatureRaw - 400) / 10.0f;

            return (humidity, temperature);
        }

        public void Dispose()
        {
            _serialPort?.Close();
            _serialPort?.Dispose();
        }
    }
}