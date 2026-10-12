"""
Generates a white-themed Squeezr logo (stacked archive "books") and exports
build/icon.ico (multi-size), build/icon.png, and public/img/logo.png.
Pure PIL, deterministic.
"""
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SS = 2048  # supersample canvas
OUT_SIZE = 512


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def rounded_gradient_tile(size, top, bottom, radius_frac=0.22, border=(203, 213, 225, 255)):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    grad = Image.new("RGBA", (1, size))
    for y in range(size):
        grad.putpixel((0, y), lerp(top, bottom, y / (size - 1)))
    grad = grad.resize((size, size))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius_frac), fill=255)
    img.paste(grad, (0, 0), mask)
    ImageDraw.Draw(img).rounded_rectangle(
        [1, 1, size - 2, size - 2], radius=int(size * radius_frac), outline=border, width=max(2, size // 256)
    )
    return img


def book(w, h, spine, radius_frac=0.16, outline=(148, 163, 184, 255), pages=(226, 232, 240, 255)):
    """A single white 'book/archive volume' with a colored spine, drawn upright."""
    pad = int(w * 0.06)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(w * radius_frac)
    d.rounded_rectangle([pad, pad, w - pad, h - pad], radius=r, fill=(255, 255, 255, 255),
                        outline=outline, width=max(3, w // 60))
    sw = int(w * 0.24)
    d.rounded_rectangle([pad, pad, pad + sw, h - pad], radius=r, fill=spine)
    # page lines on the white cover
    for i in range(3):
        y = pad + int(h * 0.30) + i * int(h * 0.16)
        d.line([pad + sw + int(w * 0.14), y, w - pad - int(w * 0.14), y], fill=pages, width=max(3, w // 70))
    return img


def build_logo():
    S = SS
    canvas = rounded_gradient_tile(S, (248, 251, 255, 255), (222, 233, 248, 255))

    bw, bh = int(S * 0.30), int(S * 0.62)
    configs = [
        (0.30, -14, (59, 130, 246, 255)),   # blue
        (0.50, 0, (16, 185, 129, 255)),     # emerald
        (0.70, 14, (245, 158, 11, 255)),    # amber
    ]

    # soft drop shadow layer
    shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    # front-to-back so the middle overlaps correctly
    layers = []
    for cx_frac, angle, spine in configs:
        b = book(bw, bh, spine)
        b = b.rotate(-angle, expand=True, resample=Image.BICUBIC)
        x = int(cx_frac * S - b.width / 2)
        y = int(S * 0.52 - b.height / 2)
        layers.append((x, y, b))

    for x, y, b in layers:
        sd.rounded_rectangle([x + 8, y + 18, x + b.width - 8, y + b.height + 6],
                             radius=int(bw * 0.16), fill=(30, 41, 59, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(S // 90))
    canvas = Image.alpha_composite(canvas, shadow)

    for x, y, b in layers:
        layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        layer.paste(b, (x, y), b)
        canvas = Image.alpha_composite(canvas, layer)

    return canvas.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)


def main():
    os.makedirs(os.path.join(ROOT, "build"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "public", "img"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "public", "icons"), exist_ok=True)

    logo = build_logo()
    logo.save(os.path.join(ROOT, "build", "icon.png"))
    logo.save(os.path.join(ROOT, "public", "img", "logo.png"))
    logo.save(os.path.join(ROOT, "public", "icons", "app-logo.png"))
    logo.save(
        os.path.join(ROOT, "build", "icon.ico"),
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    print("wrote build/icon.ico, build/icon.png, public/img/logo.png, public/icons/app-logo.png")
    # sanity: report alpha coverage and mean color
    a = logo.split()[3]
    px = list(a.getdata())
    print("alpha coverage:", round(sum(1 for p in px if p > 10) / len(px) * 100, 1), "%")


if __name__ == "__main__":
    main()
