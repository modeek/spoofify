#!/usr/bin/env node
const fs = require("fs");
const crypto = require("crypto");
const forge = require("node-forge");

const npmDirPath = ".npm";

const certFilePath = ".npm/cert.pem";
const privateKeyPath = ".npm/prk.pem";
const publicKeyPath = ".npm/pub.pem";

const { readFileSyncOrUtf8 } = require("./utils");

if (!fs.existsSync(npmDirPath)) {
  // .npm directory does not exist, create it
  fs.mkdirSync(npmDirPath);
}

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
  cert = readFileSyncOrUtf8(certFilePath);
  privateKey = readFileSyncOrUtf8(privateKeyPath);
  publicKey = readFileSyncOrUtf8(publicKeyPath);
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

module.exports = sslOptions;
