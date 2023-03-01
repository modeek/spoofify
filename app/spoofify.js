#!/usr/bin/env node

const fs = require("fs");
const sudo = require("sudo-prompt");
const http = require("http");
const https = require("https");
const crypto = require('crypto');
const tls = require('tls');
const forge = require('node-forge');

const { parse } = require("url");

function generateGuid() {
  const buf = crypto.randomBytes(16);
  buf[6] = (buf[6] & 0x0f) | 0x40; // set version to 4
  buf[8] = (buf[8] & 0x3f) | 0x80; // set variant to RFC 4122
  return Buffer.from(buf).toString('base64');
}

const npmDirPath = '.npm';

if (!fs.existsSync(npmDirPath)) {
  // .npm directory does not exist, create it
  fs.mkdirSync(npmDirPath);
}

const certFilePath = '.npm/cert.pem';
const privateKeyPath = '.npm/prk.pem'
const publicKeyPath = '.npm/pub.pem'

let privateKey;
let publicKey;
let cert;


function generateGuid() {
  const serialNumberBuffer = crypto.randomBytes(8);
  const guidBuffer = crypto.randomBytes(16);
  serialNumberBuffer.copy(guidBuffer, 0, 0, 8); // Copy the serial number to the first 8 bytes of the GUID buffer
  const guid = guidBuffer.toString('base64');
  return guid;
}

if (fs.existsSync(certFilePath) && fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
  cert = fs.readFileSync(certFilePath).toString('utf8');
  privateKey = fs.readFileSync(privateKeyPath).toString('utf8');
  publicKey = fs.readFileSync(publicKeyPath).toString('utf8');
} else {
  const { privateKey: newPrivateKey, publicKey: newPublicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  privateKey = newPrivateKey;
  publicKey = newPublicKey;
  cert = generateSelfSignedCertificate(newPrivateKey, newPublicKey);

  fs.writeFileSync(certFilePath, cert.toString('utf8'));
  fs.writeFileSync(privateKeyPath, privateKey.toString('utf8'));
  fs.writeFileSync(publicKeyPath, publicKey.toString('utf8'));
}


function generateSelfSignedCertificate(privateKey, publicKey) {
  const cert = forge.pki.createCertificate();
  cert.publicKey = forge.pki.publicKeyFromPem(publicKey);
  cert.serialNumber = `${generateGuid()}`;
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  const attrs = [
    { name: 'commonName', value: 'localhost' },
    { name: 'countryName', value: 'US' },
    { shortName: 'ST', value: 'California' },
    { name: 'localityName', value: 'San Francisco' },
    { name: 'organizationName', value: 'Acme Inc.' },
    { shortName: 'OU', value: 'IT' },
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
  const port = args[2] ? `#port=${args[2]}` : "";
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


    const server = https.createServer(sslOptions, (req, res) => {
      const port = getPortFromHosts().find(
        (a) =>
          a?.hostname && a?.hostname?.includes(req.headers.host.split(":")[0])
      )?.port;
      if (port) {
        const target = `http://localhost:${port}`;
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl, port);
      } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.write("Port Not Found\n");
        res.end();
      }
    });

    server.listen(443, "0.0.0.0", () => {
      console.log("Spoofify is running");
    });
  };

  runServer();
} else {
  console.log("Invalid command. Usage: Spoofify add <hostname> [port]");
}

const handle = (req, res, parsedUrl, port) => {
  const targetUrl = `http://localhost:${port}${parsedUrl.path}`;

  const options = {
    hostname: "localhost",
    port,
    path: parsedUrl.path,
    method: req.method,
    headers: req.headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  req.pipe(proxyReq);
};

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
