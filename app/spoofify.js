#!/usr/bin/env node

const fs = require("fs");
const sudo = require("sudo-prompt");
const crypto = require("crypto");
const forge = require("node-forge");
const RedWire = require("redwire");
const os = require("os");

const { parse } = require("url");

function generateGuid() {
  const buf = crypto.randomBytes(16);
  buf[6] = (buf[6] & 0x0f) | 0x40; // set version to 4
  buf[8] = (buf[8] & 0x3f) | 0x80; // set variant to RFC 4122
  return Buffer.from(buf).toString("base64");
}

const npmDirPath = ".npm";

if (!fs.existsSync(npmDirPath)) {
  // .npm directory does not exist, create it
  fs.mkdirSync(npmDirPath);
}

const certFilePath = ".npm/cert.pem";
const privateKeyPath = ".npm/prk.pem";
const publicKeyPath = ".npm/pub.pem";

let privateKey;
let publicKey;
let cert;

function generateGuid() {
  const serialNumberBuffer = crypto.randomBytes(8);
  const guidBuffer = crypto.randomBytes(16);
  serialNumberBuffer.copy(guidBuffer, 0, 0, 8); // Copy the serial number to the first 8 bytes of the GUID buffer
  const guid = guidBuffer.toString("base64");
  return guid;
}

if (
  fs.existsSync(certFilePath) &&
  fs.existsSync(privateKeyPath) &&
  fs.existsSync(publicKeyPath)
) {
  cert =
    (os.platform() === "linux" &&
      fs.readFileSync(certFilePath).toString("utf8")) ||
    fs.readFileSync(certFilePath);
  privateKey =
    (os.platform() === "linux" &&
      fs.readFileSync(privateKeyPath).toString("utf8")) ||
    fs.readFileSync(privateKeyPath);
  publicKey =
    (os.platform() === "linux" &&
      fs.readFileSync(publicKeyPath).toString("utf8")) ||
    fs.readFileSync(publicKeyPath);
} else {
  const { privateKey: newPrivateKey, publicKey: newPublicKey } =
    crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

  privateKey = newPrivateKey;
  publicKey = newPublicKey;
  cert = generateSelfSignedCertificate(newPrivateKey, newPublicKey);

  fs.writeFileSync(certFilePath, cert.toString("utf8"));
  fs.writeFileSync(privateKeyPath, privateKey.toString("utf8"));
  fs.writeFileSync(publicKeyPath, publicKey.toString("utf8"));
}

function generateSelfSignedCertificate(privateKey, publicKey) {
  const cert = forge.pki.createCertificate();
  cert.publicKey = forge.pki.publicKeyFromPem(publicKey);
  cert.serialNumber = `${generateGuid()}`;
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  const attrs = [
    { name: "commonName", value: "localhost" },
    { name: "countryName", value: "US" },
    { shortName: "ST", value: "California" },
    { name: "localityName", value: "San Francisco" },
    { name: "organizationName", value: "Acme Inc." },
    { shortName: "OU", value: "IT" },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(forge.pki.privateKeyFromPem(privateKey), forge.md.sha256.create());
  return forge.pki.certificateToPem(cert);
}

const sslOptions = {
  key: privateKey,
  cert,
};

const args = process.argv.slice(2);

function sudoWriteFileSync(file, content) {
  const options = { name: "Spoofify" };
  const command = `echo '${content}' > ${file}`;
  return sudo.exec(command, options);
}

if (args[0] === "add") {
  const hostname = args[1];
  const port = args[2] ? `#port=${args[2]}` : `#port=${3002}`;
  const entry = `127.0.0.1 ${hostname} ${port}`;

  let hostsFilePath;
  switch (process.platform) {
    case "win32":
      hostsFilePath = "C:\\Windows\\System32\\drivers\\etc\\hosts";
      break;
    case "linux":
      hostsFilePath = "/etc/hosts";
      break;
    case "darwin":
      hostsFilePath = "/private/etc/hosts";
      break;
    default:
      console.log("Unsupported platform");
      return;
  }

  const hostsFile = fs.readFileSync(hostsFilePath, "utf-8");
  const lines = hostsFile.split("\n");

  if (lines.findIndex((a) => a === entry) > -1) {
    console.error(`${hostname}:${args[2]} already exists is hosts file`);
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
} else if (args[0] === "run") {
  const runServer = () => {
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

    const redwire = new RedWire(options);

    getPortFromHosts().forEach((a) => {
      redwire.https(a.hostname, `localhost:${a.port}`);
      redwire.proxy(a.hostname, `localhost:${a.port}`);
      redwire.httpsWs(a.hostname, `localhost:${a.port}`);
    });
  };

  runServer();
} else {
  console.log("Invalid command. Usage: Spoofify add <hostname> [port]");
}

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
