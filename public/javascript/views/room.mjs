import { createElement, removeClass } from '../helpers/dom-helper.mjs';

const appendRoomElement = ({ name, numberOfUsers, onJoin = () => {} }) => {
    const roomsContainer = document.querySelector('#rooms-wrapper');

    const nameElement = createElement({
        tagName: 'div',
        className: 'room-name',
        attributes: { 'data-room-name': name },
        innerElements: [name]
    });

    const numberOfUsersString = getNumberOfUsersString(numberOfUsers);
    const connectedUsersElement = createElement({
        tagName: 'div',
        className: 'connected-users',
        attributes: { 'data-room-name': name, 'data-room-number-of-users': numberOfUsers },
        innerElements: [numberOfUsersString]
    });

    const joinButton = createElement({
        tagName: 'button',
        className: 'join-btn',
        attributes: { 'data-room-name': name },
        innerElements: ['Join']
    });

    const roomElement = createElement({
        tagName: 'div',
        className: 'room',
        attributes: { 'data-room-name': name },
        innerElements: [nameElement, connectedUsersElement, joinButton]
    });

    roomsContainer.append(roomElement);

    joinButton.addEventListener('click', onJoin);

    return roomElement;
};

const updateNumberOfUsersInRoom = ({ name, numberOfUsers }) => {
    const roomConnectedUsersElement = document.querySelector(`.connected-users[data-room-name='${name}']`);
    roomConnectedUsersElement.innerText = getNumberOfUsersString(numberOfUsers);
    roomConnectedUsersElement.dataset.roomNumberOfUsers = numberOfUsers;
};

const showRoom = name => {
    const roomElement = document.querySelector(`.room[data-room-name='${name}']`);
    roomElement.style = '';
};

const hideRoom = name => {
    const roomElement = document.querySelector(`.room[data-room-name='${name}']`);
    roomElement.style = 'display: none';
};

const getNumberOfUsersString = numberOfUsers => `${numberOfUsers} connected`;

const removeRoomElement = name => document.querySelector(`.room[data-room-name='${name}']`)?.remove();

const addTimer = (secondsLeft, id) => {
    const timerElement = document.getElementById(id);
    timerElement.innerText = secondsLeft;
    timerElement.classList.remove('display-none');

    const interval = setInterval(() => {
        secondsLeft -= 1;
        if (secondsLeft === 0) {
            clearInterval(interval);
            timerElement.classList.add('display-none');
        }
        timerElement.innerText = secondsLeft;
    }, 1000);

    return interval;
};

const startTimer = secondsLeft => {
    const interval = addTimer(secondsLeft, 'timer');
    return interval;
};

const gameTimer = secondsLeft => {
    const interval = addTimer(secondsLeft, 'game-timer');
    return interval;
};

const innerText = text => {
    const textElement = document.getElementById('text-container');
    textElement.innerHTML = text;
    removeClass(textElement, 'display-none');
};

export {
    appendRoomElement,
    updateNumberOfUsersInRoom,
    removeRoomElement,
    showRoom,
    hideRoom,
    startTimer,
    gameTimer,
    innerText
};
