import user from './user.js';
import room from './room.js';

import { Server } from 'socket.io';

import * as config from './config.js';

export default (io: Server) => {
    user(io.of("/game")),
    room(io.of("/game"));

/*     io.on('connection', socket => {
        const username = socket.handshake.query.username;
        console.log(`User ${username} connected SERVERRRRRRR`);
        
    }); */
};
