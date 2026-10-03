v4.0：所有六场景均已使用 Muse 提供的 Meta AI 合成配音。
网页运行不需要配音模型、生成工具或第三方 Python 库。
tools/voice-script-manifest.json 已同步当前全部台词。
generate_ep1_voice.py 和 rebuild_manifest_ep1.py 仅适用于 Muse 的 Linux 授权 TTS 环境。
其余 Kokoro 工具仅为历史工具，不适用于重建当前音色索引；不要运行它们覆盖当前 MP3 或 voice-manifest.js。
修改剧本须生成对应两方音频，保留人物音色并核验台词、大小、哈希及解码。
不要提交模型、依赖环境、账号或密钥。新增生成依赖需事先获得许可。
