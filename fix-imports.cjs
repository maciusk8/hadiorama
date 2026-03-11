const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, 'src');

const allFiles = [];
function walk(dir) {
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            allFiles.push(fullPath);
        }
    }
}
walk(srcDir);

const fileMap = {};
for (const file of allFiles) {
    const baseName = path.basename(file, path.extname(file));
    if (baseName !== 'index') {
        const relPath = path.relative(srcDir, file);
        let importPath = '@/' + relPath.replace(/\\/g, '/');
        importPath = importPath.replace(/\.(tsx|ts)$/, '');
        fileMap[baseName] = importPath;
    }
}

for (const file of allFiles) {
    let content = fs.readFileSync(file, 'utf-8');

    const importRegex = /(from\s+|import\s+)(['"])((\.\/|\.\.\/)[^'"]+)\2/g;

    const newContent = content.replace(importRegex, (match, prefix, quote, relPath) => {
        if (relPath.endsWith('.css') || relPath.endsWith('.png') || relPath.endsWith('.jpg') || relPath.endsWith('.svg')) return match;

        // In React Native/Vite occasionally imports don't have extensions, so extname returns '' for bare module names or directories
        let importedBaseName = path.basename(relPath, path.extname(relPath));

        // Some old imports were `import { X } from '../components'` which resolved to index.ts
        // We deleted index.ts. We should let TSC catch broken directory imports or fix them manually,
        // but we can fix direct file imports accurately.
        if (fileMap[importedBaseName]) {
            return `${prefix}${quote}${fileMap[importedBaseName]}${quote}`;
        }
        return match;
    });

    if (content !== newContent) {
        fs.writeFileSync(file, newContent);
    }
}
console.log('Done rewriting imports.');
