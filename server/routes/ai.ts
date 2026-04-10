import { Elysia, t } from 'elysia';
import { GoogleGenAI } from '@google/genai';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const UPLOADS_DIR = path.resolve(import.meta.dir, '../../data/uploads');
await mkdir(UPLOADS_DIR, { recursive: true });

const ai = new GoogleGenAI({});
const sessions = new Map<string, any[]>();

export const aiRoutes = new Elysia({ prefix: '/ai' })
  .post('/start_chat', async ({ body }) => {
    try {
      const { prompt, image } = body as { prompt: string; image: File };
      if (!image || !prompt) {
        return { success: false, error: 'prompt and image are required' };
      }

      const buffer = await image.arrayBuffer();
      const base64Data = Buffer.from(buffer).toString('base64');
      const mimeType = image.type || 'image/png';

      const contents = [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { data: base64Data, mimeType } }
        ]
      }];

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents,
        config: { responseModalities: ['TEXT', 'IMAGE'] }
      });

      const outputParts = response.candidates?.[0]?.content?.parts || [];
      const history = [...contents, { role: 'model', parts: outputParts }];
      
      const sessionId = crypto.randomUUID();
      sessions.set(sessionId, history);

      let filename = null;
      let url = null;

      for (const part of outputParts) {
        if (part.inlineData && part.inlineData.data) {
          const ext = part.inlineData.mimeType?.split('/')[1] || 'png';
          filename = `${crypto.randomUUID()}.${ext}`;
          const filePath = path.join(UPLOADS_DIR, filename);
          await Bun.write(filePath, Buffer.from(part.inlineData.data, 'base64'));
          url = `/uploads/${filename}`;
          break;
        }
      }

      return {
        success: true,
        sessionId,
        text: response.text,
        url
      };
    } catch (error: any) {
      console.error('AI chat start failed:', error);
      return { success: false, error: error.message };
    }
  })
  .post('/chat/:sessionId', async ({ params: { sessionId }, body }) => {
    try {
      const { prompt } = body as { prompt: string };
      if (!prompt) {
        return { success: false, error: 'prompt is required' };
      }

      const history = sessions.get(sessionId);
      if (!history) {
        return { success: false, error: 'session not found' };
      }

      const newContent = {
        role: 'user',
        parts: [{ text: prompt }]
      };
      
      const contents = [...history, newContent];

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents,
        config: { responseModalities: ['TEXT', 'IMAGE'] }
      });

      const outputParts = response.candidates?.[0]?.content?.parts || [];
      sessions.set(sessionId, [...contents, { role: 'model', parts: outputParts }]);

      let filename = null;
      let url = null;

      for (const part of outputParts) {
        if (part.inlineData && part.inlineData.data) {
          const ext = part.inlineData.mimeType?.split('/')[1] || 'png';
          filename = `${crypto.randomUUID()}.${ext}`;
          const filePath = path.join(UPLOADS_DIR, filename);
          await Bun.write(filePath, Buffer.from(part.inlineData.data, 'base64'));
          url = `/uploads/${filename}`;
          break;
        }
      }

      return {
        success: true,
        text: response.text,
        url
      };
    } catch (error: any) {
      console.error('AI chat progress failed:', error);
      return { success: false, error: error.message };
    }
  });
