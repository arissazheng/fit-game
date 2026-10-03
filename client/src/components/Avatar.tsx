import { CANVAS, composeAvatar } from '@fit-game/shared'
import type { Facing, Outfit } from '@fit-game/shared'

interface AvatarProps {
  outfit: Outfit
  facing?: Facing
  /** Integer upscale factor for display; sprites are pixel art at 64x128 native. */
  scale?: number
}

/**
 * Stacks the outfit's layers in LAYER_ORDER. Every sprite is already a full
 * 64x128 transparent PNG with its garment positioned correctly (see
 * SLOT_BOXES in avatarSpec), so rendering is just an absolute-positioned
 * stack — no per-slot layout math here.
 */
export function Avatar({ outfit, facing = 'front', scale = 4 }: AvatarProps) {
  const layers = composeAvatar(outfit, facing)

  return (
    <div
      style={{
        position: 'relative',
        width: CANVAS.width * scale,
        height: CANVAS.height * scale,
        imageRendering: 'pixelated',
      }}
    >
      {layers.map(({ layer, spritePath }) => (
        <img
          key={layer}
          src={spritePath}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            imageRendering: 'pixelated',
          }}
        />
      ))}
    </div>
  )
}
