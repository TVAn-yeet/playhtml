import { playhtml }
    from "https://unpkg.com/playhtml";


import {

    SIZE,

    TYPE_LABEL,

    TYPE_ICON,

    createInitialBoard,

    indexOf,

    isOneStep,

    isGoal,

    validateMove,

    applyMove,

    countPieces

} from "./rules.js";



/*
 * Read Room ID from URL.
 *
 * Example:
 *
 * game.html?room=ABC123
 */

const params =
    new URLSearchParams(
        location.search
    );


const roomId =
    params.get("room");



if (!roomId) {

    location.href =
        "./index.html";

    throw new Error(
        "Missing Room ID"
    );

}



/*
 * Hidden element used as
 * shared PlayHTML game state.
 */

const stateElement =
    document.createElement(
        "div"
    );


stateElement.id =
    "game-state";


stateElement.hidden = true;


document.body.appendChild(
    stateElement
);



/*
 * Initial shared state.
 */

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



/*
 * Register shared game state.
 */

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



/*
 * Room ID creates isolated multiplayer state.
 */

await playhtml.init({

    room:
        `ottv2-game-${roomId}`

});


/*
 * Wait until PlayHTML finishes
 * the initial synchronization.
 */

await playhtml.ready;



/*
 * Handle for changing shared state.
 */

const handle =
    playhtml.getHandle(
        "game-state"
    );



/*
 * Identify this browser's player.
 *
 * Use PlayHTML's stable browser identity
 * so different browsers joining the same
 * room can become different players.
 */

let myPlayer = 0;


const myIdentity =
    playhtml.presence?.getMyIdentity?.();


const myId =
    myIdentity?.publicKey ||
    crypto.randomUUID();



/*
 * Try to occupy Player 1 or Player 2.
 */

function claimPlayer() {

    handle.setData(
        data => {

            const players = {

                ...data.players

            };


            /*
             * Already Player 1.
             */

            if (
                players[1] === myId
            ) {

                myPlayer = 1;

                return data;

            }


            /*
             * Already Player 2.
             */

            if (
                players[2] === myId
            ) {

                myPlayer = 2;

                return data;

            }


            /*
             * Player 1 is empty.
             */

            if (
                !players[1]
            ) {

                players[1] = myId;

                myPlayer = 1;

            }


            /*
             * Player 1 occupied,
             * so take Player 2.
             */

            else if (
                !players[2]
            ) {

                players[2] = myId;

                myPlayer = 2;

            }


            /*
             * Both players are occupied.
             *
             * This browser becomes spectator.
             */

            else {

                myPlayer = 0;

            }


            return {

                ...data,

                players

            };

        }
    );

}


claimPlayer();



/*
 * DOM references.
 */

const boardEl =
    document.getElementById(
        "board"
    );


const turnLabel =
    document.getElementById(
        "turn-label"
    );


const statusLabel =
    document.getElementById(
        "status-label"
    );


const p1State =
    document.getElementById(
        "p1-state"
    );


const p2State =
    document.getElementById(
        "p2-state"
    );


const countsContent =
    document.getElementById(
        "counts-content"
    );


const winBanner =
    document.getElementById(
        "win-banner"
    );


const roomLabel =
    document.getElementById(
        "room-label"
    );


const coordinatesX =
    document.getElementById(
        "coordinates-x"
    );



roomLabel.textContent =
    `Room: ${roomId}`;


coordinatesX.innerHTML =

    "abcdefghi"

        .split("")

        .map(
            x =>
                `<span>${x}</span>`
        )

        .join("");



/*
 * Currently selected piece.
 */

let selected = null;


/*
 * Latest shared state.
 */

let currentState = null;



/*
 * Render complete game.
 */

function render(state) {

    currentState = state;


    /*
     * Clear old board.
     */

    boardEl.replaceChildren();



    /*
     * Create 9x9 board.
     */

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


            cell.type =
                "button";


            cell.dataset.x =
                String(x);


            cell.dataset.y =
                String(y);



            /*
             * Coordinate label.
             */

            const coord =
                document.createElement(
                    "span"
                );


            coord.className =
                "coord";


            coord.textContent =
                `${"abcdefghi"[x]}${y + 1}`;


            cell.appendChild(
                coord
            );



            /*
             * Goal squares.
             */

            if (
                isGoal(x, y)
            ) {

                cell.classList.add(
                    "goal"
                );

            }



            /*
             * Selected piece.
             */

            if (

                selected &&

                selected.x === x &&

                selected.y === y

            ) {

                cell.classList.add(
                    "selected"
                );

            }



            /*
             * Show valid moves.
             */

            if (

                selected &&

                myPlayer &&

                isOneStep(

                    selected,

                    { x, y }

                )

            ) {

                const test =
                    validateMove(

                        state,

                        myPlayer,

                        selected,

                        { x, y }

                    );


                if (
                    test.ok
                ) {

                    cell.classList.add(
                        "valid"
                    );

                }

            }



            /*
             * Draw piece.
             */

            const piece =
                state.board[
                    indexOf(x, y)
                ];


            if (piece) {

                const pieceEl =
                    document.createElement(
                        "div"
                    );


                pieceEl.className =
                    `piece p${piece.player}`;


                pieceEl.textContent =
                    TYPE_ICON[
                        piece.type
                    ];


                pieceEl.title =

                    `Player ${piece.player}` +

                    ` - ` +

                    TYPE_LABEL[
                        piece.type
                    ];


                cell.appendChild(
                    pieceEl
                );

            }



            /*
             * Click handler.
             */

            cell.addEventListener(
                "click",
                () => {

                    onCellClick(
                        x,
                        y
                    );

                }
            );


            boardEl.appendChild(
                cell
            );

        }

    }



    /*
     * Turn.
     */

    if (state.winner) {

        turnLabel.textContent =
            `Player ${state.winner} thắng`;

    }

    else {

        turnLabel.textContent =
            `Player ${state.turn}`;

    }



    /*
     * Status.
     */

    if (state.winner) {

        statusLabel.textContent =
            state.winReason;

    }

    else if (
        !state.players[1] ||
        !state.players[2]
    ) {

        statusLabel.textContent =
            "Đang chờ người chơi 2";

    }

    else if (
        myPlayer === 0
    ) {

        statusLabel.textContent =
            "Spectator";

    }

    else if (
        state.turn === myPlayer
    ) {

        statusLabel.textContent =
            "Đến lượt bạn";

    }

    else {

        statusLabel.textContent =
            "Đang chờ đối thủ";

    }



    /*
     * Players.
     */

    p1State.textContent =

        state.players[1]

            ? "Đã tham gia"

            : "Đang chờ...";


    p2State.textContent =

        state.players[2]

            ? "Đã tham gia"

            : "Đang chờ...";


    renderCounts(state);



    /*
     * Winner overlay.
     */

    if (
        state.winner
    ) {

        winBanner.textContent =

            `Player ${state.winner}` +

            ` thắng — ` +

            state.winReason;


        winBanner.classList.remove(
            "hidden"
        );

    }

    else {

        winBanner.classList.add(
            "hidden"
        );

    }

}



/*
 * Display remaining pieces.
 */

function renderCounts(state) {

    const p1 =
        countPieces(
            state.board,
            1
        );


    const p2 =
        countPieces(
            state.board,
            2
        );


    countsContent.innerHTML = `

        <div class="count-row">

            <span>
                P1 👊
            </span>

            <strong>
                ${p1.rock}
            </strong>

        </div>


        <div class="count-row">

            <span>
                P1 🍃
            </span>

            <strong>
                ${p1.paper}
            </strong>

        </div>


        <div class="count-row">

            <span>
                P1 ✂️
            </span>

            <strong>
                ${p1.scissors}
            </strong>

        </div>


        <hr>


        <div class="count-row">

            <span>
                P2 👊
            </span>

            <strong>
                ${p2.rock}
            </strong>

        </div>


        <div class="count-row">

            <span>
                P2 🍃
            </span>

            <strong>
                ${p2.paper}
            </strong>

        </div>


        <div class="count-row">

            <span>
                P2 ✂️
            </span>

            <strong>
                ${p2.scissors}
            </strong>

        </div>

    `;

}



/*
 * Handle board click.
 */

function onCellClick(
    x,
    y
) {

    /*
     * Spectator.
     */

    if (
        !currentState ||
        myPlayer === 0
    ) {

        return;

    }



    /*
     * Game finished.
     */

    if (
        currentState.winner
    ) {

        return;

    }



    /*
     * Wait until both players have joined.
     */

    if (
        !currentState.players[1] ||
        !currentState.players[2]
    ) {

        return;

    }



    /*
     * Only allow movement
     * on the current player's turn.
     */

    if (
        currentState.turn !== myPlayer
    ) {

        return;

    }



    const piece =
        currentState.board[
            indexOf(x, y)
        ];



    /*
     * We already selected a piece.
     */

    if (selected) {

        /*
         * Click same piece:
         * deselect.
         */

        if (

            selected.x === x &&

            selected.y === y

        ) {

            selected = null;

            render(
                currentState
            );

            return;

        }



        /*
         * Validate destination.
         */

        const check =
            validateMove(

                currentState,

                myPlayer,

                selected,

                { x, y }

            );



        /*
         * Invalid.
         */

        if (!check.ok) {

            /*
             * Selecting another own piece.
             */

            if (
                piece &&
                piece.player === myPlayer
            ) {

                selected = {

                    x,

                    y

                };


                render(
                    currentState
                );

            }

            else {

                alert(
                    check.reason
                );

            }


            return;

        }



        /*
         * Valid move.
         *
         * Re-read shared state
         * immediately before applying.
         */

        handle.setData(
            data => {

                const result =
                    applyMove(

                        data,

                        myPlayer,

                        selected,

                        { x, y }

                    );


                if (
                    result.result.ok
                ) {

                    return result.state;

                }


                return data;

            }
        );


        selected = null;

        return;

    }



    /*
     * Nothing selected yet.
     *
     * Select own piece.
     */

    if (

        piece &&

        piece.player === myPlayer

    ) {

        selected = {

            x,

            y

        };


        render(
            currentState
        );

    }

}



/*
 * Copy room URL.
 */

document
    .getElementById(
        "copy-link"
    )
    .addEventListener(
        "click",
        async () => {

            await navigator.clipboard
                .writeText(
                    location.href
                );

            alert(
                "Đã copy link phòng."
            );

        }
    );



/*
 * Back to lobby.
 */

document
    .getElementById(
        "back-lobby"
    )
    .addEventListener(
        "click",
        () => {

            location.href =
                "./index.html";

        }
    );