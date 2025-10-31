import sys
import os
import requests
import subprocess
import time
import winreg
import hashlib
from pathlib import Path

# Konfiguracja - ZMIEŃ NA SWÓJ URL RAILWAY
SERVER_URL = "https://twoja-aplikacja.railway.app"  # ZMIEŃ TO!

def get_hwid():
    """Generuje unikalny ID komputera"""
    try:
        # Próba pobrania Machine GUID z rejestru
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, 
                             r"SOFTWARE\Microsoft\Cryptography", 
                             0, winreg.KEY_READ | winreg.KEY_WOW64_64KEY)
        guid = winreg.QueryValueEx(key, "MachineGuid")[0]
        winreg.CloseKey(key)
        return guid
    except:
        # Fallback - hash nazwy komputera
        return hashlib.md5(os.environ.get('COMPUTERNAME', 'UNKNOWN').encode()).hexdigest()

def get_discord_user_id():
    """
    Próbuje znaleźć Discord User ID z lokalnych plików Discord
    To jest uproszczona wersja - w prawdziwym projekcie użyłbyś Discord RPC
    """
    discord_path = os.path.join(os.getenv('APPDATA'), 'discord', 'Local Storage', 'leveldb')
    
    # Tutaj normalnie parsowałbyś pliki Discord
    # Dla celów demonstracyjnych użyjemy HWID jako fallback
    return get_hwid()

def check_session_active(user_id):
    """Sprawdza czy sesja jest aktywna na serwerze"""
    try:
        response = requests.get(f"{SERVER_URL}/status/{user_id}", timeout=5)
        if response.status_code == 200:
            data = response.json()
            return data.get('active', False)
        return False
    except Exception as e:
        print(f"Błąd połączenia: {e}")
        return False

def activate_session(user_id, hwid):
    """Aktywuje sesję na serwerze"""
    try:
        response = requests.post(f"{SERVER_URL}/activate", 
                                json={'userId': user_id, 'hwid': hwid},
                                timeout=5)
        return response.status_code == 200
    except Exception as e:
        print(f"Błąd aktywacji: {e}")
        return False

def get_real_program_path():
    """Zwraca ścieżkę do prawdziwego programu"""
    # Prawdziwy program powinien być w tym samym folderze co launcher
    # ale z nazwą .real.exe
    launcher_dir = os.path.dirname(os.path.abspath(__file__))
    real_program = os.path.join(launcher_dir, "MsiUtility_v3.real.exe")
    
    if not os.path.exists(real_program):
        print(f"❌ Nie znaleziono prawdziwego programu: {real_program}")
        print(f"📁 Umieść swój program jako: MsiUtility_v3.real.exe")
        return None
    
    return real_program

def main():
    # Pobierz identyfikatory
    user_id = get_discord_user_id()
    hwid = get_hwid()
    
    print("🔍 Sprawdzanie statusu sesji...")
    print(f"   User ID: {user_id[:8]}...")
    print(f"   HWID: {hwid[:8]}...")
    
    # Sprawdź czy sesja jest aktywna
    is_active = check_session_active(user_id)
    
    if not is_active:
        print("\n❌ SESJA NIEAKTYWNA")
        print("━" * 50)
        print("⚠️  Program nie może zostać uruchomiony")
        print("📝 Aby uruchomić program:")
        print("   1. Wpisz /load na Discordzie")
        print("   2. Poczekaj na potwierdzenie")
        print("   3. Uruchom program ponownie")
        print("━" * 50)
        input("\nNaciśnij ENTER aby zamknąć...")
        sys.exit(0)
    
    print("\n✅ SESJA AKTYWNA")
    print("━" * 50)
    print("🚀 Uruchamianie programu...")
    
    # Pobierz ścieżkę do prawdziwego programu
    real_program = get_real_program_path()
    
    if not real_program:
        input("\nNaciśnij ENTER aby zamknąć...")
        sys.exit(1)
    
    # Uruchom prawdziwy program
    try:
        print(f"📂 Ładowanie: {os.path.basename(real_program)}")
        
        # Uruchom program i poczekaj na jego zakończenie
        process = subprocess.Popen([real_program])
        
        print("✓ Program uruchomiony pomyślnie")
        print("━" * 50)
        print("\n⏳ Program działa...")
        print("💡 Możesz zamknąć to okno")
        
        # Czekaj aż program się zakończy
        process.wait()
        
        print("\n✓ Program zakończony")
        
    except Exception as e:
        print(f"\n❌ Błąd podczas uruchamiania programu: {e}")
        input("\nNaciśnij ENTER aby zamknąć...")
        sys.exit(1)

if __name__ == "__main__":
    # Ukryj konsolę po 2 sekundach (opcjonalnie)
    # import ctypes
    # ctypes.windll.user32.ShowWindow(ctypes.windll.kernel32.GetConsoleWindow(), 0)
    
    main()