type Room = {
  numberOfUsers: number;
  isHidden: boolean;
  raceResult: string[];
  isFinished: boolean;
  startGameInterval?: NodeJS.Timeout
};

type User = {
  name: string;
  isReady: boolean;
  isFinished: boolean;
}

export { type Room, type User };