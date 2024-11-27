import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './SerialMonitor.css';

const SerialMonitor = () => {
    const [serialData, setSerialData] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const socket = io('http://localhost:8000');

        socket.on('connect', () => {
            setIsConnected(true);
            console.log('Connected to server');
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
            console.log('Disconnected from server');
        });

        socket.on('new_data', (data) => {
            setSerialData(prev => [...prev, data]);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    return (
        <div className="serial-monitor">
            <div className="status-bar">
                <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
                    {isConnected ? '연결됨' : '연결 끊김'}
                </span>
            </div>
            <div className="data-display">
                {serialData.map((data, index) => (
                    <div key={index} className="data-row">
                        {data.data}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SerialMonitor;