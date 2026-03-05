# Instalacja Project Utopia na EC2 (Ubuntu)

## 1. Aktualizacja systemu i instalacja Node.js

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm
```

Sprawdź wersje:

```bash
node -v
npm -v
```

## 2. Skopiowanie plików aplikacji

Umieść zawartość folderu `www/` w `/var/www/utopia`:

```bash
sudo mkdir -p /var/www/utopia
sudo cp -r ~/www/* /var/www/utopia/
sudo chown -R ubuntu:ubuntu /var/www/utopia
```

## 3. Instalacja zależności

```bash
cd /var/www/utopia
npm install
```

## 4. Konfiguracja zmiennych środowiskowych

Utwórz plik `.env`:

```bash
sudo nano /var/www/utopia/.env
```

Wklej i uzupełnij:

```env
SESSION_SECRET=twoj_tajny_klucz_sesji

DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_CALLBACK_URL=http://twoja-domena.pl/auth/discord/callback

DISCORD_BOT_TOKEN=

GUILD_ID=

ROLE_WHITELIST=
ROLE_UNWHITELIST=
ROLE_WL_CHECKER=
```

## 5. Konfiguracja usługi systemd

Utwórz plik jednostki:

```bash
sudo nano /etc/systemd/system/utopia.service
```

Wklej poniższą zawartość:

```ini
[Unit]
Description=Project Utopia - Node.js App
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/utopia
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=utopia
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## 6. Uruchomienie usługi

```bash
sudo systemctl daemon-reload
sudo systemctl enable utopia
sudo systemctl start utopia
```

## 7. Sprawdzenie statusu

```bash
sudo systemctl status utopia
```

Logi aplikacji:

```bash
sudo journalctl -u utopia -f
```

## 8. Otwieranie portu 80 w EC2

W panelu AWS przejdź do:
**EC2 > Security Groups > Inbound rules** i dodaj regułę:

| Typ | Port | Zrodlo |
|-----|------|--------|
| HTTP | 80 | 0.0.0.0/0 |

> Serwer nasłuchuje na porcie **80** (zdefiniowany w `server.js`). Upewnij się, że Node.js ma uprawnienia do tego portu lub uruchom usługę jako root.

Aby uruchomić na porcie 80 bez roota, możesz użyć `authbind`:

```bash
sudo apt install -y authbind
sudo touch /etc/authbind/byport/80
sudo chown ubuntu /etc/authbind/byport/80
sudo chmod 755 /etc/authbind/byport/80
```

Zmień `ExecStart` w pliku usługi na:

```ini
ExecStart=/usr/bin/authbind --deep /usr/bin/node server.js
```

Następnie przeładuj usługę:

```bash
sudo systemctl daemon-reload
sudo systemctl restart utopia
```
