# GeckoLib 5.5.5 — `.geo.json` ve `.animation.json` Tam Şeması

Kaynak: `com/geckolib/loading/definition/**` sınıflarının bytecode'u
(`javap -p -c -constants`). Her sınıfın `gsonDeserializer()` metodu elle yazılmış
bir `JsonDeserializer` döndürüyor; JSON anahtarları **alan adlarından değil, o
metodun içindeki string sabitlerinden** geliyor. `@SerializedName` hiçbir sınıfta
kullanılmamış — bütün eşleme elle yapılıyor.

## Okuma kılavuzu

Ayrıştırıcıların kullandığı yardımcılar ve anlamları:

| Yardımcı | Davranış |
|---|---|
| `GsonHelper.getAsX(obj, key)` (2 argüman) | **Zorunlu.** Anahtar yoksa `JsonParseException` atar. |
| `GsonHelper.getAsX(obj, key, default)` (3 argüman) | **İsteğe bağlı.** Anahtar yoksa `default` döner. |
| `GsonHelper.getAsObject(obj, key, ctx, class)` (4 argüman) | **Zorunlu.** |
| `GsonHelper.getAsObject(obj, key, default, ctx, class)` (5 argüman) | **İsteğe bağlı.** |
| `JsonUtil.getOptionalFloat/Boolean/Integer` | Anahtar yoksa `null` (kutulanmış tip). |
| `JsonUtil.jsonToVec3` | `null` girdi → `null`. Dizi ise `[x,y,z]`; nesne ise `{x,y,z}` (üçü de zorunlu); başka bir şeyse `IllegalStateException`. |
| `JsonUtil.jsonArrayToObjectArray` | `null` dizi → `null` dizi. |
| `JsonUtil.jsonObjToMap` | `null` nesne → `null` map. |

Her iki `Gson` örneği de (`Geometry.GSON`, `ActorAnimations.GSON`)
`Strictness.LENIENT` ile kurulu — yani yorum satırları, tırnaksız anahtarlar ve
sondaki virgüller tolere edilir.

---

# A) GEOMETRİ — `.geo.json`

Kök `Gson`: `Geometry.GSON`. Kayıtlı tip adaptörleri: `Geometry`,
`GeometryBone`, `GeometryCube`, `GeometryDefinition`, `GeometryDescription`,
`GeometryLocator`, `GeometryPolyIndex`, `GeometryPolyIndices`,
`GeometryPolyMesh`, `GeometryTextureMesh`, `GeometryUv`, `GeometryUvMapping`,
`GeometryUvMappingDetails`, `GeometryUvPair`.

## A.1 `Geometry` — dosyanın kökü

| JSON anahtarı | Tip | Zorunluluk | Açıklama |
|---|---|---|---|
| `format_version` | metin | **zorunlu** | Sürüm etiketi. Değer doğrulaması yükleyicide yapılır (aşağı bak). |
| `debug` | boolean | isteğe bağlı, varsayılan `false` | Ayrıştırılıyor; `bake()` içinde okunmuyor (ŞÜPHELİ: ölü alan olabilir). |
| `minecraft:geometry` | dizi&lt;`GeometryDefinition`&gt; | isteğe bağlı anahtar, **ama sonuç boş olamaz** | `null` veya boş ise: `JsonParseException: "No geometry definitions found in model file!"` |

### `format_version` için kabul edilen değerler

`ModelFormatVersion` enum'ı (`.../geometry/object/ModelFormatVersion.class`):

| Enum | Serileştirilmiş değer | Destekleniyor mu |
|---|---|---|
| `V_1_12_0` | `"1.12.0"` | evet |
| `V_1_14_0` | `"1.14.0"` | evet |
| `V_1_16_0` | `"1.16.0"` | evet |
| `V_1_19_30` | `"1.19.30"` | evet |
| `V_1_21_0` | `"1.21.0"` | evet |

Beşinin de `errorMessage` alanı `null` ile kuruluyor, dolayısıyla `supported`
alanı `true`. **5.5.5'te desteklenmeyen bir sürüm tanımlı değil.**

Doğrulama `GeckoLibGsonLoader.deserializeJsonModel` içinde ve **sadece uyarı
seviyesinde** — ayrıştırma durmaz:

- Eşleşme yoksa: `LOGGER.warn("{}: Unknown geo model format version: '{}'. This may not work correctly")`
- `isSupported()` false olsaydı: `LOGGER.error("{}: Unsupported geo model format version: '{}'. {}")`

Ayrıca aynı yükleyici, yol `.animation.json` ile bitiyorsa
`IllegalStateException: "Found animation file found in models folder! '<id>'"` atar.

## A.2 `GeometryDefinition` — `minecraft:geometry` dizisinin bir elemanı

| JSON anahtarı | Tip | Zorunluluk | Açıklama |
|---|---|---|---|
| `description` | nesne (`GeometryDescription`) | isteğe bağlı, varsayılan `null` | Yoksa: `LOGGER.warn("No geometry description found in model file, likely an invalid geometry json!")` — hata değil. |
| `cape` | metin | isteğe bağlı, varsayılan `null` | Pelerin dokusu/geometrisi adı. Ayrıştırılıyor; `bake()` yolunda okunduğuna dair iz yok (ŞÜPHELİ). |
| `bones` | dizi&lt;`GeometryBone`&gt; | isteğe bağlı, varsayılan boş dizi (`new JsonArray(0)`) | Kemik listesi. |

## A.3 `GeometryDescription`

| JSON anahtarı | Tip | Zorunluluk | Açıklama |
|---|---|---|---|
| `identifier` | metin | isteğe bağlı, varsayılan `null` | `null` ise `String.valueOf(jsonObject.hashCode())` üretilir. Normalde `geometry.xxx`. |
| `visible_bounds_width` | sayı (float) | isteğe bağlı, varsayılan `null` | Görünürlük kutusu genişliği. |
| `visible_bounds_height` | sayı (float) | isteğe bağlı, varsayılan `null` | Görünürlük kutusu yüksekliği. |
| `visible_bounds_offset` | dizi&lt;sayı&gt; veya `{x,y,z}` | isteğe bağlı, varsayılan `null` | Vec3. |
| `texture_width` | sayı (int) | isteğe bağlı, **varsayılan 16** | Doku atlası genişliği. |
| `texture_height` | sayı (int) | isteğe bağlı, **varsayılan 16** | Doku atlası yüksekliği. |

İkisinden biri eksikse:
`LOGGER.warn("GeckoLib model {} does not have texture dimensions specified, likely an invalid geometry json!")`

`GeometryDescription.EMPTY` sabiti: `identifier="geometry.unknown"`, diğer üçü
`null`, `texture_width=16`, `texture_height=16`.

## A.4 `GeometryBone`

| JSON anahtarı | Tip | Zorunluluk | Açıklama |
|---|---|---|---|
| `name` | metin | **zorunlu** | Kemik adı. Eşsiz olmalı (aşağıdaki doğrulamalara bak). |
| `parent` | metin | isteğe bağlı, varsayılan `null` | Üst kemiğin adı. |
| `pivot` | Vec3 (dizi veya `{x,y,z}`) | isteğe bağlı, varsayılan `null` | Dönme merkezi. `bake()` içinde okunur. |
| `rotation` | Vec3 | isteğe bağlı, varsayılan `null` | Derece cinsinden. `bake()` içinde okunur. |
| `debug` | boolean | isteğe bağlı, varsayılan `false` | `bake()` içinde okunmuyor (ŞÜPHELİ). |
| `mirror` | boolean | isteğe bağlı, varsayılan `null` | `GeometryCube.bake()` küpün kendi `mirror`'ı yoksa buraya bakar. |
| `inflate` | sayı (float) | isteğe bağlı, varsayılan `null` | `GeometryCube.bake()` küpün kendi `inflate`'i yoksa buraya bakar. |
| `render_group_id` | sayı (int) | isteğe bağlı, varsayılan `0` | Ayrıştırılıyor; `bake()` içinde okunmuyor (ŞÜPHELİ). |
| `cubes` | dizi&lt;`GeometryCube`&gt; | isteğe bağlı, varsayılan boş dizi | Kutular. |
| `binding` | metin | isteğe bağlı, varsayılan `null` | Molang ifadesi. `bake()` içinde okunmuyor (ŞÜPHELİ). |
| `locators` | nesne&lt;metin, `GeometryLocator`&gt; | isteğe bağlı, varsayılan `null` | Anahtar = locator adı. |
| `poly_mesh` | nesne (`GeometryPolyMesh`) | isteğe bağlı, varsayılan `null` | Ayrıştırılıyor; `GeometryBone.bake()` içinde okunmuyor (ŞÜPHELİ — poly mesh render'a bağlanmamış görünüyor). |
| `texture_meshes` | dizi&lt;`GeometryTextureMesh`&gt; | isteğe bağlı, varsayılan `null` | Aynı şekilde `bake()` içinde okunmuyor (ŞÜPHELİ). |

`GeometryBone.bake()` içinde gerçekten okunan alanlar (bytecode'dan ölçüldü):
`name`, `pivot`, `rotation`, `cubes`, `locators`.

### Kemik yapısı doğrulaması (`Geometry$BonesCollection.validateBoneStructure`)

`IllegalArgumentException` atar:

- `"Invalid model definition. Bone has defined itself as its own parent: <ad>"`
- `"Invalid model definition. Found bone with undefined parent (children -> parent): <çocuklar> -> <ebeveyn>"`

Ayrıca `Geometry` içinde: `LOGGER.error("Duplicate locator name found in bone '{}': '{}'")`.

## A.5 `GeometryCube`

| JSON anahtarı | Tip | Zorunluluk | Açıklama |
|---|---|---|---|
| `origin` | Vec3 | isteğe bağlı, varsayılan `null` | `bake()` sırasında `null` → `Vec3.ZERO`. |
| `size` | Vec3 | isteğe bağlı, varsayılan `null` | `null` → `Vec3.ZERO`. |
| `rotation` | Vec3 | isteğe bağlı, varsayılan `null` | `null` → `Vec3.ZERO`; derece → radyan çevrimi yapılır. |
| `pivot` | Vec3 | isteğe bağlı, varsayılan `null` | `null` → `Vec3.ZERO`. |
| `inflate` | sayı (float) | isteğe bağlı, varsayılan `null` | `null` ise kemiğin `inflate`'i, o da `null` ise `0`. |
| `mirror` | boolean | isteğe bağlı, varsayılan `null` | `null` ise `bone.mirror() == Boolean.TRUE`. |
| `uv` | dizi **VEYA** nesne (`GeometryUv`) | isteğe bağlı, varsayılan `null` | Aşağıya bak. |

## A.6 `GeometryUv` — birleşik tip

Bu sınıfın kendi JSON anahtarı yok; gelen elemanın **biçimine** bakar:

| Girdi biçimi | Sonuç |
|---|---|
| JSON **dizi** | `GeometryUvPair` olarak ayrıştırılır (klasik kutu UV'si). `Either.left` |
| Başka her şey (JSON nesnesi) | `GeometryUvMapping` olarak ayrıştırılır (yüz başına UV). `Either.right` |

Erişim metotları: `uv()` → `Optional<GeometryUvPair>`, `uvFaceMapping()` → `Optional<GeometryUvMapping>`.

## A.7 `GeometryUvPair`

Anahtarsız: **iki elemanlı sayı dizisi** `[u, v]`.
`array.get(0).getAsDouble()` ve `array.get(1).getAsDouble()`.
İki elemandan az olursa Gson'un kendi `IndexOutOfBounds`/hata yolu devreye girer
(özel mesaj yok — ŞÜPHELİ).

| Alan | Tip | Açıklama |
|---|---|---|
| `[0]` → `u` | sayı (double) | Yatay UV. |
| `[1]` → `v` | sayı (double) | Dikey UV. |

## A.8 `GeometryUvMapping`

Anahtarsız kök: anahtarları **yön adları** olan bir JSON nesnesi.
Anahtar `net.minecraft.core.Direction.byName(...)` ile çözülür — yani
`down`, `up`, `north`, `south`, `west`, `east` (ŞÜPHELİ: liste Minecraft'ın
`Direction` enum'ından geliyor, GeckoLib'de sabit olarak yazılı değil).

Tanınmayan anahtar →
`JsonParseException: "Error while parsing UV values. Expected Direction value: (<geçerli liste>), found <anahtar>"`

| JSON anahtarı | Tip | Zorunluluk | Açıklama |
|---|---|---|---|
| `<yön adı>` | nesne (`GeometryUvMappingDetails`) | en az biri olmalı değil (boş nesne geçerli) | Yüz başına UV tanımı. |

## A.9 `GeometryUvMappingDetails`

| JSON anahtarı | Tip | Zorunluluk | Açıklama |
|---|---|---|---|
| `uv` | `GeometryUvPair` (2'li dizi) | **zorunlu** | Yüzün UV başlangıcı. |
| `uv_size` | `GeometryUvPair` (2'li dizi) | **zorunlu** | Yüzün UV boyutu. |
| `uv_rotation` | sayı (int, derece) | isteğe bağlı, varsayılan `0` | `UvFaceRotation.fromDegrees` ile çözülür. |
| `material_instance` | metin | isteğe bağlı, varsayılan `null` | Ayrıştırılıyor; `bakeQuad()` içinde okunmuyor (ŞÜPHELİ). |

### `uv_rotation` için kabul edilen değerler — `UvFaceRotation`

Enum sabitleri: `NONE`, `CLOCKWISE_90`, `CLOCKWISE_180`, `CLOCKWISE_270`.
`fromDegrees(int)` şöyle çalışır: negatif değer düzeltilir, sonra
`values()[(derece % 360) / 90]`. Yani **temiz kabul edilen değerler 0, 90, 180,
270**. Başka bir değer dizi sınırının dışına çıkarsa:
`LOGGER.error("Invalid Face UV rotation: {}")` yazılır ve değer
`floor(|derece| / 90) * 90`'a yuvarlanıp yeniden denenir.

## A.10 `GeometryLocator` — birleşik tip

| Girdi biçimi | Davranış |
|---|---|
| JSON **dizi** | Dizinin kendisi `offset` olur; `rotation` = `null`. |
| JSON **nesne** | `offset` ve `rotation` anahtarlarının **ikisi de zorunlu** (`GsonHelper.getAsJsonArray` 2 argümanlı çağrılıyor). |

| JSON anahtarı | Tip | Zorunluluk | Açıklama |
|---|---|---|---|
| `offset` | dizi&lt;sayı&gt; → Vec3 | nesne biçiminde **zorunlu** | `bake()` sırasında `null` → `Vec3.ZERO`. |
| `rotation` | dizi&lt;sayı&gt; → Vec3 | nesne biçiminde **zorunlu**, dizi biçiminde hiç yok | `null` → `Vec3.ZERO`; derece → radyan. |

## A.11 `GeometryPolyMesh`

| JSON anahtarı | Tip | Zorunluluk | Açıklama |
|---|---|---|---|
| `normalized_uvs` | boolean | isteğe bağlı, **varsayılan `true`** | UV'ler 0–1 aralığında mı. |
| `positions` | dizi&lt;Vec3&gt; | isteğe bağlı, varsayılan `null` | Köşe konumları. |
| `normals` | dizi&lt;Vec3&gt; | isteğe bağlı, varsayılan `null` | Köşe normalleri. |
| `uvs` | dizi&lt;`GeometryUv`&gt; | isteğe bağlı, varsayılan `null` | Köşe UV'leri. |
| `polys` | `GeometryPolyIndices` | **zorunlu** | 4 argümanlı `getAsObject` — varsayılan yok. |
| `polys_format` | metin | isteğe bağlı, **varsayılan `"polys"`** | Bytecode'da varsayılan değer literal olarak `"polys"` (anahtar adının kendisi değil, ayrı bir sabit). Bedrock'ta beklenen değerler `tri_list` / `quad_list` olurdu — GeckoLib bu alanı okumuyor, sadece saklıyor (ŞÜPHELİ). |

## A.12 `GeometryPolyIndices` — birleşik tip

Anahtarsız: bir JSON dizisi. İçerik `GeometryPolyIndex[]` olarak ayrıştırılır,
sonra **ilk elemanın uzunluğuna** bakılır:

| Koşul | Sonuç |
|---|---|
| `array[0]` dizisinin boyu `3` | `tris` (`Either.left`) |
| aksi hâlde (boş dizi dâhil) | `quads` (`Either.right`) |

## A.13 `GeometryPolyIndex`

Anahtarsız: **üç elemanlı sayı dizisi**.

| Dizin | Alan adı | Tip | Açıklama |
|---|---|---|---|
| `[0]` | `position` | sayı (float) | Konum dizini. |
| `[1]` | `normal` | sayı (float) | Normal dizini. |
| `[2]` | `scale` | sayı (float) | GeckoLib'in verdiği ad; Bedrock belgelerinde bu üçüncü değer **UV dizinidir** (ŞÜPHELİ — ad yanıltıcı olabilir). |

## A.14 `GeometryTextureMesh`

| JSON anahtarı | Tip | Zorunluluk | Açıklama |
|---|---|---|---|
| `texture` | metin | **zorunlu** | `Identifier.parse()` ile çözülür. |
| `position` | dizi&lt;sayı&gt; → Vec3 | isteğe bağlı, varsayılan `null` | |
| `local_pivot` | dizi&lt;sayı&gt; → Vec3 | isteğe bağlı, varsayılan `null` | |
| `rotation` | dizi&lt;sayı&gt; → Vec3 | isteğe bağlı, varsayılan `null` | |
| `scale` | dizi&lt;sayı&gt; → Vec3 | isteğe bağlı, varsayılan `null` | |

Not: burada `jsonToVec3` değil, `jsonArrayToDoubleArray` + `arrayToVec` kullanılıyor;
yani bu dört alan **yalnızca dizi** biçimini kabul eder, `{x,y,z}` nesnesini kabul etmez.

## A.15 `GeometryQuadUvs` (JSON'da karşılığı yok)

`.../geometry/object/GeometryQuadUvs` bir **iç yardımcı record**'dur, JSON'dan
ayrıştırılmaz. Alanları `uvCoordinates` ve `uvSize` (ikisi de `GeometryUvPair`).
`ofBoxUv(Direction, u, v, size)` ile kutu UV'sinden, ya da
`GeometryUvMappingDetails`'ten üretilir; `bakeQuad(...)` ile `GeoQuad`'a çevrilir.

## A.16 Geometri tarafındaki hata/uyarı mesajlarının tam listesi

| Mesaj | Tip | Kaynak |
|---|---|---|
| `No geometry definitions found in model file!` | `JsonParseException` | `Geometry` |
| `Duplicate locator name found in bone '{}': '{}'` | `LOGGER.error` | `Geometry` |
| `No geometry description found in model file, likely an invalid geometry json!` | `LOGGER.warn` | `GeometryDefinition` |
| `GeckoLib model {} does not have texture dimensions specified, likely an invalid geometry json!` | `LOGGER.warn` | `GeometryDescription` |
| `Invalid model definition. Bone has defined itself as its own parent: <ad>` | `IllegalArgumentException` | `Geometry$BonesCollection` |
| `Invalid model definition. Found bone with undefined parent (children -> parent): <a> -> <b>` | `IllegalArgumentException` | `Geometry$BonesCollection` |
| `Error while parsing UV values. Expected Direction value: (<liste>), found <anahtar>` | `JsonParseException` | `GeometryUvMapping` |
| `Invalid Face UV rotation: {}` | `LOGGER.error` | `UvFaceRotation` |
| `Json object input must have x, y, and z properties to parse into a Vec3: <json>` | `IllegalStateException` | `JsonUtil.jsonToVec3` |
| `Json input must be an array or object to parse into a Vec3: <json>` | `IllegalStateException` | `JsonUtil.jsonToVec3` |
| `Invalid Json object, contained value was neither of the two possible formats!` | `JsonParseException` | `JsonUtil.getEither` |
| `{}: Unknown geo model format version: '{}'. This may not work correctly` | `LOGGER.warn` | `GeckoLibGsonLoader` |
| `{}: Unsupported geo model format version: '{}'. {}` | `LOGGER.error` | `GeckoLibGsonLoader` |
| `Found animation file found in models folder! '<id>'` | `IllegalStateException` | `GeckoLibGsonLoader` |
| `Error reading JSON file` | `RuntimeException` (sarmalanmış `IOException`) | `GeckoLibGsonLoader` |

---

# B) ANİMASYON — `.animation.json`

Kök `Gson`: `ActorAnimations.GSON`. Kayıtlı tip adaptörleri: `ActorAnimations`,
`ActorAnimation`, `ActorAnimationParticleEffect`, `ActorAnimationSoundEffect`,
`ActorBoneAnimation`, `ActorBoneAnimationEntry`, `ActorBoneAnimationKeyframe`,
`ActorBoneAnimationKeyframeValues`, `DoubleOrString`.

## B.1 `ActorAnimations` — dosyanın kökü

| JSON anahtarı | Tip | Zorunluluk | Açıklama |
|---|---|---|---|
| `format_version` | metin | **zorunlu** | Ayrıştırılıp saklanır. **Animasyon tarafında değer doğrulaması YOK** — `ModelFormatVersion`'a benzer bir enum sadece geometri için var, animasyon `format_version`'ı hiçbir yerde kontrol edilmiyor. |
| `animations` | nesne&lt;metin, `ActorAnimation`&gt; | **zorunlu** | Anahtar = animasyon adı (örn. `animation.model.yürü`). |

Hatalar:
- `animations` `null` ise: `JsonParseException: "Animations map missing from animations json!"`
- `animations` boş ise: **yalnızca geliştirme ortamında**
  (`GeckoLibPlatform.isDevelopmentEnvironment()`)
  `JsonParseException: "No animation definitions found in animation file!"`;
  üretimde sessizce geçer.

`GeckoLibGsonLoader.deserializeJsonAnimations` ayrıca: yol `.geo.json` ile
bitiyorsa `IllegalStateException: "Found model file in animations folder! '<id>'"`.

## B.2 `ActorAnimation` — `animations` map'inin bir değeri

| JSON anahtarı | Tip | Zorunluluk | Açıklama |
|---|---|---|---|
| `animation_length` | sayı (float) | isteğe bağlı, varsayılan `null` | Saniye. `null` ise kemik animasyonlarının en uzun zaman damgasından hesaplanır; hesap `0` çıkarsa **`Double.MAX_VALUE`** kullanılır (sonsuz). |
| `loop` | **boolean VEYA metin** | isteğe bağlı, varsayılan `null` | `null` → `PLAY_ONCE`. Aşağıya bak. |
| `start_delay` | metin (Molang) | isteğe bağlı, varsayılan `null` | Ayrıştırılıyor; `bake()` yolunda okunmuyor (ŞÜPHELİ). |
| `loop_delay` | metin (Molang) | isteğe bağlı, varsayılan `null` | Aynı şekilde okunmuyor (ŞÜPHELİ). |
| `anim_time_update` | metin (Molang) | isteğe bağlı, varsayılan `null` | Aynı şekilde okunmuyor (ŞÜPHELİ). |
| `blend_weight` | metin (Molang) | isteğe bağlı, varsayılan `null` | Aynı şekilde okunmuyor (ŞÜPHELİ). |
| `override_previous_animation` | boolean | isteğe bağlı, varsayılan `null` | Aynı şekilde okunmuyor (ŞÜPHELİ). |
| `bones` | nesne&lt;metin, `ActorBoneAnimation`&gt; | isteğe bağlı, varsayılan `null` | Anahtar = kemik adı. |
| `particle_effects` | nesne&lt;metin, `ActorAnimationParticleEffect`&gt; | isteğe bağlı, varsayılan `null` | Anahtar = **zaman damgası** (metin olarak sayı). |
| `sound_effects` | nesne&lt;metin, `ActorAnimationSoundEffect`&gt; | isteğe bağlı, varsayılan `null` | Anahtar = zaman damgası. |
| `timeline` | nesne&lt;metin, metin&gt; | isteğe bağlı, varsayılan `null` | Anahtar = zaman damgası, değer `JsonElement.getAsString()` ile okunur. Değer bir JSON **dizisi** ise `getAsString` patlar (ŞÜPHELİ — Blockbench bazen dizi yazar). |

Zaman damgası anahtarları `Double.parseDouble` ile çözülür; başarısız olursa
`CompoundException: "Invalid timestamp, must be a numerical value: <anahtar>"`.

### `loop` için kabul edilen değerler

Ayrıştırıcı: `loop` bir `JsonPrimitive` değilse `null` sayılır.
`isBoolean()` ise `Either.left(Boolean)`, değilse `Either.right(getAsString())`.

`determineLoopType()`:

| Girdi | Sonuç |
|---|---|
| anahtar yok / primitive değil | `PLAY_ONCE` |
| `true` (boolean) | `LOOP` |
| `false` (boolean) | `PLAY_ONCE` |
| metin → `LoopType.fromString(...)`; sonuç `DEFAULT` ise | `PLAY_ONCE` |
| metin, tanınmıyorsa | `PLAY_ONCE` (map `getOrDefault` varsayılanı) |

`LoopType` kayıt defterine (`com/geckolib/animation/object/LoopType`) kayıtlı
**tam metin listesi**:

| Metin | Sabit |
|---|---|
| `"default"` | `DEFAULT` |
| `"play_once"` | `PLAY_ONCE` |
| `"false"` | `PLAY_ONCE` (aynı nesne, ikinci ad) |
| `"hold_on_last_frame"` | `HOLD_ON_LAST_FRAME` |
| `"loop"` | `LOOP` |
| `"true"` | `LOOP` (aynı nesne, ikinci ad) |

Not: `fromString` **büyük/küçük harf dönüşümü yapmaz** (`LoopType` tarafında
`toLowerCase` yok — `EasingType`'ta var). Yani `"Loop"` tanınmaz.
Ayrıca `LoopType.register(...)` genel API olduğu için modlar yeni ad ekleyebilir.

## B.3 `ActorBoneAnimation` — `bones` map'inin bir değeri

| JSON anahtarı | Tip | Zorunluluk | Açıklama |
|---|---|---|---|
| `relative_to` | metin | isteğe bağlı, varsayılan `null` | Ayrıştırılıyor; `bake()` içinde okunmuyor (ŞÜPHELİ). |
| `position` | `ActorBoneAnimationEntry` | isteğe bağlı, varsayılan `null` | Öteleme kanalı. `null` → `KeyframeStack.EMPTY`. |
| `rotation` | `ActorBoneAnimationEntry` | isteğe bağlı, varsayılan `null` | Dönme kanalı (derece → radyan çevrimi bake'te yapılır). |
| `scale` | `ActorBoneAnimationEntry` | isteğe bağlı, varsayılan `null` | Ölçek kanalı. |

## B.4 `ActorBoneAnimationEntry` — birleşik/çok biçimli

Kendi anahtarı yoktur; gelen elemanın biçimine göre dallanır:

| Girdi biçimi | Yorum |
|---|---|
| JSON **primitive** (metin/sayı) | Tek kare: `ActorBoneAnimationKeyframe` olarak ayrıştırılır. |
| JSON **dizi** | Tek kare (vektör). **Boşsa:** `JsonParseException: "ActorBoneAnimationEntry has an empty keyframes list. This is an invalid animation json"` |
| JSON **nesne**, `"vector"` anahtarı içeriyorsa | Tek kare: tüm nesne bir `ActorBoneAnimationKeyframe`. |
| JSON **nesne**, aksi hâlde | Zaman damgası → kare map'i. **Boşsa:** `JsonParseException: "ActorBoneAnimationEntry has an empty keyframes map. This is an invalid animation json"` |
| Başka her şey | `JsonParseException: "ActorBoneAnimationEntry has an unknown keyframe type: <json>"` |

Map biçiminde:
- Anahtarlar `Double.parseDouble` ile çözülür; başarısız →
  `JsonParseException: "Invalid timestamp, must be a numerical value: <anahtar>"`
- Sıra bozuksa: `LOGGER.warn("Animation timestamp {} is out of order! Previous timestamp: {}")`
  ve sonradan zaman damgalarına göre **yeniden sıralanır**.
- Aynı anahtar iki kez gelirse: `LOGGER.warn("Animation has a duplicate timestamp! '{}'")`

Tek kare biçiminde (`isSingleKeyframe()` true) animasyon uzunluğu katkısı `0`'dır.

## B.5 `ActorBoneAnimationKeyframe`

**Nesne biçimi** (`isJsonObject()`):

| JSON anahtarı | Tip | Zorunluluk | Açıklama |
|---|---|---|---|
| `vector` | `ActorBoneAnimationKeyframeValues` | isteğe bağlı, varsayılan `null` | Karenin x/y/z değerleri. |
| `lerp_mode` | metin | isteğe bağlı | Easing adı. **Öncelikli.** |
| `easing` | metin | isteğe bağlı | `lerp_mode` yoksa buna bakılır. İkisi de yoksa `null` → `EasingType.LINEAR`. |
| `easingArgs` | dizi&lt;`DoubleOrString`&gt; | isteğe bağlı, varsayılan `null` | **Dikkat: anahtar camelCase** (`easing_args` değil). `null` → boş dizi. |
| `pre` | `ActorBoneAnimationKeyframe` | isteğe bağlı, varsayılan `null` | Zaman damgasının `1e-5` öncesine yerleştirilir. |
| `post` | `ActorBoneAnimationKeyframe` | isteğe bağlı, varsayılan `null` | Zaman damgasının `1e-5` sonrasına yerleştirilir. |

**Primitive veya dizi biçimi:** eleman doğrudan
`ActorBoneAnimationKeyframeValues` olarak ayrıştırılır; `lerp_mode`, `easingArgs`,
`pre`, `post` hepsi `null` olur.

**Başka biçim:**
`JsonParseException: "ActorBoneAnimationKeyframe has invalid format, expected either String, Array or JsonObject: <json>"`

`values`, `pre` ve `post` üçü birden `null` ise:
`LOGGER.warn("ActorBoneAnimationKeyframe has no values, pre, or post keyframes!")`
ve boş kare dizisi döner.

### `lerp_mode` / `easing` için kabul edilen adların TAM listesi

`EasingType.fromString(s)` → `EASING_TYPES.getOrDefault(s.toLowerCase(Locale.ROOT), LINEAR)`.
Yani **küçük harfe çevrilir** ve tanınmayan ad sessizce `linear` olur.

`com/geckolib/animation/object/EasingType` statik kurucusunda kayıtlı 34 ad:

```
linear            none              step
easeinsine        easeoutsine       easeinoutsine
easeinquad        easeoutquad       easeinoutquad
easeincubic       easeoutcubic      easeinoutcubic
easeinquart       easeoutquart      easeinoutquart
easeinquint       easeoutquint      easeinoutquint
easeinexpo        easeoutexpo       easeinoutexpo
easeincirc        easeoutcirc       easeinoutcirc
easeinback        easeoutback       easeinoutback
easeinelastic     easeoutelastic    easeinoutelastic
easeinbounce      easeoutbounce     easeinoutbounce
catmullrom
```

- `linear` ve `none` **aynı** `EasingType` nesnesine bağlıdır.
- `catmullrom` özel sınıf `EasingType$CatmullRomEasing` kullanır.
- `EasingType.register(...)` genel API olduğu için modlar yeni ad ekleyebilir;
  yukarıdaki liste GeckoLib'in kendi kaydettikleridir.
- `easingArgs` yalnız argüman alan easing'ler (`step`, `elastic`, `bounce`,
  `back`) için anlamlı; `EasingType.modifyKeyframes` ile uygulanır.

## B.6 `ActorBoneAnimationKeyframeValues`

Kendi anahtarı yoktur; girdinin biçimine bakar:

| Girdi | Sonuç |
|---|---|
| JSON dizi, boş | `JsonParseException: "ActorBoneAnimationKeyframeValues has an empty keyframe, must contain some value!"` |
| JSON dizi, **1 eleman** | Tek değer **x, y ve z'nin üçüne birden** atanır. |
| JSON dizi, **3 eleman** | Sırasıyla `x`, `y`, `z`. |
| JSON dizi, başka boy | `JsonParseException: "ActorBoneAnimationKeyframeValues has <n> values, must be either 1 or 3: <json>"` |
| Dizi değilse (primitive) | Tek `DoubleOrString` olarak ayrıştırılır ve x, y, z'nin üçüne atanır. |

| Alan | JSON kaynağı | Tip |
|---|---|---|
| `xValue` | `[0]` | `DoubleOrString` |
| `yValue` | `[1]` (1 elemanlıysa `[0]`) | `DoubleOrString` |
| `zValue` | `[2]` (1 elemanlıysa `[0]`) | `DoubleOrString` |

`rotation` kanalında üç değer de `ToRadFunction` ile sarmalanır (derece → radyan).

## B.7 `DoubleOrString` — "sayı VEYA metin" birleşik tipi

Arayüz; iki record uygulaması var.

| Girdi | Sonuç |
|---|---|
| JSON primitive, `isString()` true | `DoubleOrString$StringValue(getAsString())` — Molang ifadesi. |
| JSON primitive, aksi hâlde | `DoubleOrString$DoubleValue(getAsDouble())` — sabit sayı. |
| Primitive değilse | `JsonParseException: "DoubleOrString encountered invalid format, expected either String or double: <json>"` |

ŞÜPHELİ: JSON `true`/`false` de primitive olduğu için `DoubleValue`'ya düşer ve
`getAsDouble()` çağrısı orada patlayabilir; özel bir mesaj yok.

| Sınıf | Alan | Tip | Yanlış tip okunursa |
|---|---|---|---|
| `DoubleOrString$DoubleValue` | `doubleValue` | sayı (double) | `stringValue()` → `IllegalStateException: "Attempted to retrieve a String value from a double-type DoubleOrString!"` |
| `DoubleOrString$StringValue` | `stringValue` | metin | `doubleValue()` → `IllegalStateException: "Attempted to retrieve a double value from a String-type DoubleOrString!"` |

## B.8 `ActorAnimationSoundEffect` ve `ActorAnimationParticleEffect`

İki sınıf **birebir aynı şemaya** sahip (bytecode'da alanlar ve anahtarlar
özdeş). `sound_effects` / `particle_effects` map'inin değerleri.

| JSON anahtarı | Tip | Zorunluluk | Açıklama |
|---|---|---|---|
| `effect` | metin | **zorunlu** | Ses olayı adı / partikül adı. |
| `locator` | metin | isteğe bağlı, varsayılan `null` | Efektin bağlanacağı locator. |
| `pre_effect_script` | metin (Molang) | isteğe bağlı, varsayılan `null` | Ayrıştırılıyor; `bake()` içinde okunmuyor (ŞÜPHELİ). |
| `bind_to_actor` | boolean | isteğe bağlı, varsayılan `null` | Ayrıştırılıyor; `bake()` içinde okunmuyor (ŞÜPHELİ). |

`bake(double)` yalnız `effect` ve `locator`'ı kullanarak
`SoundKeyframeData` / `ParticleKeyframeData` üretir.

## B.9 `KeyframeTriplet` (JSON'da karşılığı yok)

`.../animation/object/KeyframeTriplet` bir **iç record**'dur, JSON'dan
ayrıştırılmaz. Alanları `x`, `y`, `z` (`com.geckolib.cache.animation.Keyframe`).
Bir `ActorBoneAnimationKeyframe`'in üç eksene ayrıştırılmış, derlenmiş hâli.

## B.10 `Group` (JSON'da karşılığı yok)

Görevde listelenen `Group`, animasyon şemasının parçası **değil**.
Tek `Group` sınıfı `com/geckolib/loading/math/value/Group` — `MathValue`
uygulayan bir record, tek alanı `contents` (`MathValue`). Molang ifadelerindeki
parantezli grubu temsil eder (`(a + b) * c`). JSON'dan doğrudan ayrıştırılmaz;
`MathParser` tarafından üretilir.

## B.11 Animasyon tarafındaki hata/uyarı mesajlarının tam listesi

| Mesaj | Tip | Kaynak |
|---|---|---|
| `Animations map missing from animations json!` | `JsonParseException` | `ActorAnimations` |
| `No animation definitions found in animation file!` | `JsonParseException` (yalnız dev ortamı) | `ActorAnimations` |
| `Unable to bake ActorAnimation '<ad>' in animation json: <x>` | `CompoundException` | `ActorAnimations.bake` |
| `Unable to bake Actor Animation '<ad>' in animation json: <x>` | `CompoundException` | `ActorAnimations.bake` |
| `Invalid timestamp, must be a numerical value: <anahtar>` | `CompoundException` | `ActorAnimation.parseTimestamp` |
| `ActorBoneAnimationEntry has an empty keyframes list. This is an invalid animation json` | `JsonParseException` | `ActorBoneAnimationEntry` |
| `ActorBoneAnimationEntry has an empty keyframes map. This is an invalid animation json` | `JsonParseException` | `ActorBoneAnimationEntry` |
| `Invalid timestamp, must be a numerical value: <anahtar>` | `JsonParseException` | `ActorBoneAnimationEntry` |
| `ActorBoneAnimationEntry has an unknown keyframe type: <json>` | `JsonParseException` | `ActorBoneAnimationEntry` |
| `Animation timestamp {} is out of order! Previous timestamp: {}` | `LOGGER.warn` | `ActorBoneAnimationEntry` |
| `Animation has a duplicate timestamp! '{}'` | `LOGGER.warn` | `ActorBoneAnimationEntry` |
| `ActorBoneAnimationKeyframe has invalid format, expected either String, Array or JsonObject: <json>` | `JsonParseException` | `ActorBoneAnimationKeyframe` |
| `ActorBoneAnimationKeyframe has no values, pre, or post keyframes!` | `LOGGER.warn` | `ActorBoneAnimationKeyframe` |
| `ActorBoneAnimationKeyframeValues has an empty keyframe, must contain some value!` | `JsonParseException` | `ActorBoneAnimationKeyframeValues` |
| `ActorBoneAnimationKeyframeValues has <n> values, must be either 1 or 3: <json>` | `JsonParseException` | `ActorBoneAnimationKeyframeValues` |
| `Attempted to retrieve a String value from a double-type DoubleOrString!` | `IllegalStateException` | `DoubleOrString$DoubleValue` |
| `Attempted to retrieve a double value from a String-type DoubleOrString!` | `IllegalStateException` | `DoubleOrString$StringValue` |
| `DoubleOrString encountered invalid format, expected either String or double: <json>` | `JsonParseException` | `DoubleOrString` |
| `Found model file in animations folder! '<id>'` | `IllegalStateException` | `GeckoLibGsonLoader` |
| `<id>: Error building animations from JSON` | `CompoundException` | `GeckoLibGsonLoader` |
| `Error building animations from JSON` | `RuntimeException` | `GeckoLibGsonLoader` |

---

# C) Dikkat edilmesi gereken noktalar

1. **`easingArgs` camelCase.** Animasyon JSON'undaki tek camelCase anahtar bu.
   `easing_args` yazılırsa sessizce yok sayılır.
2. **`lerp_mode` `easing`'i ezer.** İkisi de yazılırsa `easing` hiç okunmaz.
3. **Tanınmayan easing adı hata değil** — sessizce `linear`'a düşer.
   Tanınmayan `loop` metni de sessizce `play_once`'a düşer.
4. **Animasyon `format_version`'ı doğrulanmıyor.** Yalnız geometri tarafında
   `ModelFormatVersion` kontrolü var ve o da sadece uyarı üretiyor.
5. **`animation_length` yoksa ve hesaplanan uzunluk 0 ise animasyon
   `Double.MAX_VALUE` uzunlukta sayılır** — pratikte sonsuz.
6. **Dosya adı uzantısı kontrol ediliyor:** modeller klasöründe `.animation.json`,
   animasyonlar klasöründe `.geo.json` bulunursa `IllegalStateException`.
7. **`poly_mesh` ve `texture_meshes` ayrıştırılıyor ama `bake()` yolunda
   okunmuyor** (ŞÜPHELİ) — GeckoLib 5.5.5'te bu iki özellik render'a bağlı
   görünmüyor. Aynısı `binding`, `render_group_id`, kemik `debug`'ı,
   `material_instance`, `relative_to`, `pre_effect_script`, `bind_to_actor`,
   `start_delay`, `loop_delay`, `anim_time_update`, `blend_weight`,
   `override_previous_animation` ve `cape` için de geçerli.
