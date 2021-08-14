import fs from 'fs';

import Keypairs from '@root/keypairs';
import ACME from '@root/acme';
import CSR from '@root/csr';
import PEM from '@root/pem';

import digitalOceanChallenge from 'acme-dns-01-digitalocean';

const packageAgent = 'acme-generator/v1';

async function createAcmeAccount (acme, email) {
  const accountKeypair = await Keypairs.generate({ kty: 'EC', format: 'jwk' });
  const accountKey = accountKeypair.private;

  console.info('registering new ACME account...');

  const account = await acme.accounts.create({
    subscriberEmail: email,
    agreeToTerms: true,
    accountKey
  });

  const acmeAccountPem = await Keypairs.export({ jwk: accountKey });
  await fs.promises.writeFile('./certs/acme-account.pem', acmeAccountPem, 'ascii');

  console.info('created account with id', account.key.kid);
}

async function getAcmeAccount (acme, email) {
  try {
    await fs.promises.readFile('./certs/acme-account.pem', 'ascii');
  } catch (error) {
    if (error.code === 'ENOENT') {
      await createAcmeAccount(acme, email);
    } else {
      throw error;
    }
  }

  const accountKeyPem = await fs.promises.readFile('./certs/acme-account.pem', 'ascii');
  const accountKey = await Keypairs.import({ pem: accountKeyPem });
  const account = await acme.accounts.create({
    subscriberEmail: email,
    agreeToTerms: true,
    accountKey
  });

  console.info('loaded account with id', account.key.kid);

  return { account, accountKey };
}

async function generateCertificate (config) {
  const errors = [];
  function notify (ev, msg) {
    if (ev === 'error' || ev === 'warning') {
      errors.push(ev.toUpperCase() + ' ' + msg.message);
      return;
    }
    console.log(ev, msg.altname || '', msg.status || '');
  }

  const acme = ACME.create({ maintainerEmail: config.email, packageAgent, notify });
  await acme.init(config.directoryUrl);

  const { account, accountKey } = await getAcmeAccount(acme, config.email);

  // Generate server certificates
  const serverKeypair = await Keypairs.generate({ kty: 'RSA', format: 'jwk' });
  const serverKey = serverKeypair.private;
  const serverPem = await Keypairs.export({ jwk: serverKey });

  const encoding = 'der';
  const typ = 'CERTIFICATE REQUEST';

  const domains = config.domains;
  const csrDer = await CSR.csr({ jwk: serverKey, domains, encoding });
  const csr = PEM.packBlock({ type: typ, bytes: csrDer });

  const challenges = {
    'dns-01': digitalOceanChallenge.create({
      baseUrl: 'https://api.digitalocean.com/v2/domains',
      token: config.digitalOceanToken
    })
  };

  console.info('validating domain authorization for ' + domains.join(' '));
  const pems = await acme.certificates.create({
    account,
    accountKey,
    csr,
    domains,
    challenges
  });
  const fullchain = pems.cert + '\n' + pems.chain + '\n';

  if (errors.length) {
    console.warn();
    console.warn('[Warning]');
    console.warn('The following warnings and/or errors were encountered:');
    console.warn(errors.join('\n'));
  }

  return {
    domains,
    status: 'success',
    fullchain,
    privatekey: serverPem
  };
}

export default generateCertificate;
