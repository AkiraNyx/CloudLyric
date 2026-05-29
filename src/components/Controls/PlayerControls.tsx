import React from 'react'
import { usePlayerStore } from '../../stores/playerStore'

export const PlayerControls: React.FC = () => {
  const { playback } = usePlayerStore()

  const formatTime = (seconds: number): string => {
    const min = Math.floor(seconds / 60)
    const sec = Math.floor(seconds % 60)
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  const progress = playback.duration > 0
    ? (playback.position / playback.duration) * 100
    : 0

  return (
    <div className="player-controls">
      <div className="progress-bar">
        <div className="progress-bar-bg">
          <div
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="progress-time">
          <span>{formatTime(playback.position)}</span>
          <span>{formatTime(playback.duration)}</span>
        </div>
      </div>
    </div>
  )
}
