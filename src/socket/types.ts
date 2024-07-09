type Room = {
  numberOfUsers: number;
  isHidden: boolean;
  raceResult: string[];
};

type User = {
  name: string;
  isReady: boolean;
  isFinished: boolean;
}

export { type Room, type User };