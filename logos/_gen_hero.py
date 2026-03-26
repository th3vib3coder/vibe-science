"""
Vibe Science v7.0 TRACE — Hero Image Generator (v2)
Epistemic Architecture: tighter panels, visible grid, stronger glow.
"""
from PIL import Image, ImageDraw, ImageFont
import os, math

W, H = 1400, 720
FONT_DIR = os.path.expanduser(
    r"~/.claude/plugins/marketplaces/anthropic-agent-skills/skills/canvas-design/canvas-fonts"
)
OUT = os.path.join(os.path.dirname(__file__), "hero-v7.0-trace-adapt.png")

# === PALETTE ===
BG = (9, 14, 26)
GREEN = (62, 187, 97)
GREEN_DIM = (20, 55, 32)
BLUE = (78, 148, 255)
BLUE_DIM = (18, 40, 80)
AMBER = (242, 204, 96)
AMBER_DIM = (60, 50, 24)
SLATE = (100, 120, 150)
LIGHT = (210, 220, 232)
WHITE = (246, 248, 250)
PANEL_BG = (14, 22, 38)
PANEL_STROKE = (35, 50, 72)

def font(name, size):
    p = os.path.join(FONT_DIR, name)
    return ImageFont.truetype(p, size) if os.path.exists(p) else ImageFont.load_default()

f_title = font("BigShoulders-Bold.ttf", 80)
f_sub = font("InstrumentSans-Regular.ttf", 23)
f_mono = font("GeistMono-Regular.ttf", 15)
f_mono_b = font("GeistMono-Bold.ttf", 16)
f_label = font("InstrumentSans-Regular.ttf", 17)
f_tag = font("GeistMono-Bold.ttf", 13)
f_small = font("GeistMono-Regular.ttf", 13)
f_tiny = font("GeistMono-Regular.ttf", 12)

img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)

# === GRID (subtle but visible) ===
for x in range(0, W, 40):
    for y in range(0, H, 2):
        if y % 40 == 0:
            continue
        c = 18 + (3 if (x // 40) % 4 == 0 else 0)
        img.putpixel((min(x, W-1), min(y, H-1)), (c, c+2, c+6))
for y in range(0, H, 40):
    for x in range(0, W, 2):
        c = 18 + (3 if (y // 40) % 4 == 0 else 0)
        img.putpixel((min(x, W-1), min(y, H-1)), (c, c+2, c+6))

draw = ImageDraw.Draw(img)

# === GLOW SPOTS (stronger) ===
for cx, cy, col, radius in [(160, 280, GREEN_DIM, 300), (950, 100, BLUE_DIM, 340), (1080, 520, AMBER_DIM, 220)]:
    for r in range(radius, 0, -3):
        a = int(30 * (1 - r/radius)**1.5)
        c = tuple(min(255, BG[j] + col[j] * a // 40) for j in range(3))
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=c)

# === LEFT: TITLE ===
x0, y0 = 60, 48

# Tags
def draw_tag(x, y, text, border, text_c):
    tw = draw.textlength(text, font=f_tag)
    draw.rounded_rectangle([x, y, x+tw+24, y+28], radius=14, outline=border, width=1)
    draw.text((x+12, y+5), text, fill=text_c, font=f_tag)
    return tw + 24

tw1 = draw_tag(x0, y0, "v7.0 TRACE", GREEN, GREEN)
draw_tag(x0 + tw1 + 10, y0, "TRACE+ADAPT V0", BLUE, BLUE)

# Title
draw.text((x0, y0 + 46), "VIBE", fill=WHITE, font=f_title)
draw.text((x0, y0 + 118), "SCIENCE", fill=GREEN, font=f_title)

# Subtitle
draw.text((x0, y0 + 206), "Integrity-first research runtime", fill=LIGHT, font=f_sub)
draw.text((x0, y0 + 232), "for Claude Code", fill=LIGHT, font=f_sub)

# Bullets
bullets = [
    (GREEN, "Plugin + runtime enforcement, not just a prompt"),
    (BLUE,  "Gates block claims until evidence is verified"),
    (AMBER, "Adaptive harness, not adaptive truth"),
]
by = y0 + 290
for col, txt in bullets:
    draw.ellipse([x0+1, by+4, x0+12, by+15], fill=col)
    draw.text((x0+22, by), txt, fill=LIGHT, font=f_label)
    by += 32

# Horizontal accent line under bullets
draw.line([(x0, by+12), (x0+440, by+12)], fill=PANEL_STROKE, width=1)

# Key stats row
sy = by + 24
stats = [("32", "gates"), ("18", "lib modules"), ("7", "hooks"), ("12", "laws")]
sx = x0
for val, lbl in stats:
    draw.text((sx, sy), val, fill=WHITE, font=font("BigShoulders-Bold.ttf", 32))
    vw = draw.textlength(val, font=font("BigShoulders-Bold.ttf", 32))
    draw.text((sx + vw + 6, sy + 10), lbl, fill=SLATE, font=f_small)
    lw = draw.textlength(lbl, font=f_small)
    sx += vw + lw + 28

# === RIGHT: ARCHITECTURE STACK ===
px, py = 620, 48
pw = W - px - 52
panel_h = 170
gap = 16

layers = [
    ("01", "METHODOLOGY", GREEN, GREEN_DIM,
     ["OTAE loop", "Reviewer 2", "SFI + BFP", "Confounder harness", "12 Immutable Laws", "Tree search"]),
    ("02", "TRACE RUNTIME", BLUE, BLUE_DIM,
     ["7 lifecycle hooks", "SQLite 16 tables", "Citation verify", "DQ4 / L-1+ / L0 / D1", "Observer alerts", "Permission RBAC"]),
    ("03", "TRACE+ADAPT V0", AMBER, AMBER_DIM,
     ["Pattern extraction", "8-hint catalog", "SessionStart inject", "Gate cooldown", "Observer cooldown", "Max 3 hints"]),
]

for i, (num, name, col, dim, items) in enumerate(layers):
    ly = py + i * (panel_h + gap)

    # Panel
    bg_c = tuple(PANEL_BG[j] + dim[j]//6 for j in range(3))
    draw.rounded_rectangle([px, ly, px+pw, ly+panel_h], radius=14, fill=bg_c, outline=col, width=1)

    # Accent bar left
    draw.rounded_rectangle([px+1, ly+12, px+4, ly+panel_h-12], radius=2, fill=col)

    # Number + title
    draw.text((px+16, ly+12), num, fill=tuple(c//2 for c in col), font=f_tiny)
    draw.text((px+40, ly+10), name, fill=col, font=f_mono_b)

    # Tags
    tx, ty = px + 18, ly + 44
    for item in items:
        iw = draw.textlength(item, font=f_small) + 18
        if tx + iw > px + pw - 18:
            tx = px + 18
            ty += 30
        tag_bg = tuple(dim[j]//3 for j in range(3))
        tag_border = tuple(col[j]//3 for j in range(3))
        draw.rounded_rectangle([tx, ty, tx+iw, ty+24], radius=6, fill=tag_bg, outline=tag_border, width=1)
        draw.text((tx+9, ty+4), item, fill=LIGHT, font=f_small)
        tx += iw + 7

    # Connector
    if i < 2:
        ax = px + pw//2
        ay = ly + panel_h
        # Dashed line effect
        for d in range(3, gap-3, 3):
            if d % 6 < 3:
                draw.line([(ax, ay+d), (ax, ay+d+2)], fill=col, width=2)
        # Arrow
        draw.polygon([(ax-4, ay+gap-4), (ax+4, ay+gap-4), (ax, ay+gap)], fill=col)

# === BOTTOM PROOF STRIP ===
bar_y = H - 52
draw.line([(48, bar_y), (W-48, bar_y)], fill=PANEL_STROKE, width=1)

proofs = ["169/169 tests", "smoke passing", "readiness passing", "0 regressions"]
bx = 60
for item in proofs:
    draw.text((bx, bar_y + 12), item, fill=SLATE, font=f_mono)
    tw = draw.textlength(item, font=f_mono)
    bx += tw + 6
    if item != proofs[-1]:
        draw.text((bx, bar_y + 12), "|", fill=tuple(s//2 for s in SLATE), font=f_mono)
        bx += 14

tagline = "HARDER TO RUSH / HARDER TO FAKE / EASIER TO AUDIT"
ttw = draw.textlength(tagline, font=f_mono)
draw.text((W - 60 - ttw, bar_y + 12), tagline, fill=BLUE, font=f_mono)

# === SAVE ===
img.save(OUT, "PNG", quality=95, optimize=True)
print(f"Saved: {OUT} ({os.path.getsize(OUT):,} bytes)")
