import { playhtml } from "https://unpkg.com/playhtml";

import {
    SIZE,
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
        <main style="
            padding: 40px;
            font-family: sans-serif;
        ">
            <h2>Không tìm thấy Room ID</h2>

            <p>
                Hãy quay lại Lobby và tạo hoặc tham gia một room.
            </p>
        </main>
    `;

    throw new Error("Missing Room ID");

}


// ============================================================
// DOM
// ============================================================

const roomLabel =
    document.getElementById("room-label");

const boardElement =
    document.getElementById("board");

const player1State =
    document.getElementById("p1-state");

const player2State =
    document.getElementById("p2-state");

const turnLabel =
    document.getElementById("turn-label");

const statusLabel =
    document.getElementById("status-label");

const countsContent =
    document.getElementById("counts-content");

const winBanner =
    document.getElementById("win-banner");

const coordinatesX =
    document.getElementById("coordinates-x");

const copyButton =
    document.getElementById("copy-link");

const backLobbyButton =
    document.getElementById("back-lobby");


// ============================================================
// ROOM LABEL
// ============================================================

if (roomLabel) {

    roomLabel.textContent =
        `Room ${roomId}`;

}


// ============================================================
// INITIAL GAME STATE
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
// LOCAL VARIABLES
// ============================================================

let gameHandle = null;

let currentState = null;

let myPlayer = 0;

let selectedCell = null;


// ============================================================
// REGISTER GAME STATE
// ============================================================

gameHandle =
    await playhtml.register(
        "game-state",
        {

            defaultData:
                initialState,

            updateElement:
                ({ data }) => {

                    currentState =
                        data;

                    render(data);

                }

        }
    );


// ============================================================
// INITIALIZE PLAYHTML
// ============================================================

await playhtml.init({

    room:
        `ottv2-game-${roomId}`

});


// Wait for PlayHTML connection
await playhtml.ready;


// ============================================================
// PRESENCE
// ============================================================
//
// Player assignment:
//
// First unique identity  -> Player 1
// Second unique identity -> Player 2
// Others                 -> Spectator
//
// We use publicKey instead of shared-state writes.
// This prevents two players from racing to claim Player 1.
//

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


    return Array
        .from(ids)
        .sort();

}


// ============================================================
// GET PLAYER COUNT
// ============================================================

function getPlayerCount() {

    return getRoomPlayerIds().length;

}


// ============================================================
// UPDATE MY PLAYER
// ============================================================

function updatePlayerAssignment() {

    const playerIds =
        getRoomPlayerIds();


    const myIdentity =
        playhtml.presence.getMyIdentity();


    const myId =
        myIdentity?.publicKey;


    if (!myId) {

        myPlayer = 0;

        render(currentState);

        return;

    }


    const index =
        playerIds.indexOf(myId);


    if (index === 0) {

        myPlayer = 1;

    }

    else if (index === 1) {

        myPlayer = 2;

    }

    else {

        myPlayer = 0;

    }


    render(currentState);

}


// ============================================================
// ANNOUNCE MY PRESENCE
// ============================================================

try {

    await playhtml.presence.setMyPresence(
        "ottv2-players",
        {}
    );

}

catch (error) {

    console.warn(
        "[OTTv2] Could not set presence:",
        error
    );

}


// ============================================================
// PRESENCE CHANGE LISTENER
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
        "[OTTv2] Could not listen for presence changes:",
        error
    );

}


// ============================================================
// INITIAL PLAYER ASSIGNMENT
// ============================================================

updatePlayerAssignment();


// ============================================================
// PIECE HELPERS
// ============================================================

function getPiece(
    board,
    x,
    y
) {

    return board[
        indexOf(x, y)
    ];

}


// ============================================================
// PIECE NAME
// ============================================================

function getPieceLabel(type) {

    return (
        TYPE_LABEL[type] ||
        type
    );

}


// ============================================================
// PIECE ICON
// ============================================================

function getPieceIcon(type) {

    return (
        TYPE_ICON[type] ||
        ""
    );

}


// ============================================================
// COORDINATE
// ============================================================

function getCoordinate(x, y) {

    const letter =
        String.fromCharCode(
            97 + x
        );


    const number =
        y + 1;


    return `${letter}${number}`;

}


// ============================================================
// RENDER BOARD
// ============================================================

function renderBoard(state) {

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
                document.createElement("button");


            cell.type =
                "button";


            cell.className =
                "cell";


            // ------------------------------------------------
            // Coordinates
            // ------------------------------------------------

            cell.dataset.x =
                x;

            cell.dataset.y =
                y;

            cell.dataset.coordinate =
                getCoordinate(x, y);


            // ------------------------------------------------
            // Checkerboard
            // ------------------------------------------------

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


            // ------------------------------------------------
            // Goal square
            // ------------------------------------------------

            if (
                isGoal(x, y)
            ) {

                cell.classList.add(
                    "goal"
                );

            }


            // ------------------------------------------------
            // Selected square
            // ------------------------------------------------

            if (
                selectedCell &&

                selectedCell.x === x &&

                selectedCell.y === y
            ) {

                cell.classList.add(
                    "selected"
                );

            }


            // ------------------------------------------------
            // Valid move highlight
            // ------------------------------------------------

            if (
                selectedCell &&
                isPotentialMove(
                    state,
                    selectedCell,
                    {
                        x,
                        y
                    }
                )
            ) {

                cell.classList.add(
                    "valid-move"
                );

            }


            // ------------------------------------------------
            // Piece
            // ------------------------------------------------

            const piece =
                getPiece(
                    state.board,
                    x,
                    y
                );


            if (piece) {

                const pieceElement =
                    document.createElement("div");


                pieceElement.className =
                    `piece player-${piece.player}`;


                pieceElement.textContent =
                    getPieceIcon(
                        piece.type
                    );


                pieceElement.title =
                    `Player ${piece.player} - ` +
                    `${getPieceLabel(piece.type)}`;


                cell.appendChild(
                    pieceElement
                );

            }


            // ------------------------------------------------
            // Click handler
            // ------------------------------------------------

            cell.addEventListener(
                "click",
                () => {

                    handleCellClick(
                        x,
                        y
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
// POTENTIAL MOVE
// ============================================================
//
// This is only for visual highlighting.
// The actual move is checked again by validateMove().
//

function isPotentialMove(
    state,
    from,
    to
) {

    if (!state) {

        return false;

    }


    if (
        from.x === to.x &&
        from.y === to.y
    ) {

        return false;

    }


    const dx =
        Math.abs(
            to.x - from.x
        );


    const dy =
        Math.abs(
            to.y - from.y
        );


    if (
        dx > 1 ||
        dy > 1
    ) {

        return false;

    }


    const target =
        getPiece(
            state.board,
            to.x,
            to.y
        );


    // Own pieces cannot be entered.
    if (
        target &&
        target.player === myPlayer
    ) {

        return false;

    }


    const test =
        validateMove(
            state,
            myPlayer,
            from,
            to
        );


    return test.ok;

}


// ============================================================
// RENDER PLAYER STATUS
// ============================================================

function renderPlayerStatus() {

    const playerIds =
        getRoomPlayerIds();


    const playerCount =
        playerIds.length;


    if (player1State) {

        if (playerCount >= 1) {

            player1State.textContent =
                "Đã tham gia";

        }

        else {

            player1State.textContent =
                "Đang chờ...";

        }

    }


    if (player2State) {

        if (playerCount >= 2) {

            player2State.textContent =
                "Đã tham gia";

        }

        else {

            player2State.textContent =
                "Đang chờ...";

        }

    }

}


// ============================================================
// RENDER TURN
// ============================================================

function renderTurn(state) {

    if (!turnLabel) {

        return;

    }


    if (!state) {

        turnLabel.textContent =
            "Đang tải...";

        return;

    }


    if (state.winner) {

        turnLabel.textContent =
            "Ván đã kết thúc";

        return;

    }


    if (
        getPlayerCount() < 2
    ) {

        turnLabel.textContent =
            "Đang chờ Player 2";

        return;

    }


    turnLabel.textContent =
        `Player ${state.turn}`;

}


// ============================================================
// RENDER STATUS
// ============================================================

function renderStatus(state) {

    if (!statusLabel) {

        return;

    }


    if (!state) {

        statusLabel.textContent =
            "Đang kết nối...";

        return;

    }


    const playerCount =
        getPlayerCount();


    // --------------------------------------------------------
    // Winner
    // --------------------------------------------------------

    if (state.winner) {

        if (
            state.winner === myPlayer
        ) {

            statusLabel.textContent =
                "Bạn đã thắng!";

        }

        else {

            statusLabel.textContent =
                `Player ${state.winner} thắng!`;

        }

        return;

    }


    // --------------------------------------------------------
    // Waiting
    // --------------------------------------------------------

    if (
        playerCount < 2
    ) {

        statusLabel.textContent =
            "Đang chờ người chơi 2...";

        return;

    }


    // --------------------------------------------------------
    // My turn
    // --------------------------------------------------------

    if (
        state.turn === myPlayer
    ) {

        statusLabel.textContent =
            "Đến lượt của bạn";

        return;

    }


    // --------------------------------------------------------
    // Opponent turn
    // --------------------------------------------------------

    statusLabel.textContent =
        `Đang chờ Player ${state.turn}`;

}


// ============================================================
// RENDER COUNTS
// ============================================================

function renderCounts(state) {

    if (!countsContent) {

        return;

    }


    countsContent.innerHTML = "";


    for (
        const player of [1, 2]
    ) {

        const counts = {

            rock: 0,

            paper: 0,

            scissors: 0

        };


        for (
            const piece
            of state.board
        ) {

            if (
                piece &&
                piece.player === player
            ) {

                if (
                    counts[piece.type] !== undefined
                ) {

                    counts[piece.type]++;

                }

            }

        }


        const total =
            counts.rock +
            counts.paper +
            counts.scissors;


        const playerBox =
            document.createElement("div");


        playerBox.className =
            `count-player player-${player}`;


        playerBox.innerHTML = `

            <strong>
                Player ${player}
            </strong>

            <div class="count-row">
                <span>
                    ${TYPE_ICON.rock}
                    ${TYPE_LABEL.rock}
                </span>

                <span>
                    ${counts.rock}
                </span>
            </div>

            <div class="count-row">
                <span>
                    ${TYPE_ICON.paper}
                    ${TYPE_LABEL.paper}
                </span>

                <span>
                    ${counts.paper}
                </span>
            </div>

            <div class="count-row">
                <span>
                    ${TYPE_ICON.scissors}
                    ${TYPE_LABEL.scissors}
                </span>

                <span>
                    ${counts.scissors}
                </span>
            </div>

            <div class="count-total">
                Tổng: ${total}
            </div>

        `;


        countsContent.appendChild(
            playerBox
        );

    }

}


// ============================================================
// RENDER WIN BANNER
// ============================================================

function renderWinBanner(state) {

    if (!winBanner) {

        return;

    }


    if (!state || !state.winner) {

        winBanner.textContent = "";

        winBanner.classList.add(
            "hidden"
        );

        return;

    }


    if (
        state.winner === myPlayer
    ) {

        winBanner.textContent =
            `🎉 Bạn thắng! ${state.winReason}`;

    }

    else {

        winBanner.textContent =
            `Player ${state.winner} thắng! ${state.winReason}`;

    }


    winBanner.classList.remove(
        "hidden"
    );

}


// ============================================================
// RENDER COORDINATES
// ============================================================

function renderCoordinates() {

    if (!coordinatesX) {

        return;

    }


    coordinatesX.innerHTML = "";


    for (
        let x = 0;
        x < SIZE;
        x++
    ) {

        const coordinate =
            document.createElement("span");


        coordinate.textContent =
            String.fromCharCode(
                97 + x
            );


        coordinatesX.appendChild(
            coordinate
        );

    }

}


// ============================================================
// RENDER EVERYTHING
// ============================================================

function render(state) {

    if (!state) {

        return;

    }


    currentState =
        state;


    renderPlayerStatus();

    renderTurn(state);

    renderStatus(state);

    renderCounts(state);

    renderWinBanner(state);

    renderBoard(state);

}


// ============================================================
// HANDLE CELL CLICK
// ============================================================

async function handleCellClick(
    x,
    y
) {

    if (!currentState) {

        return;

    }


    // ========================================================
    // Must be Player 1 or Player 2
    // ========================================================

    if (
        myPlayer !== 1 &&
        myPlayer !== 2
    ) {

        return;

    }


    // ========================================================
    // Need two players
    // ========================================================

    if (
        getPlayerCount() < 2
    ) {

        return;

    }


    // ========================================================
    // Game already finished
    // ========================================================

    if (
        currentState.winner
    ) {

        return;

    }


    // ========================================================
    // Wrong turn
    // ========================================================

    if (
        currentState.turn !== myPlayer
    ) {

        return;

    }


    const clickedPiece =
        getPiece(
            currentState.board,
            x,
            y
        );


    // ========================================================
    // NOTHING SELECTED
    // ========================================================

    if (!selectedCell) {

        // Empty square
        if (!clickedPiece) {

            return;

        }


        // Enemy piece
        if (
            clickedPiece.player !== myPlayer
        ) {

            return;

        }


        selectedCell = {

            x,
            y

        };


        render(
            currentState
        );


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


        render(
            currentState
        );


        return;

    }


    // ========================================================
    // SELECT ANOTHER OWN PIECE
    // ========================================================

    if (

        clickedPiece &&

        clickedPiece.player === myPlayer

    ) {

        selectedCell = {

            x,
            y

        };


        render(
            currentState
        );


        return;

    }


    // ========================================================
    // CREATE MOVE
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
    // VALIDATE LOCALLY
    // ========================================================

    const validation =
        validateMove(
            currentState,
            myPlayer,
            from,
            to
        );


    if (!validation.ok) {

        // Keep the selected piece.
        // The user can choose another square.

        console.log(
            "[OTTv2]",
            validation.reason
        );

        return;

    }


    // ========================================================
    // UPDATE SHARED STATE
    // ========================================================

    try {

        await gameHandle.setData(
            state => {

                // --------------------------------------------
                // Safety check: game finished
                // --------------------------------------------

                if (
                    state.winner
                ) {

                    return state;

                }


                // --------------------------------------------
                // Safety check: turn
                // --------------------------------------------

                if (
                    state.turn !== myPlayer
                ) {

                    return state;

                }


                // --------------------------------------------
                // Apply move
                // --------------------------------------------

                const result =
                    applyMove(
                        state,
                        myPlayer,
                        from,
                        to
                    );


                // --------------------------------------------
                // Invalid move
                // --------------------------------------------

                if (
                    !result.result.ok
                ) {

                    return state;

                }


                // --------------------------------------------
                // Valid move
                // --------------------------------------------

                return result.state;

            }
        );

    }

    catch (error) {

        console.error(
            "[OTTv2] Failed to update game state:",
            error
        );

        return;

    }


    // ========================================================
    // CLEAR SELECTION
    // ========================================================

    selectedCell = null;


    // ========================================================
    // Render will normally be triggered by PlayHTML.
    // Render here as well for immediate local feedback.
    // ========================================================

    if (currentState) {

        render(
            currentState
        );

    }

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
                    "[OTTv2] Copy failed:",
                    error
                );

            }

        }
    );

}


// ============================================================
// BACK TO LOBBY
// ============================================================

if (backLobbyButton) {

    backLobbyButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "index.html";

        }
    );

}


// ============================================================
// COORDINATES
// ============================================================

renderCoordinates();


// ============================================================
// INITIAL RENDER
// ============================================================

render(
    currentState
);


// ============================================================
// DEBUG
// ============================================================

console.log(
    "[OTTv2] Room:",
    roomId
);

console.log(
    "[OTTv2] My identity:",
    playhtml.presence
        .getMyIdentity()
        ?.publicKey
);

console.log(
    "[OTTv2] Players:",
    getRoomPlayerIds()
);

console.log(
    "[OTTv2] My player:",
    myPlayer
);