import { exec } from 'child_process'

export interface NowPlaying {
  title: string
  artist: string
  found: boolean
}

type Callback = (song: NowPlaying) => void

export class WindowTitleService {
  private timer: NodeJS.Timeout | null = null
  private callbacks: Callback[] = []
  private lastKey = ''

  start(interval = 1000) {
    this.stop()
    this.timer = setInterval(() => this.poll(), interval)
    this.poll() // 立即执行一次
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  onUpdate(callback: Callback) {
    this.callbacks.push(callback)
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback)
    }
  }

  private async poll() {
    const song = await this.getWindowTitle()
    const key = `${song.title}-${song.artist}`

    if (song.found && key !== this.lastKey) {
      this.lastKey = key
      this.callbacks.forEach((cb) => cb(song))
    }
  }

  private getWindowTitle(): Promise<NowPlaying> {
    return new Promise((resolve) => {
      const cmd = `powershell -command "Get-Process cloudmusic -ErrorAction SilentlyContinue | Select-Object -ExpandProperty MainWindowTitle"`

      exec(cmd, { encoding: 'utf-8' }, (error, stdout) => {
        if (error || !stdout || !stdout.trim()) {
          return resolve({ title: '', artist: '', found: false })
        }

        const title = stdout.trim()

        // 格式: "歌名 - 歌手" (网易云音乐窗口标题)
        const match = title.match(/^(.+?)\s*-\s*(.+)$/)
        if (match) {
          resolve({
            title: match[1].trim(),
            artist: match[2].trim(),
            found: true,
          })
        } else {
          resolve({ title: '', artist: '', found: false })
        }
      })
    })
  }
}
