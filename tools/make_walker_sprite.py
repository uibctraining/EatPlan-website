"""吉祥物 → 像素风 3 帧行走精灵图（原图 RGBA 自带透明背景）。
裁剪 → 降采样像素化 → 调色板量化 → 站立/左步/右步 三帧横向拼接。
"""
from PIL import Image

SRC = '/home/ubuntu/upload/tripo-rigged-preview.png'
OUT = '/home/ubuntu/eatplanhq/public/walker-mascot.png'
TARGET_H = 56          # 像素化后角色高度（精灵像素）
PAD = 2                # 每帧留白，供位移使用
BOB = 1                # 走路时身体上下起伏
LEG_DX = 1             # 走路时腿部左右交替
LEG_RATIO = 0.30       # 腿部占角色高度比例

im = Image.open(SRC).convert('RGBA')
bbox = im.getbbox()          # 按 alpha 得到角色包围盒
base = im.crop(bbox)
print('角色包围盒:', bbox, '→ 裁剪后', base.size)

# 像素化：面积平均降采样，再做调色板量化，透明度二值化
sw, sh = base.size
tw = max(8, round(sw * TARGET_H / sh))
small = base.resize((tw, TARGET_H), Image.BOX)
rgb = small.convert('RGB').quantize(colors=32, method=Image.MEDIANCUT).convert('RGB')
alpha = small.split()[3].point(lambda a: 255 if a > 120 else 0)
base = Image.merge('RGBA', (*rgb.split(), alpha))
tw, th = base.size
print('像素化后每帧:', base.size)

# 三帧：站立 / 左步 / 右步
legs_h = max(4, round(th * LEG_RATIO))
cw, ch = tw + PAD * 2, th + PAD * 2
frames = []
for bob, dx in ((0, 0), (BOB, -LEG_DX), (BOB, LEG_DX)):
    f = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    body = base.crop((0, 0, tw, th - legs_h))
    legs = base.crop((0, th - legs_h, tw, th))
    f.paste(body, (PAD, PAD - bob), body)
    f.paste(legs, (PAD + dx, PAD + th - legs_h - bob), legs)
    frames.append(f)

sheet = Image.new('RGBA', (cw * 3, ch), (0, 0, 0, 0))
for i, f in enumerate(frames):
    sheet.paste(f, (i * cw, 0), f)
sheet.save(OUT)
print('精灵图:', OUT, sheet.size, 'FRAME_W =', cw, 'FRAME_H =', ch)
