import sys
import os
import requests
import subprocess
import tempfile
import base64
import winreg
import hashlib

# ⚠️ ZMIEŃ NA TWÓJ URL Z RAILWAY/RENDER
SERVER_URL = "TUTAJ_WKLEJ_SWOJ_URL"  # np. "https://api.render.com/deploy/srv-d42cohruibrs73csmi5g?key=kuqqz9wAX9s"

# 🔥 Program zostanie wklejony tutaj przez build_launcher.py
EMBEDDED_PROGRAM = """
{{EMBEDDED_EXE_BASE64}}
"""

def get_discord_user_id():
    """Wyciąga User ID z nazwy pliku .exe"""
    try:
        exe_name = os.path.basename(sys.executable)
        # Format: MsiUtility_v3_Username_1234567890.exe
        parts = exe_name.replace('.exe', '').split('_')
        for part in reversed(parts):
            if part.isdigit() and len(part) > 10:
                return part
    except:
        pass
    
    # Fallback - użyj HWID
    try:
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, 
                             r"SOFTWARE\Microsoft\Cryptography", 
                             0, winreg.KEY_READ | winreg.KEY_WOW64_64KEY)
        guid = winreg.QueryValueEx(key, "MachineGuid")[0]
        winreg.CloseKey(key)
        return guid
    except:
        return hashlib.md5(os.environ.get('COMPUTERNAME', 'UNKNOWN').encode()).hexdigest()

def check_session_active(user_id):
    """Sprawdza czy sesja jest aktywna"""
    try:
        url = f"{SERVER_URL}/api/status/{user_id}"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            return data.get('active', False)
        return False
            
    except:
        return False

def extract_and_run():
    """Wypakuj i uruchom program"""
    if EMBEDDED_PROGRAM.strip() == "{{EMBEDDED_EXE_BASE64}}":
        print("❌ Program nie został wbudowany!")
        return False
    
    try:
        # Rozpakuj do folderu tymczasowego
        temp_dir = tempfile.gettempdir()
        temp_exe = os.path.join(temp_dir, "MsiUtility_Runtime.exe")
        
        # Dekoduj i zapisz
        program_data = base64.b64decode(EMBEDDED_PROGRAM.strip())
        with open(temp_exe, 'wb') as f:
            f.write(program_data)
        
        # Uruchom w tle
        subprocess.Popen([temp_exe])
        return True
        
    except Exception as e:
        print(f"❌ Błąd: {e}")
        return False

def main():
    print("=" * 60)
    print("🔐 MSI UTILITY v3 - LICENSE CHECKER")
    print("=" * 60)
    
    user_id = get_discord_user_id()
    print(f"\n👤 User ID: {user_id[:16]}...")
    print(f"🌐 Server: {SERVER_URL}")
    print("\n🔍 Sprawdzanie licencji...")
    
    # Sprawdź sesję
    if not check_session_active(user_id):
        print("\n❌ BRAK AKTYWNEJ SESJI")
        print("=" * 60)
        print("\n📝 Aby uruchomić program:")
        print("   1. Wpisz /load na Discord")
        print("   2. Poczekaj na 'SESSION ACTIVATED'")
        print("   3. Uruchom program ponownie")
        print("\n💡 Po zakończeniu wpisz /unload")
        print("=" * 60)
        input("\nNaciśnij ENTER...")
        return
    
    print("\n✅ SESJA AKTYWNA")
    print("=" * 60)
    print("\n🚀 Uruchamianie programu...")
    
    if extract_and_run():
        print("\n✅ Program uruchomiony!")
        print("💡 Możesz zamknąć to okno")
        import time
        time.sleep(2)
    else:
        print("\n❌ Błąd uruchamiania")
        input("\nNaciśnij ENTER...")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ Błąd: {e}")
        input("\nNaciśnij ENTER...")