import { type Namespace } from "socket.io";
import { type Room } from "./types.js";
import { MAXIMUM_USERS_FOR_ONE_ROOM } from "./config.js";

const roomsMap = new Map<string, Room>();
const isUniqueRoomName = (roomName: string) => roomsMap.get(roomName) === undefined;

roomsMap.set("lobby", { numberOfUsers: 1, isHidden: false });
roomsMap.set("game", { numberOfUsers: 22, isHidden: false });

const getCurrentRoomName = socket => {
  let currrentRoomName: string | undefined;
  roomsMap.forEach((_room, name) => {
    if (socket.rooms.has(name)) {
      currrentRoomName = name;
    }
  })

  return currrentRoomName;
}

export default (io: Namespace) => {
  io.on("connection", socket => {
    socket.emit("show-rooms", Array.from(roomsMap));

    socket.on('create-room', (roomName: string) => {
      
      if (isUniqueRoomName(roomName)) {
        const newRoom = roomsMap.set(roomName, { numberOfUsers: 0, isHidden: false });
        socket.emit("create-room-done", [roomName, newRoom]);
        io.emit("ADD_ROOM", [roomName, newRoom]);

      } else {
        socket.emit("SHOW_MESSAGE", `Room ${roomName} already exists`);
      }      
    })

    socket.on('join-room', (roomName: string) => {
      console.log('join-room', roomName);
      
      const prevRoomName = getCurrentRoomName(socket)

      if (roomName === prevRoomName) {
        return;
      }
      if (prevRoomName) {
        socket.leave(prevRoomName);
      }
      const room = roomsMap.get(roomName);
      
      if (room) {
        if (room.numberOfUsers === MAXIMUM_USERS_FOR_ONE_ROOM) {
          return
        }

        const numberOfUsers = room.numberOfUsers + 1        
        const updatedRoom: Room = {
          ...room,
          numberOfUsers,
          isHidden: numberOfUsers === MAXIMUM_USERS_FOR_ONE_ROOM 
        }          
        roomsMap.set(roomName, updatedRoom);

        socket.join(roomName);
        io.emit("UPDATE_ROOM", [roomName, updatedRoom]);

      } else {
        console.error(`Room ${roomName} not found`);
      }
    })

    socket.on('quit-room', () => {
      const currentRoomName = getCurrentRoomName(socket)

      if (currentRoomName) {
        socket.leave(currentRoomName);
        const currentRoom = roomsMap.get(currentRoomName)!;

        if (currentRoom.numberOfUsers > 1) {
          const updatedRoom: Room = {
            ...currentRoom,
            numberOfUsers: currentRoom.numberOfUsers - 1,
            isHidden: false
          };
          roomsMap.set(currentRoomName, updatedRoom);
          io.emit("UPDATE_ROOM", [currentRoomName, updatedRoom]);

        } else {
          roomsMap.delete(currentRoomName);
          io.emit("DELETE_ROOM", currentRoomName);
        }
      }
    })
  });
};
