const fs = require("fs");
const RedWire = require("redwire");

const { privateKey, cert } = require("./ssl-config");

function runServer() {
  const options = {
    http: {
      port: 80,
      websockets: "yes",
      keepAlive: "yes",
    },
    https: {
      port: 443,
      key: privateKey,
      cert,
      keepAlive: "yes",
      websockets: "yes",
    },
    wss: {
      port: 443,
      key: privateKey,
      cert,
    },
    log: {
      // debug: function(e) { console.log(e)},
      // notice: function(e) { console.log(e)},
      error: function (err) {
        if (err.stack) {
          console.error(err.stack);
        } else {
          console.error(err);
        }
      },
    },
  };

  const redwire = new RedWire(options);

  const { getPortFromHosts } = require("./utils");

  getPortFromHosts().forEach((a) => {
    redwire.https(a.hostname, `localhost:${a.port}`);
    redwire.proxy(a.hostname, `localhost:${a.port}`);
    redwire.httpsWs(a.hostname, `localhost:${a.port}`);
  });
}

module.exports = runServer;
