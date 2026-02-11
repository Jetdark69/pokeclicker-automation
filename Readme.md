## Pokeclicker-automation

Pokeclicker-automation aims at automating some recurring tasks that can be a bit tedious for the web-based game https://www.pokeclicker.com/

This script collection does not aim at cheating.
It will never perform actions that the game would not allow.

Last known compatible pokeclicker version: 0.10.24

For more details, please refer to the [wiki](../../wiki)

For Pokeclicker Desktop app support, refer to [this repository](https://github.com/Farigh/pokeclicker-automation-desktop/releases)

## Manual Test Plan
1. Load the userscript from your fork and refresh the game.
2. Open `Automation -> Focus on` and confirm there is no `Shiny hunt` entry in the dropdown.
3. Enable `Shiny Hunt` in the Automation panel and verify it switches between route/dungeon/safari behavior.
4. Dungeon mode: go to a dungeon with missing shinies.
5. Dungeon mode: confirm `Stop on Pokedex` is enabled in the dungeon panel.
6. Dungeon mode: confirm the pokeball indicator is set to shiny completion.
7. Dungeon mode: verify the automation repeats runs until the dungeon is shiny-complete, then moves to the next dungeon with missing shinies.
8. Token farming fallback: set dungeon tokens below the required cost.
9. Token farming fallback: verify it moves to the best token route and uses the configured ball/fallback.
10. Safari currency fallback: reduce safari currency below entry cost.
11. Safari currency fallback: verify it moves to the best route for safari currency or falls back to EXP if unavailable.
12. Route hunt: ensure no dungeons have missing shinies.
13. Route hunt: verify it moves to the earliest route with missing shinies and auto-advances on completion.
14. Telemetry: set `localStorage["Shiny-DebugTelemetry"] = "true"` and verify console logs.
