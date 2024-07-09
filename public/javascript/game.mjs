import { addClass, removeClass } from './helpers/dom-helper.mjs';
import { showMessageModal, showInputModal, showResultsModal } from './views/modal.mjs';
import { startTimer, appendRoomElement, gameTimer, hideRoom, removeRoomElement, showRoom, updateNumberOfUsersInRoom, innerText } from './views/room.mjs';
import { appendUserElement, changeReadyStatus, removeUserElement, setProgress, wipeUsers } from './views/user.mjs';

const username = sessionStorage.getItem('username');

const gamePage = document.getElementById('game-page');
const roomsPage = document.getElementById('rooms-page');
const addRoomBtn = document.getElementById('add-room-btn');
const quitRoomBtn  = document.getElementById('quit-room-btn');
const readyBtn  = document.getElementById('ready-btn');

if (!username) {
    window.location.replace('/signin');
}

const socket = io("http://localhost:3001/game", { query: { username } });

let text = '';
let keyIdx = 0;
let gameTimerInterval;
let startTimerInterval

const showPage = (page) => {
    removeClass(page, 'display-none');
    const hidePage = page === gamePage ? roomsPage : gamePage;
    addClass(hidePage, 'display-none');    
}

const onJoinRoom = (roomName)=> {
    socket.emit("join-room", roomName);
    const roomNameElement = document.getElementById('room-name');
    roomNameElement.textContent = roomName;
    showPage(gamePage);
}

const handleKeyPress = event => {
    const textArr = text.split('');
    const currentKey = textArr[keyIdx];
    const { key } = event;

    if (!event.repeat && key === currentKey){
        keyIdx+= 1;
        const progress = Math.round((keyIdx / textArr.length) * 100);
        socket.emit('PROGRESS', progress);
        setProgress({ username, progress });

        if (progress === 100) {
            innerText(`<mark>${text}</mark>`)
            window.removeEventListener('keydown', handleKeyPress);
            socket.emit("USER_COMPLETE_RACE");
            return
        }
        innerText(`
            <mark>${textArr.slice(0, keyIdx).join('')}</mark>
            <span id="current-key">${textArr[keyIdx]}</span>
            <span>${textArr.slice(keyIdx + 1).join('')}</span>
        `);
    }
}

const resetRoom = () => {
    keyIdx = 0;
    text = '';
    innerText('');

    removeClass(readyBtn, 'display-none');
    removeClass(quitRoomBtn, 'display-none');

    readyBtn.textContent = 'READY';
}

socket.on('connect', () => {
    console.log('Connected');
});

socket.on("username-taken", () => {
    showMessageModal({
        message:'Username already taken',
        onClose:()=> {
            sessionStorage.removeItem('username');
            socket.disconnect();
            window.location.replace('/signin');
        }
    });
});

socket.on('show-rooms', (rooms) => {
    rooms.forEach(([name, room]) => {
        const newRoom = appendRoomElement({
            name,
            numberOfUsers: room.numberOfUsers,
            onJoin: () => onJoinRoom(name)
        })
        room.isHidden && addClass(newRoom, 'display-none');

    });
});

socket.on("ADD_ROOM", ([name, { numberOfUsers }]) => {
    appendRoomElement({ name, numberOfUsers, onJoin: () => onJoinRoom(name) });
})

socket.on('create-room-done', (name) => {
    socket.emit('join-room', name);
    const roomNameElement = document.getElementById('room-name');
    roomNameElement.textContent = name;
    showPage(gamePage);
})

socket.on("SHOW_MESSAGE", (message) => showMessageModal({ message }));

socket.on("UPDATE_ROOM", ([roomName, { numberOfUsers, isHidden }]) => {
    if (isHidden) {
        hideRoom(roomName);
    } else {
        showRoom(roomName);
    }
    updateNumberOfUsersInRoom({name: roomName, numberOfUsers});
})

socket.on("DELETE_ROOM", name => removeRoomElement(name));

socket.on("SHOW_USERS_IN_ROOM" , users => {
    users.forEach(user => appendUserElement({
       username: user.name,
       ready: user.isReady,
       isCurrentUser: user.name === username
    }));
})

socket.on("ADD_USER_IN_ROOM", user => {
    appendUserElement({
        username: user.name,
        ready: user.isReady,
        isCurrentUser: user.name === username
    })
})

socket.on("DELETE_USER_IN_ROOM", user => {
    removeUserElement(user.name)
})

socket.on("UPDATE_USERS_STATUS", user => {
    changeReadyStatus({ username: user.name, ready: user.isReady });
})

socket.on("START_TIMER", ({
    SECONDS_TIMER_BEFORE_START_GAME,
    textId
}) => {
    addClass(readyBtn, 'display-none');
    addClass(quitRoomBtn, 'display-none');

    fetch(`/game/texts/${textId}`, { method: 'GET' }).then(async res => {
        const resJson = await res.json();
        text = resJson.text;
    })

    startTimerInterval = startTimer(SECONDS_TIMER_BEFORE_START_GAME);
})

socket.on("START_GAME", SECONDS_FOR_GAME => {
    innerText(text);
    gameTimerInterval = gameTimer(SECONDS_FOR_GAME)
    window.addEventListener('keydown', handleKeyPress)
})

socket.on("TIME_EXPIRED", () => {
    window.removeEventListener('keydown', handleKeyPress)
})

socket.on("UPDATE_PROGRESS", ({ name, progress }) => {
    setProgress({ username: name, progress });
})

socket.on("SHOW_RACE_RESULT", (raceResult) => {
    showResultsModal({ usersSortedArray: raceResult, onClose: resetRoom });
    const gameTimer = document.getElementById('game-timer');
    addClass(gameTimer, 'display-none');
    gameTimerInterval && clearInterval(gameTimerInterval);
    startTimerInterval && clearInterval(startTimerInterval);
})

addRoomBtn.addEventListener('click', () => {
    let roomName = ''
    showInputModal({
        title: 'New room name',
        onChange: (value) => roomName = value,

        onSubmit: () => {
            socket.emit('create-room', roomName);
        }
    });
});

quitRoomBtn.addEventListener('click', () => {
    socket.emit('quit-room');
    wipeUsers();
    showPage(roomsPage);
})

readyBtn.addEventListener('click', () => {
    const isReady = readyBtn.textContent === 'READY';
    if (isReady) {
        socket.emit('READY');
        changeReadyStatus({ username, ready: true });
        readyBtn.textContent = 'NOT READY';
    } else {
        socket.emit('NOT_READY');
        changeReadyStatus({ username, ready: false });
        readyBtn.textContent = 'READY';
    }
})