import { io, Socket } from 'socket.io-client';

const SERVER_URL = 'https://cubetimer-server-0yy9.onrender.com';

let socket: Socket | null = null;

export function getSocket(): Socket {
    if (!socket) {
        socket = io(SERVER_URL, {
            transports: ['websocket'],
            autoConnect: true,
        });
    }
    return socket;
}