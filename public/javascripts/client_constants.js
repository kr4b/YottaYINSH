const WHITE = 0;
const BLACK = 1;

const INTERSECTIONS = [4, 7, 8, 9, 10, 9, 10, 9, 8, 7, 4];

const SOCKET_URL = "ws://localhost:3000";
const ROLES = { "waiting": 0, "playing": 1, "spectating": 2 };
const TURN_TYPE = { "ring": 0, "marker": 1, "none": 2, "remove": 3 };

const AVAILABILITY = { "open": 0, "private": 1, "full": 2 };
const ICONS = ["&#x1f513;", "&#x1f510;", "&#x1f441"];

export { WHITE, BLACK, INTERSECTIONS, SOCKET_URL, ROLES, TURN_TYPE, AVAILABILITY, ICONS };