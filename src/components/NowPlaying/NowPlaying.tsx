import React from 'react'
import { usePlayerStore } from '../../stores/playerStore'

export const NowPlaying: React.FC = () => {
  const { playback } = usePlayerStore()

  if (!playback.title) {
    return (
      <div className="now-playing empty">
        <p>等待播放...</p>
      </div>
    )
  }

  return (
    <div className="now-playing">
      <div className="album-art">
        {playback.albumArt ? (
          <img src={playback.albumArt} alt={playback.album} />
        ) : (
          <div className="album-art-placeholder">♪</div>
        )}
      </div>
      <div className="song-info">
        <h2 className="song-title">{playback.title}</h2>
        <p className="song-artist">{playback.artist}</p>
      </div>
    </div>
  )
}
