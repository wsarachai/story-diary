# Prompt สร้างรูปตัวละคร (ChatGPT)

ไฟล์นี้ใช้สร้างรูปตัวละครที่ยังขาดให้ **เข้ากับสไตล์รูปเดิม** ของ Story Diary
รวม 17 รูป: ภูติน้อย 6 · ชาวบ้าน B 2 · ผู้กล้า-ชาย 8 · ผู้กล้า-หญิง 1

---

## วิธีใช้ (อ่านก่อนเริ่ม)

1. **ทำทีละตัวละคร และใช้ 1 แชทต่อ 1 ตัวละคร** — เปิดแชทใหม่ใน ChatGPT ทุกครั้งที่เริ่มตัวละครใหม่
2. **รูปแรกของแต่ละตัวละครคือ "ต้นแบบ" (master)** — ถ้าต้นแบบยังไม่ถูกใจ ให้สร้างใหม่จนพอใจก่อน แล้วค่อยทำสีหน้าอื่น
3. **สีหน้าที่เหลือ ให้ทำในแชทเดิม** โดยแนบรูปต้นแบบไปด้วยทุกครั้ง แล้ววาง prompt ของสีหน้านั้น
4. **แนบรูปอ้างอิง** ตามที่แต่ละหัวข้อบอก (ลากไฟล์ใส่ช่องแชทพร้อม prompt)
5. **เช็กก่อนบันทึก** (ดูหัวข้อ "เช็กลิสต์" ท้ายไฟล์) — ถ้าหน้าเพี้ยนจากต้นแบบ ให้กด regenerate
6. **บันทึกเป็น PNG** ลงโฟลเดอร์ `C:\Users\ASUS\Downloads\ตัวละคร\<ชื่อตัวละคร>\` ตามชื่อไฟล์ที่ระบุ
   - พื้นหลังโปร่งใสดีที่สุด แต่ถ้าได้พื้นขาว/สีเรียบ ๆ ก็ใช้ได้ — Claude จะลบพื้นหลัง ตัดขอบ และย่อขนาดให้เอง

> ถ้า ChatGPT ตอบว่าแก้แค่สีหน้าไม่ได้ ให้พิมพ์ต่อว่า
> `Keep the exact same character, outfit, colors, framing and art style as the attached image. Only change the facial expression.`

---

## สไตล์กลาง (ใส่อยู่ในทุก prompt แล้ว ไม่ต้องพิมพ์เพิ่ม)

ส่วนนี้คือคำอธิบายสไตล์ของรูปเดิม เผื่ออยากปรับ:

```
Art style: clean 2D anime illustration matching the attached reference images —
smooth medium-weight dark outlines, flat cel shading with one soft shadow tone,
soft pastel colors, simple glossy highlights on the hair, large expressive eyes
with gradient irises and small white highlights, gentle rounded face shapes.
Framing: half-body bust portrait from the head to mid-chest, character centered,
facing the viewer, vertical 3:4 canvas.
Background: fully transparent PNG (no scenery, no shadow, no border, no text).
```

---

## 1. ภูติน้อย — 6 รูป (โฟลเดอร์ `ภูติน้อย`)

**ใครคือภูติน้อย:** ภูติตัวเล็กที่ก่อตัวขึ้นจากหมอก ความจำหายไป ไม่รู้ว่าตัวเองเป็นอะไร ร่าเริง ใจดี อยากช่วยผู้กล้า

**แนบรูปอ้างอิง (รูปแรกเท่านั้น):**
- `เทพี-ดี\01-เทพี(ดี)-ปกติ.png` (โทนสีอ่อน ๆ)
- `ผู้กล้า-หญิง\01-หน้าปกติ.png` (ลายเส้นและหน้าตา)

### 1.1 ต้นแบบ → บันทึกเป็น `01-ปกติ.png`

```
Using the attached images ONLY as a style reference (same line art, coloring and face style — do not copy those characters), create a NEW character for a children's educational story game:

"Little Sprite" — a tiny mist sprite that was born from a magical mist.
- Chibi-leaning proportions: small body, slightly large head, clearly smaller and cuter than a human.
- Soft fluffy hair made of mist: white fading to pale lavender, a few wispy strands at the tips dissolving into little curls of mist.
- Big round bright eyes, pale aqua-to-lavender gradient irises.
- Two tiny translucent wings like morning dewdrops, with a faint shimmer.
- A simple white flowing outfit whose hem fades softly into mist, so the sprite looks like it is floating.
- Friendly, kind, innocent look.

Expression: gentle warm smile, eyes open, calm and kind.

Art style: clean 2D anime illustration matching the attached reference images — smooth medium-weight dark outlines, flat cel shading with one soft shadow tone, soft pastel colors, simple glossy highlights on the hair, large expressive eyes with gradient irises and small white highlights, gentle rounded face shapes.
Framing: the whole sprite visible (it is small), centered, facing the viewer, vertical 3:4 canvas.
Background: fully transparent PNG (no scenery, no shadow, no border, no text).
```

### 1.2 – 1.6 สีหน้าอื่น (แชทเดิม แนบ `01-ปกติ.png` ทุกครั้ง)

ขึ้นต้นทุก prompt ด้วยประโยคนี้ แล้วต่อด้วยสีหน้า:

```
Keep the exact same character, outfit, colors, wings, framing and art style as the attached image. Only change the facial expression and a small natural gesture.
Background: fully transparent PNG.
```

| ไฟล์ | ต่อท้ายด้วย |
|---|---|
| `02-ตกใจ.png` | `Expression: shocked — eyes wide open with small pupils, mouth open in a small "O", a few small red exclamation marks "!!" floating beside the head, hands raised slightly in surprise.` |
| `03-สับสน.png` | `Expression: confused and forgetful — head tilted, one finger touching the cheek, eyebrows raised unevenly, small mouth, a small red question mark "?" floating beside the head.` |
| `04-กังวล.png` | `Expression: worried and uneasy — eyebrows drawn together and upward, eyes looking slightly down, small wavy frown, hands clasped in front of the chest.` |
| `05-มุ่งมั่น.png` | `Expression: determined and brave — confident small smile, eyebrows firm, eyes bright and focused, one small fist raised in front of the chest.` |
| `06-ดีใจ.png` | `Expression: joyful and excited — big open-mouth smile, eyes closed in happy arcs (^ ^), small sparkles around, both hands up cheerfully.` |

---

## 2. ชาวบ้าน B — 2 รูป (โฟลเดอร์ `ชาวบ้าน B`)

**ใครคือชาวบ้าน B:** ชายวัยกลางคนในหมู่บ้าน (ชาวนา/ช่าง) ใจดี ต้องดูต่างจากชาวบ้าน A (หญิงสาวผมยาว) ชัดเจน

**แนบรูปอ้างอิง:**
- `ชาวบ้าน A\02-ชาวบ้าน(หญิง) ปกติ.png`
- `ชาวบ้าน A\01-ชาวบ้าน(หญิง) ป่วยๆ.png`

### 2.1 ต้นแบบ → บันทึกเป็น `01-ปกติ.png`

```
Using the attached images as a style reference (same line art, coloring, face style and village clothing palette), create a NEW villager character from the same village — clearly different from the woman in the references:

"Villager B" — a kind middle-aged man, around 45 years old, a farmer.
- Short dark brown hair, slightly messy, with a few grey strands at the temples.
- Light stubble, warm friendly eyes, slightly tired but gentle face.
- A simple cloth headband.
- Earthy clothes: a faded olive-green vest over a beige long-sleeve work shirt with rolled sleeves, a small patch on the vest — same muted village colors as the references.

Expression: a small hopeful smile, calm and warm.

Art style: clean 2D anime illustration matching the attached reference images — smooth medium-weight dark outlines, flat cel shading with one soft shadow tone, soft muted colors, large expressive eyes with small white highlights.
Framing: half-body bust portrait from the head to mid-chest, centered, facing the viewer, vertical 3:4 canvas — same framing as the references.
Background: fully transparent PNG (no scenery, no shadow, no border, no text).
```

### 2.2 ป่วย → `02-ป่วย.png` (แชทเดิม แนบ `01-ปกติ.png` + `ชาวบ้าน A\01-ชาวบ้าน(หญิง) ป่วยๆ.png`)

```
Keep the exact same man, outfit, colors, framing and art style as the first attached image. Only change him to look sick, using the SAME sickness style as the second attached image: pale skin, a purple-blue shadow tint across the forehead and around the eyes, tired half-closed eyes, eyebrows slightly raised in discomfort, small weak frown, shoulders a little slumped.
Background: fully transparent PNG.
```

---

## 3. ผู้กล้า-ชาย — 8 รูป (โฟลเดอร์ `ผู้กล้า-ชาย`)

**ต้นแบบคือรูปจากหน้าลงทะเบียน แต่ต้องเป็น "เวอร์ชันผู้ชาย" ที่ดูออกชัด** — รูปหน้าลงทะเบียนเดิมหน้าออกแนวหญิง (ผมบ็อบ ขนตายาว ใส่กระโปรง) ถ้าสั่ง "หน้าเหมือนเดิม" จะได้ผู้หญิงกลับมา
เก็บไว้แค่ **เอกลักษณ์**: ผมฟ้า + ปอยผมชี้ (ahoge) + ตาสีทอง + เสื้อคลุมสีน้ำตาล ปกสูงสีดำ เสื้อขาว — ส่วน **หน้า ทรงผม รูปร่าง** ให้เป็นผู้ชาย

**แนบรูปอ้างอิง (รูปเดียวเท่านั้น — อย่าแนบรูปผู้กล้า-หญิง เพราะจะดึงหน้าไปเป็นผู้หญิง):**
- `C:\Users\ASUS\workspaces\projects\story-diary\frontend\public\images\register-character-normal-466x760.png`

### 3.1 ต้นแบบ → `01-ปกติ.png`

```
The attached image shows our hero's outfit and color theme. Create the MALE version of this hero: a teenage BOY, about 16 years old, who must clearly read as a boy at first glance.

Keep from the reference (identity): light-blue hair color with soft gradient, the single ahoge strand on top, golden-amber eyes, brown hooded cloak with a small clasp, black high collar, white shirt. Same clean anime art style and colors.

Change to make him clearly male:
- Short boyish haircut: short spiky-messy layers, sides trimmed above the ears, short fringe that does not cover the face — NOT a bob, no hair framing the cheeks.
- Masculine face: slightly longer face with a defined jawline and chin, straighter and thicker eyebrows, slightly narrower eyes, minimal eyelashes, no blush, no lip color, a small simple mouth.
- Boyish build: broader shoulders, flat chest, slightly thicker neck.
- Outfit: the same cloak, collar and white shirt, worn with dark brown trousers (no skirt).

Expression: calm and friendly, slight confident smile.

Art style: clean 2D anime illustration like the reference — smooth medium-weight dark outlines, flat cel shading with one soft shadow tone, soft pastel colors, glossy hair highlights.
Framing: half-body bust portrait from the head to mid-chest, centered, facing the viewer, vertical 3:4 canvas.
Background: fully transparent PNG (no scenery, no shadow, no border, no text).
```

**ถ้ายังดูเป็นผู้หญิง** พิมพ์ต่อในแชทเดิม:

```
He still looks too feminine. Make him look more clearly like a teenage boy: shorter hair cut close at the sides and back, sharper jawline, thicker straight eyebrows, smaller eyes with almost no eyelashes, broader shoulders. Keep the light-blue hair color, ahoge, golden eyes and the same outfit.
```

### 3.2 – 3.8 สีหน้าอื่น (แชทเดิม แนบ `01-ปกติ.png` ของผู้ชาย **เท่านั้น**)

> อย่าแนบรูปผู้กล้า-หญิงเป็นตัวอย่างสีหน้า — จะทำให้หน้ากลับไปเป็นผู้หญิง คำอธิบายสีหน้าด้านล่างละเอียดพอแล้ว

ขึ้นต้นทุก prompt ด้วย:

```
Keep the exact same boy — same face shape, short haircut, outfit, colors, framing and art style as the attached image. He must still clearly look male. Only change the facial expression.
Background: fully transparent PNG.
```

| ไฟล์ | ต่อท้ายด้วย |
|---|---|
| `02-ป่วย.png` | `Expression: sick and tired — pale skin, grey-purple shadow under the eyes, half-closed tired eyes, small weak frown.` |
| `03-สงสัย.png` | `Expression: curious and puzzled — head slightly tilted, one eyebrow raised, small red question marks "??" floating beside the head.` |
| `04-ยิ้ม.png` | `Expression: happy grin — eyes closed in gentle arcs, open cheerful smile.` |
| `05-ตื่นเต้น.png` | `Expression: excited — sparkling star-shaped highlights in the eyes, open eager smile.` |
| `06-มุ่งมั่น.png` | `Expression: determined — firm straight eyebrows, focused eyes, mouth closed in a confident line.` |
| `07-ตกใจ.png` | `Expression: shocked — eyes wide with small pupils, mouth open, small red exclamation marks "!!!" beside the head.` |
| `08-กลัว.png` | `Expression: scared and anxious — eyebrows raised and pinched together, eyes looking to the side, small wavy trembling mouth, a small blue sweat drop on the temple.` |

---

## 4. ผู้กล้า-หญิง — สีหน้าใหม่ 1 รูป (โฟลเดอร์ `ผู้กล้า-หญิง`)

**แนบ:** `ผู้กล้า-หญิง\01-หน้าปกติ.png` (ต้นแบบ) และ `ผู้กล้า-หญิง\07-ตกใจ.png`

### 4.1 กลัว/กังวล → `08-กลัว.png`

```
Keep the exact same character, outfit, colors, framing and art style as the first attached image. Only change the facial expression:
scared and anxious — eyebrows raised and pinched together, eyes slightly teary looking to the side, small wavy trembling mouth, a small blue sweat drop on the temple, hands near the chest.
Background: fully transparent PNG.
```

> ถ้าทำ **ผู้กล้า-ชาย 08-กลัว** ไปแล้ว แนะนำให้แนบรูปนั้นไปด้วย สองเพศจะได้สีหน้าเข้าชุดกัน

---

## เช็กลิสต์ก่อนบันทึกแต่ละรูป

- [ ] หน้าตา ทรงผม สีผม สีตา **เหมือนต้นแบบ** (ตัวละครเดิม ไม่ใช่คนใหม่)
- [ ] ชุดและสีเสื้อผ้าเหมือนต้นแบบ
- [ ] กรอบภาพครึ่งตัว หันหน้าตรง เหมือนรูปอื่น ๆ (ภูติน้อยเห็นทั้งตัวได้)
- [ ] ไม่มีตัวหนังสือ ลายน้ำ กรอบ หรือฉากหลัง (ยกเว้นเครื่องหมาย ?, !, ประกาย ที่ขอไว้)
- [ ] พื้นหลังโปร่งใส หรือเป็นสีเรียบ ๆ สีเดียว
- [ ] ไม่มีนิ้ว/มือผิดรูปชัดเจน

## เมื่อทำเสร็จ

บอก Claude ว่า "รูปตัวละครพร้อมแล้ว" — Claude จะ:
1. ลบพื้นหลัง ตัดขอบ ย่อสูง 720px และตั้งชื่อไฟล์ตามระบบ (`fairy-normal-…png` ฯลฯ)
2. เพิ่มเข้า registry ตัวละคร (`frontend/lib/character.ts`)
3. สร้างรูป silhouette ของภูติน้อย (ตอนยังเป็น "???")
4. เพิ่มช่องเลือก "สีหน้า" ของผู้กล้าในหน้าแก้ไข scene และหน้าอ่าน
5. แก้ scene ในบทที่ 1 ที่ใช้รูปผิด และตั้งสีหน้าเริ่มต้นให้ 19 scene ของผู้กล้า
6. ทดสอบใน Docker แล้วส่งให้ตรวจก่อน push
