import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import { app } from 'electron'

export interface PlaybackState {
  connected: boolean
  app?: string
  title?: string
  artist?: string
  album?: string
  thumbnail?: string
  status?: string
  position?: number
  duration?: number
  isPlaying?: boolean
  error?: string
}

type PlaybackCallback = (state: PlaybackState) => void

export class SmtcService {
  private process: ChildProcess | null = null
  private callbacks: PlaybackCallback[] = []
  private exePath: string

  constructor() {
    // SMTC bridge 路径
    // __dirname 在编译后是 dist/electron/electron/services/
    // 需要回到项目根目录再找 smtc-bridge
    const projectRoot = path.resolve(__dirname, '../../../..')
    this.exePath = path.join(
      projectRoot,
      'electron/services/smtc-bridge/bin/Release/net10.0-windows10.0.22621.0/win-x64/SmtcBridge.exe'
    )
  }

  start() {
    if (this.process) {
      this.stop()
    }

    this.spawnProcess()
  }

  private spawnProcess() {
    console.log('Starting SMTC bridge:', this.exePath)

    this.process = spawn(this.exePath, ['--continuous'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let buffer = ''

    this.process.stdout?.on('data', (data: Buffer) => {
      buffer += data.toString()

      // 处理完整的 JSON 行
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // 保留不完整的行

      for (const line of lines) {
        if (line.trim()) {
          try {
            const state: PlaybackState = JSON.parse(line.trim())
            this.callbacks.forEach((cb) => cb(state))
          } catch {
            // 忽略解析错误
          }
        }
      }
    })

    this.process.stderr?.on('data', (data: Buffer) => {
      console.error('SMTC bridge error:', data.toString())
    })

    this.process.on('close', (code) => {
      console.log('SMTC bridge exited with code:', code)
      this.process = null

      // 自动重启（如果非正常退出）
      if (code !== 0 && code !== null) {
        setTimeout(() => this.start(), 2000)
      }
    })

    this.process.on('error', (err) => {
      console.error('Failed to start SMTC bridge:', err)
    })
  }

  stop() {
    if (this.process) {
      this.process.kill()
      this.process = null
    }
  }

  onUpdate(callback: PlaybackCallback) {
    this.callbacks.push(callback)
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback)
    }
  }
}
