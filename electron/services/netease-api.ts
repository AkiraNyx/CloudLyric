import axios from 'axios'

export interface NeteaseLyric {
  lrc?: string      // 逐行歌词
  yrc?: string      // 逐字歌词
  tlyric?: string   // 翻译歌词
  klyric?: string   // 卡拉OK歌词
}

export interface SongInfo {
  id: string
  title: string
  artist: string
  album: string
  coverUrl: string
  duration: number // 毫秒
}

export class NeteaseApi {
  private baseUrl = 'https://music.163.com/api'

  /**
   * 通过歌曲 ID 获取歌词
   */
  async getLyrics(songId: string): Promise<NeteaseLyric> {
    try {
      const response = await axios.get(`${this.baseUrl}/song/lyric`, {
        params: {
          id: songId,
          lv: -1,
          kv: -1,
          tv: -1,
        },
        headers: {
          'Referer': 'https://music.163.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })

      const data = response.data

      return {
        lrc: data.lrc?.lyric,
        yrc: data.yrc?.lyric,
        tlyric: data.tlyric?.lyric,
        klyric: data.klyric?.lyric,
      }
    } catch (error) {
      console.error('Failed to fetch lyrics:', error)
      throw error
    }
  }

  /**
   * 通过歌曲 ID 获取歌曲详情
   */
  async getSongDetail(songId: string): Promise<SongInfo | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/song/detail`, {
        params: {
          ids: songId,
        },
        headers: {
          'Referer': 'https://music.163.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })

      const songs = response.data?.songs
      if (!songs || songs.length === 0) {
        return null
      }

      const song = songs[0]
      return {
        id: String(song.id),
        title: song.name || '',
        artist: song.ar?.[0]?.name || '',
        album: song.al?.name || '',
        coverUrl: song.al?.picUrl || '',
        duration: song.dt || 0,
      }
    } catch (error) {
      console.error('Failed to fetch song detail:', error)
      return null
    }
  }

  /**
   * 搜索歌曲获取 ID 和基本信息
   */
  async searchSong(title: string, artist: string): Promise<SongInfo | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/search/get`, {
        params: {
          s: `${title} ${artist}`,
          type: 1,
          limit: 5,
        },
        headers: {
          'Referer': 'https://music.163.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })

      const songs = response.data?.result?.songs
      if (!songs || songs.length === 0) {
        return null
      }

      // 尝试精确匹配
      let matchedSong = songs.find((song: any) => {
        const songTitle = song.name?.toLowerCase()
        const songArtist = song.artists?.[0]?.name?.toLowerCase()
        return (
          songTitle === title.toLowerCase() &&
          songArtist === artist.toLowerCase()
        )
      })

      // 如果没有精确匹配，使用第一个结果
      if (!matchedSong) {
        matchedSong = songs[0]
      }

      // 获取完整详情（包含封面）
      const songId = String(matchedSong.id)
      const detail = await this.getSongDetail(songId)

      if (detail) {
        return detail
      }

      // 如果详情获取失败，返回基本信息
      return {
        id: songId,
        title: matchedSong.name || title,
        artist: matchedSong.artists?.[0]?.name || artist,
        album: matchedSong.album?.name || '',
        coverUrl: '',
        duration: matchedSong.duration || 0,
      }
    } catch (error) {
      console.error('Failed to search song:', error)
      return null
    }
  }
}
