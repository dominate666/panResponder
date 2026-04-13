# expogo

React Native + Expo demo project.

## Quick Start

```bash
npm install
```

## Startup Modes

This project provides three common startup modes. If one mode is unstable in your network, switch to another.

### 1) LAN (default)

```bash
npm run start
```

- Script: `expo start -c --lan`
- Use when phone and computer are on the same local network.
- Best performance, but may fail under router isolation / firewall restrictions.

### 2) Tunnel

```bash
npm run start:tunnel
```

- Script: `expo start -c --tunnel`
- Use when LAN cannot connect.
- Depends on ngrok; may occasionally fail with temporary tunnel errors.

### 3) Localhost / USB (Android recommended fallback)

```bash
adb reverse tcp:8081 tcp:8081
npm run start:localhost
```

- Script: `expo start -c --localhost`
- Most stable when connected via USB.
- In Expo Go, open: `exp://127.0.0.1:8081`

You can also use:

```bash
npm run android:usb
```

- Script: `expo start -c --localhost --android`
- Starts localhost mode and opens Android target directly.

## Existing Scripts

- `npm run start` - LAN mode
- `npm run start:tunnel` - tunnel mode
- `npm run start:localhost` - localhost mode
- `npm run android:usb` - localhost + Android
- `npm run android` - Android + LAN
- `npm run ios` - iOS + LAN
- `npm run web` - Web

## Troubleshooting

### Expo Go shows "something went wrong"

1. Restart with cache clear (already included in all scripts).
2. Switch startup mode:
   - LAN fails -> try `start:tunnel`
   - Tunnel fails -> use `start:localhost` with USB
3. Ensure phone/computer VPN and proxy are disabled.
4. On Windows, allow `node.exe` and port `8081` through firewall.

### Tunnel error: `failed to start tunnel` / `remote gone away`

- This is usually ngrok instability.
- Retry `npm run start:tunnel`.
- If still failing, switch to LAN or localhost/USB mode.

