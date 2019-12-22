import Board from "./board.js"

onload = () => {
  const b = new Board(document.getElementById("yinsh-board"));  
  b.render();
}