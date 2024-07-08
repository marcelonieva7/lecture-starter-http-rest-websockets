import { Namespace } from "socket.io";

const users: string[] = [];

const checkUsername = (username: string) => {
  return users.includes(username);
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
        users.push(username);
      }

      socket.on("disconnect", () => {
        users.splice(users.indexOf(username), 1);
        console.log(`${username} ${socket.id} disconnected`);
      });

    } else {
      io.to(socket.id).emit("invalid-username");
      socket.disconnect();
    }
  });
};
