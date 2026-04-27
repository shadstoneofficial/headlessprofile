// Redirect headlessprofiles.com (with an 's') to headlessprofile.com
if (window.location.hostname === 'headlessprofiles.com' || window.location.hostname === 'www.headlessprofiles.com') {
    window.location.replace('https://headlessprofile.com' + window.location.pathname + window.location.search + window.location.hash);
}

async function fetchTXTRecords() {
    const urlParams = new URLSearchParams(window.location.search);
    let domain = urlParams.get('domain');

    const fullHostname = window.location.hostname;

    if (!domain) {
        if (fullHostname === 'headlessprofile.com' || fullHostname.includes('netlify')) {
            // Show nice landing page for the root domain
            showLandingPage();
            return;
        }
        domain = fullHostname;  // fallback
    }

    // Convert Emoji/Unicode to Punycode using the imported library
    let punycodeDomain = domain;
    try {
        if (window.punycode) {
            punycodeDomain = punycode.toASCII(domain);
        } else {
            // Native fallback if CDN fails (modern browsers)
            punycodeDomain = new URL('http://' + domain).hostname;
        }
    } catch (e) {
        console.error("Punycode conversion failed", e);
    }

    document.title = domain; // Keep the display name nice and pretty with emojis

    // Show loading state
    const loadingDiv = document.getElementById('loading');
    const contentDiv = document.getElementById('content');
    if (loadingDiv) loadingDiv.style.display = 'block';

    // Fetch and process the root domain's records using Punycode
    const txtRecords = await fetchAndProcessTXTRecords(punycodeDomain);

    if (txtRecords) {
        // Apply dynamic favicon and CSS
        await setDynamicFavicon(txtRecords);
        await setDynamicCSS(txtRecords);

        // Set the domain header
        const domainHeaderDiv = document.getElementById('domain-header');
        if (domainHeaderDiv) {
            domainHeaderDiv.innerHTML = `
                <span style="font-size: 0.7em; opacity: 0.7; font-family: sans-serif; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-right: 8px;">Viewing Profile</span>
                <span style="font-weight: bold; color: white;">${domain}</span>
            `;
        }

        // Process and display the fetched records using original domain for rendering
        processTXTRecords(txtRecords, domain);

        // Fetch ARP Integration Status
        await fetchARPIntegration(domain);

        // Hide loading state, show content
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (contentDiv) contentDiv.style.display = 'block';

        // Process any external records asynchronously
        txtRecords.forEach(record => {
            if (record.startsWith("ext:")) {
                const externalDomain = record.split("ext:")[1];
                let punyExternal = externalDomain;
                try {
                    punyExternal = window.punycode ? punycode.toASCII(externalDomain) : new URL('http://' + externalDomain).hostname;
                } catch(e) {}
                fetchAndProcessTXTRecords(punyExternal).then(records => processTXTRecords(records, domain));
            }
        });
    }
}

// Function to set dynamic favicon based on TXT record with "fav:" prefix
async function setDynamicFavicon(txtRecords) {
    if (!txtRecords) return;

    const faviconRecord = txtRecords.find(record => record.startsWith("fav:"));
    if (faviconRecord) {
        const faviconValue = faviconRecord.split("fav:")[1];
        const faviconUrl = `https://${faviconValue}`;
        
        // Update all existing favicon links
        let iconLinks = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
        
        if (iconLinks.length > 0) {
            // Update existing ones
            iconLinks.forEach(link => {
                link.href = faviconUrl;
            });
        } else {
            // Fallback: create a new one if none exist
            let faviconLink = document.createElement('link');
            faviconLink.rel = 'shortcut icon';
            faviconLink.type = 'image/png';
            faviconLink.href = faviconUrl;
            document.head.appendChild(faviconLink);
        }
    }
    // If no "fav:" record exists, default favicon "/static/favicon.png" remains
}

// Function to set dynamic CSS based on TXT record with "css:" prefix
async function setDynamicCSS(txtRecords) {
    if (!txtRecords) return;

    const cssRecord = txtRecords.find(record => record.startsWith("css:"));
    if (cssRecord) {
        const cssValue = cssRecord.split("css:")[1];
        const cssUrl = `/css/${cssValue}.css`; // Self-hosted CSS file path
        
        // Update existing stylesheet link or create new one
        let cssLink = document.querySelector('link[rel="stylesheet"]');
        if (!cssLink) {
            cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            document.head.appendChild(cssLink);
        }
        cssLink.href = cssUrl;
    }
    // If no "css:" record exists, default "style.css?version=1" remains
}

async function fetchAndProcessTXTRecords(domain) {
    const url = `https://resolve.shakestation.io/dns-query?name=${domain}&type=TXT`;
        // alternative node: const url = `https://api.web3dns.net/?name=${domain}&type=TXT`;
        
    console.log("Fetch URL:", url);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/dns-json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("DNS Response:", data);

        if (data.Answer && data.Answer.length > 0) {
            return data.Answer
                .filter(record => record.type === 16)
                .map(record => record.data.replace(/"/g, ''));
        } else {
            console.error("No TXT records found in DNS response.");
            const loadingDiv = document.getElementById('loading');
            if (loadingDiv) loadingDiv.style.display = 'none';
            document.body.innerHTML = `<p style="text-align:center; padding:50px; color:white;">No TXT records found for this domain.</p><br><div style="text-align:center;"><a style="color: #fff; text-decoration: underline;" href="https://github.com/H4ckB4s3/hns-bio">Do you need help seting up your DID? Check the full documentation</a></div>`;
            return null;
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        const loadingDiv = document.getElementById('loading');
        if (loadingDiv) loadingDiv.style.display = 'none';
        document.body.innerHTML = `<p style="text-align:center; padding:50px; color:white;">An error occurred while fetching TXT records: ${error.message}</p><br><div style="text-align:center;"><a style="color: #fff; text-decoration: underline;" href="https://github.com/H4ckB4s3/hns-bio">Do you need help seting up your DID? Check the full documentation</a></div>`;
        return null;
    }
}


// Helper function to format phone numbers
function formatPhoneNumber(phone) {
    if (phone.startsWith('+')) {
        // Keep the + if it already exists
        return phone;
    } else if (phone.startsWith('00')) {
        // Replace 00 with +
        return '+' + phone.slice(2);
    } else if (/^\d/.test(phone)) {
        // Prepend + if it starts with a digit
        return '+' + phone;
    }
    return phone; // Return unchanged if none of the conditions apply
}

// Helper function to decode DNS decimal escapes (e.g. \226\128\148) to UTF-8
function decodeDNSEscapes(str) {
    let bytes = [];
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '\\' && i + 3 < str.length && /^\d{3}$/.test(str.substring(i+1, i+4))) {
            bytes.push(parseInt(str.substring(i+1, i+4), 10));
            i += 3;
        } else if (str[i] === '\\' && i + 1 < str.length) {
            bytes.push(str.charCodeAt(i+1));
            i++;
        } else {
            bytes.push(str.charCodeAt(i));
        }
    }
    try {
        return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
    } catch (e) {
        return str;
    }
}

// Function to fetch and display ARP Integration Status
async function fetchARPIntegration(domain) {
    const arpBadgeDiv = document.getElementById('arp-badge');
    const primaryActionsDiv = document.getElementById('primary-actions');

    if (!domain) return;

    try {
        const response = await fetch(`https://headlessdomains.com/api/v1/lookup/${domain}`);
        if (!response.ok) return; // Silent fail if API is down or domain not found

        const data = await response.json();
        
        if (data.status === "success" && data.integrations && data.integrations.arp_chat && data.integrations.arp_chat.enabled) {
            const chatUrl = data.integrations.arp_chat.url || `https://chat.arp.run/${domain}`;
            
            // 1. Show the "ARP Chat Enabled" badge under the tags
            if (arpBadgeDiv) {
                arpBadgeDiv.style.display = 'block';
            }

            // 2. Add the "Chat Now" CTA button to the primary actions grid
            if (primaryActionsDiv) {
                primaryActionsDiv.innerHTML = `
                    <a class="action-card" href="${chatUrl}" target="_blank" style="background: linear-gradient(135deg, rgba(65, 105, 225, 0.2), rgba(65, 105, 225, 0.1)); border-color: rgba(65, 105, 225, 0.4);">
                        <div class="action-icon" style="background: rgba(65, 105, 225, 0.2);">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4169e1" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        </div>
                        <div class="action-text">
                            <div class="action-title" style="color: #fff;">Chat Now</div>
                            <div class="action-sub">ARP Secure Chat</div>
                        </div>
                        <div class="action-arrow" style="color: #4169e1;">→</div>
                    </a>` + primaryActionsDiv.innerHTML; // Prepend it so it's the first button!
            }
        }
    } catch (error) {
        console.error("Error fetching ARP integration status:", error);
    }
}

function processTXTRecords(txtRecords, originalDomain) {
    const profileDiv = document.getElementById('profile');
    const nameDiv = document.getElementById('name');
    const categoryDiv = document.getElementById('category');
    const bioDiv = document.getElementById('bio');
    const capabilitiesDiv = document.getElementById('capabilities');
    const primaryActionsDiv = document.getElementById('primary-actions');
    const linksDiv = document.getElementById('links');
    const currencyButtonsDiv = document.getElementById('currency-buttons');
    const rawTxtOutput = document.getElementById('raw-txt-output');
    const fetchTime = document.getElementById('fetch-time');
    let bgSet = false;

    // Display Raw TXT records
    if (rawTxtOutput && txtRecords) {
        rawTxtOutput.textContent = JSON.stringify(txtRecords, null, 2);
    }
    
    // Display fetch timestamp
    if (fetchTime) {
        const now = new Date();
        fetchTime.textContent = `Last Fetched: ${now.toISOString()}`;
    }

    if (!txtRecords) return;

    // Set default bio state
    if (bioDiv) {
        bioDiv.innerHTML = '';
    }
    
    // Set default name fallback
    if (nameDiv) {
        nameDiv.innerText = originalDomain || window.location.hostname;
    }
    const currencies = { 
        btc: null, ln: null, hns: null, eth: null, xmr: null, zec: null, bat: null,
        aave: null, ada: null, algo: null, apt: null, atom: null, avax: null, 
        bch: null, bgb: null, bnb: null, chainlink: null, cro: null, dai: null, 
        doge: null, dot: null, ena: null, etc: null, fil: null, gt: null, 
        hbar: null, hype: null, icp: null, jup: null, kas: null, leo: null, 
        ltc: null, mnt: null, near: null, okb: null, om: null, ondo: null, 
        op: null, pepe: null, pi: null, pol: null, render: null, shib: null, 
        sol: null, sui: null, tao: null, tia: null, ton: null, trx: null, 
        uni: null, usdc: null, usde: null, usdt: null, vet: null, xlm: null, xrp: null 
    };

    txtRecords.forEach(record => {
        let decodedRecord = decodeDNSEscapes(record);
        let separator = decodedRecord.includes('=') ? '=' : ':';
        const [key, ...valueParts] = decodedRecord.split(separator);
        const value = valueParts.join(separator);
        let formattedValue = value;

        // Format phone number for 'tel' key
        if (key === 'tel') {
            formattedValue = formatPhoneNumber(value);
        }

        switch (key) {
            case 'pfp':
                profileDiv.innerHTML = `<img src="https://${value}" alt="Profile Picture">`;
                break;
            case 'bg':
                if (!bgSet) {
                    document.body.style.backgroundImage = `linear-gradient(rgba(11, 15, 18, 0.8), rgba(11, 15, 18, 0.95)), url(https://${value})`;
                    bgSet = true;
                }
                break;
            case 'bgcolor':
                if (!bgSet) {
                    document.body.style.backgroundColor = `#${value}`;
                    document.body.style.backgroundImage = 'none';
                    bgSet = true;
                }
                break;
            case 'name':
                if (nameDiv) {
                    nameDiv.innerText = value;
                }
                break;
            case 'custom':
            case 'bio':
            case 'description':
                if (bioDiv) {
                    if (bioDiv.innerText.trim() !== '') {
                        // If there's already text (e.g. they have both 'bio' and 'custom'), append it with a line break
                        bioDiv.innerText += '\n\n' + value;
                    } else {
                        bioDiv.innerText = value;
                    }
                }
                break;
            case 'category':
                if (categoryDiv) {
                    categoryDiv.innerHTML = `${value}`;
                }
                break;
            case 'arp':
                if (primaryActionsDiv) {
                    primaryActionsDiv.innerHTML = `
                        <a class="action-card" href="https://${value}" target="_blank" style="background: linear-gradient(135deg, rgba(65, 105, 225, 0.2), rgba(65, 105, 225, 0.1)); border-color: rgba(65, 105, 225, 0.4);">
                            <div class="action-icon" style="background: rgba(65, 105, 225, 0.2);">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4169e1" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                            </div>
                            <div class="action-text">
                                <div class="action-title" style="color: #fff;">Chat Now</div>
                                <div class="action-sub">ARP Secure Chat</div>
                            </div>
                            <div class="action-arrow" style="color: #4169e1;">→</div>
                        </a>` + primaryActionsDiv.innerHTML;
                }
                break;
            case 'agent-manifest':
            case 'manifest':
                if (primaryActionsDiv) {
                    primaryActionsDiv.innerHTML += `
                        <a class="action-card action-purple" href="https://${value}" target="_blank">
                            <div class="action-icon"><img src="img/agent.png" alt=""></div>
                            <div class="action-text">
                                <div class="action-title">agent.json</div>
                                <div class="action-sub">View agent manifest</div>
                            </div>
                            <div class="action-arrow">→</div>
                        </a>`;
                }
                break;
            case 'skill-md':
            case 'skill':
                if (primaryActionsDiv) {
                    primaryActionsDiv.innerHTML += `
                        <a class="action-card action-blue" href="https://${value}" target="_blank">
                            <div class="action-icon"><img src="img/skill.png" alt=""></div>
                            <div class="action-text">
                                <div class="action-title">skill.md</div>
                                <div class="action-sub">View capabilities</div>
                            </div>
                            <div class="action-arrow">→</div>
                        </a>`;
                }
                break;
            case 'agent-capabilities':
                if (capabilitiesDiv) {
                    const caps = value.split(',').map(c => c.trim());
                    caps.forEach(cap => {
                        capabilitiesDiv.innerHTML += `
                            <span class="cap-chip">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>
                                ${cap}
                            </span>`;
                    });
                }
                break;
            case 'tb':
                linksDiv.innerHTML += `<a class="social-btn" href="#" onclick="copyToClipboard('${value}'); return false;" title="THUNDERBOLT"><img src="img/${key}.png" alt="${key}"></a>`;
                break;
            case 'onion':
                linksDiv.innerHTML += `<a class="social-btn" href="http://${value}" target="_blank" title="ONION"><img src="img/onion.png" alt="Onion"></a>`;
                break;
            case 'x':
                linksDiv.innerHTML += `<a class="social-btn" href="https://x.com/${value}" target="_blank" title="X"><img src="img/x.png" alt="X"></a>`;
                break;
            case 'tg':
                linksDiv.innerHTML += `<a class="social-btn" href="https://t.me/${value}" target="_blank" title="TELEGRAM"><img src="img/tg.png" alt="Telegram"></a>`;
                break;
            case 'wa':
                linksDiv.innerHTML += `<a class="social-btn" href="https://wa.me/${value}" target="_blank" title="WHATSAPP"><img src="img/wa.png" alt="WhatsApp"></a>`;
                break;
            case 'sn':
                linksDiv.innerHTML += `<a class="social-btn" href="https://signal.me/#p/${value}" target="_blank" title="SIGNAL"><img src="img/sn.png" alt="Signal"></a>`;
                break;
            case 'tel':
                linksDiv.innerHTML += `<a class="social-btn" href="tel:${formattedValue}" target="_blank" title="PHONE"><img src="img/tel.png" alt="Phone"></a>`;
                break;
            case 'mail':
                linksDiv.innerHTML += `<a class="social-btn" href="mailto:${value}" target="_blank" title="EMAIL"><img src="img/mail.png" alt="Mail"></a>`;
                break;
            case 'gh':
                linksDiv.innerHTML += `<a class="social-btn" href="https://github.com/${value}" target="_blank" title="GITHUB"><img src="img/gh.png" alt="GitHub"></a>`;
                break;
            case 'link':
                if (primaryActionsDiv) {
                    primaryActionsDiv.innerHTML += `
                        <a class="action-card action-green" href="http://${value}" target="_blank">
                            <div class="action-icon"><img src="img/link.png" alt=""></div>
                            <div class="action-text">
                                <div class="action-title">Visit Website</div>
                                <div class="action-sub">Open official link</div>
                            </div>
                            <div class="action-arrow">→</div>
                        </a>`;
                } else {
                    linksDiv.innerHTML += `<a class="social-btn" href="http://${value}" target="_blank" title="LINK"><img src="img/link.png" alt="Link"></a>`;
                }
                break;
            case 'ig':
                linksDiv.innerHTML += `<a class="social-btn" href="https://www.instagram.com/${value}/" target="_blank" title="INSTAGRAM"><img src="img/ig.png" alt="Instagram"></a>`;
                break;
            case 'fb':
                linksDiv.innerHTML += `<a class="social-btn" href="https://www.facebook.com/${value}" target="_blank" title="FACEBOOK"><img src="img/fb.png" alt="Facebook"></a>`;
                break;
            case 'yt':
                linksDiv.innerHTML += `<a class="social-btn" href="https://www.youtube.com/@${value}" target="_blank" title="YOUTUBE"><img src="img/yt.png" alt="Youtube"></a>`;
                break;
            case 'rumble':
                linksDiv.innerHTML += `<a class="social-btn" href="https://rumble.com/${value}" target="_blank" title="RUMBLE"><img src="img/rumble.png" alt="Rumble"></a>`;
                break;  
            case 'ens':
                linksDiv.innerHTML += `<a class="social-btn" href="http://${value}.limo" target="_blank" title="ENS"><img src="img/ens.png" alt="ENS"></a>`;
                break;  
            case 'ipfs':
                linksDiv.innerHTML += `<a class="social-btn" href="http://${value}.ipfs.dweb.link" target="_blank" title="IPFS"><img src="img/ipfs.png" alt="IPFS"></a>`;
                break;
            case 'nostr':
                linksDiv.innerHTML += `<a class="social-btn" href="nostr:${value}" target="_blank" title="NOSTR"><img src="img/nostr.png" alt="Nostr"></a>`;
                break;                                          
            case 'pk':
                linksDiv.innerHTML += `<a class="social-btn" href="http://${value}./" target="_blank" title="PKDNS"><img src="img/pkdns.png" alt="pkdns"></a>`;
                break;
            case 'matrix':
                linksDiv.innerHTML += `<a class="social-btn" href="https://matrix.to/#/@${value}:matrix.org" target="_blank" title="MATRIX"><img src="img/matrix.png" alt="Matrix"></a>`;
                break;
            case 'sx':
                linksDiv.innerHTML += `<a class="social-btn" href="https://simplex.chat/contact#/${value.replace(/\s+/g, '')}.onion" target="_blank" title="SIMPLEX"><img src="img/simplex.png" alt="SimpleX"></a>`;
                break;
            case 'bsky':
                const bskyURL = value.includes('.') ? `https://bsky.app/profile/${value}` : `https://bsky.app/profile/${value}.bsky.social`;
                linksDiv.innerHTML += `<a class="social-btn" href="${bskyURL}" target="_blank" title="BLUESKY"><img src="img/bsky.png" alt="Bluesky"></a>`;
                break;
            case 'btc':
            case 'ln':
            case 'hns':
            case 'eth':
            case 'xmr':
            case 'zec':
            case 'bat':
            case 'aave':
            case 'ada':
            case 'algo':
            case 'apt':
            case 'atom':
            case 'avax':
            case 'bch':
            case 'bgb':
            case 'bnb':
            case 'chainlink':
            case 'cro':
            case 'dai':
            case 'doge':
            case 'dot':
            case 'ena':
            case 'etc':
            case 'fil':
            case 'gt':
            case 'hbar':
            case 'hype':
            case 'icp':
            case 'jup':
            case 'kas':
            case 'leo':
            case 'ltc':
            case 'mnt':
            case 'near':
            case 'okb':
            case 'om':
            case 'ondo':
            case 'op':
            case 'pepe':
            case 'pi':
            case 'pol':
            case 'render':
            case 'shib':
            case 'sol':
            case 'sui':
            case 'tao':
            case 'tia':
            case 'ton':
            case 'trx':
            case 'uni':
            case 'usdc':
            case 'usde':
            case 'usdt':
            case 'vet':
            case 'xlm':
            case 'xrp':
                currencies[key] = `<button class="social-btn" onclick="copyToClipboard('${value}')" title="${key.toUpperCase()}"><img src="img/${key}.png" alt="${key}"></button>`;
                break;
            default:
                console.warn(`Unhandled record type: ${key}`);
        }
    });

    Object.values(currencies).forEach(button => {
        if (button) {
            currencyButtonsDiv.innerHTML += button;
        }
    });

    // Auto-index to directory (silent)
    const urlParams = new URLSearchParams(window.location.search);
    let domain = urlParams.get('domain');
    if (!domain) {
        domain = window.location.hostname;
    }
    
    // Set the Directory permalink button
    const directoryLink = document.getElementById('directory-link');
    if (directoryLink) {
        directoryLink.href = `https://directory.headlessprofile.com/entry/${domain}`;
    }

    if (domain && domain !== 'headlessprofile.com' && !domain.includes('netlify') && !domain.includes('headlessprofiles.com')) {
        fetch('https://directory.headlessprofile.com/api/index', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain: originalDomain || domain }) // Pass original emoji domain
        }).catch(() => {}); // silent fail — don't break the viewer
    }
}

function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            alert(`Copied to clipboard: ${text}`);
        }).catch(err => {
            console.error('Clipboard API failed, using fallback: ', err);
            fallbackCopyToClipboard(text);
        });
    } else {
        fallbackCopyToClipboard(text);
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    // Fix mobile Safari scrolling bug when focusing hidden textarea
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        document.execCommand('copy');
        alert(`Copied to clipboard: ${text}`);
    } catch (err) {
        console.error('Fallback: Copy failed', err);
    }

    document.body.removeChild(textArea);
}

window.onload = fetchTXTRecords;

function showLandingPage() {
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) loadingDiv.style.display = 'none';
    
    const landingDiv = document.getElementById('landing');
    if (landingDiv) {
        landingDiv.style.display = 'flex';
        // Auto-focus input for convenience
        setTimeout(() => {
            const input = document.getElementById('domainInput');
            if (input) input.focus();
        }, 100);
    }
}

function goToDomain() {
    let input = document.getElementById('domainInput').value.trim();
    if (input) {
        // Make sure we pass the raw emoji text via URL encoding
        window.location.href = `https://headlessprofile.com/?domain=${encodeURIComponent(input)}`;
    }
}
