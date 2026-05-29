import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // 播放状态
  onPlaybackUpdate: (callback: (state: any) => void) => {
    ipcRenderer.on('playback-update', (_event, state) => callback(state))
  },

  // 歌曲信息更新
  onSongInfoUpdate: (callback: (info: any) => void) => {
    ipcRenderer.on('song-info-update', (_event, info) => callback(info))
  },

  // 封面更新
  onCoverUpdate: (callback: (data: any) => void) => {
    ipcRenderer.on('cover-update', (_event, data) => callback(data))
  },

  // 位置更新
  onPositionUpdate: (callback: (data: any) => void) => {
    ipcRenderer.on('position-update', (_event, data) => callback(data))
  },

  // 歌词
  fetchLyrics: (songId: string) => ipcRenderer.invoke('fetch-lyrics', songId),
  onLyricsUpdate: (callback: (lyrics: any) => void) => {
    ipcRenderer.on('lyrics-update', (_event, lyrics) => callback(lyrics))
  },
})
