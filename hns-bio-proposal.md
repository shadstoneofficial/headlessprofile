Subject: PR / Feature Request: Add new AI Agent TXT Prefixes to HNS.BIO

Hi H4ckB4s3 and the HNS.BIO contributors,

We love the decentralized profile viewer you've built at HNS.BIO! Over at HeadlessProfile.com, we have built a fork of your project specifically optimized for displaying Decentralized AI Agents alongside human identities. 

To properly support these AI Agents, we've introduced several new TXT record prefixes to our fork, and we would love to see them merged into the upstream HNS.BIO repository so they become part of the universal standard.

Here are the new prefixes we've added:

### AI Agent Extensions
| Prefix                    | Purpose                        | Example |
|---------------------------|--------------------------------|-------|
| `agent-manifest:<url>`    | Link to agent.json manifest    | `agent-manifest:headlessdomains.com/manifests/janice.agent.json` |
| `skill-md:<url>`          | Link to SKILL.md documentation | `skill-md:headlessdomains.com/skills/janice.agent.md` |
| `agent-capabilities:...`  | Comma-separated capabilities   | `agent-capabilities:research,data-entry,web-browsing` |

### New Profile Fields
| Prefix                    | Purpose                        | Example |
|---------------------------|--------------------------------|-------|
| `name:<text>`             | Display name                   | `name:Janice The Agent` |
| `category:<text>`         | Main classification/category   | `category:Sales Agent` |
| `bio:<text>`              | Short biography or description (max ~250 chars) | `bio:Decentralized AI Agent` |

**Implementation Details:**
- `name`: Renders as a large, bold `<h2>`-style element right beneath the profile picture.
- `category`: Renders as a small, uppercase badge/pill to easily classify the profile type.
- `bio`: Renders as standard text beneath the category. If a `bio:` record is missing, it displays a faded, italicized "No bio available."
- `agent-manifest` & `skill-md`: Render as distinct buttons/links with unique gradients to distinguish them from standard web links.
- `agent-capabilities`: Splits the comma-separated string and renders them as small, individual tags/badges.

### Critical Parser Bug Fix: Support for "=" Delimiters
In addition to the new fields, we discovered a bug in the `fetch.js` parser. Currently, the script uses `const [key, value] = record.split(':');` which breaks if a DNS provider automatically uses `=` instead of `:` as the delimiter (which is common across many panels). Furthermore, if a value itself contains a colon or equals sign (like a URL), it truncates the string.

We implemented a robust fix for this that gracefully handles both delimiters and rejoins the remaining parts of the string:

```javascript
// Support both "key:value" and "key=value"
let separator = record.includes('=') ? '=' : ':';
const [key, ...valueParts] = record.split(separator);
const value = valueParts.join(separator);
```

We believe adding these prefixes and this bug fix will make HNS.BIO an incredibly powerful tool for the rapidly growing ecosystem of on-chain AI agents. 

We would be happy to submit a Pull Request to your repository (`H4ckB4s3/hns-bio`) with the exact JavaScript/HTML/CSS implementation if you are open to it. 

Looking forward to your thoughts!

Best,
Michael
HeadlessProfile.com