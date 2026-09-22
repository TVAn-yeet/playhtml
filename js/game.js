import {
    playhtml
} from "https://unpkg.com/playhtml";

import {
    SIZE,
    TYPE_LABEL,
    TYPE_ICON,
    createInitialBoard,
    indexOf,
    validateMove,
    applyMove
} from "./rules.js";


/*
 * ROOM
 */

const params =
    new URLSearchParams(
        location.search
    );

const roomId =
    params.get("room");


if (!roomId) {
    alert(
        "Không tìm thấy Room ID."
    );

    location.href =
        "./index.html";
}


/*
 * DOM
 */

const roomLabel =
    document.getElementById(
        "room-label"
    );

const copyLinkButton =
    document.getElementById(
        "copy-link"
    );

const backLobbyButton =
    document.getElementById(
        "back-lobby"
    );

const p1State =
    document.getElementById(
        "p1-state"
    );

const p2State =
    document.getElementById(
        "p2-state"
    );

const turnLabel =
    document.getElementById(
        "turn-label"
    );

const statusLabel =
    document.getElementById(
        "status-label"
    );

const countsContent =
    document.getElementById(
        "counts-content"
    );

const boardElement =
    document.getElementById(
        "board"
    );

const coordinatesX =
    document.getElementById(
        "coordinates-x"
    );

const winBanner =
    document.getElementById(
        "win-banner"
    );


/*
 * ROOM LABEL
 */

roomLabel.textContent =
    `Room ${roomId}`;


/*
 * LOCAL STATE
 */

let currentState = null;

let myPlayer = null;

let selectedSquare = null;

let gameHandle = null;


/*
 * PRESENCE CHANNEL
 */

const PRESENCE_CHANNEL =
    "ottv2-player";


/*
 * DEFAULT GAME STATE
 */

const defaultState = {
    board:
        createInitialBoard(),

    turn: 1,

    winner: null,

    winReason: null,

    moveNumber: 0
};


/*
 * CREATE HIDDEN SHARED STATE ELEMENT
 *
 * game.html doesn't need to contain
 * this element manually.
 */

let stateElement =
    document.getElementById(
        "game-state"
    );


if (!stateElement) {
    stateElement =
        document.createElement(
            "div"
        );

    stateElement.id =
        "game-state";

    stateElement.style.display =
        "none";

    document.body.appendChild(
        stateElement
    );
}


/*
 * PLAYHTML CUSTOM ELEMENT
 */

playhtml.register(
    "game-state",
    {
        defaultData:
            defaultState,

        updateElement(
            element,
            data
        ) {
            currentState =
                data;

            render(data);
        }
    }
);


/*
 * INITIALIZE PLAYHTML
 */

playhtml.init({
    room:
        `ottv2-game-${roomId}`
});


/*
 * MAIN STARTUP
 */

async function start() {

    /*
     * Wait until PlayHTML is ready.
     */

    await playhtml.ready;


    /*
     * Get the shared state handle.
     */

    gameHandle =
        playhtml.getHandle(
            "game-state"
        );


    /*
     * Announce this browser
     * in Presence.
     */

    playhtml.presence.setMyPresence(
        PRESENCE_CHANNEL,
        {
            joined: true
        }
    );


    /*
     * Render players immediately.
     */

    updatePlayers();


    /*
     * Listen for player join/leave.
     */

    playhtml.presence.onPresenceChange(
        PRESENCE_CHANNEL,
        () => {
            updatePlayers();
        }
    );


    /*
     * Render initial coordinates.
     */

    renderCoordinates();


    /*
     * Buttons.
     */

    copyLinkButton
        .addEventListener(
            "click",
            copyRoomLink
        );

    backLobbyButton
        .addEventListener(
            "click",
            () => {
                location.href =
                    "./index.html";
            }
        );


    /*
     * Board click.
     */

    boardElement
        .addEventListener(
            "click",
            handleBoardClick
        );


    /*
     * If PlayHTML already has state,
     * render it.
     */

    const existing =
        gameHandle.getData?.();

    if (existing) {
        currentState =
            existing;

        render(existing);
    }
}


start();


/*
 * GET ROOM PLAYERS
 */

function getRoomPlayers() {

    const presences =
        playhtml.presence
            .getPresences();

    return [
        ...presences.entries()
    ]
        .sort(
            ([idA], [idB]) =>
                idA.localeCompare(idB)
        );
}


/*
 * GET MY PLAYER NUMBER
 *
 * First presence = Player 1
 * Second presence = Player 2
 * More = spectator
 */

function getMyPlayerNumber() {

    const players =
        getRoomPlayers();

    const myIndex =
        players.findIndex(
            ([id, presence]) =>
                presence.isMe
        );

    if (myIndex === 0) {
        return 1;
    }

    if (myIndex === 1) {
        return 2;
    }

    return null;
}


/*
 * UPDATE PLAYER STATUS
 */

function updatePlayers() {

    const players =
        getRoomPlayers();


    /*
     * Current player number.
     */

    myPlayer =
        getMyPlayerNumber();


    /*
     * Player 1.
     */

    if (players.length >= 1) {

        const player1 =
            players[0][1];

        if (player1.isMe) {
            p1State.textContent =
                "Bạn";
        }
        else {
            p1State.textContent =
                "Đã tham gia";
        }
    }
    else {
        p1State.textContent =
            "Đang chờ...";
    }


    /*
     * Player 2.
     */

    if (players.length >= 2) {

        const player2 =
            players[1][1];

        if (player2.isMe) {
            p2State.textContent =
                "Bạn";
        }
        else {
            p2State.textContent =
                "Đã tham gia";
        }
    }
    else {
        p2State.textContent =
            "Đang chờ...";
    }


    /*
     * Spectator.
     */

    if (players.length > 2) {
        statusLabel.textContent =
            "Bạn đang xem";
    }
    else if (myPlayer) {
        statusLabel.textContent =
            "Đã kết nối";
    }
    else {
        statusLabel.textContent =
            "Đang chờ...";
    }


    /*
     * Re-render current state.
     */

    if (currentState) {
        render(currentState);
    }
}


/*
 * BOARD CLICK
 */

function handleBoardClick(event) {

    const cell =
        event.target.closest(
            ".cell"
        );

    if (!cell) {
        return;
    }


    if (!currentState) {
        return;
    }


    /*
     * Spectator cannot move.
     */

    if (!myPlayer) {

        statusLabel.textContent =
            "Bạn đang xem";

        return;
    }


    /*
     * Game finished.
     */

    if (currentState.winner) {
        return;
    }


    /*
     * Not player's turn.
     */

    if (
        currentState.turn !==
        myPlayer
    ) {

        statusLabel.textContent =
            "Chưa đến lượt bạn.";

        return;
    }


    const x =
        Number(
            cell.dataset.x
        );

    const y =
        Number(
            cell.dataset.y
        );


    /*
     * Nothing selected yet.
     */

    if (!selectedSquare) {

        const piece =
            currentState.board[
                indexOf(x, y)
            ];

        if (
            !piece ||
            piece.player !== myPlayer
        ) {

            statusLabel.textContent =
                "Hãy chọn quân của bạn.";

            return;
        }


        selectedSquare = {
            x,
            y
        };


        statusLabel.textContent =
            "Chọn ô muốn đi.";


        render(
            currentState
        );

        return;
    }


    /*
     * Clicking selected piece again
     * cancels selection.
     */

    if (
        selectedSquare.x === x &&
        selectedSquare.y === y
    ) {

        selectedSquare = null;

        statusLabel.textContent =
            "Đã bỏ chọn.";

        render(
            currentState
        );

        return;
    }


    /*
     * Try move.
     */

    makeMove(
        selectedSquare,
        {
            x,
            y
        }
    );
}
function makeMove(from, to) {

    console.log("=== MAKE MOVE ===");
    console.log("from:", from);
    console.log("to:", to);
    console.log("myPlayer:", myPlayer);
    console.log("currentState:", currentState);
    console.log("gameHandle:", gameHandle);

    if (!gameHandle) {
        console.error("gameHandle is null");
        statusLabel.textContent =
            "Lỗi: gameHandle chưa sẵn sàng.";
        return;
    }

    if (!currentState) {
        console.error("currentState is null");
        statusLabel.textContent =
            "Lỗi: game state chưa sẵn sàng.";
        return;
    }

    const check =
        validateMove(
            currentState,
            myPlayer,
            from,
            to
        );

    console.log("validation:", check);

    if (!check.ok) {

        statusLabel.textContent =
            check.reason;

        return;
    }

    selectedSquare = null;

    statusLabel.textContent =
        "Đang cập nhật...";

    try {

        gameHandle.setData(
            draft => {

                console.log(
                    "SETDATA CALLBACK EXECUTED"
                );

                console.log(
                    "draft before:",
                    draft
                );

                const result =
                    applyMove(
                        draft,
                        myPlayer,
                        from,
                        to
                    );

                console.log(
                    "applyMove result:",
                    result
                );

                if (!result.result.ok) {

                    console.error(
                        "applyMove failed:",
                        result.result
                    );

                    return;
                }

                draft.board =
                    result.state.board;

                draft.turn =
                    result.state.turn;

                draft.winner =
                    result.state.winner;

                draft.winReason =
                    result.state.winReason;

                draft.moveNumber =
                    result.state.moveNumber;

                console.log(
                    "draft after:",
                    draft
                );
            }
        );

        console.log(
            "setData() called successfully"
        );

    }
    catch (error) {

        console.error(
            "setData ERROR:",
            error
        );

        statusLabel.textContent =
            "Lỗi khi cập nhật game.";

        return;
    }

    statusLabel.textContent =
        "Đang cập nhật...";
}
/*
 * RENDER EVERYTHING
 */

function render(state) {

    if (!state) {
        return;
    }


    renderBoard(
        state
    );

    renderTurn(
        state
    );

    renderCounts(
        state
    );

    renderWin(
        state
    );


    /*
     * Don't overwrite useful
     * error messages immediately
     * while a piece is selected.
     */

    if (!selectedSquare) {

        if (state.winner) {

            statusLabel.textContent =
                state.winReason ||
                "Ván đã kết thúc.";
        }

        else if (!myPlayer) {

            statusLabel.textContent =
                "Bạn đang xem.";
        }

        else if (
            state.turn ===
            myPlayer
        ) {

            statusLabel.textContent =
                "Đến lượt bạn.";
        }

        else {

            statusLabel.textContent =
                "Đang chờ đối thủ.";
        }
    }
}


/*
 * RENDER BOARD
 */

function renderBoard(state) {

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

            cell.type =
                "button";

            cell.className =
                "cell";

            cell.dataset.x =
                x;

            cell.dataset.y =
                y;


            /*
             * Coordinates.
             */

            cell.title =
                `${String.fromCharCode(97 + x)}${y + 1}`;


            /*
             * Goal cells.
             */

            if (
                (
                    x === 0 &&
                    y === 0
                )
                ||
                (
                    x === 8 &&
                    y === 8
                )
            ) {

                cell.classList.add(
                    "goal"
                );
            }


            /*
             * Selected cell.
             */

            if (
                selectedSquare &&
                selectedSquare.x === x &&
                selectedSquare.y === y
            ) {

                cell.classList.add(
                    "selected"
                );
            }


            /*
             * Valid destination.
             */

            if (
                selectedSquare &&
                isValidDestination(
                    state,
                    selectedSquare,
                    {
                        x,
                        y
                    }
                )
            ) {

                cell.classList.add(
                    "valid"
                );
            }


            /*
             * Piece.
             */

            const piece =
                state.board[
                    indexOf(x, y)
                ];


            if (piece) {

                cell.classList.add(
                    `player-${piece.player}`
                );

                cell.classList.add(
                    `piece-${piece.type}`
                );


                const icon =
                    document.createElement(
                        "span"
                    );

                icon.className =
                    "piece-icon";

                icon.textContent =
                    TYPE_ICON[
                        piece.type
                    ];


                const label =
                    document.createElement(
                        "span"
                    );

                label.className =
                    "piece-label";

                label.textContent =
                    TYPE_LABEL[
                        piece.type
                    ];


                cell.appendChild(
                    icon
                );

                cell.appendChild(
                    label
                );
            }


            boardElement.appendChild(
                cell
            );
        }
    }
}


/*
 * CHECK VALID DESTINATION
 */

function isValidDestination(
    state,
    from,
    to
) {

    if (!myPlayer) {
        return false;
    }

    const result =
        validateMove(
            state,
            myPlayer,
            from,
            to
        );

    return result.ok;
}


/*
 * RENDER TURN
 */

function renderTurn(state) {

    if (state.winner) {

        turnLabel.textContent =
            `Player ${state.winner}`;

        return;
    }

    turnLabel.textContent =
        `Player ${state.turn}`;
}


/*
 * RENDER COUNTS
 */

function renderCounts(state) {

    const p1 =
        countPieces(
            state,
            1
        );

    const p2 =
        countPieces(
            state,
            2
        );


    countsContent.innerHTML =
        `
        <div class="count-player">
            <strong>Player 1</strong>

            <span>
                👊 ${p1.rock}
                🍃 ${p1.paper}
                ✂️ ${p1.scissors}
            </span>
        </div>

        <div class="count-player">
            <strong>Player 2</strong>

            <span>
                👊 ${p2.rock}
                🍃 ${p2.paper}
                ✂️ ${p2.scissors}
            </span>
        </div>
        `;
}


/*
 * COUNT PIECES
 */

function countPieces(
    state,
    player
) {

    const counts = {
        rock: 0,
        paper: 0,
        scissors: 0
    };


    for (
        const piece of state.board
    ) {

        if (
            piece &&
            piece.player === player
        ) {

            counts[
                piece.type
            ]++;
        }
    }


    return counts;
}


/*
 * RENDER WIN
 */

function renderWin(state) {

    if (!state.winner) {

        winBanner.classList.add(
            "hidden"
        );

        winBanner.textContent =
            "";

        return;
    }


    winBanner.classList.remove(
        "hidden"
    );


    if (
        state.winner ===
        myPlayer
    ) {

        winBanner.textContent =
            `🎉 Bạn thắng! ${state.winReason || ""}`;
    }

    else {

        winBanner.textContent =
            `Player ${state.winner} thắng. ${state.winReason || ""}`;
    }
}


/*
 * COORDINATES
 */

function renderCoordinates() {

    coordinatesX.innerHTML =
        "";

    for (
        let x = 0;
        x < SIZE;
        x++
    ) {

        const coordinate =
            document.createElement(
                "span"
            );

        coordinate.textContent =
            String.fromCharCode(
                97 + x
            );

        coordinatesX.appendChild(
            coordinate
        );
    }
}


/*
 * COPY ROOM LINK
 */

async function copyRoomLink() {

    try {

        await navigator.clipboard.writeText(
            location.href
        );

        statusLabel.textContent =
            "Đã copy link phòng.";
    }

    catch {

        statusLabel.textContent =
            "Không thể copy link.";
    }
}