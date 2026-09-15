# GeckoLib 5.5.5 — MoLang Motoru Referansı

Kaynak: `com/geckolib/loading/math/**` (GeckoLib 5.5.5 JAR, obfuscate edilmemiş `.class`).
Yöntem: `javap -p -c -constants` ve `javap -p -v` (BootstrapMethods tablosundan
`invokedynamic` → sınıf çözümlemesi). Java kaynağı yok; her bulgu bytecode'dan okundu.

Giriş noktası: `MathParser.compileMolang(String)` → `MathValue`.
`MathValue.get(ControllerState)` her karede çağrılıp `double` üretiyor.

---

## 1. Matematik fonksiyonları

Kayıt yeri: `MathParser.FUNCTION_FACTORIES` (bir `ConcurrentHashMap`, sınıfın statik
kurucusundaki `lambda$static$0` içinde doldurulur). Toplam **30 fonksiyon**.
`MathParser.registerFunction(String, MathFunction.Factory)` ile dışarıdan yenisi
eklenebilir; aynı ad ikinci kez kaydedilirse WARN log basılır ama üzerine yazılır.

Argüman sayısı `MathFunction.getMinArgs()` ile doğrulanır; `MathFunction.validate()`
yalnızca **alt sınırı** denetler (fazla argüman hata değil, sessizce yoksayılır —
fonksiyon yapıcısı yalnız beklediği indeksleri okur).

| MoLang adı | argüman sayısı | ne yapar | sınıf |
|---|---|---|---|
| `math.abs` | 1 | `Math.abs(x)` | `function/generic/AbsFunction` |
| `math.acos` | 1 | Ark kosinüs, **radyan**. `x >= 1` → `0`, `x <= -1` → `PI`, aksi halde `Math.acos(x)` | `function/generic/ACosFunction` |
| `math.asin` | 1 | Ark sinüs, **radyan**. `x >= 1` → `PI/2`, `x == 0` → `0`, `x <= -1` → `-PI/2`, aksi halde `Math.asin(x)` | `function/generic/ASinFunction` |
| `math.atan` | 1 | Ark tanjant, **radyan**. `x == 0` → `0`, aksi halde `Math.atan(x)` | `function/generic/ATanFunction` |
| `math.atan2` | 2 | `Math.atan2(y, x) * 57.2957763671875` → sonuç **derece**. İlk argüman `y`, ikinci `x` | `function/generic/ATan2Function` |
| `math.ceil` | 1 | `Math.ceil(x)` | `function/round/CeilFunction` |
| `math.clamp` | 3 | `Mth.clamp(value, min, max)` — sıra `(değer, min, maks)` | `function/limit/ClampFunction` |
| `math.cos` | 1 | **Girdi derece**: `Mth.cos(x * 0.017453292f)`; float hassasiyetinde | `function/generic/CosFunction` |
| `math.die_roll` | 3 (+1 isteğe bağlı) | `rolls` kez `min..max` arası **ondalık** rastgele üretip toplar. `(rolls, min, max[, seed])`. `rolls` `Math.floor` ile tamsayılaştırılır. Seed varsa kendi `java.util.Random`'ı her hesapta `setSeed` ile sıfırlanır; yoksa `ThreadLocalRandom` | `function/random/DieRollFunction` |
| `math.die_roll_integer` | 3 (+1 isteğe bağlı) | Tamsayı hâli: `min` `Mth.floor`, `max` `Mth.ceil`, ikisi sıraya sokulur, `rolls` kez `nextInt(hi+1-lo)+lo` toplanır. `(rolls, min, max[, seed])` | `function/random/DieRollIntegerFunction` |
| `math.exp` | 1 | `Math.exp((double)(float)x)` — argüman önce float'a daraltılır | `function/generic/ExpFunction` |
| `math.floor` | 1 | `Math.floor(x)` | `function/round/FloorFunction` |
| `math.hermite_blend` | 1 | `3t² − 2t³` (smoothstep) | `function/round/HermiteBlendFunction` |
| `math.lerp` | 3 | `Mth.lerp(delta, min, max)`. **Argüman sırası `(min, max, delta)`** | `function/round/LerpFunction` |
| `math.lerprotate` | 3 | `MiscUtil.lerpYaw(delta, min, max)` — açıların kısa yoldan interpolasyonu. Sıra yine `(min, max, delta)` | `function/round/LerpRotFunction` |
| `math.ln` | 1 | `Math.log((double)(float)x)` — doğal logaritma; argüman önce float'a daraltılır | `function/generic/LogFunction` |
| `math.max` | 2 | `Math.max(a, b)` | `function/limit/MaxFunction` |
| `math.min` | 2 | `Math.min(a, b)` | `function/limit/MinFunction` |
| `math.min_angle` | 1 | `Mth.wrapDegrees(x)` — açıyı `[-180, 180)` aralığına indirger | `function/round/MinAngleFunction` |
| `math.mod` | 2 | `modulus == 0` → `0`, aksi halde `value % modulus` | `function/generic/ModFunction` |
| `math.pi` | 0 | Sabit `3.141592653589793` | `function/misc/PiFunction` |
| `math.pow` | 2 | `Math.pow(value, power)` | `function/generic/PowFunction` |
| `math.random` | 1 (+2 isteğe bağlı) | Ondalık rastgele. `(a)` → `[0, a)`; `(a, b)` → `[min(a,b), max(a,b))`; `(a, b, seed)` → seed'li `java.util.Random`. Seed yoksa `Math.random()` | `function/random/RandomFunction` |
| `math.random_integer` | 1 (+2 isteğe bağlı) | Tamsayı rastgele; argümanlar `Math.round` ile yuvarlanır. `(a, b)` → `[min, max]` **kapalı aralık** (`nextInt(hi+1-lo)+lo`). Seed yoksa `ThreadLocalRandom` | `function/random/RandomIntegerFunction` |
| `math.round` | 1 | `(double) Math.round(x)` — yarımlar yukarı | `function/round/RoundFunction` |
| `math.sin` | 1 | **Girdi derece**: `Math.sin(x * 0.01745329238474369)` | `function/generic/SinFunction` |
| `math.sqrt` | 1 | `Math.sqrt(Math.max(0, x))` — negatif girdi `NaN` değil `0` verir | `function/generic/SqrtFunction` |
| `math.to_deg` | 1 | `Math.toDegrees(x)` | `function/misc/ToDegFunction` |
| `math.to_rad` | 1 | `Math.toRadians(x)` | `function/misc/ToRadFunction` |
| `math.trunc` | 1 | `(double)(long) x` — sıfıra doğru kırpma | `function/round/TruncateFunction` |

### Dikkat edilecek noktalar

- **`math.sin` / `math.cos` derece alır**, `math.asin` / `math.acos` / `math.atan`
  ise **radyan döndürür**; `math.atan2` **derece** döndürür. Bu asimetri bytecode'da
  açıkça böyle (Bedrock'ın kendi davranışıyla uyumlu).
- `math.lerp` ve `math.lerprotate` argüman sırası `(min, max, delta)`; alanlar
  sınıfta `min`, `max`, `delta` olarak bu sırayla atanıyor.
- Sıfıra bölme / sıfıra mod hiçbir yerde istisna atmaz, güvenli değer döner.
- `math.random`, `math.random_integer`, `math.die_roll*` seed **verilmediğinde**
  (argüman sayısı 3'ten az) `isMutable()` daima `true` döner; sonuç önbelleğe
  alınmaz, her karede yeniden üretilir.

### Önbellekleme (performans açısından önemli)

`MathFunction.get()`: ifade **mutable değilse** (içinde değişken veya rastgelelik
yoksa) ilk hesaplama sonucu `cachedValue` alanında saklanır ve bir daha
hesaplanmaz. Sentinel değer `Double.MIN_VALUE` (`4.9E-324`). Aynı mekanizma
`value/Calculation` içinde de var.

---

## 2. Operatörler

Kayıt yeri: `Operator` sınıfının statik kurucusu. Her operatör bir
`record Operator(String symbol, int precedence, Operation operation)`.
`Operator.register(...)` / `Operator.registerAlias(...)` ile genişletilebilir.

Öncelik **büyük sayı önce bağlar** (`takesPrecedenceOver` = `precedence > other.precedence`).

| Sembol | Takma ad | Öncelik | İşlem (bytecode'dan) |
|---|---|---|---|
| `=` | — | 1 | `Operation` gövdesi `return 0.0`; gerçek atama ayrıştırıcıda `VariableAssignment` ile yapılır |
| `\|\|` | `\|` | 2 | `(a != 0 \|\| b != 0) ? 1 : 0` |
| `&&` | `&` | 3 | `(a != 0 && b != 0) ? 1 : 0` |
| `==` | — | 4 | `Math.abs(a - b) < 1e-5 ? 1 : 0` — **epsilon karşılaştırması**, tam eşitlik değil |
| `!=` | — | 4 | `Math.abs(a - b) >= 1e-5 ? 1 : 0` |
| `<` | — | 5 | `a < b ? 1 : 0` |
| `<=` | — | 5 | `a <= b ? 1 : 0` |
| `>` | — | 5 | `a > b ? 1 : 0` |
| `>=` | — | 5 | `a >= b ? 1 : 0` |
| `+` | — | 6 | `Double.sum(a, b)` |
| `-` | — | 6 | `a - b` |
| `*` | — | 7 | `a * b` |
| `/` | — | 7 | `b == 0 ? a : a / b` — **sıfıra bölmede sol taraf aynen döner** |
| `%` | — | 7 | `b == 0 ? a : a % b` |
| `^` | — | 8 | `Math.pow(a, b)` |

`OPERATOR_SYMBOLS` karakter kümesi bu sembollerin tüm karakterlerini, ayrıca ayrı
olarak eklenmiş `?`, `:` ve `,` karakterlerini içerir (`lambda$static$0`). Bu üçü
operatör değil, ayrıştırıcının tanıdığı yapısal işaretlerdir.

### Tekli (unary) işleçler

`Operator` tablosunda değil, ayrıştırıcıda özel durum olarak ele alınırlar:

- `!` → `value/BooleanNegate` — `x == 0 ? 1 : 0`
- `-` → `value/Negative` — `-x` (bir sayının başındaysa `NUMERIC_FORMAT` deseni
  `-?` kabul ettiği için doğrudan negatif sabit olur)

### `?:` (ternary) davranışı — `MathParser.compileTernary`

- `value/Ternary.get()`: `condition.get() != 0 ? trueValue : falseValue`.
- İki biçim destekleniyor:
  1. **Tam üçlü**: `cond ? a : b`.
  2. **Kısaltma**: `cond ? a` (iki nokta yok) → yanlış dalı
     **`compileConstant(0.0)`** olur; bytecode'da `:` bulunamazsa `Ternary`
     üçüncü argümanı sabit 0 ile kurulur.
- İç içe `?:` için derinlik sayacı tutuluyor (`?` görünce artan, `:` görünce
  azalan), yani `a ? b : c ? d : e` doğru eşleşir.
- Ternary, `compileValue` içinde **atamadan sonra, aritmetik hesaptan önce**
  denenir: sıra `compileAssignment` → `compileTernary` → `compileCalculation`.

### Değer sınıfları (`value/`)

| Sınıf | Rolü |
|---|---|
| `Constant` | Sabit `double`; `isMutable()` = `false` |
| `Variable` | `record(name, AtomicReference<ToDoubleFunction<ControllerState>>)`. `ControllerState` null ise `0` döner; istisna olursa hata loglanır ve `0` döner |
| `VariableAssignment` | `variable.set(value.get(state))` yapar ve **her zaman `0.0` döndürür** |
| `Calculation` | `(operator, left, right)`; mutable değilse sonucu `MutableDouble` içinde önbelleğe alır |
| `Ternary` | `(condition, trueValue, falseValue)` |
| `Group` | Parantezli tek değerin sarmalayıcısı |
| `CompoundValue` | `;` ile ayrılmış ifadeler dizisi; hepsini sırayla çalıştırır, **sonuncusunun** değerini döndürür |
| `Negative` | `-x` |
| `BooleanNegate` | `!x` |

---

## 3. Ayrıştırma akışı

1. **`compileMolang(String)`**
   - Boş/boşluk ifade → `Constant(0.0)`.
   - `EXPRESSION_FORMAT` desenine uymuyorsa `CompoundException`.
   - Tüm boşluklar silinir (`\s` → ``), sonra `toLowerCase(Locale.ROOT)`.
     **Yani MoLang tamamen büyük/küçük harf duyarsız.**
   - `Deduplicator` üzerinden derlenir (bkz. §6).
2. **`return` ve `;` işlenmesi** (`lambda$compileMolang$0`)
   - İfade `return` ile başlıyorsa bu önek atılır; ardından ilk `;`'ye kadarki kısım alınır.
   - `;` içeriyorsa ifade parçalara bölünür, boş parçalar atlanır, her parçanın
     başındaki `return` atılır, hepsi derlenip `CompoundValue` içine konur.
     `return` görülen parçadan **sonrası derlenmez** (döngü kırılır).
   - Hiç parça kalmazsa `Constant(0.0)`.
3. **`decomposeExpression`** — parantez ve süslü parantez dengesini denetler.
4. **`compileSymbols(char[])`** — `List<Either<String, List<MathValue>>>` üretir.
   Sol taraf sembol/işleç dizesi, sağ taraf parantezli grup (fonksiyon argüman listesi).
   - `(` ... `)` içi, derinlik 1'deki `,` karakterlerinden bölünüp her parça
     özyinelemeli derlenir → argüman listesi.
   - Bir grubun hemen öncesindeki `-` tekli eksi olarak tanınır, grup `Negative`
     ile sarılır.
   - `tryMergeOperativeSymbols` en uzundan kısaya deneyerek çok karakterli
     işleçleri (`<=`, `&&`, `!=` …) tek parça yapar; `Operator.maxOperatorLength()`
     kadar ileri bakar. Eşleşme yoksa `?`, `:`, `,` tek karakter olarak döner.
5. **`parseSymbols`** — liste tam 2 elemanlı ve `[sol=ad, sağ=grup]` biçimindeyse
   `compileFunction`, aksi halde `compileValue`.
6. **`compileValue`** — tek elemanlıysa `compileSingleValue`; değilse sırayla
   `compileAssignment` → `compileTernary` → `compileCalculation`.
7. **`compileCalculation`** — klasik öncelik indirgemesi: işleç konumları bulunur,
   en yüksek öncelikli işleç seçilip `Calculation` düğümüne indirgenir; liste tek
   değere inene kadar tekrarlanır. `=` işleci görülürse `compileAssignment`'a düşer.
8. **`compileFunction`**
   - Ad `!` ile başlıyorsa: yalnız `!` ise `BooleanNegate(ilk argüman)`;
     `!foo(...)` ise `foo` derlenip `BooleanNegate` ile sarılır.
   - Ad `-` ile başlıyorsa: yalnız `-` ise `Negative(ilk argüman)`;
     `-foo(...)` ise `foo` derlenip `Negative` ile sarılır.
   - Kayıtlı değilse `Optional.empty()`.
9. **`compileSingleValue`** (`lambda$compileSingleValue$0`) tek sembolü şu sırayla dener:
   `!` öneki → sayısal sabit (`NUMERIC_FORMAT`) → `-` öneki soyulur →
   değişken mi (`isLikelyVariable`) → argümansız fonksiyon mu (`math.pi` gibi) →
   hiçbiri değilse `null`.

---

## 4. Değişkenler / query'ler

### Desteklenen önekler

- **`query.`** — tanınan ve önceden kayıtlı önek.
- **`q.`** — `query.` için **gerçek takma ad**. `MolangQueries.getVariableFor`
  içindeki `applyPrefixAliases(name, "query.", "q.")` çağrısı `q.` önekini
  `query.` ile değiştirir; `q.anim_time` ile `query.anim_time` **aynı**
  `Variable` nesnesine gider.
- **Diğer her önek** — `variable.`, `v.`, `temp.`, `t.` dahil **özel muamele
  görmez**. Hiçbir takma ad veya ön kayıt yok; JAR'ın tamamında `variable.` /
  `temp.` / `v.` dizgisi geçmiyor.
  Bunun yerine `VARIABLE_FORMAT` = `^[a-z_]+(\.\w+)+$` deseni bu adları
  **serbest değişken** olarak kabul eder ve `VARIABLES` haritasında
  `computeIfAbsent` ile **varsayılan değeri 0.0 olan** yeni bir `Variable`
  oluşturulur.
  **Sonuç (önemli):** `variable.foo` ile `v.foo` GeckoLib'de **aynı değişken
  değildir** — iki ayrı `Variable` olur. Bedrock'ta bunlar eşdeğerdir; burada
  değil. Aynı şey `temp.` / `t.` için de geçerli. Değer atanmadıkça hepsi 0 döner.
- Bir adın değişken sayılabilmesi için ayrıca **kayıtlı bir fonksiyon adı
  olmaması** ve **bir işleç olmaması** gerekir (`isLikelyVariable`).

### Tanınan `query.*` adları (82 adet)

Hepsi `MolangQueries` sınıfında `public static final String` sabiti olarak da
duruyor. Değerleri `MolangQueries.ACTOR_VARIABLES` üzerinden, animasyonu
çalıştıran nesnenin (`Actor`) tipine göre doldurulur; tipe uymayan bir query
kullanılırsa `Variable.get` istisnayı yakalar, hata loglar ve 0 döner.

**Genel (14)** — her animatable için:
`query.actor_count` `query.anim_time` `query.controller_speed`
`query.cardinal_player_facing` `query.day` `query.frame_alpha` `query.has_cape`
`query.is_first_person` `query.life_time` `query.moon_brightness`
`query.moon_phase` `query.player_level` `query.time_of_day` `query.time_stamp`

**BlockEntity (1)**: `query.block_state`

**Entity (38)**:
`query.body_x_rotation` `query.body_y_rotation` `query.cardinal_facing`
`query.cardinal_facing_2d` `query.distance_from_camera` `query.get_actor_info_id`
`query.equipment_count` `query.has_collision` `query.has_gravity` `query.has_owner`
`query.has_player_rider` `query.has_rider` `query.is_alive` `query.is_angry`
`query.is_breathing` `query.is_fire_immune` `query.is_invisible`
`query.is_in_contact_with_water` `query.is_in_lava` `query.is_in_water`
`query.is_in_water_or_rain` `query.is_leashed` `query.is_moving` `query.is_on_fire`
`query.is_on_ground` `query.is_riding` `query.is_saddled` `query.is_silent`
`query.is_sneaking` `query.is_sprinting` `query.is_swimming`
`query.movement_direction` `query.rider_body_x_rotation` `query.rider_body_y_rotation`
`query.rider_head_x_rotation` `query.rider_head_y_rotation` `query.vertical_speed`
`query.yaw_speed`

**LivingEntity (20)**:
`query.blocking` `query.death_ticks` `query.ground_speed` `query.has_head_gear`
`query.head_x_rotation` `query.head_y_rotation` `query.health` `query.hurt_time`
`query.invulnerable_ticks` `query.is_baby` `query.is_sleeping` `query.is_using_item`
`query.is_wall_climbing` `query.limb_swing` `query.limb_swing_amount`
`query.main_hand_item_max_duration` `query.main_hand_item_use_duration`
`query.max_health` `query.scale` `query.sleep_rotation`

**Mob (4)**: `query.can_climb` `query.can_fly` `query.can_swim` `query.can_walk`

**Item (5)**: `query.is_enchanted` `query.is_stackable` `query.item_max_use_duration`
`query.max_durability` `query.remaining_durability`

### Dışarıdan değişken tanımlama

- `MathParser.registerVariable(Variable)` / `MathParser.setVariable(String, ToDoubleFunction)`
- `MolangQueries.setVariableValue(String, double)` ve
  `MolangQueries.setVariableFunction(String, ToDoubleFunction)` — bir **actor
  query**'sinin üzerine yazmaya çalışırsa
  `IllegalArgumentException: "Cannot replace actor variables"` atar.
- `MolangQueries.setActorVariable(String, ToDoubleFunction<Actor<T>>)` — actor
  bağlamlı query eklemek için.

---

## 5. Ayrıştırma hataları (bytecode'daki dizgi sabitleri)

Hepsi `com.geckolib.object.CompoundException` ile atılır (aksi belirtilmedikçe);
`<...>` yerine ilgili ifade metni geçer.

| Mesaj | Nerede / ne zaman |
|---|---|
| `Invalid characters found in expression: '<ifade>'` | `compileMolang` — ifade `EXPRESSION_FORMAT` desenine uymuyor |
| `Closing parenthesis before opening parenthesis in expression '<ifade>'` | `decomposeExpression` — `)` fazlası `(` öncesinde |
| `Closing curly brace before opening curly brace in expression '<ifade>'` | `decomposeExpression` — `}` fazlası |
| `Uneven parenthesis in expression, each opening brace must have a pairing close brace '<ifade>'` | `decomposeExpression` — parantezler dengesiz |
| `Uneven curly braces in expression, each opening brace must have a pairing close brace '<ifade>'` | `decomposeExpression` — süslü parantezler dengesiz |
| `Failed to parse expression '<ifade>'` | `compileExpression` — alttaki `CompoundException`'a eklenen sarmalayıcı mesaj |
| `Found empty expression group` | `compileSingleValue` — `()` boş grup |
| `Found expression group with more than one variable? '<grup>'` | `compileSingleValue` — parantez içinde birden çok değer kalmış (virgülle ayrılmış ama fonksiyon çağrısı değil) |
| `Found empty expression group '!()'` | `compileFunction` — `!()` |
| `Found empty expression group '-()'` | `compileFunction` — `-()` |
| `Attempted to assign a value to a non-variable` | `compileAssignment` — `=` solundaki şey `Variable` değil |
| `Invalidly formatted expression: <liste>` | `compileCalculation` — indirgeme sonunda tek değer kalmadı |
| `Unknown operator symbol '<sembol>'` | `getOperatorFor` — `Operator` kayıtlarında yok |
| `Unable to parse compiled symbols from expression: <liste>` | `parseSymbols` — `compileValue` boş döndü |
| `Unable to parse function '<ad>' with arguments: <argümanlar>` | `parseSymbols` — `compileFunction` boş döndü |
| `Invalid math function arguments provided in Molang expression '<ad>'` | `buildFunction` — fabrikadan `IllegalArgumentException` geldi (genelde eksik argüman) |
| `Function '%s' at least %s arguments. Only %s given!` | `MathFunction.validate` — **`IllegalArgumentException`**. Cümle bozuk ("requires" eksik), kaynakta böyle |
| `Attempted to use Molang variable for incompatible animatable type ({}). An animation json needs to be fixed` | `Variable.get` — çalışma zamanı hatası; istisna yutulur, `0` döner |
| `Duplicate registration of MathFunction: '{}'. Ignore if intentional override` | `registerFunction` — WARN log, hata değil |
| `Cannot replace actor variables` | `MolangQueries.setVariableValue` / `setVariableFunction` — `IllegalArgumentException` |

### İlgili düzenli ifadeler

| Sabit | Desen | Kullanım |
|---|---|---|
| `EXPRESSION_FORMAT` | `^[\w\s_+-/*%^&\|<>=!?:;.,(){}]+$` | İfadenin tamamında izinli karakter kümesi |
| `WHITESPACE` | `\s` | Ayrıştırmadan önce tüm boşluklar silinir |
| `NUMERIC_FORMAT` | `^-?(\d+(\.\d+)?\|\.\d+)$` | Sayısal sabit tanıma. **Bilimsel gösterim (`1e-5`) desteklenmiyor** |
| `VARIABLE_FORMAT` | `^[a-z_]+(\.\w+)+$` | Serbest değişken adı tanıma |

---

## 6. Ek notlar

- **Deduplicator** (`MathParser$Deduplicator`): `MathParser.create()` bunu `NONE`
  ile kurar (önbelleksiz), `MathParser.createWithDeduplication()` ise
  `defaultImpl()` ile — sabitler ve tüm ifade metinleri `ConcurrentHashMap`
  içinde paylaşılır, aynı MoLang dizgisi ikinci kez derlenmez.
- `compileDoubleOrString(DoubleOrString)`: animasyon JSON'undaki bir keyframe
  değeri sayı ise doğrudan `Constant`, dizgi ise `compileMolang`'a gider.
  Bedrock animasyon dosyalarında MoLang'in girdiği yer burası.
- **`{}` süslü parantezler yalnız denge açısından denetleniyor.** `compileSymbols`
  içinde `{`/`}` için hiçbir işleme yok, yani süslü parantezli MoLang blokları
  (Bedrock'taki `{ ... }` gövdeleri) desteklenmiyor — karakterler ifadeye aynen
  gömülür ve büyük olasılıkla değişken adı sanılır.
  **ŞÜPHELİ**: bunun bilinçli bir sınırlama mı yoksa eksiklik mi olduğu
  bytecode'dan anlaşılmıyor.
- `MathValue.collectUsedVariables(...)` ile her düğüm hangi değişkenleri
  kullandığını bilir; `MolangQueries.buildActorVariables` her karede yalnızca
  **gerçekten kullanılan** query'leri hesaplar.
