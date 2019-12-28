const SOCKET_URL = "ws://localhost:3000";

onload = () => {
  const socket = new WebSocket(SOCKET_URL);

  socket.onopen = e => {
    socket.send(JSON.stringify({ type: "session" }));
  };

  socket.onmessage = message => {
    const response = JSON.parse(message.data);
    sessionStorage.setItem("id", response.id);
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

