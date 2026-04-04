"""Make edge-connected near-black pixels transparent (keeps inner black on badges)."""
from collections import deque
from pathlib import Path

from PIL import Image


def main():
    root = Path(__file__).resolve().parents[1]
    path = root / "src" / "assets" / "podium-medals.png"
    if not path.exists():
        raise SystemExit(f"Missing {path}")

    img = Image.open(path).convert("RGBA")
    w, h = img.size
    px = img.load()
    thresh = 45

    def near_black(r, g, b):
        return r <= thresh and g <= thresh and b <= thresh

    visited = set()
    q = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))

    transparent = set()
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        if (x, y) in visited:
            continue
        visited.add((x, y))
        r, g, b, _a = px[x, y]
        if not near_black(r, g, b):
            continue
        transparent.add((x, y))
        for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            q.append((x + dx, y + dy))

    for x, y in transparent:
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)

    img.save(path, "PNG")
    print(f"Updated {path} ({len(transparent)} pixels cleared)")


if __name__ == "__main__":
    main()
