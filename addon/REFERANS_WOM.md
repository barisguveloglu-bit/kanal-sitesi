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
| ara değer | kuaterniyon (slerp) | her eksen ayrı, **düz** |

Çevirici: [`kaynak_anim/ef_cevir.py`](kaynak_anim/ef_cevir.py)

### İskeletler aynı yapıda (v5.5'te ölçüldü)

Epic Fight (`assets/epicfight/animmodels/entity/biped.json`) ve Bedrock
oyuncusu (`geometry.humanoid.custom`; Marvel Project'in 46 oyuncu modeli
birebir bunu yansıtıyor):

```
Epic Fight                     Bedrock
Root                           root  (0,0,0)
 ├ Thigh_R → Leg_R              ├ rightLeg (-2,12,0)
 ├ Thigh_L → Leg_L              ├ leftLeg  (2,12,0)
 └ Torso                        └ waist (0,12,0)
    └ Chest                        └ body (0,24,0)
       ├ Head                         ├ head     (0,24,0)
       ├ Shoulder_R → Arm_R           ├ rightArm (-5,22,0)
       └ Shoulder_L → Arm_L           └ leftArm  (5,22,0)
```

Eşleme **bire bir**. Tek istisna kol: Bedrock'ta tek kemik, Epic
Fight'ta zincir — deltaları çarpılıyor (`rightArm = D(Shoulder_R)·D(Arm_R)`),
**dirsek bükülmesi kayboluyor**, aktarılan şey kolun genel yönü.

### Adımlar

1. Bağlama pozundan **delta**: `D(t) = bind⁻¹ · L(t)`. Animasyon kendi
   `armature`'ını taşıyorsa (63 dosyanın 55'i) o kullanılıyor — Epic
   Fight de öyle yapıyor.
2. `root` ilk kareye göre **sıfırlanıyor** (kombo devamı + eksen düzeni;
   gerekçesi `NOTLAR.md` v5.5 §5).
3. Zincir çarpımı, sonra matris → euler.
4. **Süreklilik**: iki eşdeğer euler çözümünden öncekine yakın olanı
   seçilip 360'ın katlarıyla kaydırılıyor.
5. **Yay sıklaştırma**: iki kare arası gerçek dönüş 45 dereceyi geçerse
   araya kaynaktan (slerp'le) örnek ekleniyor.
6. Bedrock kuralı: dosyadaki değer matematiksel dönüşün **tersi**
   (bu depoda v4.88'de ölçüldü).
7. `override_previous_animation: true` — vanilla `move.arms` /
   `attack.rotations` üstüne eklenmesin diye.

### v5.0–v5.4'te neden bozuktu

Kullanıcının ekran görüntüsü: *"karakter bildiğin dans ediyor"*, uzuvlar
gövdeden kopmuş. Üç hata, üçü de ölçüldü:

1. **Euler dal atlaması.** 7470 kare geçişinin 147'si 180 dereceden
   büyük sıçrıyordu (en kötüsü saniyede 7049 derece). Aynı dönüşün iki
   yazılışı arasında gerçek fark 0.4 derece, Bedrock'un düz geçişi
   359.6 derece.
2. **Root atılıyordu.** 63 animasyonun 60'ında 20 dereceden fazla gövde
   dönüşü var (en çok 88.8). Kafa ve bacaklar onu dengeleyen ters
   dönüşler taşıdığı için Root gidince kafa 113 derece savruluyordu.
3. **Bacaklardan gövde çıkarılıyordu.** Yorum *"Bedrock'ta rightLeg,
   body'nin çocuğu"* diyordu — değil, `root`'un çocuğu, `body`'nin
   **kardeşi**. Çıkarma bacaklara gövdenin tersini ekliyordu.

### Doğrulama

Sayıların makul görünmesi yetmedi — pozlar `scratchpad/onizle_poz.py`
ile **çizildi**. Önizleyicinin kendisi de v5.5'te düzeltildi: bacakları
`body`'nin çocuğu çiziyordu, yani çevirinin **aynı yanlışını**
doğruluyordu; ve kareler arasını çizmiyordu, dans tam da orada oluyordu.

Root'u `body`'ye katlama denemesini yalnızca önizleme yakaladı: sayılar
temizdi ama `body`'nin dönme merkezi **boyun**, `root`'unki **ayak** —
gövde kafanın altından kayıyordu.

| | v5.4 | v5.5 |
|---|---|---|
| 180'i aşan kare sıçraması | 147 | **0** |
| ara değer hatası > 30° | 177 | **0** |
| en kötü ara değer hatası | 350° | **7°** |
| kare | 7848 | 9927 |

**63 animasyon**, 9927 kare. Kalıcı denetim: `sim/wom_dovus.mjs` (4 yeni
sınama) ve `sim/anim_tara.py` (kare sıçraması + iskelet düzeni). İkisi de
bozuk v5.4 verisiyle geri koşuldu — 147 hata veriyorlar.

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
