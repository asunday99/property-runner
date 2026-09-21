const fs = require('fs');
const html = fs.readFileSync('index_beta.html', 'utf8');
if (html.includes('runner-area')) {
    console.log("Runner HTML exists.");
}
