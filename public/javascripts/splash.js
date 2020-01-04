import Socket from "./socket.js"

const SOCKET_URL = "ws://localhost:3000";

const AVAILABILITY = { "open": 0, "private": 1, "full": 2 };
const ICONS = ["&#x1f513;", "&#x1f510;", "&#x1f441"];

onload = () => {
  const socket = new Socket(new WebSocket(SOCKET_URL));
  let games = [];

  // Add a game item to the list
  const addGameItem = async (gameId, availability, player1, player2, elapsedTime) => {
    const time = Math.floor(elapsedTime / 3600).toString().padStart(2, '0')
      + ":" + Math.floor(elapsedTime / 60 % 60).toString().padStart(2, '0')
      + ":" + (elapsedTime % 60).toString().padStart(2, '0');

    const item = document.createElement("div");

    item.onclick = () => socket.send("public", { id: gameId });
    item.className = "item";
    item.innerHTML = `
      <div class="visibility" alt="join" title="${availability}">${ICONS[AVAILABILITY[availability]]}</div>
      <div class="player">${clean(player1 || '-')}</div>
      <div class="player">${clean(player2 || '-')}</div>
      <div class="player-count">${(player1 ? 1 : 0) + (player2 ? 1 : 0)}/2</div>
      <div class="time">${time}</div>
    `;
    document.querySelector("#list").appendChild(item);
  };

  // Clean player name to prevent HTML injection
  const clean = str => str.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const refreshGameItems = async () => {
    const list = document.querySelector("#list");
    const buttons = list.children[0];
    list.innerHTML = "";
    list.appendChild(buttons);

    const localgames = Array.from(games).sort((a, b) => sortingMethod[selectedSort](a, b) * (ascendingSort ? 1 : -1));

    for (let game of localgames) {
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
    games = data.games;
    refreshGameItems();
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

  document.querySelectorAll("#list-header > .item > div").forEach((value, key) => {
    value.onclick = () => {
      if (selectedSort == key)
        ascendingSort = !ascendingSort;
      else {
        selectedSort = key;
        ascendingSort = true;
      }
      refreshGameItems();
    }
  });

  let selectedSort = 0;
  let ascendingSort = true;
  const sortingMethod = [
    (a, b) => AVAILABILITY[a.availability] - AVAILABILITY[b.availability],
    (a, b) => a.player1.localeCompare(b.player1),
    (a, b) => a.player2.localeCompare(b.player2),
    (a, b) => (a.player1 ? 1 : 0) + (a.player2 ? 1 : 0) - (b.player1 ? 1 : 0) + (b.player2 ? 1 : 0),
    (a, b) => a.elapsedTime - b.elapsedTime
  ];
}