import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const serverDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(serverDir, '..', '..')

export const config = {
  port: Number(process.env.PORT ?? 4000),
  sessionSecret: process.env.SESSION_SECRET ?? 'dev-only-insecure-secret',
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  openaiVisionModel: process.env.OPENAI_VISION_MODEL ?? 'gpt-5',
  openaiImageModel: process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1',
  useMockExtraction: process.env.USE_MOCK_EXTRACTION === 'true',
  dataDir: path.join(repoRoot, 'data'),
  uploadsDir: path.join(repoRoot, 'data', 'uploads'),
  processedDir: path.join(repoRoot, 'data', 'processed'),
  dbPath: path.join(repoRoot, 'data', 'fit-game.sqlite'),
}
