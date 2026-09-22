const RECENT_KEY =
    "ottv2-recent-rooms";


function getRooms() {
    try {
        return JSON.parse(
            localStorage.getItem(
                RECENT_KEY
            ) || "[]"
        );
    }
    catch {
        return [];
    }
}


function saveRoom(room) {
    const rooms =
        getRooms()
            .filter(
                r => r !== room
            );

    rooms.unshift(room);

    localStorage.setItem(
        RECENT_KEY,
        JSON.stringify(
            rooms.slice(0, 12)
        )
    );
}


function makeRoomId() {
    const alphabet =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let result = "";

    for (
        let i = 0;
        i < 6;
        i++
    ) {
        result +=
            alphabet[
                Math.floor(
                    Math.random() *
                    alphabet.length
                )
            ];
    }

    return result;
}


function openGame(roomId) {
    saveRoom(roomId);

    const base =
        location.pathname.replace(
            "index.html",
            ""
        );

    const url =
        `${location.origin}` +
        `${base}` +
        `game.html?room=` +
        encodeURIComponent(roomId);

    window.open(
        url,
        `ottv2-${roomId}`,
        [
            "popup",
            "width=1100",
            "height=900",
            "resizable=yes",
            "scrollbars=yes"
        ].join(",")
    );
}


document
    .getElementById("create-game")
    .addEventListener(
        "click",
        () => {
            const room =
                makeRoomId();

            openGame(room);
        }
    );


document
    .getElementById("join-game")
    .addEventListener(
        "click",
        () => {
            const room =
                prompt(
                    "Nhập Room ID:"
                );

            if (!room) {
                return;
            }

            const normalized =
                room
                    .trim()
                    .toUpperCase();

            if (
                !/^[A-Z0-9]{6}$/
                    .test(normalized)
            ) {
                alert(
                    "Room ID phải gồm 6 ký tự."
                );

                return;
            }

            openGame(normalized);
        }
    );


function renderRecentRooms() {
    const container =
        document.getElementById(
            "recent-rooms"
        );

    const rooms =
        getRooms();

    if (!rooms.length) {
        container.innerHTML =
            `
            <div class="muted">
                Chưa có room nào
                trên thiết bị này.
            </div>
            `;

        return;
    }

    container.innerHTML = "";

    for (const room of rooms) {
        const row =
            document.createElement(
                "div"
            );

        row.className =
            "room-row";

        row.innerHTML =
            `
            <span>
                Room
                <code>
                    ${room}
                </code>
            </span>

            <button
                class="secondary">

                Mở

            </button>
            `;

        row
            .querySelector("button")
            .addEventListener(
                "click",
                () => {
                    openGame(room);
                }
            );

        container.appendChild(row);
    }
}


renderRecentRooms();