配音生成工具，不是网页运行依赖。
在 tools 下建立隔离 Python 3.10–3.13 环境，需事先获得安装许可。
已用版本：kokoro-onnx 0.6.1、lameenc 1.8.4。
先用 download_voice_hf.py 下载官方模型及音色，再运行 prepare_voice_styles.py。
生成：python generate_full_voice.py --app-dir .. --model-dir voice-model
编辑脚本时还须同步 voice-script-manifest.json。
生成后运行 python build_voice_pack.py --app-dir .. 校验并重建 voice-manifest.js。
不要提交模型、依赖环境或账号密钥；每个新版本必须校验全部音频及台词映射。
