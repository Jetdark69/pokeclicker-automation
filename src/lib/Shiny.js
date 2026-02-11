/**
 * @class The AutomationShiny regroups the shiny hunting helpers
 */
class AutomationShiny
{
    static Settings = {
        FeatureEnabled: "Shiny-Enabled",
        UseMasterball: "Shiny-UseMasterball",
        AutoAdvanceRoutes: "Shiny-AutoAdvanceRoutes",
        DebugTelemetry: "Shiny-DebugTelemetry",
        DungeonTokenFarmBall: "Shiny-DungeonTokenFarmBall",
        DungeonTokenFarmFallbackBall: "Shiny-DungeonTokenFarmFallbackBall",
        DungeonTokenFarmRouteMode: "Shiny-DungeonTokenFarmRouteMode",
        SafariCurrencyFarmBall: "Shiny-SafariCurrencyFarmBall",
        SafariCurrencyFarmFallbackBall: "Shiny-SafariCurrencyFarmFallbackBall",
        SafariCurrencyFarmRouteMode: "Shiny-SafariCurrencyFarmRouteMode"
    };

    static initialize(initStep)
    {
        if (initStep == Automation.InitSteps.BuildMenu)
        {
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.FeatureEnabled, false);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.UseMasterball, true);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.AutoAdvanceRoutes, true);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.DebugTelemetry, false);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.DungeonTokenFarmBall, GameConstants.Pokeball.Ultraball);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.DungeonTokenFarmFallbackBall, GameConstants.Pokeball.Greatball);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.DungeonTokenFarmRouteMode, "best");
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.SafariCurrencyFarmBall, GameConstants.Pokeball.Ultraball);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.SafariCurrencyFarmFallbackBall, GameConstants.Pokeball.Greatball);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.SafariCurrencyFarmRouteMode, "best");

            this.__internal__buildMenu();
        }
        else if (initStep == Automation.InitSteps.Finalize)
        {
            this.toggleShinyHunt();
        }
    }

    /**
     * @brief Toggles the shiny hunting feature
     *
     * @param enable: Optional override, otherwise uses local storage value
     */
    static toggleShinyHunt(enable)
    {
        if ((enable !== true) && (enable !== false))
        {
            enable = (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "true");
        }

        if (enable)
        {
            if (this.__internal__loop == null)
            {
                this.__internal__loop = setInterval(this.__internal__tick.bind(this), 500);
            }

            this.__internal__state = this.HuntStates.HUNT_ROUTE;
            this.__internal__updateHuntState();
            this.__internal__tick();
        }
        else
        {
            if (this.__internal__loop != null)
            {
                clearInterval(this.__internal__loop);
                this.__internal__loop = null;
            }

            if (this.__internal__filterActive)
            {
                Automation.Utils.Pokeball.disableAutomationFilter();
                this.__internal__filterActive = false;
            }

            this.__internal__currentDungeonTarget = null;
            this.__internal__currentSafariTarget = null;
        }
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static HuntStates = {
        HUNT_ROUTE: 0,
        HUNT_DUNGEON: 1,
        HUNT_SAFARI: 2,
        FARM_DUNGEON_TOKENS: 3,
        FARM_SAFARI_CURRENCY: 4
    };

    static __internal__loop = null;
    static __internal__filterActive = false;
    static __internal__lastAutoAdvanceAt = 0;
    static __internal__state = this.HuntStates.HUNT_ROUTE;
    static __internal__currentDungeonTarget = null;
    static __internal__currentSafariTarget = null;
    static __internal__container = null;

    /**
     * @brief Builds the menu
     */
    static __internal__buildMenu()
    {
        this.__internal__container = document.createElement("div");

        const shinyTooltip = "Hunts uncaught shiny pokÃ©mon across routes, dungeons, and safari"
                           + Automation.Menu.TooltipSeparator
                           + "Automatically farms tokens or safari currency when needed";
        const shinyButton =
            Automation.Menu.addAutomationButton("Shiny hunt", this.Settings.FeatureEnabled, shinyTooltip, this.__internal__container);
        shinyButton.addEventListener("click", this.toggleShinyHunt.bind(this), false);

        Automation.Menu.addSeparator(this.__internal__container);
        Automation.Menu.AutomationButtonsDiv.appendChild(this.__internal__container);

        const shinySettingPanel = Automation.Menu.addSettingPanel(shinyButton.parentElement.parentElement);

        const titleDiv = Automation.Menu.createTitleElement("Shiny hunt advanced settings");
        titleDiv.style.marginBottom = "10px";
        shinySettingPanel.appendChild(titleDiv);

        const masterballTooltip = "Use Masterball on shiny encounters if available";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Use Masterball for shiny encounters",
                                                               this.Settings.UseMasterball,
                                                               masterballTooltip,
                                                               shinySettingPanel);

        const autoAdvanceTooltip = "Automatically move to the next route once the current one is shiny-complete";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Auto-advance routes",
                                                               this.Settings.AutoAdvanceRoutes,
                                                               autoAdvanceTooltip,
                                                               shinySettingPanel);

        const debugTooltip = "Logs shiny hunt state changes and fallback decisions in the console";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Enable debug telemetry",
                                                               this.Settings.DebugTelemetry,
                                                               debugTooltip,
                                                               shinySettingPanel);

        shinySettingPanel.appendChild(document.createElement("br"));

        const tokenBallTooltip = "PokÃ©ball used while farming dungeon tokens";
        shinySettingPanel.appendChild(
            Automation.Menu.addPokeballList(this.Settings.DungeonTokenFarmBall,
                                            "Dungeon token farm ball",
                                            tokenBallTooltip));

        const tokenFallbackTooltip = "Fallback pokÃ©ball used if the main ball is unavailable";
        shinySettingPanel.appendChild(
            Automation.Menu.addPokeballList(this.Settings.DungeonTokenFarmFallbackBall,
                                            "Dungeon token fallback ball",
                                            tokenFallbackTooltip));

        shinySettingPanel.appendChild(
            this.__internal__buildRouteModeDropdown(this.Settings.DungeonTokenFarmRouteMode,
                                                    "Dungeon token farm route",
                                                    "Select how routes are chosen while farming dungeon tokens"));

        shinySettingPanel.appendChild(document.createElement("br"));

        const safariBallTooltip = "PokÃ©ball used while farming safari currency";
        shinySettingPanel.appendChild(
            Automation.Menu.addPokeballList(this.Settings.SafariCurrencyFarmBall,
                                            "Safari currency farm ball",
                                            safariBallTooltip));

        const safariFallbackTooltip = "Fallback pokÃ©ball used if the main ball is unavailable";
        shinySettingPanel.appendChild(
            Automation.Menu.addPokeballList(this.Settings.SafariCurrencyFarmFallbackBall,
                                            "Safari currency fallback ball",
                                            safariFallbackTooltip));

        shinySettingPanel.appendChild(
            this.__internal__buildRouteModeDropdown(this.Settings.SafariCurrencyFarmRouteMode,
                                                    "Safari currency farm route",
                                                    "Select how routes are chosen while farming safari currency"));
    }

    static __internal__buildRouteModeDropdown(settingId, label, tooltip)
    {
        const savedValue = Automation.Utils.LocalStorage.getValue(settingId) ?? "best";
        const options = [
            { value: "best", label: "Best route" },
            { value: "auto", label: "Auto (no forced move)" }
        ];

        const selectOptions = options.map((option) =>
            {
                const elem = document.createElement("div");
                elem.appendChild(document.createTextNode(option.label));
                return { value: option.value, element: elem, selected: (option.value === savedValue) };
            });

        const dropdown = Automation.Menu.createDropdownListWithHtmlOptions(selectOptions, label, tooltip);
        dropdown.onValueChange = function()
        {
            Automation.Utils.LocalStorage.setValue(settingId, dropdown.selectedValue);
        };

        dropdown.getElementsByTagName("button")[0].style.width = "180px";
        return dropdown;
    }

    static __internal__tick()
    {
        this.__internal__handleShinyEncounter();
        this.__internal__updateHuntState();

        switch (this.__internal__state)
        {
            case this.HuntStates.HUNT_DUNGEON:
                this.__internal__runDungeonHunt();
                break;
            case this.HuntStates.HUNT_SAFARI:
                this.__internal__runSafariHunt();
                break;
            case this.HuntStates.FARM_DUNGEON_TOKENS:
                this.__internal__runDungeonTokenFarm();
                break;
            case this.HuntStates.FARM_SAFARI_CURRENCY:
                this.__internal__runSafariCurrencyFarm();
                break;
            case this.HuntStates.HUNT_ROUTE:
            default:
                this.__internal__runRouteHunt();
                break;
        }
    }

    static __internal__handleShinyEncounter()
    {
        const enemy = this.__internal__getCurrentEnemyPokemon();
        const isShiny = !!enemy && enemy.shiny === true;

        if (!isShiny)
        {
            if (this.__internal__filterActive)
            {
                Automation.Utils.Pokeball.disableAutomationFilter();
                this.__internal__filterActive = false;
            }
            return;
        }

        const useMasterball = (Automation.Utils.LocalStorage.getValue(this.Settings.UseMasterball) === "true");
        if (!useMasterball)
        {
            return;
        }

        const masterballCount = this.__internal__getMasterballCount();
        if (masterballCount <= 0)
        {
            return;
        }

        if (!this.__internal__filterActive)
        {
            const applied = Automation.Utils.Pokeball.catchOnlyShinyWith(GameConstants.Pokeball.Masterball, false);
            if (applied)
            {
                this.__internal__filterActive = true;
            }
        }
    }

    static __internal__autoAdvanceRoute()
    {
        if (this.__internal__state !== this.HuntStates.HUNT_ROUTE)
        {
            return;
        }

        if (Automation.Utils.LocalStorage.getValue(this.Settings.AutoAdvanceRoutes) !== "true")
        {
            return;
        }

        if (Automation.Utils.isInInstanceState() || (player.route === 0))
        {
            return;
        }

        // Avoid jumping during active catches
        if ((App.game.gameState === GameConstants.GameState.fighting)
            && (typeof Battle !== "undefined")
            && (typeof Battle.catching === "function")
            && Battle.catching())
        {
            return;
        }

        if (!this.__internal__isRouteShinyComplete(player.route, player.region))
        {
            return;
        }

        const now = Date.now();
        if ((now - this.__internal__lastAutoAdvanceAt) < 2000)
        {
            return;
        }

        const nextRoute = this.__internal__findNextUncompletedShinyRoute(player.route, player.region);
        if (!nextRoute)
        {
            return;
        }

        this.__internal__lastAutoAdvanceAt = now;
        this.__internal__moveToRouteWithRegionChange(nextRoute);
    }

    static __internal__isRouteShinyComplete(route, region)
    {
        const pokemonList = RouteHelper.getAvailablePokemonList(route, region);

        return pokemonList.every((pokemonName) =>
        {
            const pokemonData = PokemonHelper.getPokemonByName(pokemonName);
            if (!pokemonData)
            {
                return false;
            }
            return Automation.Utils.getPokemonCaughtStatus(pokemonData.id) === CaughtStatus.CaughtShiny;
        });
    }

    static __internal__runRouteHunt()
    {
        if (Automation.Utils.isInInstanceState())
        {
            return;
        }

        if (this.__internal__isRouteShinyComplete(player.route, player.region))
        {
            this.__internal__autoAdvanceRoute();
        }

        this.__internal__moveToFirstUncompletedShinyRoute();
    }

    static __internal__getOrderedRoutes()
    {
        const routes = [...Routes.regionRoutes];
        routes.sort((a, b) =>
            {
                if (a.region !== b.region) return a.region - b.region;
                return a.number - b.number;
            });
        return routes;
    }

    static __internal__findFirstUncompletedShinyRoute()
    {
        const routes = this.__internal__getOrderedRoutes();

        for (const route of routes)
        {
            if (!Automation.Utils.Route.canMoveToRoute(route.number, route.region, route))
            {
                continue;
            }

            if (Automation.Utils.Route.isInMagikarpJumpIsland(route.region, route.subRegion))
            {
                continue;
            }

            if (!this.__internal__isRouteShinyComplete(route.number, route.region))
            {
                return route;
            }
        }

        return null;
    }

    static __internal__findNextUncompletedShinyRoute(currentRoute, currentRegion)
    {
        const routes = this.__internal__getOrderedRoutes();
        let foundCurrent = false;

        for (const route of routes)
        {
            if (!foundCurrent)
            {
                if ((route.region === currentRegion) && (route.number === currentRoute))
                {
                    foundCurrent = true;
                }
                continue;
            }

            if (!Automation.Utils.Route.canMoveToRoute(route.number, route.region, route))
            {
                continue;
            }

            if (Automation.Utils.Route.isInMagikarpJumpIsland(route.region, route.subRegion))
            {
                continue;
            }

            if (!this.__internal__isRouteShinyComplete(route.number, route.region))
            {
                return route;
            }
        }

        // If nothing found after current route, wrap from the beginning
        for (const route of routes)
        {
            if (!Automation.Utils.Route.canMoveToRoute(route.number, route.region, route))
            {
                continue;
            }

            if (Automation.Utils.Route.isInMagikarpJumpIsland(route.region, route.subRegion))
            {
                continue;
            }

            if (!this.__internal__isRouteShinyComplete(route.number, route.region))
            {
                return route;
            }
        }

        return null;
    }

    static __internal__moveToFirstUncompletedShinyRoute()
    {
        if (Automation.Utils.isInInstanceState())
        {
            return;
        }

        const targetRoute = this.__internal__findFirstUncompletedShinyRoute();
        if (!targetRoute)
        {
            return;
        }

        this.__internal__moveToRouteWithRegionChange(targetRoute);
    }

    static __internal__moveToRouteWithRegionChange(route)
    {
        if (!route)
        {
            return;
        }

        if (route.region !== player.region)
        {
            const dockTownName = GameConstants.DockTowns[route.region];
            if (dockTownName)
            {
                Automation.Utils.Route.moveToTown(dockTownName);
            }
        }

        Automation.Utils.Route.moveToRoute(route.number, route.region);
    }

    static __internal__updateHuntState()
    {
        if (this.__internal__state === this.HuntStates.FARM_DUNGEON_TOKENS)
        {
            if (this.__internal__canAffordCurrentDungeon())
            {
                this.__internal__state = this.HuntStates.HUNT_DUNGEON;
            }
            return;
        }

        if (this.__internal__state === this.HuntStates.FARM_SAFARI_CURRENCY)
        {
            if (this.__internal__canAffordSafari())
            {
                this.__internal__state = this.HuntStates.HUNT_SAFARI;
            }
            return;
        }

        const hasDungeonTargets = this.__internal__findDungeonWithMissingShiny() !== null;
        const hasSafariTargets = this.__internal__findSafariWithMissingShiny() !== null;

        if (hasDungeonTargets)
        {
            this.__internal__state = this.HuntStates.HUNT_DUNGEON;
        }
        else if (hasSafariTargets)
        {
            this.__internal__state = this.HuntStates.HUNT_SAFARI;
        }
        else
        {
            this.__internal__state = this.HuntStates.HUNT_ROUTE;
        }
    }

    static __internal__runDungeonHunt()
    {
        if (Automation.Utils.isInInstanceState()
            && App.game.gameState !== GameConstants.GameState.dungeon)
        {
            return;
        }

        if (!App.game?.keyItems?.hasKeyItem?.(KeyItemType.Dungeon_ticket))
        {
            this.__internal__debugLog("Dungeon ticket missing, falling back to route hunt.");
            this.__internal__state = this.HuntStates.HUNT_ROUTE;
            return;
        }

        if (this.__internal__currentDungeonTarget
            && this.__internal__isDungeonShinyCompleted(this.__internal__currentDungeonTarget.dungeon))
        {
            Automation.Dungeon.stopAfterThisRun();
            this.__internal__currentDungeonTarget = null;
        }

        if (!this.__internal__currentDungeonTarget)
        {
            this.__internal__currentDungeonTarget = this.__internal__findDungeonWithMissingShiny();
        }

        if (!this.__internal__currentDungeonTarget)
        {
            this.__internal__state = this.HuntStates.HUNT_ROUTE;
            return;
        }

        if (!this.__internal__canAffordCurrentDungeon())
        {
            this.__internal__state = this.HuntStates.FARM_DUNGEON_TOKENS;
            return;
        }

        const dungeonTownName = this.__internal__currentDungeonTarget.dungeon.name;
        if (!Automation.Utils.Route.isPlayerInTown(dungeonTownName))
        {
            Automation.Utils.Route.moveToTown(dungeonTownName);
            return;
        }

        Automation.Utils.LocalStorage.setValue(Automation.Dungeon.Settings.StopOnPokedex, true);
        Automation.Dungeon.setCatchMode(1); // UncaughtShiny
        Automation.Dungeon.AutomationRequestedMode = Automation.Dungeon.InternalModes.ForcePokemonFight;
        Automation.Menu.forceAutomationState(Automation.Dungeon.Settings.FeatureEnabled, true);
    }

    static __internal__runSafariHunt()
    {
        const safariTarget = this.__internal__findSafariWithMissingShiny();
        if (!safariTarget)
        {
            this.__internal__state = this.HuntStates.HUNT_ROUTE;
            return;
        }

        this.__internal__currentSafariTarget = safariTarget;

        if (!this.__internal__canAffordSafari())
        {
            this.__internal__state = this.HuntStates.FARM_SAFARI_CURRENCY;
            return;
        }

        Automation.Menu.forceAutomationState(Automation.Safari.Settings.FeatureEnabled, true);
    }

    static __internal__runDungeonTokenFarm()
    {
        if (Automation.Utils.isInInstanceState())
        {
            return;
        }

        const ball = this.__internal__selectAvailableBall(
            this.Settings.DungeonTokenFarmBall,
            this.Settings.DungeonTokenFarmFallbackBall);

        Automation.Utils.Pokeball.catchEverythingWith(ball);

        const routeMode = Automation.Utils.LocalStorage.getValue(this.Settings.DungeonTokenFarmRouteMode);
        if (routeMode !== "auto")
        {
            Automation.Utils.Route.moveToHighestDungeonTokenIncomeRoute(ball);
        }
    }

    static __internal__runSafariCurrencyFarm()
    {
        if (Automation.Utils.isInInstanceState())
        {
            return;
        }

        const ball = this.__internal__selectAvailableBall(
            this.Settings.SafariCurrencyFarmBall,
            this.Settings.SafariCurrencyFarmFallbackBall);

        Automation.Utils.Pokeball.catchEverythingWith(ball);

        const routeMode = Automation.Utils.LocalStorage.getValue(this.Settings.SafariCurrencyFarmRouteMode);
        if (routeMode !== "auto")
        {
            this.__internal__moveToBestSafariCurrencyRoute(ball);
        }
    }

    static __internal__isDungeonShinyCompleted(dungeon)
    {
        if (!dungeon)
        {
            return true;
        }

        try
        {
            return DungeonRunner.dungeonCompleted(dungeon, true);
        }
        catch (error)
        {
            this.__internal__debugLog(`Failed to read dungeon shiny completion: ${error}`);
            return false;
        }
    }

    static __internal__findDungeonWithMissingShiny()
    {
        const dungeonNames = Object.keys(dungeonList);
        const ordered = dungeonNames
            .map((name) => ({ name, town: TownList[name], dungeon: dungeonList[name] }))
            .filter((entry) => entry.town && entry.dungeon)
            .sort((a, b) =>
                {
                    if (a.town.region !== b.town.region) return a.town.region - b.town.region;
                    return a.name.localeCompare(b.name);
                });

        for (const entry of ordered)
        {
            if (!Automation.Utils.Route.canMoveToTown(entry.town))
            {
                continue;
            }

            if (!this.__internal__isDungeonShinyCompleted(entry.dungeon))
            {
                return entry;
            }
        }

        return null;
    }

    static __internal__findSafariWithMissingShiny()
    {
        if (typeof Safari === "undefined")
        {
            return null;
        }

        if (typeof SafariPokemonList !== "undefined")
        {
            const missing = SafariPokemonList?.some?.((pokemon) =>
            {
                const pokemonData = PokemonHelper.getPokemonByName(pokemon?.name ?? pokemon);
                if (!pokemonData)
                {
                    return false;
                }
                return Automation.Utils.getPokemonCaughtStatus(pokemonData.id) !== CaughtStatus.CaughtShiny;
            });

            if (missing)
            {
                return { name: "Safari" };
            }
        }

        return null;
    }

    static __internal__canAffordCurrentDungeon()
    {
        if (!this.__internal__currentDungeonTarget)
        {
            return false;
        }

        const cost = this.__internal__currentDungeonTarget.dungeon.tokenCost ?? 0;
        return App.game.wallet.currencies[GameConstants.Currency.dungeonToken]() >= cost;
    }

    static __internal__canAffordSafari()
    {
        const safariCurrency = this.__internal__getSafariCurrency();
        if (!safariCurrency)
        {
            return true;
        }

        return App.game.wallet.currencies[safariCurrency]() > 0;
    }

    static __internal__getSafariCurrency()
    {
        if (GameConstants?.Currency?.safariTicket !== undefined)
        {
            return GameConstants.Currency.safariTicket;
        }

        if (GameConstants?.Currency?.SafariTicket !== undefined)
        {
            return GameConstants.Currency.SafariTicket;
        }

        return null;
    }

    static __internal__moveToBestSafariCurrencyRoute(ballTypeToUse)
    {
        const safariCurrency = this.__internal__getSafariCurrency();
        if (!safariCurrency)
        {
            this.__internal__debugLog("Safari currency not detected, falling back to best EXP route.");
            Automation.Utils.Route.moveToBestRouteForExp();
            return;
        }

        if (typeof PokemonFactory?.routeSafariTickets === "function")
        {
            let bestRoute = null;
            let bestRegion = null;
            let bestIncome = 0;

            const playerClickAttack = Automation.Utils.Battle.calculateClickAttack();
            const totalAtkPerSecondByRegion = Automation.Utils.Battle.getPlayerWorstAttackPerSecondForAllRegions(playerClickAttack);
            const catchTimeTicks = App.game.pokeballs.calculateCatchTime(ballTypeToUse) / 50;
            const safariBonus = App.game.wallet.calcBonus(new Amount(1, safariCurrency));
            const pokeballBonus = App.game.pokeballs.getCatchBonus(ballTypeToUse);
            const oakBonus = App.game.oakItems.calculateBonus(OakItemType.Magic_Ball);

            for (const route of Routes.regionRoutes)
            {
                if (!Automation.Utils.Route.canMoveToRoute(route.number, route.region, route))
                {
                    continue;
                }

                if (Automation.Utils.Route.isInMagikarpJumpIsland(route.region, route.subRegion))
                {
                    continue;
                }

                const pokemons = RouteHelper.getAvailablePokemonList(route.number, route.region);
                let currentRouteRate = 0;
                for (const pokemon of pokemons)
                {
                    currentRouteRate += PokemonFactory.catchRateHelper(pokemonMap[pokemon].catchRate, true);
                }

                currentRouteRate /= pokemons.length;
                currentRouteRate += pokeballBonus + oakBonus;

                let routeIncome = PokemonFactory.routeSafariTickets(route.number, route.region)
                    * safariBonus * (currentRouteRate / 100);

                const routeAvgHp = PokemonFactory.routeHealth(route.number, route.region);
                const nbGameTickToDefeat = Automation.Utils.Battle.getGameTickCountNeededToDefeatPokemon(
                    routeAvgHp, playerClickAttack, totalAtkPerSecondByRegion.get(route.region));
                routeIncome = (routeIncome / (nbGameTickToDefeat + catchTimeTicks));

                if (Math.ceil(routeIncome * 1000) >= Math.ceil(bestIncome * 1000))
                {
                    bestIncome = routeIncome;
                    bestRoute = route.number;
                    bestRegion = route.region;
                }
            }

            if (bestRoute !== null)
            {
                Automation.Utils.Route.moveToRoute(bestRoute, bestRegion);
                return;
            }
        }

        this.__internal__debugLog("Safari ticket route income not available, falling back to best EXP route.");
        Automation.Utils.Route.moveToBestRouteForExp();
    }

    static __internal__selectAvailableBall(primaryKey, fallbackKey)
    {
        const primary = parseInt(Automation.Utils.LocalStorage.getValue(primaryKey));
        const fallback = parseInt(Automation.Utils.LocalStorage.getValue(fallbackKey));

        if (App.game.pokeballs.getBallQuantity(primary) > 0)
        {
            return primary;
        }

        if (App.game.pokeballs.getBallQuantity(fallback) > 0)
        {
            return fallback;
        }

        return GameConstants.Pokeball.Pokeball;
    }

    static __internal__debugLog(message)
    {
        if (Automation.Utils.LocalStorage.getValue(this.Settings.DebugTelemetry) !== "true")
        {
            return;
        }

        console.log(`[${GameConstants.formatDate(new Date())}] [Shiny] ${message}`);
    }

    static __internal__getMasterballCount()
    {
        if (App && App.game && App.game.pokeballs && typeof App.game.pokeballs.getBallQuantity === "function")
        {
            return App.game.pokeballs.getBallQuantity(GameConstants.Pokeball.Masterball);
        }

        const ball = App && App.game && App.game.pokeballs
            && App.game.pokeballs.pokeballs
            && App.game.pokeballs.pokeballs[GameConstants.Pokeball.Masterball];

        if (ball && typeof ball.quantity === "function")
        {
            return ball.quantity();
        }

        return 0;
    }

    static __internal__getCurrentEnemyPokemon()
    {
        const getEnemy = function(battleObj)
        {
            if (!battleObj) return null;
            if (typeof battleObj.enemyPokemon === "function") return battleObj.enemyPokemon();
            return battleObj.enemyPokemon || null;
        };

        if (App.game.gameState === GameConstants.GameState.fighting && typeof Battle !== "undefined")
        {
            return getEnemy(Battle);
        }

        if (App.game.gameState === GameConstants.GameState.dungeon && typeof DungeonBattle !== "undefined")
        {
            return getEnemy(DungeonBattle);
        }

        if (App.game.gameState === GameConstants.GameState.safari && typeof SafariBattle !== "undefined")
        {
            return getEnemy(SafariBattle);
        }

        if (App.game.gameState === GameConstants.GameState.temporaryBattle && typeof TemporaryBattleBattle !== "undefined")
        {
            return getEnemy(TemporaryBattleBattle);
        }

        return null;
    }
}
