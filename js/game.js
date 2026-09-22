import { playhtml } from "https://unpkg.com/playhtml";

import {
    SIZE,
    TYPES,
    TYPE_LABEL,
    TYPE_ICON,
    createInitialBoard,
    indexOf,
    isGoal,
    validateMove,
    applyMove
} from "./rules.js";


// ============================================================
// ROOM
// ============================================================

const params =
    new URLSearchParams(window.location.search);

const roomId =
    params.get("room");


if (!roomId) {

    document.body.innerHTML = `
        <h2>Không tìm thấy Room ID</h2>
        <p>Hãy quay lại lobby và tạo hoặc tham gia một phòng.</p>
    `;

    throw new Error("Missing room ID");

}


// ============================================================
// GAME STATE ELEMENT
// ============================================================

const gameStateElement =
    document.createElement("div");

gameStateElement.id =
    "game-state";

gameStateElement.style.display =
    "none";

document.body.appendChild(
    gameStateElement
);


// ============================================================
// INITIAL STATE
// ============================================================

const initialState = {

    version: 1,

    roomId,

    players: {

        1: null,

        2: null

    },

    board:
        createInitialBoard(),

    turn: 1,

    winner: null,

    winReason: null,

    moveNumber: 0

};


// ============================================================
// VARIABLES
// ============================================================

let myPlayer = 0;

let selectedCell = null;

let gameHandle = null;


// ============================================================
// REGISTER PLAYHTML STATE
// ============================================================

gameHandle =
    await playhtml.register(
        "game-state",
        {

            defaultData:
                initialState,

            updateElement:
                ({ data }) => {

                    render(data);

                }

        }
    );


// ============================================================
// INIT PLAYHTML
// ============================================================

await playhtml.init({

    room:
        `ottv2-game-${roomId}`

});


await playhtml.ready;


// ============================================================
// PRESENCE
// ============================================================

function getRoomPlayerIds() {

    const ids =
        new Set();

    const presences =
        playhtml.presence.getPresences();


    for (
        const presence
        of presences.values()
    ) {

        const id =
            presence
                .playerIdentity
                ?.publicKey;


        if (id) {

            ids.add(id);

        }

    }


    return [
        ...ids
    ].sort();

}


// ============================================================
// UPDATE PLAYER ASSIGNMENT
// ============================================================

function updatePlayerAssignment() {

    const playerIds =
        getRoomPlayerIds();


    const myIdentity =
        playhtml.presence
            .getMyIdentity();


    const myId =
        myIdentity?.publicKey;


    if (!myId) {

        myPlayer = 0;

        render();

        return;

    }


    const index =
        playerIds.indexOf(
            myId
        );


    if (index === 0) {

        myPlayer = 1;

    }

    else if (index === 1) {

        myPlayer = 2;

    }

    else {

        myPlayer = 0;

    }


    render();

}


// ============================================================
// ANNOUNCE PRESENCE
// ============================================================

try {

    await playhtml.presence.setMyPresence(
        "ottv2-players",
        {}
    );

}

catch (error) {

    console.warn(
        "Presence error:",
        error
    );

}


// ============================================================
// PRESENCE CHANGE
// ============================================================

try {

    playhtml.presence.onPresenceChange(
        "ottv2-players",
        () => {

            updatePlayerAssignment();

        }
    );

}

catch (error) {

    console.warn(
        "Presence listener error:",
        error
    );

}


// ============================================================
// INITIAL PLAYER ASSIGNMENT
// ============================================================

updatePlayerAssignment();


// ============================================================
// DOM
// ============================================================

const boardElement =
    document.getElementById(
        "board"
    );

const statusElement =
    document.getElementById(
        "status"
    );

const player1State =
    document.getElementById(
        "player1-state"
    );

const player2State =
    document.getElementById(
        "player2-state"
    );

const myPlayerElement =
    document.getElementById(
        "my-player"
    );

const roomElement =
    document.getElementById(
        "room-id"
    );

const copyButton =
    document.getElementById(
        "copy-link"
    );

const backButton =
    document.getElementById(
        "back-lobby"
    );


// ============================================================
// ROOM ID
// ============================================================

if (roomElement) {

    roomElement.textContent =
        roomId;

}


// ============================================================
// PLAYER COUNT
// ============================================================

function getPlayerCount() {

    return getRoomPlayerIds()
        .length;

}


// ============================================================
// GET PIECE
// ============================================================

function getPiece(
    board,
    x,
    y
) {

    return board[
        indexOf(
            x,
            y
        )
    ];

}


// ============================================================
// RENDER
// ============================================================

function render(state) {

    if (!state) {

        return;

    }


    const playerCount =
        getPlayerCount();


    // ========================================================
    // PLAYER 1 STATUS
    // ========================================================

    if (player1State) {

        player1State.textContent =
            playerCount >= 1
                ? "Đã tham gia"
                : "Đang chờ...";

    }


    // ========================================================
    // PLAYER 2 STATUS
    // ========================================================

    if (player2State) {

        player2State.textContent =
            playerCount >= 2
                ? "Đã tham gia"
                : "Đang chờ...";

    }


    // ========================================================
    // MY PLAYER
    // ========================================================

    if (myPlayerElement) {

        if (myPlayer === 1) {

            myPlayerElement.textContent =
                "Bạn là Player 1";

        }

        else if (myPlayer === 2) {

            myPlayerElement.textContent =
                "Bạn là Player 2";

        }

        else {

            myPlayerElement.textContent =
                "Spectator";

        }

    }


    // ========================================================
    // STATUS
    // ========================================================

    if (statusElement) {

        if (state.winner) {

            if (
                state.winner === myPlayer
            ) {

                statusElement.textContent =
                    `Bạn thắng! ${state.winReason}`;

            }

            else {

                statusElement.textContent =
                    `Player ${state.winner} thắng! ${state.winReason}`;

            }

        }

        else if (
            playerCount < 2
        ) {

            statusElement.textContent =
                "Đang chờ người chơi 2...";

        }

        else if (
            state.turn === myPlayer
        ) {

            statusElement.textContent =
                "Đến lượt của bạn";

        }

        else {

            statusElement.textContent =
                `Đến lượt Player ${state.turn}`;

        }

    }


    // ========================================================
    // BOARD
    // ========================================================

    if (!boardElement) {

        return;

    }


    boardElement.innerHTML = "";


    for (
        let y = 0;
        y < SIZE;
        y++
    ) {

        for (
            let x = 0;
            x < SIZE;
            x++
        ) {

            const cell =
                document.createElement(
                    "button"
                );


            cell.className =
                "cell";


            // =================================================
            // COORDINATE
            // =================================================

            const file =
                String.fromCharCode(
                    97 + x
                );

            const rank =
                y + 1;


            const coordinate =
                `${file}${rank}`;


            cell.dataset.x =
                x;

            cell.dataset.y =
                y;

            cell.dataset.coordinate =
                coordinate;


            // =================================================
            // CHECKERBOARD
            // =================================================

            if (
                (x + y) % 2 === 0
            ) {

                cell.classList.add(
                    "light"
                );

            }

            else {

                cell.classList.add(
                    "dark"
                );

            }


            // =================================================
            // GOAL
            // =================================================

            if (
                isGoal(x, y)
            ) {

                cell.classList.add(
                    "goal"
                );

            }


            // =================================================
            // SELECTED
            // =================================================

            if (
                selectedCell &&

                selectedCell.x === x &&

                selectedCell.y === y
            ) {

                cell.classList.add(
                    "selected"
                );

            }


            // =================================================
            // VALID MOVE
            // =================================================

            if (
                isSelectedMove(x, y)
            ) {

                cell.classList.add(
                    "valid-move"
                );

            }


            // =================================================
            // PIECE
            // =================================================

            const piece =
                getPiece(
                    state.board,
                    x,
                    y
                );


            if (piece) {

                const pieceElement =
                    document.createElement(
                        "div"
                    );


                pieceElement.className =
                    `piece player-${piece.player}`;


                pieceElement.textContent =
                    TYPE_ICON[
                        piece.type
                    ];


                pieceElement.title =
                    `Player ${piece.player} - ${
                        TYPE_LABEL[piece.type]
                    }`;


                cell.appendChild(
                    pieceElement
                );

            }


            // =================================================
            // CLICK
            // =================================================

            cell.addEventListener(
                "click",
                () => {

                    onCellClick(
                        x,
                        y,
                        state
                    );

                }
            );


            boardElement.appendChild(
                cell
            );

        }

    }

}


// ============================================================
// VALID MOVE DISPLAY
// ============================================================

function isSelectedMove(
    x,
    y
) {

    if (!selectedCell) {

        return false;

    }


    const dx =
        Math.abs(
            x -
            selectedCell.x
        );


    const dy =
        Math.abs(
            y -
            selectedCell.y
        );


    return (

        dx <= 1 &&

        dy <= 1 &&

        (
            dx !== 0 ||
            dy !== 0
        )

    );

}


// ============================================================
// CELL CLICK
// ============================================================

async function onCellClick(
    x,
    y,
    state
) {

    // ========================================================
    // SPECTATOR
    // ========================================================

    if (
        myPlayer !== 1 &&
        myPlayer !== 2
    ) {

        return;

    }


    // ========================================================
    // WAITING FOR PLAYER 2
    // ========================================================

    if (
        getPlayerCount() < 2
    ) {

        return;

    }


    // ========================================================
    // GAME OVER
    // ========================================================

    if (
        state.winner
    ) {

        return;

    }


    // ========================================================
    // WRONG TURN
    // ========================================================

    if (
        state.turn !== myPlayer
    ) {

        return;

    }


    const clickedPiece =
        getPiece(
            state.board,
            x,
            y
        );


    // ========================================================
    // SELECT PIECE
    // ========================================================

    if (!selectedCell) {

        if (!clickedPiece) {

            return;

        }


        if (
            clickedPiece.player !==
            myPlayer
        ) {

            return;

        }


        selectedCell = {

            x,
            y

        };


        render(state);

        return;

    }


    // ========================================================
    // CLICK SAME PIECE
    // ========================================================

    if (

        selectedCell.x === x &&

        selectedCell.y === y

    ) {

        selectedCell = null;

        render(state);

        return;

    }


    // ========================================================
    // CLICK ANOTHER OWN PIECE
    // ========================================================

    if (

        clickedPiece &&

        clickedPiece.player ===
        myPlayer

    ) {

        selectedCell = {

            x,
            y

        };


        render(state);

        return;

    }


    // ========================================================
    // PREPARE MOVE
    // ========================================================

    const from = {

        x:
            selectedCell.x,

        y:
            selectedCell.y

    };


    const to = {

        x,

        y

    };


    // ========================================================
    // VALIDATE MOVE LOCALLY
    // ========================================================

    const validation =
        validateMove(
            state,
            myPlayer,
            from,
            to
        );


    if (!validation.ok) {

        console.log(
            validation.reason
        );

        return;

    }


    // ========================================================
    // UPDATE SHARED STATE
    // ========================================================

    await gameHandle.setData(
        currentState => {

            // -----------------------------------------------
            // Game already finished
            // -----------------------------------------------

            if (
                currentState.winner
            ) {

                return currentState;

            }


            // -----------------------------------------------
            // Wrong turn
            // -----------------------------------------------

            if (
                currentState.turn !==
                myPlayer
            ) {

                return currentState;

            }


            // -----------------------------------------------
            // Apply move
            // -----------------------------------------------

            const result =
                applyMove(
                    currentState,
                    myPlayer,
                    from,
                    to
                );


            // -----------------------------------------------
            // Invalid
            // -----------------------------------------------

            if (
                !result.result.ok
            ) {

                return currentState;

            }


            // -----------------------------------------------
            // Return new state
            // -----------------------------------------------

            return result.state;

        }
    );


    // ========================================================
    // CLEAR SELECTION
    // ========================================================

    selectedCell = null;


    render(
        state
    );

}


// ============================================================
// COPY ROOM LINK
// ============================================================

if (copyButton) {

    copyButton.addEventListener(
        "click",
        async () => {

            try {

                await navigator.clipboard.writeText(
                    window.location.href
                );


                const oldText =
                    copyButton.textContent;


                copyButton.textContent =
                    "Đã copy!";


                setTimeout(
                    () => {

                        copyButton.textContent =
                            oldText;

                    },
                    1500
                );

            }

            catch (error) {

                console.error(
                    "Copy failed:",
                    error
                );

            }

        }
    );

}


// ============================================================
// BACK TO LOBBY
// ============================================================

if (backButton) {

    backButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "index.html";

        }
    );

}


// ============================================================
// INITIAL RENDER
// ============================================================

const initialData =
    gameHandle.getData?.();


if (initialData) {

    render(
        initialData
    );

}


// ============================================================
// DEBUG
// ============================================================

console.log(
    "[OTTv2] Room:",
    roomId
);

console.log(
    "[OTTv2] My player:",
    myPlayer
);

console.log(
    "[OTTv2] Players:",
    getRoomPlayerIds()
);