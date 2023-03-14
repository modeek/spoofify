#!/usr/bin/env node
const RedWire = require("redwire");

const { privateKeyPath, certFilePath } = require("./ssl-config");

function runServer() {
  const options = {
    http: {
      port: 80,
      websockets: "yes",
      keepAlive: "yes",
    },
    https: {
      port: 443,
      key: privateKeyPath,
      cert: certFilePath,
      keepAlive: "yes",
      websockets: "yes",
    },
    wss: {
      port: 443,
      key: privateKeyPath,
      cert: certFilePath,
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

  console.log("Spoofify is running!");

  const redwire = new RedWire(options);

  const { getPortFromHosts } = require("./utils");

  getPortFromHosts().forEach((a) => {
    redwire.https(a.hostname, `localhost:${a.port}`);
    redwire.proxy(a.hostname, `localhost:${a.port}`);
    redwire.httpsWs(a.hostname, `localhost:${a.port}`);
  });
}

module.exports = runServer;
