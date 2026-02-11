## Pokeclicker-automation

Pokeclicker-automation aims at automating some recurring tasks that can be a bit tedious for the web-based game https://www.pokeclicker.com/

This script collection does not aim at cheating.
It will never perform actions that the game would not allow.

Last known compatible pokeclicker version: 0.10.24

For more details, please refer to the [wiki](../../wiki)

For Pokeclicker Desktop app support, refer to [this repository](https://github.com/Farigh/pokeclicker-automation-desktop/releases)

### Shiny hunt manual test plan (dungeon + safari fallback)

1. **Dungeon hunt enabled + enough tokens**
   - Enable `Shiny hunt` and `Enable dungeon shiny hunt`.
   - Keep dungeon tokens above `Min dungeon tokens`.
   - Expected: automation moves to preferred/auto dungeon and starts dungeon automation.

2. **Dungeon tokens low -> farm -> resume**
   - While dungeon hunt is active, reduce dungeon tokens below `Min dungeon tokens`.
   - Expected: state switches to `FARM_DUNGEON_TOKENS`, moves to preferred/auto best route and equips Ultra Ball (or fallback ball).
   - Increase tokens above `Resume dungeon tokens`.
   - Expected: state switches back to `HUNT_DUNGEON` and dungeons resume.

3. **Safari hunt enabled + low currency -> farm -> resume**
   - Enable `Enable safari shiny hunt`.
   - Keep safari currency below `Min safari currency`.
   - Expected: state switches to `FARM_SAFARI_CURRENCY`, farms route with Ultra Ball/fallback.
   - Raise safari currency above `Resume safari currency`.
   - Expected: state switches back to `HUNT_SAFARI`.

4. **No Ultra Balls available**
   - Set `Use Ultra Balls while farming` on and set Ultra Ball quantity to 0.
   - Expected: the first available ball from `Fallback ball priority` is used.

5. **Dungeon/Safari modes disabled**
   - Disable `Enable dungeon shiny hunt` and `Enable safari shiny hunt`.
   - Expected: only route shiny hunt logic is used, no instance switching.
