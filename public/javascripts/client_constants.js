const WHITE = 0;
const BLACK = 1;

const WIN_RINGS = 3;

const INTERSECTIONS = [4, 7, 8, 9, 10, 9, 10, 9, 8, 7, 4];
const POINT_OFFSET = [1, 0, 0, 0, 0, 1, 1, 2, 3, 4, 6];

const NUMBER_INDEX = [17, 3, 2, 1, 0, 12, 11, 22, 33, 44, 66];
const LETTER_INDEX = [3, 17, 29, 41, 53, 63, 75, 85, 95, 105, 113];

const SOCKET_URL = "ws://localhost:3000";
const TURN_TYPE = { "ring": 0, "marker": 1, "none": 2, "remove": 3 };

const AVAILABILITY = { "open": 0, "private": 1, "full": 2 };
const ICONS = ["&#x1f513;", "&#x1f510;", "&#x1f441;"];

export { WHITE, BLACK, WIN_RINGS, INTERSECTIONS, SOCKET_URL, TURN_TYPE, AVAILABILITY, ICONS, POINT_OFFSET, NUMBER_INDEX, LETTER_INDEX };