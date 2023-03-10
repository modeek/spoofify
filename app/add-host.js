#!/usr/bin/env node
const fs = require("fs");
const sudo = require("sudo-prompt");
const { platform } = require("os");
const { sudoWriteFileSync, getHostsFilePath } = require("./utils");



function addHost(hostname, port = 3000) {
  const hostsFilePath = getHostsFilePath();
  const entry = `127.0.0.1 ${hostname} #port=${port}`;

  const hostsFile = fs.readFileSync(hostsFilePath, "utf-8");
  const lines = hostsFile.split("\n");

  if (lines.findIndex((a) => a === entry) > -1) {
    console.error(`${hostname}:${port} already exists in hosts file`);
    return;
  }

  const newLines = lines.map((line) => {
    if (line.startsWith(`127.0.0.1 ${hostname}`)) {
      return entry;
    }
    return line;
  });

  if (newLines.indexOf(entry) === -1) {
    newLines.push(entry);
  }

  const newHostsFile = newLines.join("\n");
  sudoWriteFileSync(hostsFilePath, newHostsFile);
  console.log(`Added ${hostname} to hosts file`);
}


module.exports = addHost;
