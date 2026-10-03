export {}

declare global {
  interface Window {
    PixelUI: {
      init: (root?: HTMLElement | Document) => void
      initTabs: (root?: HTMLElement | Document) => void
      initDropzones: (root?: HTMLElement | Document) => void
      selectTab: (tab: HTMLElement, focus?: boolean) => void
    }
    FIP: {
      THEMES: { theme: string; category: string }[]
      THEME_CATEGORIES: Record<string, string[]>
      pickTheme: (random?: () => number) => { theme: string; category: string }
    }
  }
}
