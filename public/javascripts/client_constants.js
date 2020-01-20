const WHITE = 0;
const BLACK = 1;

const WIN_RINGS = 3;

const INTERSECTIONS = [4, 7, 8, 9, 10, 9, 10, 9, 8, 7, 4];
const POINT_OFFSET = [1, 0, 0, 0, 0, 1, 1, 2, 3, 4, 6];

const NUMBER_INDEX = [17, 3, 2, 1, 0, 12, 11, 22, 33, 44, 66];
const LETTER_INDEX = [3, 17, 29, 41, 53, 63, 75, 85, 95, 105, 113];

const WHITE_COLOR = "#ddd";
const BLACK_COLOR = "#111";

const WHITE_HINT_COLOR = "#999";
const BLACK_HINT_COLOR = "#111";

const SOCKET_URL = "ws://localhost:3000";
const TURN_TYPE = { "ring": 0, "marker": 1, "none": 2, "remove": 3 };

const AVAILABILITY = { "open": 0, "private": 1, "full": 2 };
const ICONS = ["&#x1f513;", "&#x1f510;", "&#x1f441;"];

const AUDIO = [
  {
    "name": "PLACE",
    "path": "../audio/place.wav",
  },
  {
    "name": "MOVE",
    "path": "../audio/move.wav",
  },
  {
    "name": "MARKER",
    "path": "../audio/marker.wav",
  },
  {
    "name": "RING",
    "path": "../audio/ring.wav",
  },
  {
    "name": "WIN",
    "path": "../audio/win.wav",
  },
  {
    "name": "LOSE",
    "path": "../audio/lose.wav",
  }
];

const COLOR_PALETTES = [
  /* [ light, dark ]  */
  /* default          */
  ["#9b59b6", "#8e44ad"], /* [ amethyst, wisteria ] */
  ["#95a5a6", "#7f8c8d"], /* [ concrete, asbestos ] */
  ["#3498db", "#2980b9"], /* [ peter river, belize hole ] */
  ["#1abc9c", "#16a085"], /* [ turquoise, green sea ] */
  /* fr */
  ["#38ada9", "#079992"], /* [ waterfall, reef encounter ] */
  /* nl */
  ["#B53471", "#833471"], /* [ very berry, hollyhock ] */
  /* in */
  ["#B33771", "#6D214F"], /* [ fiery fuchsia, magenta purple ] */
  /* es */
  ["#ffb142", "#cc8e35"], /* [ mandarin sorbet, alameda ochre ] */
  ["#ff793f", "#cd6133"], /* [ synthetic pumpkin, chilean fire ] */
  ["#ff5252", "#b33939"], /* [ fluorescent red, eye of newt ] */
  ["#34ace0", "#227093"], /* [ summer sky, devil blue ] */
  /* gb */
  ["#e84118", "#c23616"]  /* [ nasturcian flower, harley davidson orange ] */
];

const formatTime = (elapsedTime) => {
  return Math.floor(elapsedTime / 3600).toString().padStart(2, "0")
    + ":" + Math.floor(elapsedTime / 60 % 60).toString().padStart(2, "0")
    + ":" + (elapsedTime % 60).toString().padStart(2, "0");
}

export {
  WHITE, BLACK, WHITE_COLOR, BLACK_COLOR, WHITE_HINT_COLOR, BLACK_HINT_COLOR,
  WIN_RINGS, INTERSECTIONS, SOCKET_URL, TURN_TYPE, AVAILABILITY, ICONS,
  POINT_OFFSET, NUMBER_INDEX, LETTER_INDEX, AUDIO, COLOR_PALETTES,
  formatTime
};
