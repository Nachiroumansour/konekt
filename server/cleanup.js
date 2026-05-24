import fs from 'fs';
import path from 'path';

const AUTH_DATA_PATH = path.resolve(process.cwd(), '.wwebjs_auth');

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
deleteLocks(AUTH_DATA_PATH);
console.log(`Cleanup finished. Auth path: ${AUTH_DATA_PATH}`);
