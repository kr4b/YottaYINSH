const SOCKET_URL = "ws://localhost:3000";

const AVAILABILITY = { "open": 0, "private": 1, "full": 2 };
const ICONS = ["&#x1f513;", "&#x1f510;", "&#x1f441"];

onload = () => {
  const socket = new WebSocket(SOCKET_URL);

  const addGameItem = (availability, player1, player2, elapsedTime) => {
    const time = Math.floor(elapsedTime / 3600 % 60).toString().padStart(2, '0')
      + ":" + Math.floor(elapsedTime / 60 % 60).toString().padStart(2, '0')
      + ":" + (elapsedTime % 60).toString().padStart(2, '0');

    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div class="visibility" alt="join">${ICONS[AVAILABILITY[availability]]}</div>
      <div class="player">${player1 || '-'}</div>
      <div class="player">${player2 || '-'}</div>
      <div class="player-count">${(player1 ? 1 : 0) + (player2 ? 1 : 0)}/2</div>
      <div class="time">${time}</div>
    `;
    document.querySelector("#list").appendChild(item);
  };

  const clean = str => {
    return str.replace("<", "&lt;").replace(">", "&gt;");
  };

  const refreshGameItems = games => {
    const list = document.querySelector("#list");
    const buttons = list.children[0];
    list.innerHTML = "";
    list.appendChild(buttons);
    for (let game of games) {
      addGameItem(game.availability, clean(game.player1), clean(game.player2), game.elapsedTime);
    }
  };

  socket.onopen = e => {
    socket.send(JSON.stringify({ type: "session" }));
    socket.send(JSON.stringify({ type: "games" }));
    setInterval(() => {
      socket.send(JSON.stringify({ type: "games" }));
    }, 1000);
  };

  socket.onmessage = message => {
    const response = JSON.parse(message.data);
    if (response.type == "games") {
      refreshGameItems(response.games);
    } else if (response.type == "session") {
      sessionStorage.setItem("id", response.id);
    }
  }

  const createGame = game => {
    const properties = {
      type: "create",
      game
    };

    socket.send(JSON.stringify(properties));

    socket.onmessage = message => {
      const response = JSON.parse(message.data);
      window.location.assign(`game.html?id=${response.id}`);
    }
  }

  document.querySelector("#public").onclick = () => createGame("public");
  document.querySelector("#private").onclick = () => createGame("private");
  document.querySelector("#ai").onclick = () => createGame("ai");
}
