const fs = require('fs');
const path = require('path');

// Read the .env file
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.error("Error: .env file not found!");
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const domainMatch = envContent.match(/CHAT_DOMAIN=(.+)/);

if (!domainMatch) {
    console.error("Error: CHAT_DOMAIN not found in .env!");
    process.exit(1);
}

const domain = domainMatch[1].trim();
console.log(`Building extension for domain: ${domain}`);

// 1. Update manifest.json
const manifestPath = path.join(__dirname, 'manifest.json');
try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Replace the chat domain in host_permissions
    manifest.host_permissions = manifest.host_permissions.map(url => 
        url.includes('google.com') ? url : `*://${domain}/*`
    );
    
    // Replace the chat domain in content_scripts
    manifest.content_scripts.forEach(script => {
        if (!script.matches[0].includes('google.com')) {
            script.matches = [`*://${domain}/*`];
        }
    });

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('✅ Updated manifest.json');
} catch (e) {
    console.error('Failed to update manifest.json:', e.message);
}

// 2. Update background.js
const bgPath = path.join(__dirname, 'background.js');
try {
    let background = fs.readFileSync(bgPath, 'utf8');
    
    // Regex to match the chrome.tabs.query for the chat app
    // Looks for: url: "*://SOME_DOMAIN/*" and replaces it
    // We only replace the one that IS NOT gemini.google.com
    background = background.replace(/url:\s*"([^"]+)"/g, (match, url) => {
        if (url.includes('gemini.google.com')) {
            return `url: "*://gemini.google.com/*"`;
        } else {
            return `url: "*://${domain}/*"`;
        }
    });

    fs.writeFileSync(bgPath, background);
    console.log('✅ Updated background.js');
} catch (e) {
    console.error('Failed to update background.js:', e.message);
}

console.log('Build complete! You can now "Reload" the extension in Chrome.');
