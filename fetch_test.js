const https = require('https');
const fs = require('fs');
const url = 'https://script.google.com/macros/s/AKfycbxTwh1RscCE9FDajFBXMbdaR-RiFHxrgy2jg1Mgry7qH3xnnVqH2tbtWjZIKQ58aExz/exec';

function fetchUrl(targetUrl) {
    https.get(targetUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            console.log("Redirecting to: " + res.headers.location);
            fetchUrl(res.headers.location);
            return;
        }
        
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log("Response length:", data.length);
            console.log("Response prefix:", data.substring(0, 500));
            fs.writeFileSync('gas_dump.json', data);
        });
    }).on('error', err => {
        console.error("Error:", err.message);
    });
}
fetchUrl(url);
