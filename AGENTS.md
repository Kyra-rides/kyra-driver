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
Five teammate branches exist off `main`: `feat/shivansh`, `feat/divyashri`,
`feat/latisha`, `feat/dev`, `feat/avni`. Stay on whichever is currently
checked out unless asked otherwise.

## Workspace context
For workspace-wide routing rules and strategy docs, see `../AGENTS.md`
and the parent `/Kyra/` folder.
