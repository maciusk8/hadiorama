const fs = require('fs');
const path = require('path');

const cssConfig = [
    { file: 'src/shared/components/NavBar.css', match: [/^\.nav(-zone|-autohide|\b)/m] },
    { file: 'src/features/rooms/components/ImageAreaSelector.css', match: [/^\.image-area-selector-container\b/m] },
    { file: 'src/shared/components/ImageDisplay.css', match: [/^\.image-display-/m] },
    { file: 'src/features/rooms/components/RoomView.css', match: [/^\.roomView\b/m, /^\.entity-(sidebar|list)\b/m] },
    { file: 'src/shared/components/PopupOverlay.css', match: [/^\.popup-overlay\b/m, /^@keyframes popup-fade-in/m] },
    { file: 'src/shared/components/WheelPalette.css', match: [/^\.wheel-palette-/m] },
    { file: 'src/features/dnd/components/DragPin.css', match: [/^\.drag-pin\b/m, /^\.pin\b/m] },
    { file: 'src/features/entities/components/EntityCard.css', match: [/^\.entity-card/m, /^\.big-switch/m, /^\.switch-icon-overlay/m, /^\.sidebar-drag-handle/m, /^\.entity-state-/m, /^\.deleteName\b/m] },
    { file: 'src/features/lights/components/Light/LightControls.css', match: [/^\.light-card-body\b/m, /^\.light-state-container\b/m, /^\.light-control-area\b/m, /^\.slider-/m, /^\.temp-value-bubble\b/m, /^\.light-mode-actions\b/m, /^\.mode-btn\b/m, /^\.color-control-container\b/m, /^\.mode-separator\b/m, /^\.presets-grid\b/m, /^\.preset-btn\b/m] },
    { file: 'src/features/lights/components/LightEditor/LightEditor.css', match: [/^\.light-editor-/m, /^\.light-center-drag-pin\b/m] }
];

const content = fs.readFileSync('src/App.css', 'utf-8');

const blocks = [];
let currentBlock = '';
let braceCount = 0;
let inMedia = false;

const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    currentBlock += line + '\n';

    braceCount += (line.match(/\{/g) || []).length;
    braceCount -= (line.match(/\}/g) || []).length;

    if (line.includes('@media')) {
        inMedia = true;
    }

    if (braceCount === 0 && currentBlock.trim() !== '') {
        if (inMedia) {
            inMedia = false;
        }
        blocks.push(currentBlock);
        currentBlock = '';
    }
}

if (currentBlock.trim() !== '') {
    blocks.push(currentBlock);
}

const unassignedBlocks = [];
const fileOutputs = {};
cssConfig.forEach(c => fileOutputs[c.file] = '');

for (const block of blocks) {
    let matched = false;
    for (const config of cssConfig) {
        if (config.match.some(regex => regex.test(block))) {
            fileOutputs[config.file] += block + '\n';
            matched = true;
            break;
        }
    }
    if (!matched) {
        unassignedBlocks.push(block);
    }
}

for (const [file, css] of Object.entries(fileOutputs)) {
    if (css.trim() !== '') {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, css.trim() + '\n');
    }
}

fs.writeFileSync('src/App.css', unassignedBlocks.join('\n').trim() + '\n');
console.log('CSS splitting complete!');
