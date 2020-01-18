import { AUDIO } from "./client_constants.js";

export default
  class AudioPlayer {
  constructor() {
    this.audio = {};
    for (let audio of AUDIO) {
      this.audio[audio.name] = new Audio(audio.path);
    }
  }

  playAudio(name) {
    const audio = this.audio[name];
    if (audio) {
      audio.play();
    }
  }
}