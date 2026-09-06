# Referans · Boby1545 Mini Pack + Kevin1545 modu (eymox)

**İkisi de eklenti (hile değil):** davranış + kaynak paketi,
gerçek `@minecraft/server` script'i taşıyorlar. Okundu ve
karşılaştırıldı; oyunda çalıştırılmadı.

| md5 | bayt | kayıt | ad |
|---|---|---|---|
| `0613efc670719a42198d0cf38ef825cc` | 386.975 | 93 | `Boby1545_Mini_Pack_eymox.mcaddon.zip` |
| `9582d82241a51c4e4110eac9f61866f8` | 126.331 | 147 | `kevin1545_modu_eymox.mcaddon.zip` |

Kullanıcı sordu: *"bir tanesinde tek tek Şimşek atabiliyorsun,
hangisi olduğunu bilmiyorum ama onun nasıl yaptığına bir bak
bize geçir. Bu arada bu iki moddan da alabildiğini al."*

**Cevap: ikisinde de var, iki ayrı yolla.**

---

## "Tek tek şimşek" — kaynakta iki yol

### Kevin1545 · `yildirim.mcfunction` — tek satır

```
summon lightning_bolt ^^^12
```

`^^^12` **caret (yerel) koordinat**: baktığın yönde sabit 12
blok ileri. Raycast yok, nişan yok, arada ne varsa önemsiz.

Tetikleyici, kılıcın kendi olayı:

```json
"minecraft:on_use": { "on_use": { "event": "on_use_event" } },
"on_use_event": { "sequence": [
  { "run_command": { "command": [
      "function kevin1545_kol_hareketi", "function yildirim" ] } },
  { "damage": { "type": "durability", "amount": 1 } } ]},
"minecraft:cooldown": {
  "category": "kevin1545_sword_yildirim_cooldown", "duration": 1 }
```

Yani: **sağ tık → bir şimşek, 1 sn bekleme, tekrar bas.** "Tek
tek" hissi buradan geliyor.

### Boby1545 · `menu.js` — üç kademeli nişan

```js
const entityRay = dimension.getEntitiesFromRay(head, view, {maxDistance:25});
const targetEntity = entityRay.find(hit => hit.entity.id !== player.id)?.entity;
const blockRay = dimension.getBlockFromRay(head, view, {maxDistance:25});

targetLoc = targetEntity      ? targetEntity.location
          : blockRay?.block   ? blockRay.block.location
          : { x: loc.x + view.x*12, ... };          // 12 blok ileri

player.runCommand(`summon lightning_bolt ${tX} ${tY+1} ${tZ}`);
```

**Varlık → blok → 12 blok ileri.** Sonra tek `summon`.

---

## Bizde neden yoktu

Dört şimşek yeteneğimiz vardı ve **dördü de yağmur**:
`SIMSEK_SAYISI` (20) tane şimşek `SIMSEK_ARALIK` (3) tickte bir.
Güçlü ama ağır. Tek bir moba nişan alıp **bir kere basmak** diye
bir şey yoktu — kullanıcının fark ettiği eksik tam olarak buydu.

## Ne yazıldı: **Tek Şimşek** (`tek_simsek.js`, sıra 21)

Boby'nin üç kademeli nişanı + Kevin'in üçüncü kademesi:

```js
1. kilitliHedef(...)   -> artının üstündeki canlı
2. hedefBul(...)       -> baktığın yüzey
3. konum + yön*TEK_SIMSEK_UZAK   (12 — kaynağın sayısı)
```

### Kaynaktan ayrılan üç şey

1. **Duvarın arkasına geçmiyor.** Kevin'in `^^^12`'si arada
   duvar olsa da 12 blok ileri vuruyor. Bizde blok kademesi
   ikinci sırada, yani duvara bakarken duvara vuruyor.
   `test/tek_simsek.mjs` 5. bölüm bunu tutuyor.
2. **Bekleme eşyada değil JS'te** (`TEK_SIMSEK_BEKLEME = 10`
   tick). Kaynak `minecraft:cooldown` kullanıyor; bu depodaki
   bütün beklemeler `ayarlar.js`'ten okunuyor.
3. **İş açmıyor.** Bir tick, bir varlık, bitti. Yağmur işi
   açsaydı "tek tek basma" hissi kaybolurdu — yeteneğin var
   olma sebebi zaten bu. Test 1. bölüm bunu tutuyor.

---

## İkinci alınan: **Toprak İzi** (`toprak_izi.js`, sıra 22)

Kaynak: Boby `menu.js` `"boby_2"` — *"Yürüdüğün Yer Toprak"*.

```js
system.runInterval(() => {
  for (const id of activeTrails) {
    ...
    player.dimension.runCommand(`setblock ${x} ${y} ${z} dirt replace`);
  }
}, 1);
```

### Kaynağın üç sorunu, üçü de bizde yok

| sorun | kaynakta | bizde |
|---|---|---|
| **her tick yazıyor** | duruyorken bile saniyede 20 `setblock` | koordinat değişmedikçe **tek işlem yok** |
| **geri almıyor** | yürüdüğün her yer kalıcı toprak | eski blok tipi defterde, kapanınca aynen geri |
| **süresiz** | açan unutursa dünya sonsuza kadar toprak | `IZ_SURE` (2 dk) + `IZ_TAVAN` (256 blok kuyruk) |

Ayrıca kaynağın `replace` filtresi yok: **sandığı da içindekiyle
birlikte** toprağa çeviriyor. `IZ_KORUNAN` listesi (kap blokları
+ bedrock) ve `pa:` öneki bunu engelliyor — `kafes.js`'teki
`KAFES_KORUNAN` ile aynı gerekçe.

Bir ayrıntı daha: geri koyarken **yalnız bizim koyduğumuz duruyorsa**
geri konuyor. Arada biri oraya bir şey inşa ettiyse onunki kalır.

---

## Alınmayanlar — hepsi zaten bizde

| kaynaktaki | bizdeki |
|---|---|
| `hapis` (`fill iron_bars`) | Kevin1545'ten v6.x'te alınmış (`test/kevin.mjs`) |
| `kol_kopar` / `kevinn_duzelr` (`evoker.general` pozu) | Dondur |
| `kevin1545_tp` (`tp @s ^^^10`) | Işınlanma |
| `boby_1` dev toprak duvar | Toprak Duvarı |
| `arms_1` örs (`setblock ~ ~7 ~ anvil`) | Örs Yağdır |
| `arms_2` uçma (`levitation`) | Uçuş |
| `arms_3` uçurma | Uçurma |
| `arms_4` yamultma | Yamultma |
| `1535_1` 10 blok şimşek yağmuru | Alan Şimşeği |
| `1535_2` 3 sn şimşek takibi | Yön Şimşeği'nin hedef kilidi (hedef kaçarsa peşinden gider) |
| kafaya/göğse model takıp `invisibility 1 0 true` | kol/konsey derileri |

---

## Alınmayan bir şey daha — **`picker_0`, bilerek**

Boby'nin "Mobpicker" gücü:

```js
tp <hedef> x (y-5) z                       // yerin 5 blok dibi
effect <hedef> blindness    99999 1   true
effect <hedef> slowness     99999 255 true
effect <hedef> regeneration 99999 255 true // ölemesin diye
effect <hedef> resistance   99999 255 true
```

Kurbanı yerin dibine gömüyor, kör ediyor, donduruyor ve
**ölümsüz yapıyor** — yani ölerek bile kurtulamıyor. Tek çıkış
saldırganın `picker_1`'e basması, ve eski konum `savedLocations`
adlı **bellekteki bir Map'te**: dünya kapanıp açılınca kurban
yerin 500 blok altında, kör, donmuş ve öldürülemez halde kalıyor.

**Bu tam olarak Zaman Saati'nde reddettiğimiz hata** (v7.2 notu),
üçüncü kez. Alınmadı.

`picker_1`'in iki ayrı kusuru daha var:
- `effect "<ad>" clear` — kurbanın **kendi içtiği iksiri de**
  siliyor. Bu kalıp bu depoda dördüncü kez reddediliyor.
- Döngünün içinde `return` var: iki tutsak varsa **yalnız biri**
  kurtarılabiliyor, öteki sonsuza kadar orada.

`arms_4` (yamultma) da aynı aileden: `slowness 100000 255` +
`fox.sleep 9999`, süre yok, çıkış yok. Bizimki süreli.
