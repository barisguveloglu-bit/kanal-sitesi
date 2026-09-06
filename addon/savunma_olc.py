# -*- coding: utf-8 -*-
"""SAVUNMA KAPSAMI OLCUMU.                              v7.38

Kullanici sordu: "savunmamiz yuzde kac ve ne kadar artti?"

Bu dosya o soruyu TAHMIN ETMEDEN cevapliyor. Sayilar buradaki
tablodan cikiyor, tablo da gonderilen dort APK'nin KENDI ayar
ve modul listesinden:

    REFERANS_TOOLBOX_APK.md     (65 s_* anahtari)
    REFERANS_WDBAX_APK.md       (ayni 65)
    REFERANS_BLOODY_APK.md      (ayni 65)
    REFERANS_WCLIENT_APK.md     (vekil, ayri modul listesi)

---- BU YUZDE NE DEGILDIR ----
"%60 guvendesin" DEMEK DEGIL. Ozellik sayan bir olcu bu:
kacan tek bir killaura, goremedigimiz on tane HUD parcasindan
daha onemli. Agirlik yok, cunku agirligi kim verecek belli
degil -- uydurulmus bir agirlik, uydurulmus bir yuzde uretir.

O yuzden IKI sayi basiliyor:
  1. HAM KAPSAM      -- butun ozelliklere gore
  2. ENGELLENEBILIR  -- yalnizca engellenebilecek olanlara gore
Ikincisi anlamli olan. Birincisinin tavani zaten 100 degil:
goruntu ailesi bir davranis paketi icin kalici olarak
gorunmez.

---- DURUMLAR ----
  kapali   bizim kodumuz goruyor/engelliyor  (surum yaziyor)
  acik     OLCULEBILIR ama yazilmadi          -> yapilacak is
  ayirt    sunucuya geliyor ama durust oyundan ayirt edilemez
  op       operator yetkisi istiyor; kapi "op verme"
  imkansiz tamamen karsi tarafin ekraninda; asla gorulemez

Sinifladirma bir YARGI. Gizlenmesin diye her satir burada
acikca yaziyor ve tek tek tartisilabilir.

Kullanim:  python3 addon/savunma_olc.py
"""

KAPALI, ACIK, AYIRT, OP, IMKANSIZ = "kapali", "acik", "ayirt", "op", "imkansiz"

# (ad, aile, kaynak, durum, surum, not)
# kaynak: T = Toolbox ailesi (Toolbox/WDBAX/Bloody -- ucu ayni)
#         W = WClient (vekil)
#         M = Toolbox For Turkey / io.mrarm.mctoolbox (enjektor)
#         F = FerSReD Client / ToolMcFSRD (M'nin Turkce yeniden
#             markalamasi, ayni enjektor, COK DAHA BUYUK menu)
#         Harfler birlesebilir: "TW", "TM", "TWM"...
#
# ---- M NEDEN AYRI BIR HARF  (v7.46) ----
# Oteki dordu OYUNU YERINE KOYAN istemciler ya da paket vekili.
# Bu ise gercek Minecraft'i KENDI SURECINDE baslatip yamalayan
# bir enjektor (io.mrarm.mctoolbox, libtoolbox-1.19.51.01.so).
# Ozellik listesi buyuk olcude ortusuyor ama dagitim yolu
# bambaska; kaynagi karistirmamak icin kendi harfi var.
#
# ---- K NEDEN AYRI BIR HARF  (v7.49) ----
# Otekilerin hepsi bir PROGRAM: apk, enjektor ya da vekil.
# K bir program degil, elden ele dolasan KOMUT DOSYALARI --
# .txt icinde /effect, /replaceitem, /playanimation satirlari.
# Kurulum istemiyor, sohbete yapistiriliyor. Ozellik listesi
# cok daha kucuk ama tam da bu yuzden en yaygin olani:
# indirilecek bir sey yok.
OZELLIKLER = [
    # ---------------- DOVUS ----------------
    ("anti_knockback",   "dovus", "TWMF", KAPALI, "7.31", "geri itme denetimi"),
    ("killaura",         "dovus", "TWMF", KAPALI, "7.30", "menzil + bakis acisi + CPS"),
    ("reach / hitbox_expand", "dovus", "TWMF", KAPALI, "7.30", "vurus aninda mesafe"),
    ("tp_to_player",     "dovus", "TWF", KAPALI, "7.30", "isinlanma sicramasi"),
    ("packets_per_attack", "dovus", "W", KAPALI, "7.38", "ayni tick + ayni kurban"),
    ("auto_armor",       "dovus", "TMF",  AYIRT, "", "envanter otomasyonu"),
    ("auto_bow",         "dovus", "TMF",  AYIRT, "", "envanter otomasyonu"),
    ("switcher",         "dovus", "TWMF", AYIRT, "", "envanter otomasyonu"),
    ("auto_totem",       "dovus", "W",  AYIRT, "", "envanter otomasyonu"),
    ("auto_crystal",     "dovus", "W",  ACIK, "", "koyma+vurma hizi olculebilir"),

    # ---------------- HAREKET ----------------
    ("flying",           "hareket", "TWMF", KAPALI, "7.30", "kesintisiz yukselme"),
    # v7.46: suzulme eskiden TOPTAN muaf idi -- elytra takan biri
    # butun hareket denetimlerini kapatiyordu. Artik roketsiz
    # tirmanis olculuyor, gerisi hala muaf (gercek suzulme
    # roketle 30+ blok/sn yapar).
    ("elytra_fly",       "hareket", "MF",  KAPALI, "7.46",
     "suzulurken roketsiz surekli yukselme"),
    ("speed",            "hareket", "TWF", KAPALI, "7.30", "yatay hiz"),
    ("high_jump",        "hareket", "TWF", KAPALI, "7.30", "yukselme"),
    ("air_jump",         "hareket", "TWMF", KAPALI, "7.30", "yukselme"),
    ("tap_teleport",     "hareket", "TW", KAPALI, "7.30", "isinlanma"),
    ("vanilla_fly_bypass", "hareket", "T", KAPALI, "7.30", "ucus olcumu"),
    ("no_clip",          "hareket", "TWMF", KAPALI, "7.38", "kati blok icinde"),
    ("phase",            "hareket", "TWMF", KAPALI, "7.38", "kati blok icinde"),
    ("tpmine",           "hareket", "W",  KAPALI, "7.38", "kati blok icinde"),
    ("no_fall",          "hareket", "TF", KAPALI, "7.47",
     "esik ustu dusus + can azalmadi"),
    ("jesus",            "hareket", "TF",  ACIK, "", "su yuzeyinde duruyor"),
    ("spider",           "hareket", "W",  ACIK, "", "duvara tirmaniyor"),
    ("anti_void",        "hareket", "W",  ACIK, "", "bosluktan geri donuyor"),
    ("blink",            "hareket", "TWMF", ACIK, "", "paket geciktirme"),
    ("slow_falling",     "hareket", "TF",  ACIK, "", "dusme hizi"),
    ("auto_sprint",      "hareket", "TWM", AYIRT, "", "insan da hep kosar"),
    ("no_slowdown",      "hareket", "T",  AYIRT, "", "istemci tarafi yavaslama"),
    ("anti_afk",         "hareket", "W",  AYIRT, "", "kucuk hareketler"),
    ("auto_walk",        "hareket", "W",  AYIRT, "", "yurumek yurumektir"),

    # ---------------- DUNYA ----------------
    ("fast_destroy",     "dunya", "TWF", KAPALI, "7.36", "blok kirma hizi"),
    ("rapid_build",      "dunya", "TWF", KAPALI, "7.36", "blok koyma hizi"),
    ("bridge_builder",   "dunya", "TWF", KAPALI, "7.36", "blok koyma hizi"),
    ("nuke",             "dunya", "TWMF", KAPALI, "7.36", "blok kirma hizi"),
    ("haste_effect / fast_miner", "dunya", "TWM", KAPALI, "7.36", "blok kirma hizi"),
    ("bloklarla hapsetme", "dunya", "TW", KAPALI, "7.36", "Kafes Kir"),
    ("gamemode_switcher", "dunya", "W", KAPALI, "7.38", "oyun kipi denetimi"),
    ("far_bypass",       "dunya", "T",  ACIK, "", "blok koyma mesafesi"),
    ("pick_distance",    "dunya", "T",  ACIK, "", "blok koyma mesafesi"),
    ("chest_stealer",    "dunya", "TWF", AYIRT, "", "normal sandik etkilesimi"),
    ("give_item",        "dunya", "T",  OP, "", "sunucu izin vermeli"),
    ("enchant",          "dunya", "TM",  OP, "", "sunucu izin vermeli"),
    ("nbt_editor",       "dunya", "TMF",  OP, "", "sunucu izin vermeli"),
    ("spawn_exp",        "dunya", "TMF",  OP, "", "sunucu izin vermeli"),

    # ---------------- KOMUT / KILIT (Arinma ailesi) ----------------
    ("komutla poz/girdi/kamera kilidi", "komut", "TW", KAPALI, "7.28", "Arinma"),
    ("dongu halinde kilit", "komut", "TW", KAPALI, "7.29", "Savunma Kipi"),
    ("ekrani title duvariyla kapatma", "komut", "TW", KAPALI, "7.35", "Arinma"),
    ("ses bombasi", "komut", "TW", KAPALI, "7.35", "Arinma"),
    ("sis (/fog push)", "komut", "TW", KAPALI, "7.35", "Arinma"),
    ("envanteri /clear ile silme", "komut", "TW", KAPALI, "7.30", "Envanter Yedegi"),
    ("item_lock ile zorla esya takma", "komut", "TWK", KAPALI, "7.49",
     "Arinma -- kilit sokme"),
    ("/kill · /damage · /summon", "komut", "TW", OP, "", "sunucu izin vermeli"),

    # ---------------- CESITLI ----------------
    ("auto_disconnect",  "cesitli", "W", KAPALI, "7.38", "kacis denetimi (bildirim)"),
    ("fake_death",       "cesitli", "W", ACIK, "", "can/olum tutarsizligi"),
    ("spammer",          "cesitli", "W", ACIK, "", "sohbet hizi"),
    ("disabler",         "cesitli", "W", ACIK, "", "paket dusurme"),
    ("desync",           "cesitli", "W", ACIK, "", "konum bayatlatma"),
    ("ping_spoof",       "cesitli", "W", ACIK, "", "paket kuyrugu"),
    ("inventory_helper", "cesitli", "W", AYIRT, "", "envanter otomasyonu"),
    ("fast_drop",        "cesitli", "W", AYIRT, "", "envanter otomasyonu"),
    ("chat_suffix",      "cesitli", "W", AYIRT, "", "sadece metin"),
    ("force_achievements", "cesitli", "T", IMKANSIZ, "", "istemci tarafi"),
    ("name_override",    "cesitli", "T", IMKANSIZ, "", "istemci tarafi"),
    ("fake_xp",          "cesitli", "W", IMKANSIZ, "", "istemci tarafi"),
    ("totem_pop_counter", "cesitli", "W", IMKANSIZ, "", "sadece sayac"),

    # ---- FerSReD Client'in getirdigi yeni maddeler (v7.47) ----
    # Menusu M'ninkinin iki kati; asagidakiler oteki bes dosyanin
    # hicbirinde yoktu.
    ("auto_glide",       "hareket", "F",  ACIK, "",
     "suzulme baslatma otomasyonu -- elytra_fly olcumune giriyor"),
    ("touch_teleport",   "hareket", "F",  KAPALI, "7.30",
     "isinlanma sicramasi"),
    ("no_bow_slowdown",  "dovus", "F",  AYIRT, "",
     "yay cekerken yavaslamamak; insan da hep kosar gibi"),
    ("reach_fix",        "dovus", "F",  KAPALI, "7.30",
     "menzil zaten olculuyor"),
    ("auto_pickup",      "dunya", "F",  AYIRT, "", "envanter otomasyonu"),
    ("achievement_forcer", "dunya", "F", OP, "", "sunucu izin vermeli"),
    ("command_mode",     "dunya", "F",  OP, "", "operator yetkisi istiyor"),
    ("fake_name",        "goruntu", "F", IMKANSIZ, "",
     "ad Xbox hesabindan geliyor; istemci kendi ekraninda degistirir"),

    # ---------------- GORUNTU (tamami imkansiz) ----------------
    ("xray",             "goruntu", "TWMF", IMKANSIZ, "", "sunucuya hicbir sey gitmiyor"),
    ("xray_block_tracker", "goruntu", "TMF", IMKANSIZ, "", ""),
    ("xray_chest_esp / chest_esp", "goruntu", "TWMF", IMKANSIZ, "", ""),
    ("xray_player_esp / esp", "goruntu", "TWMF", IMKANSIZ, "", ""),
    ("block_esp",        "goruntu", "W",  IMKANSIZ, "", ""),
    ("tracers",          "goruntu", "TW", IMKANSIZ, "", ""),
    ("minimap",          "goruntu", "TWMF", IMKANSIZ, "", ""),
    ("freecam",          "goruntu", "TWMF", IMKANSIZ, "", ""),
    ("health_display",   "goruntu", "F",  IMKANSIZ, "", ""),
    ("armor_hud",        "goruntu", "F",  IMKANSIZ, "", ""),
    ("entity_outline",   "goruntu", "F",  IMKANSIZ, "", ""),
    ("nametag_cut",      "goruntu", "F",  IMKANSIZ, "", ""),
    ("mob_color",        "goruntu", "F",  IMKANSIZ, "", ""),
    ("fullbright",       "goruntu", "TWMF", IMKANSIZ, "", ""),
    ("zoom",             "goruntu", "TWMF", IMKANSIZ, "", ""),
    ("hp_bars",          "goruntu", "TW", IMKANSIZ, "", ""),
    ("armor_hud / armor_esp", "goruntu", "TW", IMKANSIZ, "", ""),
    ("outline_renderer", "goruntu", "T",  IMKANSIZ, "", ""),
    ("nametags",         "goruntu", "W",  IMKANSIZ, "", ""),
    ("crosshair / hit marker", "goruntu", "W", IMKANSIZ, "", ""),
    ("speed_display · network_info · coords_hud", "goruntu", "W", IMKANSIZ, "", ""),
    ("mod_alert",        "goruntu", "W",  IMKANSIZ, "", ""),
    ("stash_finder",     "goruntu", "W",  IMKANSIZ, "", "chunk taramasi, ekranda"),
    ("chunk_finder",     "goruntu", "W",  IMKANSIZ, "", "chunk taramasi, ekranda"),
    ("anti_debuff",      "goruntu", "W",  IMKANSIZ, "", "sunucuda etki duruyor, iz yok"),
    ("effect_spoof · time_shift · weather", "goruntu", "W", IMKANSIZ, "", ""),
    ("particles",        "goruntu", "W",  IMKANSIZ, "", ""),
]

# Savunmanin yazildigi surumler, sirayla.
SURUMLER = ["7.27", "7.28", "7.29", "7.30", "7.31", "7.35", "7.36", "7.38",
            "7.46", "7.47", "7.49"]


def surum_no(s):
    a, b = s.split(".")
    return (int(a), int(b))


def kapsam(surum):
    """Verilen surumde kac ozellik kapali."""
    n = surum_no(surum)
    return sum(1 for o in OZELLIKLER
               if o[3] == KAPALI and surum_no(o[4]) <= n)


def say(kosul):
    return sum(1 for o in OZELLIKLER if kosul(o))


if __name__ == "__main__":
    toplam = len(OZELLIKLER)
    imkansiz = say(lambda o: o[3] == IMKANSIZ)
    ayirt = say(lambda o: o[3] == AYIRT)
    op = say(lambda o: o[3] == OP)
    acik = say(lambda o: o[3] == ACIK)
    kapali = say(lambda o: o[3] == KAPALI)
    # ENGELLENEBILIR = bizim kodumuzun gorebilecegi kume.
    # imkansiz, ayirt-edilemez ve op ailesi disarida: ucu de
    # bir davranis paketinin yazabilecegi bir sey degil.
    engellenebilir = kapali + acik

    print("=== OZELLIK SAYIMI (ALTI APK ve KOMUT DOSYALARI) ===")
    print("  toplam ozellik            %3d" % toplam)
    print("  kapali (bizde karsiligi)  %3d" % kapali)
    print("  acik   (olculebilir, yok) %3d" % acik)
    print("  ayirt  (ayirt edilemez)   %3d" % ayirt)
    print("  op     (operator kapisi)  %3d" % op)
    print("  imkansiz (ekran tarafi)   %3d" % imkansiz)
    print()
    print("=== KAPSAM ===")
    print("  HAM      : %d/%d = %%%.0f" % (kapali, toplam, 100.0 * kapali / toplam))
    print("  ENGELLENEBILIR: %d/%d = %%%.0f"
          % (kapali, engellenebilir, 100.0 * kapali / engellenebilir))
    print()
    print("  Ham kapsamin tavani %d degil: goruntu ailesi (%d ozellik),"
          % (100, imkansiz))
    print("  ayirt edilemeyenler (%d) ve op ailesi (%d) bir davranis" % (ayirt, op))
    print("  paketinin ulasabilecegi yerde degil. Tavan %%%.0f."
          % (100.0 * engellenebilir / toplam))
    print()
    print("=== SURUME GORE ARTIS ===")
    print("  surum   kapali   ham    engellenebilir   o surumde eklenen")
    onceki = 0
    for s in SURUMLER:
        k = kapsam(s)
        eklenen = [o[0] for o in OZELLIKLER if o[3] == KAPALI and o[4] == s]
        print("  v%-6s %3d    %%%-4.0f  %%%-14.0f %s"
              % (s, k, 100.0 * k / toplam, 100.0 * k / engellenebilir,
                 (", ".join(eklenen[:3]) + ("…" if len(eklenen) > 3 else ""))
                 if eklenen else "-"))
        onceki = k
    print()
    print("=== KAYNAGA GORE  (T = Toolbox ailesi, W = WClient,")
    print("                    M = Toolbox For Turkey, F = FerSReD,")
    print("                    K = elden ele komut dosyalari) ===")
    for etiket, kosul in (
        ("Toolbox ailesi (MH_TEAM_V5 · WDBAX · BloodyClient)",
         lambda o: "T" in o[2]),
        ("WClient (vekil)", lambda o: "W" in o[2]),
        ("Toolbox For Turkey (enjektor)", lambda o: "M" in o[2]),
        ("FerSReD Client (ToolMcFSRD)", lambda o: "F" in o[2]),
        ("Komut dosyalari (elden ele .txt)", lambda o: "K" in o[2]),
    ):
        alt = [o for o in OZELLIKLER if kosul(o)]
        a_kapali = sum(1 for o in alt if o[3] == KAPALI)
        a_acik = sum(1 for o in alt if o[3] == ACIK)
        a_imk = sum(1 for o in alt if o[3] == IMKANSIZ)
        a_ayirt = sum(1 for o in alt if o[3] == AYIRT)
        a_op = sum(1 for o in alt if o[3] == OP)
        a_eng = a_kapali + a_acik
        print("  %s" % etiket)
        print("    toplam %d · kapali %d · acik %d · ayirt %d · op %d · imkansiz %d"
              % (len(alt), a_kapali, a_acik, a_ayirt, a_op, a_imk))
        print("    ham %%%.0f   engellenebilir %%%.0f"
              % (100.0 * a_kapali / len(alt), 100.0 * a_kapali / a_eng))
    print()
    print("=== ACIK KALANLAR (olculebilir ama yazilmadi) ===")
    for o in OZELLIKLER:
        if o[3] == ACIK:
            print("  %-22s %s" % (o[0], o[5]))
