import { Namespace } from "socket.io";
import { type User } from "./types.js";

export const users = new Map<string, User>();

const checkUsername = (username: string) => {
  return Array.from(users.values()).some(({ name }) => name === username);
};

const isString = (username: unknown): username is string => (typeof username == "string");

export default (io: Namespace) => {
  io.on("connection", socket => {
    const { username } = socket.handshake.query;
    console.log(`User ${username} connected`);

    if (isString(username)) {
      if (checkUsername(username)) {
        io.to(socket.id).emit("username-taken");
        socket.disconnect();
      } else {
        users.set(socket.id, { name: username, isReady: false });
      }

      socket.on("disconnect", () => {
        users.delete(socket.id);
        console.log(`${username} ${socket.id} disconnected`);
      });

    } else {
      io.to(socket.id).emit("invalid-username");
      socket.disconnect();
    }
  });
};
