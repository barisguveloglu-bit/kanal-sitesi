# Weapons of Miracles + Epic Fight → Şimşek TNT

**Kaynaklar:**
- `WeaponsOfMiracles2.0.176.jar` — *Weapons of Miracles* (Reascer), NeoForge
- `_yle.jar` — *Epic Fight* (yesman), üzerine kurulu olduğu dövüş sistemi

## Aktarılan: 27 silah

| silah | hasar | dayanıklılık | nadirlik | vuruş serisi |
|---|---|---|---|---|
| Izdırap (Agony) | 6 | 2135 | rare | agony_auto_1..4 |
| Antitheus | 8 | 6666 | epic | antitheus_auto_1..4 |
| Kara Yıldız (Blackstar) | 9 | 2135 | rare | blackstar_basic_attack_1..4 |
| Ender Tabancası | 7 | 4735 | epic | enderblaster_onehand_auto_1..4 |
| Kötü Ôdachi | 8 | 1635 | rare | katana_auto_1..3 |
| Gesetz | 4 | 4157 | rare | gezets_auto_1..3 |
| Herrscher | 6 | 1582 | rare | herrscher_auto_1..3 |
| Kof Uzun Kılıç | 7 | 875 | rare | longsword_auto1..3 *(Epic Fight)* |
| Pençeli Eldiven | 6 | 782 | rare | fist_auto1..3 *(Epic Fight)* |
| Aysız (Moonless) | 7 | 2135 | epic | moonless_auto_1..3 |
| Napoleon | 7 | 2135 | epic | napoleon_auto_1..4 |
| Nova | 5 | 2135 | rare | nova_attack_1..4 |
| Yörünge (Orbit) | 8 | 2135 | rare | orbit_attack_1..4 |
| Ruine | 7 | 2135 | rare | ruine_auto_1..4 |
| Satsujin | 7 | 2135 | epic | katana_auto_1..3 |
| Güneş (Solar) | 9 | 2135 | epic | solar_auto_1..4 |
| Azap (Torment) | 9 | 2135 | rare | torment_auto_1..4 |
| Asalar (6 kademe) | 2–6 | 32–2031 | common | staff_auto_1..3 |
| Balyoz baltalar (4 kademe) | 8–12 | 32–2031 | common | axe_auto1..2 *(Epic Fight)* |

## Sayılar nereden: bytecode

Bu mod öncekilerden **farklı** — hasar ve dayanıklılık JSON'da değil,
derlenmiş Java'nın içinde. Ama okunabilir; `javap` ile çıkarıldı:

```
WOMItems.class  static{} : "agony" → InvokeDynamic → lambda$static$N
                BootstrapMethods   : lambda'yı çözüyor
                lambda gövdesi     : Rarity.RARE, durability(2135),
                                     AgonySpearItem.createWeaponAttributes()
AgonySpearItem.class
                createWeaponAttributes(): ldc 5.0f  (hasar)
                                          ldc -2.0f (hız)
```

Kademe silahları formülle:
`Greataxe = 7.0 + kademe bonusu`, `Staff = 1.0 + kademe bonusu`
(vanilla bonus: tahta 0, taş 1, demir 2, elmas 3, altın 0, netherite 4).

**Test 27/27 silahı jar'dan yeniden çıkarıp karşılaştırıyor.**

### Java hasarı → Bedrock hasarı

Java'da eşyanın sayısı bir **değiştirici** (taban yumruk 1 üstüne biner);
Bedrock'ta `minecraft:damage` **toplam**. O yüzden `bedrock = java + 1`.
Elmas kılıçta ölçüldü: Java +6, Bedrock 7.

## Animasyonlar: kopyalanmadı, çevrildi

Epic Fight ve WoM animasyonları Bedrock biçimi **değil**:

| | Epic Fight | Bedrock |
|---|---|---|
| veri | eklem başına 4×4 dönüşüm matrisi | kemik başına euler derece |
| iskelet | Root/Torso/Chest/Shoulder_R/Arm_R/Elbow_R/Hand_R… | head/body/rightArm/… |

Çevirici: [`kaynak_anim/ef_cevir.py`](kaynak_anim/ef_cevir.py)

1. Bağlama pozundan (armature) **delta**: `D(t) = bind⁻¹ · L(t)`.
   Delta olmadan her kemik dinlenme pozu kadar kayıyordu.
2. Bedrock'un kolu **tek kemik**, Epic Fight'ınki zincir. Zincirin
   deltaları çarpılıyor: `rightArm = D(Shoulder_R)·D(Arm_R)`.
3. Matris → euler XYZ derece.
4. Bedrock kuralı: dosyadaki değer matematiksel dönüşün **tersi**
   (bu depoda v4.88'de ölçüldü).

### Yakalanan hata

İlk çevrimde kılıç sallamada bacaklar **~50° dönüyordu**. Sebep: Epic
Fight'ta `Thigh_R`, `Root`'un çocuğu (`Torso`'nun **kardeşi**);
Bedrock'ta `rightLeg`, `body`'nin **çocuğu**. Gövde dönüşü bacaklara
mirasla geçip **iki kez** uygulanıyordu. Düzeltme: bacağın deltasından
gövdeninki çıkarılıyor.

### Doğrulama

Sayıların makul görünmesi yetmedi — çevrilen pozlar
`scratchpad/onizle_poz.py` ile **çizildi** ve gerçek bir kılıç savuruşu /
mızrak hamlesi oldukları görüldü. (İlk çizici sınır kutusu çiziyordu ve
hiçbir şeyi doğrulamıyordu; gerçek yüz çizimine geçirildi.)

**63 animasyon**, 7848 kare, 242 KB. Tekrar eden kareler atıldı — Bedrock
araları kendisi yumuşatıyor.

## Silah → seri eşlemesi uydurma değil

WoM'un kendi animasyonları **zaten silah adıyla**: `solar_auto_1..4`,
`katana_auto_1..3`, `torment_auto_1..4`. Eşleşme modun kendi
adlandırmasından.

WoM'da kendi serisi olmayan üç aile (balyoz baltalar, pençeli eldiven,
kof uzun kılıç) Epic Fight'ın **tür** serisine bağlandı.

## Aktarılamayanlar (uydurulmadı)

| ne | neden |
|---|---|
| **saldırı hızı** | Bedrock'ta eşya başına saldırı hızı bileşeni yok. Sayılar tabloda duruyor, oyunda karşılığı yok — özetler vaat etmiyor. |
| **dirsek bükülmesi** | Epic Fight'ın kolu 4 kemikli zincir, Bedrock'un oyuncu kolu tek kemik. Kolun genel yönü doğru, dirsek yok. |
| **oyuncu kilidi** | Epic Fight saldırı boyunca oyuncuyu kilitliyor. Bedrock'ta script'ten girdi kilitlemek yok; animasyon normal hareketin üstüne oynuyor. |
| **3B silah modelleri** | `.obj`/`.mtl` üçgen ağı; Bedrock kutu tabanlı `.geo.json` istiyor. İkonlar modun kendi pikselleri. |
| **Epic Fight'ın kendisi** | Stamina, skill ağacı, kombo penceresi, parry — 1530 derlenmiş sınıf, bir dövüş sistemi. Aktarılan şey **animasyonları** ve WoM'un silahları. |

## Aktarılmayanlar (istenmediği için)

WoM'da silahların yanında **takı/zırh** de var (bilezikler, maskeler,
kemerler, taçlar). Kullanıcı "zırh modları da buldum, bunları
ekledikten sonra atacam" dedi — onlar sonraki sürüme.
