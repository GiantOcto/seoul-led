/**
 * Socket.IO 접속 베이스 URL.
 * - 프로덕션: 페이지와 동일 출처 → server 의 PORT와 자동 일치
 * - 개발(CRA 기본 :3000): 소켓은 http://localhost:8000 (서버 기본 포트)
 * - 선택: REACT_APP_SOCKET_URL (개발 중 서버 포트를 8000이 아니게 쓸 때 등)
 */
const DEFAULT_DEV_SOCKET = 'http://localhost:8000';

export function getSocketUrl() {
    const explicit = process.env.REACT_APP_SOCKET_URL;
    if (explicit != null && String(explicit).trim() !== '') {
        return String(explicit).trim().replace(/\/$/, '');
    }

    if (typeof window !== 'undefined' && window.location) {
        const { hostname, port, origin } = window.location;
        const isLocal =
            hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
        if (process.env.NODE_ENV === 'development' && isLocal && port === '3000') {
            return DEFAULT_DEV_SOCKET;
        }
        if (origin) {
            return origin;
        }
    }

    return DEFAULT_DEV_SOCKET;
}