"""Пересобирает облегчённые копии медиафайлов для сайта.

Исходники лежат в media/ (их и нужно менять), сайт берёт файлы из assets/media/.
После замены картинки или трейлера в media/ запустите из корня репозитория:

    python3 tools/optimize_media.py

Нужны Pillow (pip install pillow) и, для трейлера, ffmpeg.
"""
import glob
import os
import shutil
import subprocess

from PIL import Image

SRC, DST = "media", os.path.join("assets", "media")
os.makedirs(DST, exist_ok=True)

for path in sorted(glob.glob(os.path.join(SRC, "*.png")) + glob.glob(os.path.join(SRC, "*.jpg"))):
    name = os.path.splitext(os.path.basename(path))[0]
    im = Image.open(path)
    has_alpha = "A" in im.getbands() or "transparency" in im.info
    im = im.convert("RGBA" if has_alpha else "RGB")
    max_w = 2400 if name.startswith("background_1") else 1920  # небо и море крупнее: на них параллакс
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    out = os.path.join(DST, name + ".webp")
    im.save(out, "WEBP", quality=80, method=6)
    print(f"{path} -> {out} ({os.path.getsize(path) // 1024}K -> {os.path.getsize(out) // 1024}K)")

trailer = os.path.join(SRC, "trailer.mp4")
if os.path.exists(trailer) and shutil.which("ffmpeg"):
    out = os.path.join(DST, "trailer.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", trailer, "-c:v", "libx264", "-preset", "slow",
                    "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k",
                    "-movflags", "+faststart", out], check=True)
    print(f"{trailer} -> {out} ({os.path.getsize(trailer) // 1048576}M -> {os.path.getsize(out) // 1048576}M)")
