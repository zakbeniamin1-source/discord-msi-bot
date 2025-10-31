import base64
import os

print("=" * 70)
print("🔨 MSI UTILITY v3 - BUILDER")
print("=" * 70)

# Nazwy plików
TEMPLATE = "launcher_embedded.py"
REAL_PROGRAM = "MsiUtility_v3.real.exe"  # Twój program (3 251 KB)
OUTPUT = "launcher_final.py"

# Sprawdź pliki
if not os.path.exists(TEMPLATE):
    print(f"❌ Brak: {TEMPLATE}")
    input("Naciśnij ENTER...")
    exit(1)

if not os.path.exists(REAL_PROGRAM):
    print(f"❌ Brak: {REAL_PROGRAM}")
    print(f"💡 Upewnij się że plik nazywa się: {REAL_PROGRAM}")
    input("Naciśnij ENTER...")
    exit(1)

print(f"\n✅ Znaleziono pliki")
print(f"   📄 Template: {TEMPLATE}")
print(f"   📦 Program: {REAL_PROGRAM}")

# Wczytaj template
print(f"\n📖 Wczytywanie template...")
with open(TEMPLATE, 'r', encoding='utf-8') as f:
    code = f.read()

# Wczytaj program
print(f"📦 Wczytywanie programu...")
with open(REAL_PROGRAM, 'rb') as f:
    program_bytes = f.read()

size_mb = len(program_bytes) / (1024 * 1024)
print(f"   📊 Rozmiar: {size_mb:.2f} MB")

if size_mb > 20:
    print(f"   ⚠️  Duży plik - może być problem z Discord (limit 25MB)")

# Koduj do base64
print(f"\n🔄 Kodowanie do base64...")
program_b64 = base64.b64encode(program_bytes).decode('utf-8')

# Wstaw do template
print(f"🔧 Generowanie launchera...")
final_code = code.replace('{{EMBEDDED_EXE_BASE64}}', program_b64)

# Zapisz
with open(OUTPUT, 'w', encoding='utf-8') as f:
    f.write(final_code)

output_size = len(final_code.encode('utf-8')) / (1024 * 1024)

print(f"\n✅ GOTOWE!")
print(f"   📄 Plik: {OUTPUT}")
print(f"   📊 Rozmiar: {output_size:.2f} MB")

print(f"\n" + "=" * 70)
print("📝 NASTĘPNY KROK:")
print("=" * 70)
print(f"\nSkompiluj launcher do .exe:")
print(f"\n   pyinstaller --onefile --name MsiUtility_v3 {OUTPUT}")
print(f"\nPlik będzie w: dist/MsiUtility_v3.exe")
print("=" * 70)

input("\nNaciśnij ENTER aby zamknąć...")