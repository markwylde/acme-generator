import fs from 'fs';
import path from 'path';
import { Client } from 'node-scp';

import config from './config.js';
import generateCertificate from './generateCertificate.js';

const date = new Date();

const chainFileName = `./certs/${date.getDate()}-${date.getMonth()}-${date.getFullYear()}.chain.pem`;
const privateKeyFileName = `./certs/${date.getDate()}-${date.getMonth()}-${date.getFullYear()}.privkey.pem`;
const result = await generateCertificate(config)

fs.writeFileSync(chainFileName, result.fullchain)
fs.writeFileSync(privateKeyFileName, result.privatekey)

const client = await Client({
  host: config.server.host,
  port: config.server.port,
  username: config.server.user,
  privateKey: fs.readFileSync(config.server.privateKeyFile)
})

console.log('Uploading certificates to server');
await client.uploadFile(chainFileName, path.join(config.server.outputDirectory, 'chain.pem'));
await client.uploadFile(privateKeyFileName, path.join(config.server.outputDirectory, 'privkey.pem'));

client.close();
