export interface PlaybackState {
  title: string
  artist: string
  album: string
  albumArt?: string
  position: number  // 秒
  duration: number  // 秒
  isPlaying: boolean
  songId?: string
}

export interface PlayerStore {
  playback: PlaybackState
  setPlayback: (state: Partial<PlaybackState>) => void
  isReady: boolean
  setReady: (ready: boolean) => void
}
