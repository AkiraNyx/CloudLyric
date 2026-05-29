export interface LyricWord {
  text: string
  startTime: number
  duration: number
}

export interface LyricLine {
  startTime: number
  duration: number
  words: LyricWord[]
  translation?: string
  romanization?: string
  isBackground?: boolean
  duetSide?: 'left' | 'right'
}

export interface LyricsData {
  lines: LyricLine[]
  songId: string
  source: 'netease' | 'qq'
}
