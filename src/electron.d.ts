export interface ElectronAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  onPlaybackUpdate: (callback: (state: any) => void) => void
  onSongInfoUpdate: (callback: (info: any) => void) => void
  onCoverUpdate: (callback: (data: any) => void) => void
  onPositionUpdate: (callback: (data: any) => void) => void
  fetchLyrics: (songId: string) => Promise<any>
  onLyricsUpdate: (callback: (lyrics: any) => void) => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
