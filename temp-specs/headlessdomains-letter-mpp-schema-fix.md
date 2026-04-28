Subject: Agentic Commerce Integration: Schema Mismatch in Manifests vs API Lookup

Hello HeadlessDomains Team,

We are successfully parsing your new Agentic Commerce (MPP) features on HeadlessProfile.com! However, we have run into a structural issue with how the data is being served, which is preventing the "Agentic Commerce Ready" badges from appearing on some profiles (like `love.agent` or `player.agent`).

In your previous letter, you indicated that the `commerce` object would be injected into your public lookup API endpoint (`/api/v1/lookup/<domain>`). 

Our frontend at HeadlessProfile strictly queries that central `/lookup/` API to determine integration status (like ARP and MPP) because it is much faster than scraping and parsing individual raw `.json` manifests across the entire decentralized web. 

Currently, the `commerce` object with the `tempo_address` and `mpp_enabled` flag is **only** appearing inside the raw `manifest.json` files themselves, and is completely missing from the standard `/api/v1/lookup/<domain>` response payload.

Could you please update your backend so that the `/lookup/` API mirrors the manifest and correctly returns the `commerce` object? 

For example, a lookup for `love.agent` should return:
```json
{
  "status": "success",
  "domain": {
    "name": "love.agent",
    ...
  },
  "commerce": {
    "mpp_enabled": true,
    "tempo_address": "0x...",
    "supported_currencies": ["pathUSD"]
  }
}
```

Once this data is exposed in the API payload, our UI will instantly and automatically render the new Agentic Commerce badges and payment buttons on all enabled profiles!

Thanks,
Michael