import user from './user.js';
import room from './room.js';

import { Server } from 'socket.io';

export default (io: Server) => {
    user(io.of("/game")),
    room(io.of("/game"));
};
