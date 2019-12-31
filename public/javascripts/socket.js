// Do not override onmessage
// Overriding onopen is allowed
export default
  class Socket {
  constructor(ws) {
    this.ws = ws;
    this.callbacks = [];
    this.ws.onmessage = data => {
      const message = JSON.parse(data.data);
      const callback = this.callbacks[message.key];
      callback(message.data);
    };
  }

  // Send object data to the server with a given key
  send(key, data) {
    this.ws.send(JSON.stringify({ key, data }));
  }

  // Set callback to call when server responds with the given key
  setReceive(key, callback) {
    this.callbacks[key] = callback;
  }
}
