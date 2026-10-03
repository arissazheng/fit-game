import { useSyncExternalStore } from 'react'
import { DevHome } from './dev/DevHome'
import { PixelizePage } from './dev/pixelize/PixelizePage'
import { ClosetScreen } from './screens/ClosetScreen'

function subscribeToHash(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

function useHash() {
  return useSyncExternalStore(subscribeToHash, () => window.location.hash)
}

export function App() {
  const hash = useHash()

  if (hash === '#/dev') return <DevHome />
  if (hash === '#/dev/pixelize') return <PixelizePage />
  return <ClosetScreen />
}
