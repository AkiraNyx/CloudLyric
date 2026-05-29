import { create } from 'zustand'
import { LyricLine } from '../../shared/types/lyric'

interface LyricStore {
  lines: LyricLine[]
  activeLineIndex: number
  activeWordIndex: number
  setLines: (lines: LyricLine[]) => void
  setActiveLine: (index: number) => void
  setActiveWord: (index: number) => void
}

export const useLyricStore = create<LyricStore>((set) => ({
  lines: [],
  activeLineIndex: -1,
  activeWordIndex: -1,
  setLines: (lines) => set({ lines }),
  setActiveLine: (index) => set({ activeLineIndex: index }),
  setActiveWord: (index) => set({ activeWordIndex: index }),
}))
