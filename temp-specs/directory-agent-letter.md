Subject: CRITICAL: directory.headlessprofile.com still not resolving — query.hdns.io change appears incorrect; need fix and verification

Hi [Agent/Developer Name],

Our directory at `directory.headlessprofile.com` is still not resolving properly. 

I see in your last message you stated the fix was “3/3 done” and you swapped the primary resolver to `https://query.hdns.io/dns-query`. However, this change appears to be the wrong approach for our setup and is completely failing in production. `query.hdns.io/dns-query` is currently throwing "Unable to parse the request" errors when hit. 

The service remains broken. Please treat this issue as unresolved and immediately roll back or correct the resolver issue. 

**What we need from you now:**

1. **Confirm resolver choice and rationale:** Explain why `query.hdns.io` was selected when it fails to parse requests. Use a resolver that actually works and returns the exact TXT records we require (like `resolve.shakestation.io/dns-query` which we use successfully on the frontend), or run a local/controlled resolver that does.

2. **Prove TXT retrieval end-to-end:** Provide logs (with timestamps) showing the exact DNS queries made, the transport (DoH/DoT/UDP), the endpoint, and the full decoded TXT response for the domains in question. We must see the raw payloads and the parsed output used by the app to ensure `name`, `bio`, and `category` fields are intact.

3. **Validation steps:** Share the exact commands and results you used to verify resolution, e.g.:
   - A `curl` DoH request to the chosen resolver showing a successful HTTP 200 with the DNS wire payload and decoded TXT answers.
   - `dnspython` output for those same queries.
   - App logs from `fetch_txt_records` showing the resolver used, the status, and the full list of TXT records returned.

**Acceptance criteria (do not mark complete until ALL pass):**
1. `directory.headlessprofile.com` resolves and loads profiles with the full `name`, `bio`, and `category` fields from TXT records (including preserving spaces and special characters).
2. The “Force Refresh” button pulls the exact same data immediately without failing.
3. Railway logs explicitly show the resolver used and the complete TXT arrays returned.
4. There is NO dependency on an API fallback that strips TXT records (i.e., no “agent_json/skill_md only” fallbacks).

If `query.hdns.io` is to be retained, you must provide undeniable evidence that it returns the correct TXT data for our records across multiple domains. If not, replace it immediately with a resolver that does.

Please prioritize this and send back:
- The updated `utils.py` diff
- The exact resolver configuration you settled on
- The validation logs/screenshots demonstrating the working TXT retrieval
- An ETA for the production deploy

Until the above is verified and `directory.headlessprofile.com` resolves correctly, this ticket should remain open.

Thanks,
Michael