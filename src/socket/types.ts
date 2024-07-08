type Room = {
  numberOfUsers: number;
  isHidden: boolean;
};

type User = {
  name: string;
  isReady: boolean;
}

export { type Room, type User };