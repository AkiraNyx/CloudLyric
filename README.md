# CloudLyric

> 开发中，尚未发布。

Apple Music 风格的桌面歌词应用，专为网易云音乐设计。

## 功能

- 逐字高亮歌词显示
- 实时播放进度同步（通过 Windows SMTC）
- 毛玻璃背景 + 流体主题色
- 自动获取网易云音乐歌词

## 技术栈

- Electron + React + TypeScript + Vite
- SMTC (System Media Transport Controls) 获取播放状态
- .NET Bridge 与 WinRT API 交互
- Zustand 状态管理

## 开发

```bash
# 安装依赖
npm install

# 构建 SMTC Bridge
cd electron/services/smtc-bridge
dotnet build -c Release
cd ../../..

# 启动开发模式
npm run dev
```

## 构建

```bash
npm run build
```

## License

MIT
