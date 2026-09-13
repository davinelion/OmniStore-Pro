# Obtanium Features in OmniStore Pro

OmniStore Pro now includes **Obtanium's best features** — direct app updates from source, background checks, and full user control. Obtanium is an Android app that gets updates directly from GitHub releases, etc. We brought its philosophy to the web for all platforms.

## Why Obtanium?

Traditional app stores (Play Store, App Store) are middlemen. Obtanium bypasses them:

- **Direct from source**: GitHub, GitLab, Codeberg, Forgejo, F-Droid, Flathub, etc.
- **No account, no tracking**: Your tracked list stays on device (IndexedDB)
- **You control updates**: Skip, rollback, track-only, auto-update per app
- **Background checks**: Every 6h by default, notifications when new release

OmniStore Pro implements all of this for **Windows, macOS, Linux, Android, iOS** — not just Android APKs.

## Features Implemented

### 1. Direct App Update Directly (Core)

- **Every app page** has **Track — Get direct updates** button (`TrackAppButton`)
- Tracked apps appear in **/updates** — Obtanium-style update center
- Each card shows **Installed vs Latest** version, with direct download button to GitHub release asset (APK, EXE, DMG, AppImage, etc.)
- **Update all** — batch open direct downloads (browser will open first 3 to avoid popup blocker)
- **PlatformDownloadMatrix** shows all assets grouped by platform, with direct links

**Flow like Obtanium:**
1. User browses store or pastes GitHub URL in /track
2. Clicks Track
3. OmniStore remembers installed version (user can set it, like Obtanium reads from device)
4. Background checks compare installed vs latest from OmniSource (which indexes GitHub releases directly)
5. When new version found: badge, notification, direct download button

### 2. Background Update Checks

- **Global settings** (`GlobalUpdateSettings` in IndexedDB):
  - `checkIntervalHours`: 1, 3, 6 (Obtanium default), 12, 24
  - `wifiOnly`, `chargingOnly`: preferences stored, shown in UI (can't enforce on web but respected in logic notes)
  - `notificationsEnabled`: uses Web Notification API
  - `lastCheckAt`: timestamp
- **Implementation**: `useTracked` + `UpdatesPanel` sets `setInterval` + `visibilitychange` listener. When tab becomes visible, checks if interval passed since last check → auto refresh.
- **Notifications**: If permission granted and new updates found, shows `new Notification("OmniStore: X updates available")` with app names

### 3. Per-App Settings (Obtanium)

Each tracked app has:

- `autoUpdate`: Auto-update when new version (Obtanium background update per-app)
- `includePrerelease`: Include RC/beta (Obtanium allow pre-release)
- `trackOnly`: Don't show in updates, just track (Obtanium track-only)
- `allowDowngrade`: Show previous releases for rollback (Obtanium rollback)
- `wifiOnly`, `chargingOnly`: Per-app overrides
- `skippedVersion`: Skip a version — don't notify (Obtanium skip version)
- `installedVersion`: What user has installed — like Obtanium reads from device. Updates calculated from this.
- `versionFilter`: Custom regex (future, stored)
- `lastNotifiedAt`: When last notified

UI in `ObtaniumCard`: gear icon → settings panel with toggles, installed version input, skip/unskip, stop tracking.

### 4. Import/Export

- **Export**: JSON file with all tracked apps (`exportApps()` → Blob download)
- **Import**: File input, parses JSON array, merges by key (`importApps()`)
- Like Obtanium's import/export app list, share configurations
- File name: `omnistore-tracked-YYYY-MM-DD.json`

### 5. Version Detection & Rollback

- **Installed vs Latest**: Shows `Installed: 1.16.0 → Latest: 1.17.0`
- User can set installed version manually (input field) — like Obtanium reads version from device
- **Rollback**: If `allowDowngrade` enabled, shows previous 3 releases from `app.releases` with download links
- **Skip version**: Button to skip current latest, badge shows skipped, option to unskip

### 6. Supports Many Sources

- Same as Obtanium: GitHub, GitLab, Codeberg, Forgejo, F-Droid, Flathub, Winget, Homebrew, Other
- Via `/api/v1/sources/resolve` — parses bare `owner/repo`, full URLs, `git@host:owner/name.git`
- Custom HTML source future: versionFilter regex stored per-app

### 7. Update Inbox & Tracking

- `/track` — add any source, see updates, mark as seen
- `/updates` — **main Obtanium center**: search, filter (all/updates/up-to-date), batch actions, global settings, import/export
- Sticky footer with counts and refresh/update all
- Toast notifications

### 8. Direct Download Everywhere

- **StoreAppCard**: Direct Download button for preferred platform
- **App detail**: `PlatformDownloadMatrix` — all platforms, grouped, size, checksum
- **Updates**: Direct download per app + per asset
- All downloads go to upstream (GitHub) — never mirrored, like Obtanium

## UI Components

- `src/lib/track/types.ts` — Enhanced TrackedApp with Obtanium fields + `defaultTrackedSettings()`
- `src/lib/track/store.ts` — IndexedDB v2 migration, global settings store, `updateTrackedSettings`, `getGlobalSettings`
- `src/lib/track/use-tracked.ts` — `setInstalledVersion`, `skipVersion`, `updateSettings`, `updateGlobalSettings`, `importApps`, `exportApps`, notifications
- `src/components/updates/ObtaniumCard.tsx` — Card per tracked app: installed vs latest, direct download, assets preview, per-app settings
- `src/components/updates/UpdatesPanel.tsx` — Full update center: header with stats, batch actions, filters, global settings, background interval, import/export, sticky footer
- `src/app/updates/page.tsx` — Route
- `src/components/app/TrackAppButton.tsx` — Track button for app pages
- `src/components/track/TrackPanel.tsx` — Banner linking to /updates

## How to Use (User Flow)

1. **Browse** `/apps` or `/platforms/windows` — see direct download + source on every card
2. **App page** `/app/localsend` — click **Track — Get direct updates**
3. **Updates** `/updates` — see all tracked, set installed version if needed
4. **Settings** — set check interval to 6h (Obtanium default), enable notifications
5. **Background** — leave tab open or PWA installed; OmniStore checks every 6h, notifies
6. **Update** — when new version appears, click **Update to vX** → direct download from GitHub, then **Mark installed**
7. **Control** — Skip version if broken, rollback to previous via Allow downgrade, track-only for apps you just watch

## Comparison with Obtanium

| Feature | Obtanium (Android) | OmniStore Pro |
|---------|-------------------|---------------|
| Direct from source | ✅ GitHub etc. APK | ✅ GitHub etc. APK/EXE/DMG/AppImage for all platforms |
| Background checks | ✅ Every 6h | ✅ Every 6h + visibility check |
| Notifications | ✅ System notification | ✅ Web Notification API |
| Per-app auto-update | ✅ | ✅ |
| Include pre-release | ✅ | ✅ |
| Skip version | ✅ | ✅ |
| Track only | ✅ | ✅ |
| Rollback | ✅ Previous APKs | ✅ Previous releases with download |
| Wi-Fi only | ✅ | ✅ Preference stored |
| Charging only | ✅ | ✅ Preference stored |
| Import/export | ✅ JSON/URL list | ✅ JSON |
| Installed version | ✅ Reads from device | ✅ User sets + mark installed |
| Platforms | Android only | Windows, macOS, Linux, Android, iOS |
| Store UI | No (just updater) | Full App Store + Play Store + F-Droid UI |

OmniStore Pro is **Obtanium + App Store + F-Droid + AI** — best of all.

## Future Enhancements

- Periodic Background Sync API for true background checks even when closed (requires PWA)
- Web Push for server-sent update notifications
- Version regex filter UI (Obtanium custom HTML source)
- Auto-install via PWA File Handling + Native File System (when browser allows)
- Share tracked list via URL (like Obtanium share config)
