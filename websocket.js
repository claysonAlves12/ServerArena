const WebSocket = require('ws');

const server = new WebSocket.Server({ noServer: true });

server.on('connection', (socket) => {
    console.log('Cliente conectado');

    socket.on('message', (mensagem) => {
        console.log(`Mensagem recebida: ${mensagem}`);
        socket.send('Recebi sua mensagem!');
    });

    socket.on('close', () => {
        console.log('Cliente desconectado');
    });
});

module.exports = server;
