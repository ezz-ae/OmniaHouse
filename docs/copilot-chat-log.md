## GitHub Copilot Chat

- Extension: 0.49.0 (prod)
- VS Code: 1.121.0 (f6cfa2ea2403534de03f069bdf160d06451ed282)
- OS: darwin 24.6.0 arm64
- GitHub Account: ezz-ae

## Network

User Settings:
```json
  "http.systemCertificatesNode": true,
  "github.copilot.advanced.debug.useElectronFetcher": true,
  "github.copilot.advanced.debug.useNodeFetcher": false,
  "github.copilot.advanced.debug.useNodeFetchFetcher": true
```

Connecting to https://api.github.com:
- DNS ipv4 Lookup: 20.233.83.146 (17 ms)
- DNS ipv6 Lookup: ::ffff:20.233.83.146 (5 ms)
- Proxy URL: None (1 ms)
- Electron fetch (configured): HTTP 200 (67 ms)
- Node.js https: HTTP 200 (48 ms)
- Node.js fetch: HTTP 200 (292 ms)

Connecting to https://api.individual.githubcopilot.com/_ping:
- DNS ipv4 Lookup: 140.82.114.21 (16 ms)
- DNS ipv6 Lookup: ::ffff:140.82.114.21 (3 ms)
- Proxy URL: None (1 ms)
- Electron fetch (configured): HTTP 200 (576 ms)
- Node.js https: HTTP 200 (550 ms)
- Node.js fetch: HTTP 200 (585 ms)

Connecting to https://proxy.individual.githubcopilot.com/_ping:
- DNS ipv4 Lookup: 20.199.39.224 (15 ms)
- DNS ipv6 Lookup: ::ffff:20.199.39.224 (14 ms)
- Proxy URL: None (1 ms)
- Electron fetch (configured): HTTP 200 (362 ms)
- Node.js https: HTTP 200 (363 ms)
- Node.js fetch: HTTP 200 (373 ms)

Connecting to https://mobile.events.data.microsoft.com: HTTP 404 (116 ms)
Connecting to https://dc.services.visualstudio.com: HTTP 404 (615 ms)
Connecting to https://copilot-telemetry.githubusercontent.com/_ping: HTTP 200 (573 ms)
Connecting to https://telemetry.individual.githubcopilot.com/_ping: HTTP 200 (570 ms)
Connecting to https://default.exp-tas.com: Error (111 ms): Error: read ECONNRESET
	at TLSWrap.onStreamRead (node:internal/stream_base_commons:216:20)

Number of system certificates: 0

## Documentation

In corporate networks: [Troubleshooting firewall settings for GitHub Copilot](https://docs.github.com/en/copilot/troubleshooting-github-copilot/troubleshooting-firewall-settings-for-github-copilot).