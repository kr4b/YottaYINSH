const fs = require("fs");

let constants = {};

constants["loadConstants"] = () => {
  const data = fs.readFileSync("./public/javascripts/client_constants.js", "utf8");

  const clean = data.replace(/^.*{/g, "{");

  return JSON.parse(clean);
};

module.exports = constants;