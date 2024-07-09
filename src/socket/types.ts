type Room = {
    numberOfUsers: number;
    isHidden: boolean;
    raceResult: string[];
    isFinished: boolean;
    startGameInterval?: NodeJS.Timeout;
    isStarted: boolean;
};

type User = {
    name: string;
    isReady: boolean;
    isFinished: boolean;
};

export { type Room, type User };
