# kyra-driver — AGENTS.md

This is the **Driver** app. The user of this app is the woman driver. Build
only features that a *driver* does on her own phone.

## Belongs here
- Driver onboarding (vehicle docs, license, training certificate)
- Online/offline availability toggle
- Ride accept / reject screen
- Turn-by-turn navigation
- OTP entry (verifies the rider's pickup code)
- Earnings dashboard, daily fee balance, payouts
- SOS button (driver-side, in-motion variant — triple-press volume shortcut)

## Does NOT belong here
- Anything a rider does → build in `../kyra-rider/`
- Anything Kyra ops staff does → build in `../kyra-admin/`

## Branches
Default to **`feat/shivansh`** (Shivansh's branch) for all feature work.
Switch to it and merge `main` before building:

```bash
git checkout main && git pull
git checkout feat/shivansh && git merge main
```

The other teammate branches (`feat/divyashri`, `feat/latisha`, `feat/dev`,
`feat/avni`) are reserved for future engineers; do not commit to them
unless explicitly asked. Never build features directly on `main`.

## Workspace context
For workspace-wide routing rules and strategy docs, see `../AGENTS.md`
and the parent `/Kyra/` folder.
