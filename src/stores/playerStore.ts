import { create } from 'zustand'
import { PlaybackState } from '../../shared/types/player'

interface PlayerStore {
  playback: PlaybackState
  setPlayback: (state: Partial<PlaybackState>) => void
  isReady: boolean
  setReady: (ready: boolean) => void
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  playback: {
    title: '',
    artist: '',
    album: '',
    albumArt: undefined,
    position: 0,
    duration: 0,
    isPlaying: false,
    songId: undefined,
  },
  setPlayback: (state) =>
    set((prev) => ({
      playback: { ...prev.playback, ...state },
    })),
  isReady: false,
  setReady: (ready) => set({ isReady: ready }),
}))
