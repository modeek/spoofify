const fs = require("fs");
const sudo = require("sudo-prompt");
const { platform } = require("os");

function sudoWriteFileSync(file, content) {
  const options = { name: "Spoofify" };
  const command = `echo '${content}' > ${file}`;
  return sudo.exec(command, options);
}

function addHost(hostname, port) {
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

function getHostsFilePath() {
  switch (platform()) {
    case "win32":
      return "C:\\Windows\\System32\\drivers\\etc\\hosts";
    case "linux":
      return "/etc/hosts";
    case "darwin":
      return "/private/etc/hosts";
    default:
      console.log("Unsupported platform");
      process.exit(1);
  }
}

module.exports = addHost;
