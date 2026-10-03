"""Codex girişini gerçek çekirdek ve bozulmuş geçici depolarla sına."""

import importlib.util
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

KOK = Path(__file__).resolve().parents[1]


class EchoSinavi(unittest.TestCase):
    def setUp(self):
        self.gecici = tempfile.TemporaryDirectory()
        self.addCleanup(self.gecici.cleanup)
        self.kok = Path(self.gecici.name) / "depo"
        shutil.copytree(KOK, self.kok, ignore=shutil.ignore_patterns(
            ".git", "__pycache__", "*-durumu.json", "pano.jsonl", "olay-defteri.jsonl"))
        self.ortam = os.environ.copy()
        for ad in ("OPENAI_API_KEY", "ANTHROPIC_API_KEY", "CLAUDE_CODE_SESSION_ID",
                   "ECHO_SESSION_ID", "CODEX_THREAD_ID", "CI", "ECHO_KAPALI"):
            self.ortam.pop(ad, None)
        self.ortam["CLAUDE_PROJECT_DIR"] = "/olmayan-claude-projesi"
        for arg in (("init", "-q"), ("add", "."),
                    ("-c", "user.name=Test", "-c", "user.email=test@example.invalid",
                     "commit", "-qm", "test tabanı")):
            subprocess.run(["git", *arg], cwd=self.kok, check=True,
                           stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

    def kos(self, *arg, ortam=None):
        # Başka çalışma dizininden de doğru depoyu seçmeli.
        return subprocess.run([sys.executable, str(self.kok / "echo.py"), *arg],
                              cwd=self.gecici.name, env=ortam or self.ortam,
                              capture_output=True, text=True, timeout=90)

    def test_baslangic_claude_ortamina_bagli_degil(self):
        s = self.kos("baslat")
        self.assertEqual(s.returncode, 0, s.stdout + s.stderr)
        for metin in ("DERS DEFTERİ", "İŞ DEFTERİ", "[dogrula: 0]", "[butunluk: 0]"):
            self.assertIn(metin, s.stdout)

    def test_sessiz_olen_kapi_basari_sayilmaz(self):
        (self.kok / ".claude/butunluk.py").write_text("raise SystemExit(0)\n")
        s = self.kos("kontrol")
        self.assertEqual(s.returncode, 2, s.stdout)
        self.assertIn("[butunluk: 2]", s.stdout)

    def test_eksik_kapi_basari_sayilmaz(self):
        (self.kok / ".claude/kapi.py").unlink()
        s = self.kos("kontrol")
        self.assertEqual(s.returncode, 2)
        self.assertIn("KOŞMADI", s.stdout)

    def test_sessiz_hafiza_okuyucusu_basari_sayilmaz(self):
        (self.kok / ".claude/defter.py").write_text("raise SystemExit(0)\n")
        s = self.kos("baslat")
        self.assertEqual(s.returncode, 2)
        self.assertIn("defter beklenen özeti üretmedi", s.stdout)

    def test_ihlal_ve_insan_kapisi_ayri_kalir(self):
        yol = self.kok / ".claude/dogrula.py"
        for kod, mesaj in ((1, "1 hata, 0 geçen denetim"), (3, "İNSAN KAPISI")):
            with self.subTest(kod=kod):
                yol.write_text(f"print({mesaj!r})\nraise SystemExit({kod})\n")
                s = self.kos("kontrol")
                self.assertEqual(s.returncode, kod, s.stdout)
                self.assertIn(mesaj, s.stdout)

    def test_bozuk_arac_basari_sayilmaz(self):
        (self.kok / ".claude/ara.py").write_text("raise RuntimeError('bozuk')\n")
        s = self.kos("arac", "ara", "irade")
        self.assertEqual(s.returncode, 2)
        self.assertIn("KOŞMADI", s.stdout)

    def test_butce_bittiginde_gorev_verilmez(self):
        s = self.kos("gorev", "--rol", "canon-denetci", "--konu", "irade", "--gonder")
        self.assertEqual(s.returncode, 1, s.stdout)
        self.assertNotIn("# Codex uzman görevi", s.stdout)
        s = self.kos("arac", "butce", "ac", "--kosu", "test", "--ajan-sinir", "1")
        self.assertEqual(s.returncode, 0, s.stdout)
        arg = ("gorev", "--rol", "canon-denetci", "--konu", "irade")
        self.assertEqual(self.kos(*arg).returncode, 0)  # önizleme tüketmez
        s = self.kos(*arg, "--gonder")
        self.assertEqual(s.returncode, 0, s.stdout + s.stderr)
        self.assertIn("# Codex uzman görevi", s.stdout)
        self.assertNotIn("CLAUDE.md", s.stdout)
        s = self.kos(*arg, "--gonder")
        self.assertEqual(s.returncode, 1)
        self.assertNotIn("# Codex uzman görevi", s.stdout)

    def test_tum_roller_model_secimini_tasimaz(self):
        tanim = importlib.util.spec_from_file_location("echo_test", self.kok / "echo.py")
        echo = importlib.util.module_from_spec(tanim)
        tanim.loader.exec_module(echo)
        roller = list((self.kok / ".claude/agents").glob("*.md"))
        self.assertTrue(roller)
        for yol in roller:
            with self.subTest(rol=yol.stem):
                metin = echo.rol_metni(yol.stem)
                self.assertTrue(metin)
                for yasak in ("CLAUDE.md", "model:", "tools:", "Opus 5", "Sonnet"):
                    self.assertNotIn(yasak, metin)

    def test_kimliksiz_devre_reddedilir_ve_codex_kilidi_korunur(self):
        arg = ("arac", "devre", "dene", "--halka", "test", "--not", "ilk tur")
        self.assertEqual(self.kos(*arg).returncode, 2)
        self.assertEqual(self.kos(*arg, ortam=dict(self.ortam, CODEX_THREAD_ID="oturum-a")).returncode, 0)
        s = self.kos(*arg, ortam=dict(self.ortam, CODEX_THREAD_ID="oturum-b"))
        self.assertEqual(s.returncode, 4, s.stdout)

    def test_kapatma_anahtari_acik_kontrolu_atlatmaz(self):
        (self.kok / ".claude/butunluk.py").write_text("raise SystemExit(0)\n")
        s = self.kos("baslat", ortam=dict(self.ortam, ECHO_KAPALI="1"))
        self.assertEqual(s.returncode, 2, s.stdout)
        self.assertIn("ECHO_KAPALI", s.stdout)

    def test_rol_yolu_depodan_cikamaz(self):
        s = self.kos("gorev", "--rol", "../../AGENTS", "--konu", "test")
        self.assertEqual(s.returncode, 2)
        self.assertIn("Geçersiz rol", s.stdout)


if __name__ == "__main__":
    unittest.main()
