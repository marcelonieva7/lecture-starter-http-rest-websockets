import { addClass, removeClass } from './helpers/dom-helper.mjs';
import { showMessageModal, showInputModal } from './views/modal.mjs';
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

const showPage = (page) => {
    removeClass(page, 'display-none');
    const hidePage = page === gamePage ? roomsPage : gamePage;
    addClass(hidePage, 'display-none');    
}

const onJoinRoom = (roomName)=> {
    socket.emit("join-room", roomName);
    showPage(gamePage);
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

socket.on('create-room-done', ([name]) => {
    socket.emit('join-room', name);
    showPage(gamePage);
})

socket.on("SHOW_MESSAGE", (message) => showMessageModal({ message }));

socket.on("UPDATE_ROOM", ([roomName, { numberOfUsers, isHidden }]) => {
    console.log('UPDATE ROOM');
    console.log(roomName, numberOfUsers, isHidden);
    if (isHidden) {
        hideRoom(roomName);
    } else {
        showRoom(roomName);
    }
    updateNumberOfUsersInRoom({name: roomName, numberOfUsers});
})

socket.on("DELETE_ROOM", name => removeRoomElement(name));

socket.on("SHOW_USERS_IN_ROOM" , users => {
    console.log('SHOW_USERS_IN_ROOM', users);
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