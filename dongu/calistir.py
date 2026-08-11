#!/usr/bin/env python3
"""
Beş halkalı döngünün çalışan gösterimi.

    python3 calistir.py                    # sahte motor, konsoldan onay
    python3 calistir.py --otomatik         # hiç sormadan koş (insan kapısı kapalı)
    python3 calistir.py --motor claude     # gerçek Claude (ANTHROPIC_API_KEY gerekir)
    python3 calistir.py --hedef "..."      # kendi hedefin

Sahte motorla koşarsan senaryo şu üç kenarın hepsini tetikler:
  1. eksik dosya  → ReAct gözlemi planı yeniden yazdırır
  2. eksik bölüm  → yansıtma reddeder, yönetici yeniden görev verir
  3. dosya silme  → geri alınamaz eylem, insan kapısı
  4. kapanış özeti eksik → yönetici birleştirmede yeni görev üretir
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

from cekirdek.araclar import dosya_araclari
from cekirdek.insan import Esikler, Kapi, Karar, KonsolKapisi, OtomatikKapi
from cekirdek.motor import MotorHatasi, motor_sec
from cekirdek.olaylar import OlayGunlugu
from cekirdek.uzmanlar import Yonetici, ornek_kadro, ozet_dosyasi_oragi
from cekirdek.yansitma import Yansitici, bos_olmasin, dosya_bolumleri, yasakli_ifadeler
from cekirdek.yurutucu import Yurutucu

VARSAYILAN_HEDEF = (
    "Ölçüm verisinden Bulgular ve Yöntem bölümleri olan bir rapor üret, "
    "sonra geçici dosyaları temizle."
)

DOLDURMA_IFADELERI = ("yakında", "todo", "lorem ipsum", "örnek metin", "buraya yazılacak")


def dongu_kur(calisma_dizini: Path, esikler: Esikler, kapi_secimi, motor_secimi=None):
    """Beş katmanı kablolayıp yürütücüyü döndürür."""
    gunluk = OlayGunlugu()
    motor = motor_sec(motor_secimi)
    araclar = dosya_araclari(calisma_dizini)

    # --- Katman 3: oraklar ---------------------------------------------
    # Genel oraklar her adıma; özel oraklar yalnız ilgili adıma koşar.
    # Maliyeti çarpmamak için bilinçli olarak dar tutuluyor.
    yansitici = Yansitici(gunluk)
    yansitici.ekle(bos_olmasin())
    yansitici.ekle(yasakli_ifadeler(DOLDURMA_IFADELERI))
    yansitici.ekle(
        dosya_bolumleri(calisma_dizini / "rapor.md", ("## Bulgular", "## Yöntem")),
        adim_kimligi="rapor-yaz",
    )

    # --- Katman 4: eşikler + kapı ---------------------------------------
    kapi = Kapi(esikler, kapi_secimi, gunluk)

    # --- Katman 1.5: yönetici + uzman kadrosu ---------------------------
    yonetici = Yonetici(
        ornek_kadro(), gunluk, birlestirme_oraklari=[ozet_dosyasi_oragi(calisma_dizini)]
    )

    return Yurutucu(motor, araclar, yansitici, kapi, yonetici, gunluk), gunluk, motor


def main(argv: list[str] | None = None) -> int:
    ayristirici = argparse.ArgumentParser(description="Beş halkalı ajan döngüsü")
    ayristirici.add_argument("--hedef", default=VARSAYILAN_HEDEF)
    ayristirici.add_argument(
        "--motor", choices=("sahte", "claude"), default=None, help="varsayılan: otomatik seç"
    )
    ayristirici.add_argument(
        "--otomatik", action="store_true", help="insan kapısını kapat (gözetimsiz koşu)"
    )
    ayristirici.add_argument("--dizin", default="calisma", help="çalışma dizini")
    ayristirici.add_argument("--temizle", action="store_true", help="çalışma dizinini önce sil")
    ayristirici.add_argument("--plan-kaydet", default=None, help="bitince planı JSON olarak yaz")
    secenekler = ayristirici.parse_args(argv)

    calisma = Path(__file__).parent / secenekler.dizin
    if secenekler.temizle and calisma.exists():
        shutil.rmtree(calisma)

    esikler = Esikler()
    if secenekler.otomatik:
        kapi_secimi = OtomatikKapi(Karar.ONAY)
        print("⚠  Gözetimsiz kip: insan kapısı her şeyi onaylıyor.\n")
    else:
        kapi_secimi = KonsolKapisi()

    try:
        yurutucu, gunluk, motor = dongu_kur(calisma, esikler, kapi_secimi, secenekler.motor)
    except MotorHatasi as hata:
        print(f"Motor kurulamadı: {hata}", file=sys.stderr)
        return 2

    print(f"Motor: {getattr(motor, 'ad', motor.__class__.__name__)}")
    print(f"Çalışma dizini: {calisma}")
    print(f"Hedef: {secenekler.hedef}\n")
    print("=" * 68)

    sonuc = yurutucu.calistir(secenekler.hedef)

    print("=" * 68)
    print(sonuc.plan.ozet())
    print()
    if sonuc.durduruldu:
        print(f"⏹  Koşu durduruldu: {sonuc.sebep}")
    elif sonuc.basarili:
        print("✔  Koşu başarıyla bitti.")
    else:
        print("✘  Koşu bitti ama bazı adımlar başarısız.")

    print("\nÖlçümler:")
    for anahtar, deger in sonuc.istatistik.items():
        print(f"  {anahtar:24} {deger}")

    if secenekler.plan_kaydet:
        sonuc.plan.kaydet(secenekler.plan_kaydet)
        print(f"\nPlan yazıldı: {secenekler.plan_kaydet}")

    return 0 if sonuc.basarili else 1


if __name__ == "__main__":
    raise SystemExit(main())
