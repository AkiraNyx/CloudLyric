import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { SmtcService, PlaybackState } from './services/smtc-service'
import { NeteaseApi } from './services/netease-api'
import { LyricParser } from './services/lyric-parser'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let smtcService: SmtcService | null = null
const neteaseApi = new NeteaseApi()
const lyricParser = new LyricParser()

// 调试日志
const logFile = path.join(os.tmpdir(), 'cloudlyric-debug.log')
function debugLog(msg: string) {
  try {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`)
  } catch {}
}

// ======== 核心状态 ========
const lyricsCache = new Map<string, any>()
let currentSongKey = ''
let songDuration = 0

// ======== 位置追踪状态 ========
let refPosition = 0        // 参考位置（秒）
let refTimestamp = 0       // 参考时间（Date.now() 毫秒）
let isPlaying = false       // 播放状态（来自 SMTC status 字段）

// 上一次 SMTC 原始位置（用于去重和拖动检测）
let lastSmtcPosition = -1
let lastSmtcTimestamp = 0

// 位置更新计时器
let positionTimer: NodeJS.Timeout | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 700,
    frame: false,
    transparent: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const isDev = !app.isPackaged
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 窗口控制 IPC
ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on('window-close', () => mainWindow?.hide())

// 歌词获取 IPC
ipcMain.handle('fetch-lyrics', async (_event, songId: string) => {
  if (lyricsCache.has(songId)) return lyricsCache.get(songId)
  try {
    const lyrics = await neteaseApi.getLyrics(songId)
    const parsed = lyricParser.parse(lyrics.yrc, lyrics.lrc, lyrics.tlyric)
    parsed.songId = songId
    lyricsCache.set(songId, parsed)
    return parsed
  } catch {
    return null
  }
})

// ======== 位置插值 ========
function getCurrentPosition(): number {
  if (!isPlaying || !refTimestamp) return refPosition
  const elapsed = (Date.now() - refTimestamp) / 1000
  const pos = refPosition + elapsed
  return songDuration > 0 ? Math.min(pos, songDuration) : pos
}

// ======== 位置同步计时器 ========
function startPositionSync() {
  if (positionTimer) clearInterval(positionTimer)

  let logCounter = 0
  positionTimer = setInterval(() => {
    // 暂停时不发送位置更新（位置由 SMTC 直接提供）
    if (!isPlaying) return

    const position = getCurrentPosition()
    logCounter++
    if (logCounter >= 100) {
      debugLog(`[Timer] pos=${position.toFixed(1)} ref=${refPosition.toFixed(1)}`)
      logCounter = 0
    }
    mainWindow?.webContents.send('position-update', { position })
  }, 50)
}

// ======== SMTC 状态处理 ========
function handleSmtcUpdate(state: PlaybackState) {
  const now = Date.now()

  // 1. 处理时长
  if (state.duration && state.duration > 0) {
    songDuration = state.duration
  }

  // 2. 检测歌曲变化
  const songKey = `${state.title || ''}-${state.artist || ''}`
  if (state.connected && state.title && state.artist && songKey !== currentSongKey) {
    const prevKey = currentSongKey
    currentSongKey = songKey

    // 重置位置追踪
    lastSmtcPosition = -1
    lastSmtcTimestamp = 0

    // 用 SMTC 的位置初始化
    if (state.position && state.position > 0) {
      refPosition = state.position
      refTimestamp = now
    } else {
      refPosition = 0
      refTimestamp = now
    }

    // 用 SMTC 的 status 判断播放状态
    const smtcStatus = (state.status || '').toLowerCase()
    isPlaying = smtcStatus === 'playing'

    debugLog(`[Song] "${state.title}" pos=${state.position} status=${smtcStatus} playing=${isPlaying}`)

    // 封面
    const coverUrl = state.thumbnail
      ? `file:///${state.thumbnail.replace(/\\/g, '/')}`
      : ''

    // 发送歌曲信息
    mainWindow?.webContents.send('song-info-update', {
      title: state.title,
      artist: state.artist,
      album: state.album || '',
      coverUrl: coverUrl,
      duration: state.duration || 0,
    })

    // 搜索歌词
    fetchAndSendLyrics(state.title!, state.artist!)

    debugLog(`[SMTC] songKey="${songKey}" prev="${prevKey}"`)
  }

  // 3. 用 SMTC status 更新播放状态
  const smtcStatus = (state.status || '').toLowerCase()
  const wasPlaying = isPlaying
  if (smtcStatus === 'playing') {
    isPlaying = true
  } else if (smtcStatus === 'paused' || smtcStatus === 'stopped') {
    isPlaying = false
  }

  // 状态变化时记录
  if (wasPlaying !== isPlaying) {
    if (!isPlaying) {
      // 切换到暂停：用当前插值位置作为暂停位置
      refPosition = getCurrentPosition()
      refTimestamp = now
      debugLog(`[State] -> Paused at ${refPosition.toFixed(1)}`)
    } else {
      // 切换到播放：更新参考时间
      refTimestamp = now
      debugLog(`[State] -> Playing from ${refPosition.toFixed(1)}`)
    }
  }

  // 4. 处理 SMTC 位置更新
  if (state.position !== undefined && state.position > 0) {
    // 去重
    const isDuplicate = state.position === lastSmtcPosition && (now - lastSmtcTimestamp) < 400
    if (!isDuplicate) {
      lastSmtcPosition = state.position
      lastSmtcTimestamp = now

      if (!refTimestamp) {
        // 第一次收到位置
        refPosition = state.position
        refTimestamp = now
        debugLog(`[Pos] First: ${state.position}`)
      } else if (!isPlaying) {
        // 暂停状态：直接采用 SMTC 位置（暂停时位置是准确的）
        const delta = Math.abs(state.position - refPosition)
        if (delta > 0.5) {
          debugLog(`[Pos] Pause-update: ${refPosition.toFixed(1)} -> ${state.position} (delta=${delta.toFixed(1)})`)
        }
        refPosition = state.position
        refTimestamp = now
      } else {
        // 播放状态：检查是否拖动了进度条
        const realElapsed = (now - refTimestamp) / 1000
        const predicted = refPosition + realElapsed
        const drift = state.position - predicted

        if (Math.abs(drift) > 5) {
          // 大跳变 = 拖动进度条
          refPosition = state.position
          refTimestamp = now
          debugLog(`[Pos] Seek: SMTC=${state.position} predicted=${predicted.toFixed(1)} drift=${drift.toFixed(1)}`)
        } else if (Math.abs(drift) > 1) {
          // 中等偏差 = 累积误差，平滑修正
          const corrected = refPosition + drift * 0.3
          refPosition = corrected
          refTimestamp = now
          debugLog(`[Pos] Adjust: drift=${drift.toFixed(1)} corrected=${corrected.toFixed(1)}`)
        } else {
          // 小偏差 = 正常，更新参考点
          refPosition = state.position
          refTimestamp = now
        }
      }
    }
  }

  // 5. 封面更新
  if (state.thumbnail) {
    const coverUrl = `file:///${state.thumbnail.replace(/\\/g, '/')}`
    mainWindow?.webContents.send('cover-update', { coverUrl })
  }

  // 6. 发送播放状态（暂停时用 SMTC 的精确位置，播放时用插值）
  const currentPosition = isPlaying ? getCurrentPosition() : refPosition
  mainWindow?.webContents.send('playback-update', {
    isPlaying: isPlaying,
    position: currentPosition,
    duration: state.duration || 0,
  })
}

async function fetchAndSendLyrics(title: string, artist: string) {
  try {
    const songInfo = await neteaseApi.searchSong(title, artist)
    if (songInfo) {
      const lyrics = await neteaseApi.getLyrics(songInfo.id)
      const parsed = lyricParser.parse(lyrics.yrc, lyrics.lrc, lyrics.tlyric)
      parsed.songId = songInfo.id
      lyricsCache.set(songInfo.id, parsed)
      mainWindow?.webContents.send('lyrics-update', parsed)
    }
  } catch (e) {
    debugLog(`[Lyrics] Error: ${e}`)
  }
}

// 启动 SMTC 服务
function startSmtcService() {
  smtcService = new SmtcService()
  smtcService.onUpdate(handleSmtcUpdate)
  smtcService.start()
}

// 系统托盘
function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '../../assets/icons/icon.png'))
  tray = new Tray(icon.resize({ width: 16, height: 16 }))

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => mainWindow?.show(),
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        smtcService?.stop()
        if (positionTimer) clearInterval(positionTimer)
        app.quit()
      },
    },
  ])

  tray.setToolTip('CloudLyric')
  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => mainWindow?.show())
}

app.whenReady().then(() => {
  createWindow()
  createTray()
  startPositionSync()
  startSmtcService()
})

app.on('window-all-closed', () => {})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})
