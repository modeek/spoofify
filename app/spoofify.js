#!/usr/bin/env node
const args = process.argv.slice(2);

if (args[0] === "add" || args[0] === 'a') {
  const addHost = require("./add-host");
  addHost(args[1], args[2]);
} else if (args[0] === "remove" || args[0] === 'r') {
  const removeHost = require("./remove-host");
  removeHost(args[1]);
} else if (args[0] === "run" || !args[0]) {
  const runServer = require("./run-server");
  runServer();
} else {
  console.log("Invalid command. Usage: Spoofify add <hostname> [port]");
}