from pathlib import Path
from PIL import Image

for path in sorted(Path('/home/ubuntu/webdev-static-assets').glob('*')):
    if not path.is_file():
        continue
    try:
        with Image.open(path) as image:
            print(f"{path.name}\t{image.width}x{image.height}\t{image.mode}")
    except Exception:
        pass
