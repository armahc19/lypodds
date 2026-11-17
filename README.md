# LYPODDS

LYPODDS is a real-time football prediction and virtual-points trading platform.
The visual trading workspace and responsive design live here, while the Supabase
authentication, market rules, positions, settlement, and admin server functions
are integrated in the same application.

This project was built with [Lovable](https://lovable.dev).

## Architecture

- `src/components/` contains the LYPODDS trading interface and reusable UI.
- `src/lib/sim/` contains the local simulation experience used by the current
  visual prototype.
- `src/hooks/` and `src/integrations/supabase/` contain the Supabase-backed
  account, match, and position data layer.
- `src/lib/markets.ts` and `src/lib/trading.functions.ts` contain the shared
  market rules and server-side trading operations.

The local simulation and Supabase-backed experience are intentionally being
converged. New trading features should use the server market rules and atomic
position functions rather than creating a second balance or settlement system.

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b8f0fdf0-8b14-4276-87d1-4ca32e47a81c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
