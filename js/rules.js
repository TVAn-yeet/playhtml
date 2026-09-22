/*
 * OTTv2 GAME RULES
 *
 * Board:
 *     9 x 9
 *
 * Movement:
 *     Exactly 1 square
 *     8 directions
 *
 * Capture:
 *     Rock > Scissors
 *     Scissors > Paper
 *     Paper > Rock
 *
 * Same type:
 *     Cannot capture
 *
 * Win:
 *     1. Capture ALL enemy pieces
 *     OR
 *     2. Move a piece to a1 or i9
 */

export const SIZE = 9;

export const TYPES = Object.freeze({
    ROCK: "rock",
    PAPER: "paper",
    SCISSORS: "scissors"
});

export const TYPE_LABEL = Object.freeze({
    rock: "Đấm",
    paper: "Lá",
    scissors: "Kéo"
});

export const TYPE_ICON = Object.freeze({
    rock: "👊",
    paper: "🍃",
    scissors: "✂️"
});

export function beats(attacker, defender) {
    return (
        (
            attacker === TYPES.ROCK &&
            defender === TYPES.SCISSORS
        )
        ||
        (
            attacker === TYPES.SCISSORS &&
            defender === TYPES.PAPER
        )
        ||
        (
            attacker === TYPES.PAPER &&
            defender === TYPES.ROCK
        )
    );
}

export function inside(x, y) {
    return (
        x >= 0 &&
        x < SIZE &&
        y >= 0 &&
        y < SIZE
    );
}

export function isOneStep(from, to) {
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);

    return (
        dx <= 1 &&
        dy <= 1 &&
        (
            dx !== 0 ||
            dy !== 0
        )
    );
}

export function isGoal(x, y) {
    return (
        (
            x === 0 &&
            y === 0
        )
        ||
        (
            x === 8 &&
            y === 8
        )
    );
}

export function indexOf(x, y) {
    return y * SIZE + x;
}

export function createInitialBoard() {
    const board =
        Array(SIZE * SIZE).fill(null);

    const player1 = [
        {
            x: 3,
            y: 0,
            type: TYPES.ROCK
        },
        {
            x: 4,
            y: 0,
            type: TYPES.PAPER
        },
        {
            x: 5,
            y: 0,
            type: TYPES.SCISSORS
        }
    ];

    const player2 = [
        {
            x: 3,
            y: 8,
            type: TYPES.ROCK
        },
        {
            x: 4,
            y: 8,
            type: TYPES.PAPER
        },
        {
            x: 5,
            y: 8,
            type: TYPES.SCISSORS
        }
    ];

    for (const piece of player1) {
        board[
            indexOf(
                piece.x,
                piece.y
            )
        ] = {
            ...piece,
            player: 1
        };
    }

    for (const piece of player2) {
        board[
            indexOf(
                piece.x,
                piece.y
            )
        ] = {
            ...piece,
            player: 2
        };
    }

    return board;
}

export function countPieces(board, player) {
    const counts = {
        rock: 0,
        paper: 0,
        scissors: 0
    };

    for (const piece of board) {
        if (
            piece &&
            piece.player === player
        ) {
            counts[piece.type]++;
        }
    }

    return counts;
}

export function allEnemyPiecesGone(
    board,
    enemyPlayer
) {
    return !board.some(
        piece =>
            piece &&
            piece.player === enemyPlayer
    );
}

export function validateMove(
    state,
    player,
    from,
    to
) {
    if (state.winner) {
        return {
            ok: false,
            reason: "Ván đã kết thúc."
        };
    }

    if (state.turn !== player) {
        return {
            ok: false,
            reason: "Chưa đến lượt bạn."
        };
    }

    if (
        !inside(from.x, from.y) ||
        !inside(to.x, to.y)
    ) {
        return {
            ok: false,
            reason:
                "Vị trí không nằm trên bàn cờ."
        };
    }

    if (!isOneStep(from, to)) {
        return {
            ok: false,
            reason:
                "Mỗi quân chỉ được đi đúng 1 ô."
        };
    }

    const source =
        state.board[
            indexOf(from.x, from.y)
        ];

    const target =
        state.board[
            indexOf(to.x, to.y)
        ];

    if (
        !source ||
        source.player !== player
    ) {
        return {
            ok: false,
            reason:
                "Đây không phải quân của bạn."
        };
    }

    if (!target) {
        return {
            ok: true,
            capture: false,
            source,
            target: null
        };
    }

    if (target.player === player) {
        return {
            ok: false,
            reason:
                "Không thể đi vào ô đang có quân của bạn."
        };
    }

    if (source.type === target.type) {
        return {
            ok: false,
            reason:
                "Hai quân cùng loại không thể ăn nhau."
        };
    }

    if (!beats(source.type, target.type)) {
        return {
            ok: false,
            reason:
                "Quân này không thắng được quân ở ô đích."
        };
    }

    return {
        ok: true,
        capture: true,
        source,
        target
    };
}

export function applyMove(
    state,
    player,
    from,
    to
) {
    const check =
        validateMove(
            state,
            player,
            from,
            to
        );

    if (!check.ok) {
        return {
            state,
            result: check
        };
    }

    const board =
        state.board.map(
            piece =>
                piece
                    ? { ...piece }
                    : null
        );

    const fromIndex =
        indexOf(from.x, from.y);

    const toIndex =
        indexOf(to.x, to.y);

    const moved = {
        ...board[fromIndex],
        x: to.x,
        y: to.y
    };

    board[fromIndex] = null;
    board[toIndex] = moved;

    const enemy =
        player === 1
            ? 2
            : 1;

    let winner = null;
    let winReason = null;

    if (
        isGoal(
            to.x,
            to.y
        )
    ) {
        winner = player;

        winReason =
            "Đã đưa quân vào ô đích.";
    }

    else if (
        allEnemyPiecesGone(
            board,
            enemy
        )
    ) {
        winner = player;

        winReason =
            "Đã ăn hết toàn bộ quân của đối phương.";
    }

    const nextState = {
        ...state,

        board,

        turn:
            winner
                ? state.turn
                : enemy,

        winner,

        winReason,

        moveNumber:
            (state.moveNumber ?? 0) + 1
    };

    return {
        state: nextState,

        result: {
            ok: true,

            capture:
                check.capture,

            winner,

            winReason
        }
    };
}