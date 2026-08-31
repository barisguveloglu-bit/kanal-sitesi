# Max Steel: yetenek ağacı ve alınmayan modlar

Kaynak: `ionstrike` v1.0.0 (Bionic), Palladium eklentisi. Bütün sayılar
`data/ionstrike/palladium/powers/*.json`'dan **ölçüldü**, hiçbiri hafızadan yazılmadı.

## Ağaç: kaynakta nasıl

Bütün güçler `gui_display_type: "tree"`. Kök `base_mode`; diğer modlar oradan,
**kendi çekirdeği ödenerek** açılıyor (`palladium:item_buyable`).

| düğüm | bedel |
|---|---|
| `turbo_bike` | **40 XP kademesi** |
| `heat_mode` | `heat_core` ×1 |
| `size_mode` | `shrink_core` ×1 |
| `titan_mode` | `titan_core` ×1 |
| `strength_mode` | `strength_core` ×1 |
| `speed_mode` | `speed_core` ×1 |
| `recon_mode` | `recon_core` ×1 |
| `clone_mode` | `clone_core` ×1 |
| `cannon_mode` | `cannon_core` ×1 |
| `stealth_mode` | `stealth_core` ×1 |
| `scuba_mode` | `hydro_core` ×1 |
| `flight_mode` | `flight_core` ×1 |
| `mode_select` | **30 XP kademesi** |
| `camo_mode` | `memory_core` ×1 |

`base_mode` satın alınacak bir düğüm **değil** — ağacın kendisi. Bizde de
Temel baştan açık.

## Alınmayan modlarda gerçekten ne var

Kullanıcı sordu: *"bunların hangisinde özellik var? Mod hepsinde birer birer
özellik olmaz değil mi?"* — haklıydı. Görsel yetenekler (`render_layer`,
`hide_body_part`, `name_change`, `animation_timer`, `trail`) ayıklandı; aşağıda
yalnızca **gerçek** olanlar var.

### `super_mode` — Super Mode

- `kb_resist` knockback_resistance +10
- `kb` attack_knockback +4
- `strength` attack_damage +10
- `splode_immune` bağışıklık: is_explosion, is_fall
- `flight_style` palladium:heroic_flight_type +1
- `laser_eyes` **ışın 15 hasar / 30 blok**
- `armor_toughness` armor_toughness +20
- `armour` armor +40

### `hydroheat` — Hydro Heat Mode

- `armor_toughness` armor_toughness +15
- `armour` armor +25
- `fire_proofing` bağışıklık: is_fire, is_freezing
- `fire_beam` **ışın 15 hasar / 30 blok** · 5 sn yakma
- `ice_beam` **ışın 20 hasar / 30 blok**
- `aim` nişan

### `strength_stealth` — Strength Mode

- `camo` görünmezlik
- `armor_toughness` armor_toughness +15
- `armour` armor +30
- `strength_boots` palladium:fall_resistance +100
- `strength_damage` attack_damage +15
- `strength_defence` armor +20

### `flight_stealth` — Flight mode

- `camo` görünmezlik
- `immunities2` bağışıklık: oxygen
- `toughlungs` uzay nefesi
- `freeze_immunity` bağışıklık: is_freezing, oxygen
- `splode_immune` bağışıklık: is_explosion, is_fall
- `armor_toughness` armor_toughness +15
- `armour` armor +20

### `ion_power` — Takonian

- `laser_aim` nişan
- `ion_blast` **ışın 5 hasar / 30 blok**

### `scuba_flight` — Scuba Flight mode

- `swim` forge:swim_speed +5
- `armor_toughness` armor_toughness +15
- `armour` armor +20
- `fall_immunity` palladium:fall_resistance +200

### `scuba_stealth` — Scuba Stealth mode

- `camo` görünmezlik
- `swim` forge:swim_speed +5
- `armor_toughness` armor_toughness +15
- `armour` armor +20

### `size_mode` — Size Mode

- `armor_toughness` armor_toughness +15
- `armour` armor +20
- `fall_immunity` palladium:fall_resistance +100

### `nova` — Nova Ring

- `fu_catcher` bağışıklık: is_lightning
- `freeze_immunity` bağışıklık: is_freezing, oxygen
- `immunities2` bağışıklık: oxygen
- `toughlungs` uzay nefesi

### `clone_mode` — Clone mode

- `armor_toughness` armor_toughness +15
- `armour` armor +20

### `cannon_mode` — Cannon mode

- `damage_immunities` bağışıklık: is_lightning, is_fall, is_projectile, is_explosion
- `armor_toughness` armor_toughness +20
- `armour` armor +40

### `turbo_lash` — Turbo Lash

- `Whip_beam` **ışın 5 hasar / 30 blok**

### `camo_mode` — Camo Mode

**Gerçek özellik yok.** Alınmadı.

### `turbo_sword` — Steeless Sword

**Gerçek özellik yok.** Alınmadı.

### `steeless_sword` — Steeless Sword

**Gerçek özellik yok.** Alınmadı.

