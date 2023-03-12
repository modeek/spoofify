const fs = require("fs");
const sudo = require("sudo-prompt");
const crypto = require("crypto");
const forge = require("node-forge");
const os = require("os");

function getPortFromHosts() {
    const hostsFile = fs.readFileSync("/etc/hosts", "utf-8");
    const lines = hostsFile.split("\n");
    const hosts = [];
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2 && parts[0] === "127.0.0.1") {
        const hostname = parts[1];
        const portMatch = line.match(/#port=(\d+)/);
        const port = portMatch ? parseInt(portMatch[1]) : null;
        hosts.push({ hostname, port });
      }
    }
    return hosts;
  }
  

function readFileSyncOrUtf8(filePath) {
  if (os.platform() === "linux") {
    return fs.readFileSync(filePath).toString("utf8");
  } else {
    return fs.readFileSync(filePath);
  }
}

module.exports = {
  getPortFromHosts,
  readFileSyncOrUtf8,
};
