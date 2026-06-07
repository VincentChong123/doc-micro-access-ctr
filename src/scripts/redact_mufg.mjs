import fs from 'fs';
import path from 'path';

const directory = '/home/vin/01-prj/doc-micro-access-ctr';

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                results = results.concat(walkDir(fullPath));
            }
        } else {
            results.push(fullPath);
        }
    });
    return results;
}

const allFiles = walkDir(directory);

let modifiedCount = 0;

allFiles.forEach(file => {
    // Only process text files (skip binaries if any)
    if (file.match(/\.(md|js|mjs|json|jsonl)$/i)) {
        let content = fs.readFileSync(file, 'utf8');
        
        if (content.match(/global-bank/i)) {
            // Replace email/domain domains
            content = content.replace(/global-bank\.jp/g, 'global-bank.local');
            // Replace prefixes
            content = content.replace(/GLOBAL-BANK/g, 'GLOBAL-BANK');
            // Replace lowercase
            content = content.replace(/global-bank/g, 'global-bank');
            
            fs.writeFileSync(file, content, 'utf8');
            console.log(`Redacted: ${file}`);
            modifiedCount++;
        }
    }
});

console.log(`\nSuccessfully redacted ${modifiedCount} files.`);
