using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Windows.Media.Control;
using Windows.Storage.Streams;
using System.IO;

namespace SmtcBridge;

class Program
{
    private static readonly SemaphoreSlim _outputLock = new(1, 1);
    private static string _lastOutput = "";

    static async Task Main(string[] args)
    {
        bool continuous = args.Length > 0 && args[0] == "--continuous";

        if (continuous)
        {
            await RunEventDriven();
        }
        else
        {
            await RunOnce();
        }
    }

    static async Task RunOnce()
    {
        try
        {
            var state = await GetPlaybackState();
            Console.WriteLine(state);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(JsonSerializer.Serialize(new { error = ex.Message }));
            Environment.Exit(1);
        }
    }

    static async Task RunEventDriven()
    {
        var manager = await GlobalSystemMediaTransportControlsSessionManager.RequestAsync();

        // 立即输出一次
        await OutputCurrentState(manager);

        // 监听 session 变化
        manager.CurrentSessionChanged += async (s, e) =>
        {
            await OutputCurrentState(manager);
            // 重新订阅新 session 的事件
            SubscribeToSession(manager.GetCurrentSession());
        };

        // 订阅当前 session 的事件
        SubscribeToSession(manager.GetCurrentSession());

        // 保持进程运行
        await Task.Delay(Timeout.Infinite);
    }

    private static void SubscribeToSession(GlobalSystemMediaTransportControlsSession? session)
    {
        if (session == null) return;

        // 监听时间线变化（位置、时长）
        session.TimelinePropertiesChanged += async (s, e) =>
        {
            await OutputCurrentStateFromSession(s as GlobalSystemMediaTransportControlsSession);
        };

        // 监听播放状态变化
        session.PlaybackInfoChanged += async (s, e) =>
        {
            await OutputCurrentStateFromSession(s as GlobalSystemMediaTransportControlsSession);
        };

        // 监听媒体属性变化（切歌）
        session.MediaPropertiesChanged += async (s, e) =>
        {
            await OutputCurrentStateFromSession(s as GlobalSystemMediaTransportControlsSession);
        };
    }

    private static async Task OutputCurrentStateFromSession(GlobalSystemMediaTransportControlsSession? session)
    {
        if (session == null) return;

        await _outputLock.WaitAsync();
        try
        {
            var state = await BuildState(session);
            var output = JsonSerializer.Serialize(state);

            // 去重：只输出有变化的状态
            if (output != _lastOutput)
            {
                _lastOutput = output;
                Console.WriteLine(output);
                Console.Out.Flush();
            }
        }
        catch { }
        finally
        {
            _outputLock.Release();
        }
    }

    private static async Task OutputCurrentState(GlobalSystemMediaTransportControlsSessionManager manager)
    {
        var session = manager.GetCurrentSession();
        if (session == null)
        {
            var noSession = JsonSerializer.Serialize(new
            {
                connected = false,
                error = "No active media session"
            });
            Console.WriteLine(noSession);
            Console.Out.Flush();
            return;
        }

        await OutputCurrentStateFromSession(session);
    }

    private static async Task<object> BuildState(GlobalSystemMediaTransportControlsSession session)
    {
        var media = await session.TryGetMediaPropertiesAsync();
        var playback = session.GetPlaybackInfo();
        var timeline = session.GetTimelineProperties();

        string thumbnailPath = await SaveThumbnail(media.Thumbnail);

        return new
        {
            connected = true,
            app = session.SourceAppUserModelId,
            title = media.Title ?? "",
            artist = media.Artist ?? "",
            album = media.AlbumTitle ?? "",
            thumbnail = thumbnailPath,
            status = playback.PlaybackStatus.ToString(),
            position = Math.Round(timeline.Position.TotalSeconds, 3),
            duration = Math.Round((timeline.EndTime - timeline.StartTime).TotalSeconds, 3),
            isPlaying = playback.PlaybackStatus.ToString() == "Playing"
        };
    }

    static async Task<string> GetPlaybackState()
    {
        var manager = await GlobalSystemMediaTransportControlsSessionManager.RequestAsync();
        var session = manager.GetCurrentSession();

        if (session == null)
        {
            return JsonSerializer.Serialize(new
            {
                connected = false,
                error = "No active media session"
            });
        }

        var state = await BuildState(session);
        return JsonSerializer.Serialize(state);
    }

    static async Task<string> SaveThumbnail(IRandomAccessStreamReference? thumbnail)
    {
        if (thumbnail == null)
            return "";

        try
        {
            var stream = await thumbnail.OpenReadAsync();
            var tempPath = Path.Combine(Path.GetTempPath(), "cloudlyric_cover.jpg");

            using var fileStream = File.Create(tempPath);
            using var inputStream = stream.AsStreamForRead();
            await inputStream.CopyToAsync(fileStream);

            return tempPath;
        }
        catch
        {
            return "";
        }
    }
}
