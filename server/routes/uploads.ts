import { Elysia } from 'elysia';
import { mkdir, exists } from 'node:fs/promises';
import path from 'node:path';

const UPLOADS_DIR = path.resolve(import.meta.dir, '../../data/uploads');

// Ensure uploads directory exists
await mkdir(UPLOADS_DIR, { recursive: true });

export const uploadsRoutes = new Elysia()
    .post('/api/local/upload', async ({ body, set }) => {
        try {
            const file = (body as any).file as File;
            if (!file) {
                set.status = 400;
                return { success: false, error: 'No file provided' };
            }

            // Generate unique filename
            const ext = path.extname(file.name) || '.png';
            const filename = `${crypto.randomUUID()}${ext}`;
            const filePath = path.join(UPLOADS_DIR, filename);

            // Write file to disk
            const buffer = await file.arrayBuffer();
            await Bun.write(filePath, buffer);

            return { success: true, url: `/uploads/${filename}` };
        } catch (error) {
            set.status = 500;
            return { success: false, error: 'Failed to upload file' };
        }
    })
    // Serve static files from uploads directory
    .get('/uploads/:filename', async ({ params: { filename }, set }) => {
        try {
            const filePath = path.join(UPLOADS_DIR, filename);

            if (!await exists(filePath)) {
                set.status = 404;
                return { success: false, error: 'File not found' };
            }

            return Bun.file(filePath);
        } catch (error) {
            set.status = 500;
            return { success: false, error: 'Failed to serve file' };
        }
    });
