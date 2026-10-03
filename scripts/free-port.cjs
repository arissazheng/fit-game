// Frees a TCP port before `npm run dev` starts, so a stray process left over
// from a previous run (crashed watcher, a second session, etc.) can't block
// the new one with EADDRINUSE. Best-effort: silently does nothing if lsof
// isn't available or nothing is listening.
const { execSync } = require('node:child_process')

const port = process.argv[2] || '4000'

try {
  const pids = execSync(`lsof -ti:${port} -sTCP:LISTEN`, { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim()
    .split('\n')
    .filter(Boolean)

  for (const pid of pids) {
    try {
      process.kill(Number(pid), 'SIGKILL')
      console.log(`Freed port ${port} (killed stale process ${pid})`)
    } catch {
      // already gone
    }
  }
} catch {
  // lsof found nothing listening (or isn't available) — port is already free
}
