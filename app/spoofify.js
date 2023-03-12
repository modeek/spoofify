#!/usr/bin/env node

const args = process.argv.slice(2);

if (args[0] === "add") {
  const addHost = require("./add-host");
  addHost(args[1], args[2]);
} else if (args[0] === "run") {
  const runServer = require("./run-server");
  runServer();
} else {
  console.log("Invalid command. Usage: Spoofify add <hostname> [port]");
}