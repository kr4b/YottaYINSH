const fs = require("fs");

let constants = {};

constants["loadConstants"] = () => {
  const data = fs.readFileSync("./public/javascripts/client_constants.js", "utf8");

  return JSON.parse(`{${
    data
      .replace(/\r\n(\r\n)+/g, "\r\n")
      .replace(/;\r\n.+$/, "")
      .replace(/const\s+(.+)\s*=/g, "\"$1\":")
      .replace(/\s+"/g, "\"")
      .replace(/;/g, ",")
  }}`);
};

module.exports = constants;