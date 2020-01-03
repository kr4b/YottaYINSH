import Socket from "./socket.js";
import { SOCKET_URL, AVAILABILITY, ICONS } from "./client_constants.js";


onload = () => {
  const socket = new Socket(new WebSocket(SOCKET_URL));

  // Add a game item to the list
  const addGameItem = (gameId, availability, player1, player2, elapsedTime) => {
    const time = Math.floor(elapsedTime / 3600).toString().padStart(2, "0")
      + ":" + Math.floor(elapsedTime / 60 % 60).toString().padStart(2, "0")
      + ":" + (elapsedTime % 60).toString().padStart(2, "0");

    const item = document.createElement("div");

    item.onclick = () => socket.send("public", { id: gameId });
    item.className = "item";
    item.innerHTML = `
      <div class="visibility" alt="join" title="${availability}">${ICONS[AVAILABILITY[availability]]}</div>
      <div class="player">${clean(player1 || "-")}</div>
      <div class="player">${clean(player2 || "-")}</div>
      <div class="player-count">${(player1 ? 1 : 0) + (player2 ? 1 : 0)}/2</div>
      <div class="time">${time}</div>
    `;
    document.querySelector("#list").appendChild(item);
  };

  // Clean player name to prevent HTML injection
  const clean = str => str.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Refresh the list of game items
  const refreshGameItems = games => {
    const list = document.querySelector("#list");
    const buttons = list.children[0];
    list.innerHTML = "";
    list.appendChild(buttons);
    for (let game of games) {
      addGameItem(game.id, game.availability, game.player1, game.player2, game.elapsedTime);
    }
  };

  socket.ws.onopen = () => {
    if (sessionStorage.getItem("id") == null) socket.send("session", {});

    socket.send("games", {});
    setInterval(() => {
      socket.send("games", {});
    }, 1000);
  };

  document.querySelector("#name > input").oninput = e => {
    socket.send("name", { id: sessionStorage.getItem("id"), name: e.srcElement.value });
  };

  socket.setReceive("games", data => {
    refreshGameItems(data.games);
  });

  socket.setReceive("session", data => {
    sessionStorage.setItem("id", data.id);
  });

  socket.setReceive("public", data => {
    window.location.assign(`game?id=${data.id}`);
  });

  socket.setReceive("create", data => {
    socket.send("public", { id: data.id });
  });

  const createGame = game => {
    socket.send("create", { game });
  };

  document.querySelector("#public").onclick = () => createGame("public");
  document.querySelector("#private").onclick = () => createGame("private");
  document.querySelector("#ai").onclick = () => createGame("ai");
};
