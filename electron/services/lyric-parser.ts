import { LyricLine, LyricWord, LyricsData } from '../../shared/types/lyric'

export class LyricParser {
  /**
   * 解析 YRC 逐字歌词
   * 格式: [start,duration](start,duration,0)Word (start,duration,0)word
   */
  parseYRC(yrcString: string): LyricLine[] {
    if (!yrcString) return []

    const lines = yrcString.split('\n')
    const result: LyricLine[] = []

    for (const line of lines) {
      // 跳过空行和头部信息（JSON 格式）
      if (!line.trim() || line.trim().startsWith('{')) continue

      // 解析行级时间戳 [start,duration]
      const lineMatch = line.match(/^\[(\d+),(\d+)\]/)
      if (!lineMatch) continue

      const startTime = parseInt(lineMatch[1])
      const duration = parseInt(lineMatch[2])

      // 解析单词级时间戳 (start,duration,0)text
      const words: LyricWord[] = []
      const wordRegex = /\((\d+),(\d+),\d+\)([^(\[]+)/g
      let match: RegExpExecArray | null

      while ((match = wordRegex.exec(line)) !== null) {
        const text = match[3].trim()
        if (text) {
          words.push({
            text,
            startTime: parseInt(match[1]),
            duration: parseInt(match[2]),
          })
        }
      }

      if (words.length > 0) {
        result.push({
          startTime,
          duration,
          words,
        })
      }
    }

    return result
  }

  /**
   * 解析 LRC 逐行歌词
   * 格式: [mm:ss.xx]歌词
   */
  parseLRC(lrcString: string): LyricLine[] {
    if (!lrcString) return []

    const lines = lrcString.split('\n')
    const result: LyricLine[] = []

    for (const line of lines) {
      // 匹配时间戳 [mm:ss.xx] 或 [mm:ss.xxx]
      const match = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/)
      if (!match) continue

      const minutes = parseInt(match[1])
      const seconds = parseInt(match[2])
      const ms = parseInt(match[3].padEnd(3, '0'))
      const startTime = (minutes * 60 + seconds) * 1000 + ms

      const text = match[4].trim()
      if (!text) continue

      // LRC 没有逐字信息，将整行作为一个 word
      result.push({
        startTime,
        duration: 0, // LRC 没有时长信息
        words: [
          {
            text,
            startTime,
            duration: 0,
          },
        ],
      })
    }

    // 计算每行的时长（到下一行开始的时间）
    for (let i = 0; i < result.length - 1; i++) {
      result[i].duration = result[i + 1].startTime - result[i].startTime
      result[i].words[0].duration = result[i].duration
    }

    // 最后一行给一个默认时长
    if (result.length > 0) {
      const lastLine = result[result.length - 1]
      lastLine.duration = 5000 // 默认 5 秒
      lastLine.words[0].duration = lastLine.duration
    }

    return result
  }

  /**
   * 解析翻译歌词
   * 格式: [mm:ss.xx]翻译文本
   */
  parseTranslation(tlyricString: string): Map<number, string> {
    const translations = new Map<number, string>()

    if (!tlyricString) return translations

    const lines = tlyricString.split('\n')

    for (const line of lines) {
      const match = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/)
      if (!match) continue

      const minutes = parseInt(match[1])
      const seconds = parseInt(match[2])
      const ms = parseInt(match[3].padEnd(3, '0'))
      const time = (minutes * 60 + seconds) * 1000 + ms

      const text = match[4].trim()
      if (text) {
        translations.set(time, text)
      }
    }

    return translations
  }

  /**
   * 合并歌词和翻译
   */
  mergeWithTranslation(lines: LyricLine[], tlyricString: string): LyricLine[] {
    const translations = this.parseTranslation(tlyricString)

    return lines.map((line) => {
      // 查找最接近的翻译（允许 100ms 误差）
      let translation: string | undefined

      for (const [time, text] of translations) {
        if (Math.abs(time - line.startTime) < 100) {
          translation = text
          break
        }
      }

      return {
        ...line,
        translation,
      }
    })
  }

  /**
   * 检测并标记背景人声
   * 规则：以 ( 或 （ 开头，) 或 ） 结束的行
   */
  detectBackgroundVocals(lines: LyricLine[]): LyricLine[] {
    return lines.map((line, index) => {
      const firstWord = line.words[0]?.text || ''
      const lastWord = line.words[line.words.length - 1]?.text || ''

      const isBackground =
        (firstWord.startsWith('(') || firstWord.startsWith('（')) &&
        (lastWord.endsWith(')') || lastWord.endsWith('）'))

      // 移除括号
      if (isBackground && line.words.length > 0) {
        const newWords = [...line.words]
        newWords[0] = {
          ...newWords[0],
          text: newWords[0].text.replace(/^[(（]/, ''),
        }
        newWords[newWords.length - 1] = {
          ...newWords[newWords.length - 1],
          text: newWords[newWords.length - 1].text.replace(/[)）]$/, ''),
        }

        return {
          ...line,
          words: newWords,
          isBackground: true,
        }
      }

      return line
    })
  }

  /**
   * 完整解析流程
   */
  parse(yrc?: string, lrc?: string, tlyric?: string): LyricsData {
    // 优先使用 YRC 逐字歌词
    let lines = yrc ? this.parseYRC(yrc) : []

    // 如果没有 YRC，使用 LRC
    if (lines.length === 0 && lrc) {
      lines = this.parseLRC(lrc)
    }

    // 合并翻译
    if (tlyric) {
      lines = this.mergeWithTranslation(lines, tlyric)
    }

    // 检测背景人声
    lines = this.detectBackgroundVocals(lines)

    return {
      lines,
      songId: '',
      source: 'netease',
    }
  }
}
