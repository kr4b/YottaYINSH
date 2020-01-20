import Socket from "./socket.js";
import { SOCKET_URL, AVAILABILITY, ICONS, COLOR_PALETTES } from "./client_constants.js";

onload = () => {
  {
    const cc = COLOR_PALETTES[(Math.random() * COLOR_PALETTES.length) | 0];
    document.body.style.setProperty("--highlight-color-light", cc[0]);
    document.body.style.setProperty("--highlight-color-dark", cc[1]);
  }

  const socket = new Socket(new WebSocket(SOCKET_URL));
  let games = [];

  { // Add scrollbar width padding to some elements
    const gameListHeader = document.getElementById("content-header");
    const gameList = document.getElementById("game-list");
    const scrollbarWidth = gameList.getBoundingClientRect().width - gameList.clientWidth;
    gameListHeader.style.paddingRight = `${scrollbarWidth}px`;
    gameListHeader.style.paddingLeft = `${scrollbarWidth}px`;
    gameList.style.paddingLeft = `${scrollbarWidth}px`;
  }

  { // Set your name
    if (sessionStorage.getItem("name")) {
      document.getElementById("name-input").placeholder = sessionStorage.getItem("name");
    }
  }

  // Add a game item to the list
  const addGameItem = async (gameId, availability, player1, player2, elapsedTime) => {
    const time = Math.floor(elapsedTime / 3600).toString().padStart(2, "0")
      + ":" + Math.floor(elapsedTime / 60 % 60).toString().padStart(2, "0")
      + ":" + (elapsedTime % 60).toString().padStart(2, "0");

    const item = document.createElement("div");

    item.onclick = () => socket.send("public", { id: gameId });
    item.className = "game-item";
    item.innerHTML = `
      <div class="visibility" alt="join" title="${availability}">${ICONS[AVAILABILITY[availability]]}</div>
      <div class="player">${clean(player1 || "-")}</div>
      <div class="player">${clean(player2 || "-")}</div>
      <div class="player-count">${(player1 ? 1 : 0) + (player2 ? 1 : 0)}/2</div>
      <div class="time">${time}</div>
    `;
    document.getElementById("game-list").appendChild(item);
  };

  // Clean player name to prevent HTML injection
  const clean = str => str.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const refreshGameItems = async () => {
    const list = document.getElementById("game-list");
    list.innerHTML = "";

    const localgames = Array.from(games).sort((a, b) => sortingMethod[selectedSort](a, b) * (ascendingSort ? 1 : -1));

    for (let game of localgames) {
      addGameItem(game.id, game.availability, game.player1, game.player2, game.elapsedTime);
    }
  };

  const updateExistingGameItems = async () => {
    const list = document.getElementById("game-list").children;
    let i = 0;
    for (let game of games) {
      const time = Math.floor(game.elapsedTime / 3600).toString().padStart(2, "0")
        + ":" + Math.floor(game.elapsedTime / 60 % 60).toString().padStart(2, "0")
        + ":" + (game.elapsedTime % 60).toString().padStart(2, "0");


      if (list[i].children[0].title != game.availability) { // Update availability title & html
        list[i].children[0].title = game.availability;
        list[i].children[0].innerHTML = ICONS[AVAILABILITY[game.availability]];
      }
      
      const lastIndex = list[i].children.length - 1;
      const playerCount = `${(game.player1 ? 1 : 0) + (game.player2 ? 1 : 0)}/2`;
      if (list[i].children[lastIndex - 1].innerHTML != playerCount) // Update playercount html
        list[i].children[lastIndex - 1].innerHTML = playerCount

      list[i].children[lastIndex].innerHTML = time;
      i++;
    }
  }

  socket.ws.onopen = () => {
    if (sessionStorage.getItem("id") == null) socket.send("session", {});

    socket.send("games", {});
    setInterval(() => {
      socket.send("games", {});
    }, 1000);
  };

  document.getElementById("name-input").oninput = e => {
    const name = e.srcElement.value;
    sessionStorage.setItem("name", name);
    socket.send("name", { id: sessionStorage.getItem("id"), name: name });
  };

  socket.setReceive("games", data => {
    if (data.games.length == games.length) {
      let sameGames = true;
      for (let i = 0; i < games.length; i++) {
        if (games[i].id != data.games[i].id) {
          sameGames = false;
        }
      }
      if (sameGames) {
        games = data.games;
        updateExistingGameItems();
        return;
      }
    }

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

  document.getElementById("public-game").onclick = () => createGame("public");
  document.getElementById("private-game").onclick = () => createGame("private");
  // document.getElementById("ai-game").onclick = () => createGame("ai");

  document.querySelectorAll("#content-header > h1").forEach((value, key) => {
    value.onclick = () => {
      if (selectedSort == key)
        ascendingSort = !ascendingSort;
      else {
        selectedSort = key;
        ascendingSort = true;
      }

      if (ascendingSort) value.classList.add("ascending")
      else value.classList.remove("ascending");

      refreshGameItems();
    }
  });

  let selectedSort = 0;
  let ascendingSort = true;
  const sortingMethod = [
    (a, b) => AVAILABILITY[a.availability] - AVAILABILITY[b.availability],
    (a, b) => (a.player1 && b.player1) ? a.player1.localeCompare(b.player1) : !a.player1 ? 1 : !b.player2 ? -1 : 0,
    (a, b) => (a.player2 && b.player2) ? a.player2.localeCompare(b.player2) : !a.player2 ? 1 : !b.player2 ? -1 : 0,
    (a, b) => (a.player1 ? 1 : 0) + (a.player2 ? 1 : 0) - (b.player1 ? 1 : 0) - (b.player2 ? 1 : 0),
    (a, b) => a.elapsedTime - b.elapsedTime
  ];
}
