import React from 'react'
import { LyricLine as LyricLineType } from '../../../shared/types/lyric'
import { LyricWord } from './LyricWord'

interface Props {
  line: LyricLineType
  isActive: boolean
  currentTime: number
}

export const LyricLine: React.FC<Props> = ({ line, isActive, currentTime }) => {
  // 计算当前字的进度
  const getWordProgress = (wordIndex: number): number => {
    if (!isActive) return 0

    const word = line.words[wordIndex]
    if (!word) return 0

    const wordEnd = word.startTime + word.duration
    if (currentTime < word.startTime) return 0
    if (currentTime >= wordEnd) return 1

    return (currentTime - word.startTime) / word.duration
  }

  return (
    <div
      className={`lyric-line ${isActive ? 'active' : ''} ${
        line.isBackground ? 'background' : ''
      } ${line.duetSide ? `duet-${line.duetSide}` : ''}`}
    >
      <div className="lyric-words">
        {line.words.map((word, index) => (
          <LyricWord
            key={index}
            word={word}
            isActive={isActive && getWordProgress(index) > 0 && getWordProgress(index) < 1}
            progress={getWordProgress(index)}
          />
        ))}
      </div>
      {line.translation && (
        <div className="lyric-translation">{line.translation}</div>
      )}
      {line.romanization && (
        <div className="lyric-romanization">{line.romanization}</div>
      )}
    </div>
  )
}
