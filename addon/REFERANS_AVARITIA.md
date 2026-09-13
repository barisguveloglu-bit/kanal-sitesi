# Avaritia Ultimate 1.5.0 — inceleme

Kullanıcı: *"bu modda zırhlı bir şekilde özel bir zırhı var, o zırhı taktığın
zaman /kill yazınca bile öldürmüyormuş, öyle bir mekanik var mı?"*

Paket: **1162 dosya, 6,0 MB.** Bedrock `.mcaddon`. Tek script dosyası:
`AvaritiaBP/scripts/__bundle.js`, **630 KB**. Paket **çalıştırılmadı** — zip
açıldı, bundle okundu.

## Kısa cevap: hayır, öyle bir mekanik yok

`immortal` diye bir şey var ama **`/kill` ile hiçbir ilgisi yok.** Sadece bir
**etiket** ve tek işi, **modun kendi silahlarının** o oyuncuyu atlaması:

```js
if (player.hasTag("infinity_armor")) {
  player.addTag("immortal");
  player.addEffect("saturation", 5, …);
  player.addEffect("fire_resistance", 5, { amplifier: 5, … });
}
```

```js
// combatHit.js — sonsuzluk kılıcı
if (entity.hasTag("immortal")) entity.removeTag("infinityHit");
if (entity.hasTag("immortal"))  runCommand(`damage @s 1 self_destruct …`);
if (entity.hasTag("infinityHit")) runCommand(`damage @s 100000 self_destruct …`);
if (entity.hasTag("infinityHit")) runCommand("kill @s");
```

Yani sonsuzluk kılıcı sana **100000 yerine 1** hasar veriyor. Zırhın verdiği
gerçek şey: doyma + ateş direnci VI. Hepsi bu.

## Ölüm engelleyen hiçbir şey yok

Bundle'daki **bütün** `beforeEvents` abonelikleri sayıldı:

| olay | adet |
|---|---|
| `beforeEvents.startup` | 16 |
| `beforeEvents.playerInteractWithBlock` | 4 |
| `beforeEvents.playerInteractWithEntity` | 4 |
| `beforeEvents.playerBreakBlock` | 2 |
| `beforeEvents.itemUse` / `itemUseOn` | 1 / 1 |
| **`beforeEvents.entityHurt`** | **0** |

`entityDie` ile dirilten bir şey de yok. Yani "zırhı takınca `/kill`
öldürmüyor" iddiası bu pakette **karşılıksız**.

## Ama kullanılabilir bir teknik var

Mod, **düşme hasarını** iptal etmek için şunu yapıyor — `entityHurt` olay
*sonrası* olduğu için iptal değil, **geri iyileştirme**:

```js
world.afterEvents.entityHurt.subscribe((ev) => {
  if (ev.damageSource?.cause !== "fall") return;
  const health = hurt.getComponent("minecraft:health");
  health.setCurrentValue(Math.min(health.effectiveMax,
                                  health.currentValue + ev.damage));
});
```

**Alınan şey bu.** `yetenekler/yenilmez_zirh.js`, aynı teknik, her hasar
sebebine.

## Bedrock'ta `/kill` kesin engellenebilir mi

**Hayır, garanti edilemez.** Hasarı iptal eden bir kanca yok; `entityHurt`
olaydan sonra çalışıyor. Ölümcül olmayan her hasar geri alınabiliyor, ama
`/kill`in ölümü sonlandırmadan önce script'in yetişip yetişmediği **oyunda
denenmeden bilinemez** ve bu depoda oyun çalıştırılamıyor.

O yüzden iki iş **ayrı** yazıldı:

- **geri iyileştirme** — kesin çalışır (kaynakta çalışan tekniğin aynısı),
- **öldürme girişimi bildirimi** — yakalandığında İngilizce mesaj basıyor.

Kod "herhalde olur" diye bir şey iddia etmiyor.

## Alınmayanlar

Sonsuzluk kılıcı / zırhı / aletleri, madde kümesi, bedrock kırıcı, infinity
elytra, sıkıştırma tarifleri, 748 doku. Hepsi kendi eşya ve blok sistemine
bağlı; bu depoda karşılığı zaten var (`kns_*` setleri, `goz_lazeri`,
`zirh_katman`).
