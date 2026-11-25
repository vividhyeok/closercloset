"""Generate the app's simple code-designed brand icons, not fashion artwork."""
from PIL import Image, ImageDraw
from pathlib import Path

root = Path(__file__).resolve().parents[1] / 'public'
for size in (192, 512):
    image = Image.new('RGB', (size, size), '#f7f8f2')
    draw = ImageDraw.Draw(image)
    draw.arc((size*.24,size*.24,size*.72,size*.76),45,315,fill='#e96d45',width=round(size*.095))
    draw.ellipse((size*.70,size*.64,size*.81,size*.75),fill='#e96d45')
    image.save(root / f'icon-{size}.png')
