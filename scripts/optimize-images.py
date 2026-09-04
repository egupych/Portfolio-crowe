"""
Пережимает исходные PNG в WebP — именно их отдаёт браузер.

Запускать после добавления нового фото или сертификата:
    python scripts/optimize-images.py

Исходники остаются на месте как архив и в вёрстке не используются:
    photos/*.png        →  photos/webp/*.webp        384 px, q88
    certificates/*.png  →  certificates/webp/*.webp     исходный размер, q90 (лайтбокс и печать)
                        →  certificates/thumb/*.webp    400 px, q80 (сетка превью)

Файл пересобирается, только если исходник новее — повторный запуск дешёвый.
"""

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit('Нужен Pillow: pip install Pillow')

ROOT = Path(__file__).resolve().parent.parent

# (папка с исходниками, подпапка результата, максимальная сторона или None, качество)
JOBS = [
    ('photos', 'webp', 384, 88),
    ('certificates', 'webp', None, 90),
    ('certificates', 'thumb', 400, 80),
]


def convert(src: Path, dst: Path, max_side, quality: int) -> None:
    with Image.open(src) as im:
        im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'PA') else 'RGB')
        if max_side:
            im.thumbnail((max_side, max_side * 8), Image.LANCZOS)
        dst.parent.mkdir(parents=True, exist_ok=True)
        im.save(dst, 'WEBP', quality=quality, method=6)


def main() -> None:
    for folder, subdir, max_side, quality in JOBS:
        src_dir = ROOT / folder
        out_dir = src_dir / subdir
        made = skipped = src_bytes = out_bytes = 0

        for src in sorted(src_dir.glob('*.png')):
            dst = out_dir / (src.stem + '.webp')
            if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
                skipped += 1
            else:
                convert(src, dst, max_side, quality)
                made += 1
            src_bytes += src.stat().st_size
            out_bytes += dst.stat().st_size

        weights = f'{src_bytes / 1048576:.1f} МБ -> {out_bytes / 1048576:.1f} МБ'
        label = f'{folder}/{subdir}'
        print(f'{label:<28} собрано: {made:>3}, актуально: {skipped:>3}   {weights}')


if __name__ == '__main__':
    main()
