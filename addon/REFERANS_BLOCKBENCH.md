# Referans — Blockbench `.bbmodel`

Kullanıcı Blockbench öğreniyor. Bu dosya biçimin **kaynaktan okunmuş**
hâli — çünkü resmî wiki açıkça şunu diyor:

> "There is no complete specification of the JSON format at this point in
> time. To understand it, it is recommended to look at example .bbmodel
> files and to examine the Blockbench source code."

Okunan dosyalar (`JannisX11/blockbench`, master):

| dosya | ne verdi |
|---|---|
| `js/formats/bbmodel.js` | `FORMATV = '5.0'`, `compile()`'ın yazdığı 20 üst anahtar |
| `js/formats/bedrock/bedrock.js` | **asıl sözleşme**: `compileCube`, `compileGroup`, `parseCube` |
| `js/outliner/outliner.js` | `Outliner.toJSON` / `loadJSON` — hiyerarşi ve eski biçim desteği |

## Üst düzey anahtarlar

`compile()` sırayla şunları yazıyor: `meta`, `overrides`, `resolution`,
`flag`, `editor_state`, `elements`, `groups`, `outliner`, `texture_groups`,
`textures`, `collections`, `animations`, `animation_controllers`,
`animation_variable_placeholders`, `display`, `reference_images`,
`export_options`, `history`, `skin_model`, `backgrounds`.

Bizim ihtiyacımız olan altısı:

```json
{
  "meta": { "format_version": "5.0", "model_format": "bedrock", "box_uv": true },
  "resolution": { "width": 64, "height": 64 },
  "elements": [ { "from": [...], "to": [...], "origin": [...],
                  "rotation": [...], "uv_offset": [u,v], "inflate": 0,
                  "box_uv": true, "uuid": "..." } ],
  "outliner": [ { "name": "...", "origin": [...], "rotation": [...],
                  "uuid": "...", "children": [ "eleman-uuid", { ...alt grup... } ] } ],
  "textures": [ { "id": "0", "name": "x.png", "source": "data:image/png;base64,…" } ]
}
```

## Bedrock'a çevrim (bedrock.js'ten olduğu gibi)

```javascript
// compileGroup — Blockbench grubu → Bedrock kemiği
bone.pivot     = g.origin;    pivot[0]    *= -1
bone.rotation  = g.rotation;  rotation[0] *= -1
                              rotation[1] *= -1      // Z aynen

// compileCube — Blockbench küpü → Bedrock küpü
origin = cube.from;  size = to - from
origin[0] = -(origin[0] + size[0])
pivot     = cube.origin;  pivot[0] *= -1             // dönüş varsa
rotation[axis] *= -1  for axis != 2
box_uv ? uv = cube.uv_offset
       : yüz başına { uv, uv_size };  up/down için
         uv += uv_size ve uv_size negatiflenir
```

**Yani fark tek bir ayna: X.** (Bir de X/Y dönüş işaretleri.) Y'de kaydırma
yok — Blockbench'in Bedrock kipi zaten Y-yukarı çalışıyor. Blockbuster'daki
`24 − Y` çevrimi burada **yok**; o Java entity uzayına özeldi.

## Sürüm tuzağı

`meta.format_version` **5.0** (Ekim 2025) gruplarla hiyerarşiyi ayırdı:
gruplar artık ayrı bir `groups` dizisinde, `outliner` sadece uuid ağacı.

Ama `outliner.js:loadJSON` içinde hâlâ şu var:

```javascript
// Legacy group support
if (item && item.name != undefined) { obj = new Group(item, item.uuid); ... }
```

Yani **iç içe grup** biçimi (5.0 öncesi) güncel Blockbench tarafından hâlâ
okunuyor. Biz `format_version: "4.5"` + iç içe grup yazıyoruz: yeni
Blockbench de açar, eski Blockbench de. 5.0'ın yeni şeklini yazsaydık eski
sürümlerde dosya **hiç açılmazdı**.

## Bizdeki karşılığı

`bbmodel.py` — iki yön de tek dosyada:

```
python3 bbmodel.py <geo.json> [doku.png] [çıktı.bbmodel]   # dışa aktar
python3 bbmodel.py --denetim [geo.json]                    # denetim
```

`ciz_kemik.yukle()` artık `.bbmodel` de yiyor; doku dosyanın içinde
(`data:` URI) olduğu için ayrıca png vermek gerekmiyor.
