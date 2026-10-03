import { readFile } from 'node:fs/promises'
import OpenAI from 'openai'
import type { Slot } from '@fit-game/shared'
import { config } from '../config.ts'

export interface DetectedGarment {
  /** Short descriptive name, e.g. "red striped crop top" — avatar.js colors/shapes garments by keyword match on this. */
  name: string
  slot: Slot
}

const SLOTS: Slot[] = ['top', 'bottom', 'dress', 'accessory']

const MOCK_GARMENTS: DetectedGarment[][] = [
  [{ name: 'Blue denim jacket', slot: 'top' }, { name: 'Black skinny jeans', slot: 'bottom' }],
  [{ name: 'Floral sundress', slot: 'dress' }, { name: 'Straw sun hat', slot: 'accessory' }],
  [{ name: 'White graphic tee', slot: 'top' }, { name: 'Khaki cargo shorts', slot: 'bottom' }],
  [{ name: 'Red plaid flannel', slot: 'top' }, { name: 'Dark wash jeans', slot: 'bottom' }, { name: 'Beaded necklace', slot: 'accessory' }],
]

function mockExtract(): DetectedGarment[] {
  return MOCK_GARMENTS[Math.floor(Math.random() * MOCK_GARMENTS.length)]
}

let client: OpenAI | null = null
function getClient(): OpenAI {
  client ??= new OpenAI({ apiKey: config.openaiApiKey })
  return client
}

const PROMPT =
  "List every distinct wearable garment or accessory visible in this photo. Ignore the person's body, " +
  'face, and background. Skip items barely visible. For each item give a short descriptive name including ' +
  'its color/pattern (e.g. "red striped crop top", "black ankle boots") and which slot it belongs to: ' +
  '"top", "bottom", "dress" (one-piece garments only), or "accessory" (hats, bags, jewelry, glasses, scarves, ' +
  'shoes, belts all count as accessory). Respond with JSON: {"items": [{"name": "...", "slot": "..."}]}.'

export async function extractGarments(photoPath: string): Promise<DetectedGarment[]> {
  if (config.useMockExtraction || !config.openaiApiKey) return mockExtract()

  const imageBuffer = await readFile(photoPath)
  const base64 = imageBuffer.toString('base64')
  const mimeType = photoPath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'

  const response = await getClient().chat.completions.create({
    model: config.openaiVisionModel,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
        ],
      },
    ],
  })

  // Rough per-call cost visibility until real usage patterns are known.
  const usage = response.usage
  if (usage) console.log(`[extractGarments] ${config.openaiVisionModel} tokens: ${usage.prompt_tokens} in / ${usage.completion_tokens} out`)

  let parsed: unknown
  try {
    parsed = JSON.parse(response.choices[0]?.message?.content ?? '{}')
  } catch {
    return []
  }

  const items = (parsed as { items?: unknown })?.items
  if (!Array.isArray(items)) return []

  return items
    .filter((item): item is { name: unknown; slot: unknown } => typeof item === 'object' && item !== null)
    .map((item) => ({ name: String(item.name ?? '').trim().slice(0, 60), slot: item.slot }))
    .filter((item): item is DetectedGarment => item.name.length > 0 && SLOTS.includes(item.slot as Slot))
}
