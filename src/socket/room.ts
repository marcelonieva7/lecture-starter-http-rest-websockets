import { type Socket, type Namespace } from "socket.io";
import { type User, type Room } from "./types.js";
import { MAXIMUM_USERS_FOR_ONE_ROOM, SECONDS_FOR_GAME, SECONDS_TIMER_BEFORE_START_GAME } from "./config.js";
import { users } from "./user.js";
import { texts } from "../data.js";

const roomsMap = new Map<string, Room>();
const isUniqueRoomName = (roomName: string) => roomsMap.get(roomName) === undefined;

roomsMap.set("lobby", { numberOfUsers: 0, isHidden: false, raceResult: [], isFinished: false });
roomsMap.set("game", { numberOfUsers: 22, isHidden: false, raceResult: [], isFinished: false });

const getCurrentRoomName = (socket: Socket) => {
  let currrentRoomName: string | undefined;
  roomsMap.forEach((_room, name) => {
    if (socket.rooms.has(name)) {
      currrentRoomName = name;
    }
  });
  return currrentRoomName;
}

const getUsersInRoom = (io: Namespace, roomName: string): User[] => {
  const room = io.adapter.rooms.get(roomName);
  if (!room) return [];

  return Array.from(room)
    .map(socketId => users.get(socketId))
    .filter((user): user is User => user !== undefined);
};

const startGame = (io: Namespace, socket: Socket, roomName: string ) => {
  io.to(roomName).emit("START_TIMER", {
    SECONDS_TIMER_BEFORE_START_GAME,
    textId : getRandomTextId(texts)
  });

  const room = roomsMap.get(roomName)!;
  const updatedRoom: Room = {
    ...room,
    isHidden: true
  }          
  roomsMap.set(roomName, updatedRoom);
  
  io.emit("UPDATE_ROOM", [roomName, updatedRoom]);

  const startGameTimeout = SECONDS_TIMER_BEFORE_START_GAME * 1000;
  const gameDurationTimeout = SECONDS_FOR_GAME * 1000;

  setTimeout(() => {
    io.to(roomName).emit("START_GAME", SECONDS_FOR_GAME);
    const startGameInterval = setTimeout(() => {
      const room = roomsMap.get(roomName)!;
      if (room.isFinished) return;

      io.to(roomName).emit("TIME_EXPIRED")

      const { raceResult } = roomsMap.get(roomName)!
      io.to(roomName).emit("SHOW_RACE_RESULT", raceResult);

      resetRoom(socket, io, roomName);

    }, gameDurationTimeout);
    const room = roomsMap.get(roomName)!;
    roomsMap.set(roomName, {
      ...room,
      startGameInterval: startGameInterval
    })
  }, startGameTimeout);
}

const checkIfAllUsersAreReady = (io: Namespace, socket: Socket, roomName: string): void => {
  const usersInRoom = getUsersInRoom(io, roomName);

  if (usersInRoom.every(user => user.isReady)) {
    startGame(io, socket, roomName);
  }
}

const getRandomTextId = (texts: string[]) => Math.floor(Math.random() * texts.length);

const resetRoom = (socket: Socket, io: Namespace, roomName: string) => {
  const room = roomsMap.get(roomName)!;
  room.startGameInterval && clearTimeout(room.startGameInterval)
  room.raceResult = [];
  room.isFinished = false;
  roomsMap.set(roomName, room);

  const usersInRoom = getUsersInRoom(io, roomName);
  usersInRoom.forEach(user => {
    const updatedUser = { ...user, isReady: false, isFinished: false };
    users.set(socket.id, updatedUser);
    io.to(roomName).emit("UPDATE_USERS_STATUS", updatedUser);
    io.to(roomName).emit("UPDATE_PROGRESS", { name: user.name, progress: 0 });
  })
}

export default (io: Namespace) => {
  io.on("connection", socket => {
    socket.on("disconnecting", () => {
      const room = getCurrentRoomName(socket)!;
      console.log("=========================");
      console.log(room, "room");
    })

    socket.emit("show-rooms", Array.from(roomsMap));

    socket.on('create-room', (roomName: string) => {
      
      if (isUniqueRoomName(roomName)) {
        const newRoom = roomsMap.set(roomName, { numberOfUsers: 0, isHidden: false, raceResult: [], isFinished: false });
        socket.emit("create-room-done", [roomName, newRoom]);
        io.emit("ADD_ROOM", [roomName, newRoom]);

      } else {
        socket.emit("SHOW_MESSAGE", `Room ${roomName} already exists`);
      }      
    })

    socket.on('join-room', (roomName: string) => {
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
       
        const usersInRoom = getUsersInRoom(io, roomName);
        socket.emit("SHOW_USERS_IN_ROOM", usersInRoom);
        socket.to(roomName).emit("ADD_USER_IN_ROOM", users.get(socket.id));
        
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

          socket.to(currentRoomName).emit("DELETE_USER_IN_ROOM", users.get(socket.id));
          io.emit("UPDATE_ROOM", [currentRoomName, updatedRoom]);

          checkIfAllUsersAreReady(io, socket, currentRoomName);

        } else {
          roomsMap.delete(currentRoomName);
          io.emit("DELETE_ROOM", currentRoomName);
        }
      }
    })

    socket.on("READY", () => {
      const currentUser = users.get(socket.id)!
      const updatedUser = { ...currentUser, isReady: true };

      users.set(socket.id, updatedUser);

      const room = getCurrentRoomName(socket)!
      socket.to(room).emit("UPDATE_USERS_STATUS", updatedUser);

      checkIfAllUsersAreReady(io, socket, room);
    })

    socket.on("NOT_READY", () => {
      const currentUser = users.get(socket.id)!
      const updatedUser = { ...currentUser, isReady: false };

      users.set(socket.id, updatedUser);

      const room = getCurrentRoomName(socket)!
      socket.to(room).emit("UPDATE_USERS_STATUS", updatedUser);
    })

    socket.on("PROGRESS", (progress) => {
      const { name } = users.get(socket.id)!;
      const room = getCurrentRoomName(socket)!
      socket.to(room).emit("UPDATE_PROGRESS", { name, progress });
    })

    socket.on("USER_COMPLETE_RACE", () => {
      const user = users.get(socket.id)!;

      const roomName = getCurrentRoomName(socket)!
      const room = roomsMap.get(roomName)!;
      room.raceResult.push(user.name);
      roomsMap.set(roomName, room);

      users.set(socket.id, { ...user, isFinished: true });

      const usersInRoom = getUsersInRoom(io, roomName);

      if (usersInRoom.every(user => user.isFinished)) {
        const { raceResult } = roomsMap.get(roomName)!
        io.to(roomName).emit("SHOW_RACE_RESULT", raceResult);
        resetRoom(socket, io, roomName)
      }
    })
  });
};
