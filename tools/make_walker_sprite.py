"""吉祥物 → 像素风 3 帧行走精灵图（原图 RGBA 自带透明背景）。
裁剪 → 降采样像素化 → 调色板量化 → 站立 / 左步 / 右步。
行走帧：腿部分成左右两半反向错位（下移 1px + 外扩 1px），身体上抬 1px，
做出「脚在动」的交替步态；腿部裁剪比实际多取 2px，错位时不会露出髋部空隙。
"""
from PIL import Image

SRC = '/home/ubuntu/upload/tripo-rigged-preview.png'
OUT = '/home/ubuntu/eatplanhq/public/walker-mascot.png'
TARGET_H = 56          # 像素化后角色高度（精灵像素）
PAD = 2                # 每帧留白，供位移使用
BOB = 1                # 走路时身体起伏
LEG_SHIFT = 2          # 腿部错位像素
LEG_RATIO = 0.32       # 腿部占角色高度比例
LEG_OVERLAP = 2        # 腿部多裁 2px，防止错位后露缝

im = Image.open(SRC).convert('RGBA')
bbox = im.getbbox()
base = im.crop(bbox)
print('角色包围盒:', bbox, '→ 裁剪后', base.size)

# 像素化：面积平均降采样 + 32 色调色板量化，透明度二值化
sw, sh = base.size
tw = max(8, round(sw * TARGET_H / sh))
small = base.resize((tw, TARGET_H), Image.BOX)
rgb = small.convert('RGB').quantize(colors=32, method=Image.MEDIANCUT).convert('RGB')
alpha = small.split()[3].point(lambda a: 255 if a > 120 else 0)
base = Image.merge('RGBA', (*rgb.split(), alpha))
tw, th = base.size
print('像素化后每帧:', base.size)

# 三帧：站立 / 左步（左腿下移外扩）/ 右步（右腿下移外扩）
legs_h = max(6, round(th * LEG_RATIO))
legs_top = max(0, th - legs_h - LEG_OVERLAP)
mid = tw // 2
cw, ch = tw + PAD * 2, th + PAD * 2

# (身体起伏, 左腿 dx, 左腿 dy, 右腿 dx, 右腿 dy)
poses = [
    (0, 0, 0, 0, 0),                                  # 站立
    (BOB, -LEG_SHIFT, LEG_SHIFT, LEG_SHIFT, -LEG_SHIFT),  # 左步
    (BOB, LEG_SHIFT, LEG_SHIFT, -LEG_SHIFT, -LEG_SHIFT),  # 右步
]
frames = []
for bob, ldx, ldy, rdx, rdy in poses:
    f = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    body = base.crop((0, 0, tw, legs_top))
    left = base.crop((0, legs_top, mid, th))
    right = base.crop((mid, legs_top, tw, th))
    f.paste(body, (PAD, PAD - bob), body)
    f.paste(left, (PAD + ldx, PAD + legs_top + ldy - bob), left)
    f.paste(right, (PAD + rdx, PAD + legs_top + rdy - bob), right)
    frames.append(f)

sheet = Image.new('RGBA', (cw * 3, ch), (0, 0, 0, 0))
for i, f in enumerate(frames):
    sheet.paste(f, (i * cw, 0), f)
sheet.save(OUT)

# 放大预览（供人工检查）
sheet.resize((cw * 15, ch * 15), Image.NEAREST).save('/tmp/mascot_preview.png')
print('精灵图:', OUT, sheet.size, 'FRAME_W =', cw, 'FRAME_H =', ch)
