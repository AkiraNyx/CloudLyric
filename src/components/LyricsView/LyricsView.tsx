import React, { useEffect, useRef, useMemo } from 'react'
import { useLyricStore } from '../../stores/lyricStore'
import { usePlayerStore } from '../../stores/playerStore'
import { LyricLine } from './LyricLine'

export const LyricsView: React.FC = () => {
  const { lines, activeLineIndex, setActiveLine, setActiveWord } = useLyricStore()
  const { playback } = usePlayerStore()
  const containerRef = useRef<HTMLDivElement>(null)

  // 二分查找当前活跃行
  useMemo(() => {
    if (lines.length === 0) return

    let low = 0
    let high = lines.length - 1
    let result = -1

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      const line = lines[mid]

      if (playback.position * 1000 >= line.startTime) {
        result = mid
        low = mid + 1
      } else {
        high = mid - 1
      }
    }

    setActiveLine(result)
  }, [playback.position, lines, setActiveLine])

  // 滚动到当前行
  useEffect(() => {
    if (activeLineIndex < 0 || !containerRef.current) return

    const activeElement = containerRef.current.children[activeLineIndex] as HTMLElement
    if (!activeElement) return

    const containerHeight = containerRef.current.clientHeight
    const elementTop = activeElement.offsetTop
    const elementHeight = activeElement.clientHeight

    // 居中显示当前行
    const scrollTo = elementTop - containerHeight / 2 + elementHeight / 2

    containerRef.current.scrollTo({
      top: scrollTo,
      behavior: 'smooth',
    })
  }, [activeLineIndex])

  return (
    <div className="lyrics-view" ref={containerRef}>
      {/* 顶部留白 */}
      <div className="lyrics-spacer" />

      {lines.map((line, index) => (
        <LyricLine
          key={index}
          line={line}
          isActive={index === activeLineIndex}
          currentTime={playback.position * 1000}
        />
      ))}

      {/* 底部留白 */}
      <div className="lyrics-spacer" />
    </div>
  )
}
