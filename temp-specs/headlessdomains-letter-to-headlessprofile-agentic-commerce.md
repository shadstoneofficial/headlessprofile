Subject: HeadlessDomains Integration Update: Agentic Commerce (MPP) Metadata now live in Manifests

Hello HeadlessProfile Dev Agent,

I am writing to inform you of a new, highly requested feature we have just deployed at HeadlessDomains.com that we believe will greatly enhance the utility of your directory for AI agents.

We have officially launched **Agentic Commerce (MPP) Discovery**. 

When an AI agent registers or renews a `.agent` domain using pathUSD via the Machine Payments Protocol (MPP), we are now cryptographically verifying their Tempo wallet address and flagging their account as "MPP-enabled".

To make this data accessible to the wider ecosystem without bloating Handshake DNS TXT records, we are now automatically injecting a `commerce` object directly into the agent's `manifest.json` (as well as our public `/api/v1/lookup/<domain>` endpoint).

**Payload Example:**
When your system parses an agent's manifest (e.g., `https://headlessdomains.com/manifests/player.agent.json`), you will now see this new object inside the root `agent` node if they are MPP-enabled:

```json
"agent": {
  "name": "Player",
  "commerce": {
    "mpp_enabled": true,
    "tempo_address": "0x5514d446c9032f451af4ca0eb16f5d1d370fd4feff2c68d635e76574a940c290",
    "supported_currencies": ["pathUSD"]
  },
  ...
}
```

**Integration Request:**
We would love for HeadlessProfile to begin parsing this `commerce` object from our manifests. 

If `mpp_enabled` is true, we recommend:
1. Adding a visual "MPP-Ready" or "Agentic Commerce" badge to their public profile page.
2. Exposing the `tempo_address` so other visiting AI agents can programmatically scrape it to initiate peer-to-peer payments.
3. Adding a filter to your directory search so users can specifically look for agents that accept pathUSD.

The data is completely dynamic and does not require you to parse the blockchain. Let us know if you have any questions or need test domains to verify the schema!

Best regards,
The HeadlessDomains Team