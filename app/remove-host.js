#!/usr/bin/env node
const fs = require("fs");
const sudo = require("sudo-prompt");
const { platform } = require("os");
const { sudoWriteFileSync, getHostsFilePath } = require("./utils");

function removeHost(hostname) {
  const hostsFilePath = getHostsFilePath();

  const hostsFile = fs.readFileSync(hostsFilePath, "utf-8");
  const lines = hostsFile.split("\n");

  if (lines.findIndex((a) => a.startsWith(`127.0.0.1 ${hostname}`)) < 0) {
    console.error(`${hostname} does not exists in hosts file`);
    return;
  }

  const newLines = lines.map((line) => {
    if (line.startsWith(`127.0.0.1 ${hostname}`)) {
      console.log(`Removing ${line.split(" ")[1]} from hosts file`);
      return "";
    }
    return line;
  });

  const newHostsFile = newLines.join("\n");
  sudoWriteFileSync(hostsFilePath, newHostsFile);
}

module.exports = removeHost;
