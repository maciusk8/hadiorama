const fs = require('fs');
const path = require('path');

const injections = [
    { file: 'src/shared/components/NavBar.tsx', import: './NavBar.css' },
    { file: 'src/features/rooms/components/ImageAreaSelector.tsx', import: './ImageAreaSelector.css' },
    { file: 'src/shared/components/ImageDisplay.tsx', import: './ImageDisplay.css' },
    { file: 'src/features/rooms/components/RoomView.tsx', import: './RoomView.css' },
    { file: 'src/shared/components/PopupOverlay.tsx', import: './PopupOverlay.css' },
    { file: 'src/shared/components/WheelPalette.tsx', import: './WheelPalette.css' },
    { file: 'src/features/dnd/components/DraggableEntityPin.tsx', import: './DragPin.css' },
    { file: 'src/features/entities/components/StaticEntityPin.tsx', import: '@/features/dnd/components/DragPin.css' },
    { file: 'src/features/entities/components/AbstractEntityCard.tsx', import: './EntityCard.css' },
    { file: 'src/features/entities/components/EntityEditCard.tsx', import: './EntityCard.css' },
    { file: 'src/features/entities/components/EntitySwitchCard.tsx', import: './EntityCard.css' },
    { file: 'src/features/entities/components/EntityDefaultCard.tsx', import: './EntityCard.css' },
    { file: 'src/features/lights/components/Light/LightControls.tsx', import: './LightControls.css' },
    { file: 'src/features/lights/components/LightEditor/LightEditor.tsx', import: './LightEditor.css' },
    { file: 'src/features/lights/components/LightEditor/LightEditorControls.tsx', import: './LightEditor.css' },
    { file: 'src/features/lights/components/LightEditor/LightEditorPreview.tsx', import: './LightEditor.css' }
];

for (const inj of injections) {
    if (fs.existsSync(inj.file)) {
        let content = fs.readFileSync(inj.file, 'utf-8');
        const importStmt = `import '${inj.import}';\n`;
        if (!content.includes(importStmt) && !content.includes(`import "${inj.import}"`)) {
            // find last import or start of file
            const importMatches = [...content.matchAll(/^import\s+.*$/gm)];
            if (importMatches.length > 0) {
                const lastMatch = importMatches[importMatches.length - 1];
                const insertIndex = lastMatch.index + lastMatch[0].length + 1;
                content = content.slice(0, insertIndex) + importStmt + content.slice(insertIndex);
            } else {
                content = importStmt + content;
            }
            fs.writeFileSync(inj.file, content);
            console.log(`Injected into ${inj.file}`);
        }
    } else {
        console.log(`Could not find ${inj.file}`);
    }
}
