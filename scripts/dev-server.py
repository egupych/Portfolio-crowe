"""
Статический сервер для разработки.

Отличие от `python -m http.server` одно: каждый ответ идёт с `no-store`.
Штатный сервер не шлёт `Cache-Control` вообще, браузер кэширует эвристически
и после правки отдаёт старый CSS или JS — правка выглядит как «не применилась».
В проде того же добивается vercel.json.

    python scripts/dev-server.py [порт]
"""

import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    handler = partial(NoCacheHandler, directory=str(ROOT))
    print(f'http://localhost:{port}  (без кэша)')
    # Потоковый: на странице десятки параллельных запросов за картинками,
    # однопоточный сервер их сериализует и загрузка подвисает
    ThreadingHTTPServer(('127.0.0.1', port), handler).serve_forever()


if __name__ == '__main__':
    main()
