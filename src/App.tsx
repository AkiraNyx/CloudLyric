import React, { useEffect } from 'react'
import { LyricsView } from './components/LyricsView/LyricsView'
import { NowPlaying } from './components/NowPlaying/NowPlaying'
import { PlayerControls } from './components/Controls/PlayerControls'
import { FluidBackground } from './components/Background/FluidBackground'
import { usePlayerStore } from './stores/playerStore'
import { useLyricStore } from './stores/lyricStore'
import './styles/global.css'

const App: React.FC = () => {
  const { setPlayback } = usePlayerStore()
  const { setLines } = useLyricStore()

  useEffect(() => {
    // 监听播放状态更新
    window.electronAPI?.onPlaybackUpdate((state) => {
      console.log('[Renderer] playback-update:', state.isPlaying, 'pos:', state.position, 'dur:', state.duration)
      setPlayback({
        isPlaying: state.isPlaying,
        position: state.position,
        duration: state.duration,
      })
    })

    // 监听歌曲信息更新（包含封面）
    window.electronAPI?.onSongInfoUpdate((info) => {
      console.log('[Renderer] song-info-update: pos=0, title:', info.title)
      setPlayback({
        title: info.title,
        artist: info.artist,
        album: info.album,
        albumArt: info.coverUrl,
        duration: info.duration,
        position: 0, // 切换歌曲时重置进度
      })
    })

    // 监听封面更新
    window.electronAPI?.onCoverUpdate((data) => {
      setPlayback({
        albumArt: data.coverUrl,
      })
    })

    // 监听位置更新
    window.electronAPI?.onPositionUpdate((data) => {
      console.log('[Renderer] position-update:', data.position)
      setPlayback({
        position: data.position,
      })
    })

    // 监听歌词更新
    window.electronAPI?.onLyricsUpdate((lyrics) => {
      if (lyrics?.lines) {
        setLines(lyrics.lines)
      }
    })
  }, [setPlayback, setLines])

  return (
    <div className="app">
      <FluidBackground />
      <div className="app-content">
        <div className="titlebar">
          <div className="titlebar-drag" />
          <div className="titlebar-buttons">
            <button className="titlebar-btn" onClick={() => window.electronAPI?.minimize()}>
              ─
            </button>
            <button className="titlebar-btn" onClick={() => window.electronAPI?.close()}>
              ✕
            </button>
          </div>
        </div>
        <NowPlaying />
        <LyricsView />
        <PlayerControls />
      </div>
    </div>
  )
}

export default App
