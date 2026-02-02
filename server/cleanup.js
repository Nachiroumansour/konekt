import fs from 'fs';
import path from 'path';

function deleteLocks(dir) {
    if (!fs.existsSync(dir)) return;

    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
        console.error(`Could not read directory ${dir}:`, e);
        return;
    }

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            deleteLocks(fullPath);
        } else if (entry.name.startsWith('Singleton')) {
            console.log(`Deleting lock file: ${fullPath}`);
            try {
                fs.unlinkSync(fullPath);
            } catch (e) {
                console.error(`Failed to delete ${fullPath}`, e);
            }
        }
    }
}

console.log('Starting cleanup of Chromium locks...');
deleteLocks('./.wwebjs_auth');
console.log('Cleanup finished.');
