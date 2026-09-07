# OmniStore client architecture

```
                    OmniSource
                         │
                 API / JSON Feeds
                         │
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
    OmniStore Web    OmniStore iOS   OmniStore Android
        │                                 │
        └──────────────┬──────────────────┘
                       ↓
              Future Desktop Clients
```

## Contract

Versioned HTTP JSON under `/api/v1/`:

- `GET /api/v1/apps`
- `GET /api/v1/apps/{id}`
- `GET /api/v1/search`
- `GET /api/v1/releases` (via `/api/v1/apps/{id}/releases`)
- `GET /api/v1/categories`
- `GET /api/v1/platforms`
- `GET /api/v1/trending`

The web UI consumes this BFF. Native clients should use the same resource shapes (`App`, `Release`, `Asset`) defined in `src/lib/schemas/omnisource.ts`.

When OmniSource v2 appears, add an adapter. Do not rewrite presentation code.

## Future installers

`PlatformInstaller` is the extension point:

- Web: `BrowserDownloadInstaller`
- Later: `IOSInstaller`, `AndroidInstaller`, `WindowsInstaller`, `MacOSInstaller`, `LinuxInstaller`

## Future updates

`UpdateProvider` exposes latest version comparison for native tracking of installed apps.

## Do not

Do not couple clients to OmniSource database internals.
