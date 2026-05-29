import React from 'react'
import { LyricWord as LyricWordType } from '../../../shared/types/lyric'

interface Props {
  word: LyricWordType
  isActive: boolean
  progress: number // 0-1
}

export const LyricWord: React.FC<Props> = ({ word, isActive, progress }) => {
  return (
    <span className="lyric-word">
      <span className="lyric-word-text">{word.text}</span>
      {isActive && (
        <span
          className="lyric-word-highlight"
          style={{ width: `${progress * 100}%` }}
        />
      )}
    </span>
  )
}
