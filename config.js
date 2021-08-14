export default {
  directoryUrl: 'https://acme-staging-v02.api.letsencrypt.org/directory',
  // directoryUrl: 'https://acme-v02.api.letsencrypt.org/directory',
  email: 'your@email.example.com',
  domains: ['*.example.com'],
  digitalOceanToken: process.env.DIGITALOCEAN_TOKEN,
  server: {
    host: '192.168.1.100',
    port: 22,
    user: 'root',
    privateKeyFile: '/home/user/.ssh/id_rsa',
    outputDirectory: '/data/certs'
  }
}
