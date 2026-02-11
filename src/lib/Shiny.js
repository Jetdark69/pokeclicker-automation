/**
 * @class The AutomationShiny regroups the shiny hunting helpers
 */
class AutomationShiny
{
    static Settings = {
        FeatureEnabled: "Shiny-Enabled",
        UseMasterball: "Shiny-UseMasterball",
        AutoAdvanceRoutes: "Shiny-AutoAdvanceRoutes",
        EnableDungeonHunt: "Shiny-EnableDungeonHunt",
        EnableSafariHunt: "Shiny-EnableSafariHunt",
        MinDungeonTokens: "Shiny-MinDungeonTokens",
        ResumeDungeonTokens: "Shiny-ResumeDungeonTokens",
        MinSafariCurrency: "Shiny-MinSafariCurrency",
        ResumeSafariCurrency: "Shiny-ResumeSafariCurrency",
        AllowAutoBestRoute: "Shiny-AllowAutoBestRoute",
        PreferredDungeonTokenRoute: "Shiny-PreferredDungeonTokenRoute",
        PreferredSafariCurrencyRoute: "Shiny-PreferredSafariCurrencyRoute",
        UseUltraBallsForFarming: "Shiny-UseUltraBallsForFarming",
        FallbackBallPriority: "Shiny-FallbackBallPriority",
        PreferredDungeonTown: "Shiny-PreferredDungeonTown",
        DebugTelemetry: "Shiny-DebugTelemetry"
    };

    static States = {
        HUNT_ROUTE: "HUNT_ROUTE",
        HUNT_DUNGEON: "HUNT_DUNGEON",
        HUNT_SAFARI: "HUNT_SAFARI",
        FARM_DUNGEON_TOKENS: "FARM_DUNGEON_TOKENS",
        FARM_SAFARI_CURRENCY: "FARM_SAFARI_CURRENCY"
    };

    static initialize(initStep)
    {
        if (initStep == Automation.InitSteps.BuildMenu)
        {
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.FeatureEnabled, false);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.UseMasterball, true);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.AutoAdvanceRoutes, true);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.EnableDungeonHunt, true);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.EnableSafariHunt, false);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.MinDungeonTokens, 5000);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.ResumeDungeonTokens, 7000);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.MinSafariCurrency, 200);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.ResumeSafariCurrency, 300);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.AllowAutoBestRoute, true);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.PreferredDungeonTokenRoute, "auto");
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.PreferredSafariCurrencyRoute, "auto");
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.UseUltraBallsForFarming, true);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.FallbackBallPriority, "Ultraball,Greatball,Pokeball");
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.PreferredDungeonTown, "auto");
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.DebugTelemetry, false);

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

            this.__internal__setState(this.__internal__computeDesiredState(), "feature enabled");

            if (this.__internal__state === this.States.HUNT_ROUTE)
            {
                this.__internal__moveToFirstUncompletedShinyRoute();
            }
        }
        else
        {
            if (this.__internal__loop != null)
            {
                clearInterval(this.__internal__loop);
                this.__internal__loop = null;
            }

            this.__internal__stopExternalAutomations();
            this.__internal__state = null;

            if (this.__internal__filterActive)
            {
                Automation.Utils.Pokeball.disableAutomationFilter();
                this.__internal__filterActive = false;
            }
        }
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__loop = null;
    static __internal__filterActive = false;
    static __internal__lastAutoAdvanceAt = 0;
    static __internal__state = null;
    static __internal__stateChangedAt = 0;
    static __internal__lastTelemetryAt = 0;

    static __internal__tick()
    {
        this.__internal__handleStateMachine();
        this.__internal__handleShinyEncounter();
        this.__internal__autoAdvanceRoute();
        this.__internal__runTelemetry();
    }

    static __internal__buildMenu()
    {
        const shinyTitle = '<img src="assets/images/pokeball/Pokeball-shiny.svg" height="16px" style="position:relative;bottom:1px;">'
            + '&nbsp;Shiny hunt';
        const shinyDiv = Automation.Menu.addCategory("shinyHuntSettings", shinyTitle);

        const enableButton = Automation.Menu.addAutomationButton("Enable shiny hunt",
                                                                  this.Settings.FeatureEnabled,
                                                                  "Automatically hunts shinies using routes, dungeons and safari",
                                                                  shinyDiv,
                                                                  true);
        enableButton.addEventListener("click", this.toggleShinyHunt.bind(this), false);

        const settingsPanel = Automation.Menu.addSettingPanel(enableButton.parentElement.parentElement, true);
        const titleDiv = Automation.Menu.createTitleElement("Shiny hunt advanced settings");
        titleDiv.style.marginBottom = "10px";
        settingsPanel.appendChild(titleDiv);

        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Use Masterball on shiny encounters",
                                                                this.Settings.UseMasterball,
                                                                "Only when a shiny encounter is active",
                                                                settingsPanel);
        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Auto-advance shiny routes",
                                                                this.Settings.AutoAdvanceRoutes,
                                                                "Moves to next route once current route shiny-dex is complete",
                                                                settingsPanel);
        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Enable dungeon shiny hunt",
                                                                this.Settings.EnableDungeonHunt,
                                                                "Allows shiny hunt mode to run dungeons",
                                                                settingsPanel);
        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Enable safari shiny hunt",
                                                                this.Settings.EnableSafariHunt,
                                                                "Allows shiny hunt mode to run safari",
                                                                settingsPanel);
        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Use Ultra Balls while farming",
                                                                this.Settings.UseUltraBallsForFarming,
                                                                "If unavailable, fallbackBallPriority will be used",
                                                                settingsPanel);
        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Allow auto best farming route",
                                                                this.Settings.AllowAutoBestRoute,
                                                                "If disabled, preferred routes will be used when set",
                                                                settingsPanel);
        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Debug telemetry",
                                                                this.Settings.DebugTelemetry,
                                                                "Prints mode + currency status every 10 seconds",
                                                                settingsPanel);

        this.__internal__addNumberSetting(settingsPanel, "Min dungeon tokens", this.Settings.MinDungeonTokens);
        this.__internal__addNumberSetting(settingsPanel, "Resume dungeon tokens", this.Settings.ResumeDungeonTokens);
        this.__internal__addNumberSetting(settingsPanel, "Min safari currency", this.Settings.MinSafariCurrency);
        this.__internal__addNumberSetting(settingsPanel, "Resume safari currency", this.Settings.ResumeSafariCurrency);

        this.__internal__addTextSetting(settingsPanel, "Fallback ball priority", this.Settings.FallbackBallPriority,
                                        "Comma-separated list (for example: Ultraball,Greatball,Pokeball)");

        this.__internal__addDropDownRouteSetting(settingsPanel,
                                                 "Preferred dungeon token farming route",
                                                 this.Settings.PreferredDungeonTokenRoute);
        this.__internal__addDropDownRouteSetting(settingsPanel,
                                                 "Preferred safari currency farming route",
                                                 this.Settings.PreferredSafariCurrencyRoute);

        this.__internal__addDungeonSetting(settingsPanel, "Preferred dungeon", this.Settings.PreferredDungeonTown);
    }

    static __internal__addNumberSetting(parent, label, storageKey)
    {
        const wrapper = document.createElement("div");
        wrapper.style.marginBottom = "4px";
        wrapper.style.paddingLeft = "10px";

        const title = document.createElement("span");
        title.innerText = `${label}: `;
        wrapper.appendChild(title);

        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.style.width = "85px";
        input.value = Automation.Utils.LocalStorage.getValue(storageKey);
        input.onchange = function()
        {
            const parsed = Math.max(0, parseInt(input.value));
            Automation.Utils.LocalStorage.setValue(storageKey, isNaN(parsed) ? 0 : parsed);
            input.value = Automation.Utils.LocalStorage.getValue(storageKey);
        };
        wrapper.appendChild(input);

        parent.appendChild(wrapper);
    }

    static __internal__addTextSetting(parent, label, storageKey, tooltip = "")
    {
        const wrapper = document.createElement("div");
        wrapper.style.marginBottom = "4px";
        wrapper.style.paddingLeft = "10px";

        const title = document.createElement("span");
        title.innerText = `${label}: `;
        wrapper.appendChild(title);

        const input = document.createElement("input");
        input.type = "text";
        input.style.width = "220px";
        input.value = Automation.Utils.LocalStorage.getValue(storageKey);
        input.onchange = function() { Automation.Utils.LocalStorage.setValue(storageKey, input.value.trim()); };
        wrapper.appendChild(input);

        if (tooltip !== "")
        {
            wrapper.classList.add("hasAutomationTooltip");
            wrapper.setAttribute("automation-tooltip-text", tooltip);
        }

        parent.appendChild(wrapper);
    }

    static __internal__addDropDownRouteSetting(parent, label, storageKey)
    {
        const wrapper = document.createElement("div");
        wrapper.style.marginBottom = "4px";
        wrapper.style.paddingLeft = "10px";

        const title = document.createElement("span");
        title.innerText = `${label}: `;
        wrapper.appendChild(title);

        const select = Automation.Menu.createDropDownListElement(storageKey);
        select.style.width = "220px";

        const autoOption = document.createElement("option");
        autoOption.value = "auto";
        autoOption.text = "Auto";
        select.appendChild(autoOption);

        for (const route of this.__internal__getOrderedRoutes())
        {
            const option = document.createElement("option");
            option.value = `${route.region}:${route.number}`;
            option.text = `${GameConstants.Region[route.region]} - Route ${route.number}`;
            select.appendChild(option);
        }

        select.value = Automation.Utils.LocalStorage.getValue(storageKey) ?? "auto";
        select.onchange = function() { Automation.Utils.LocalStorage.setValue(storageKey, select.value); };

        wrapper.appendChild(select);
        parent.appendChild(wrapper);
    }

    static __internal__addDungeonSetting(parent, label, storageKey)
    {
        const wrapper = document.createElement("div");
        wrapper.style.marginBottom = "4px";
        wrapper.style.paddingLeft = "10px";

        const title = document.createElement("span");
        title.innerText = `${label}: `;
        wrapper.appendChild(title);

        const select = Automation.Menu.createDropDownListElement(storageKey);
        select.style.width = "220px";

        const autoOption = document.createElement("option");
        autoOption.value = "auto";
        autoOption.text = "Auto (last town / first unlocked)";
        select.appendChild(autoOption);

        const dungeonTowns = Object.values(TownList).filter((town) => Automation.Utils.isInstanceOf(town, "DungeonTown"));
        dungeonTowns.sort((a, b) => a.region - b.region || a.subRegion - b.subRegion || a.name.localeCompare(b.name));

        for (const town of dungeonTowns)
        {
            const option = document.createElement("option");
            option.value = town.name;
            option.text = `${GameConstants.Region[town.region]} - ${town.name}`;
            select.appendChild(option);
        }

        select.value = Automation.Utils.LocalStorage.getValue(storageKey) ?? "auto";
        select.onchange = function() { Automation.Utils.LocalStorage.setValue(storageKey, select.value); };

        wrapper.appendChild(select);
        parent.appendChild(wrapper);
    }


    static __internal__computeDesiredState()
    {
        const tokens = this.__internal__getDungeonTokens();
        const safariCurrency = this.__internal__getSafariCurrency();

        const minDungeonTokens = this.__internal__readNumericSetting(this.Settings.MinDungeonTokens, 5000);
        const resumeDungeonTokens = Math.max(this.__internal__readNumericSetting(this.Settings.ResumeDungeonTokens, 7000), minDungeonTokens + 1);
        const minSafariCurrency = this.__internal__readNumericSetting(this.Settings.MinSafariCurrency, 200);
        const resumeSafariCurrency = Math.max(this.__internal__readNumericSetting(this.Settings.ResumeSafariCurrency, 300), minSafariCurrency + 1);

        const dungeonEnabled = (Automation.Utils.LocalStorage.getValue(this.Settings.EnableDungeonHunt) === "true")
            && this.__internal__isDungeonUnlocked();
        const safariEnabled = (Automation.Utils.LocalStorage.getValue(this.Settings.EnableSafariHunt) === "true")
            && this.__internal__isSafariUnlocked();

        if (this.__internal__state === this.States.FARM_DUNGEON_TOKENS)
        {
            return (tokens >= resumeDungeonTokens) ? this.States.HUNT_DUNGEON : this.States.FARM_DUNGEON_TOKENS;
        }

        if (this.__internal__state === this.States.FARM_SAFARI_CURRENCY)
        {
            return (safariCurrency >= resumeSafariCurrency) ? this.States.HUNT_SAFARI : this.States.FARM_SAFARI_CURRENCY;
        }

        if (dungeonEnabled)
        {
            return (tokens < minDungeonTokens) ? this.States.FARM_DUNGEON_TOKENS : this.States.HUNT_DUNGEON;
        }

        if (safariEnabled)
        {
            return (safariCurrency < minSafariCurrency) ? this.States.FARM_SAFARI_CURRENCY : this.States.HUNT_SAFARI;
        }

        return this.States.HUNT_ROUTE;
    }

    static __internal__handleStateMachine()
    {
        const now = Date.now();
        const canTransition = ((now - this.__internal__stateChangedAt) > 3000);

        if ((Automation.Utils.LocalStorage.getValue(this.Settings.EnableDungeonHunt) === "true") && !this.__internal__isDungeonUnlocked())
        {
            this.__internal__log("Dungeon hunt requested but dungeon ticket is locked");
        }

        if ((Automation.Utils.LocalStorage.getValue(this.Settings.EnableSafariHunt) === "true") && !this.__internal__isSafariUnlocked())
        {
            this.__internal__log("Safari hunt requested but safari is locked");
        }

        const desiredState = this.__internal__computeDesiredState();

        if ((this.__internal__state !== desiredState) && canTransition)
        {
            this.__internal__setState(desiredState, "state recomputed");
        }

        this.__internal__runCurrentState();
    }

    static __internal__runCurrentState()
    {
        switch (this.__internal__state)
        {
            case this.States.HUNT_DUNGEON:
                this.__internal__runDungeonHunt();
                break;
            case this.States.HUNT_SAFARI:
                this.__internal__runSafariHunt();
                break;
            case this.States.FARM_DUNGEON_TOKENS:
                this.__internal__runDungeonTokenFarm();
                break;
            case this.States.FARM_SAFARI_CURRENCY:
                this.__internal__runSafariCurrencyFarm();
                break;
            case this.States.HUNT_ROUTE:
            default:
                this.__internal__stopExternalAutomations();
                break;
        }
    }

    static __internal__setState(newState, reason)
    {
        if (this.__internal__state === newState)
        {
            return;
        }

        this.__internal__state = newState;
        this.__internal__stateChangedAt = Date.now();
        this.__internal__log(`State -> ${newState} | reason=${reason} | tokens=${this.__internal__getDungeonTokens()} | safari=${this.__internal__getSafariCurrency()}`);
    }

    static __internal__stopExternalAutomations()
    {
        if (Automation.Utils.LocalStorage.getValue(Automation.Dungeon.Settings.FeatureEnabled) === "true")
        {
            Automation.Dungeon.stopAfterThisRun();
            Automation.Menu.forceAutomationState(Automation.Dungeon.Settings.FeatureEnabled, false);
        }

        if (Automation.Utils.LocalStorage.getValue(Automation.Safari.Settings.FeatureEnabled) === "true")
        {
            Automation.Menu.forceAutomationState(Automation.Safari.Settings.FeatureEnabled, false);
        }
    }


    static __internal__isDungeonShinyCompleted(dungeonTown)
    {
        if (!dungeonTown || !dungeonTown.dungeon || (typeof DungeonRunner === "undefined")
            || (typeof DungeonRunner.dungeonCompleted !== "function"))
        {
            return false;
        }

        return DungeonRunner.dungeonCompleted(dungeonTown.dungeon, true);
    }

    static __internal__findDungeonWithMissingShiny()
    {
        const preferredDungeonTown = Automation.Utils.LocalStorage.getValue(this.Settings.PreferredDungeonTown);
        if ((preferredDungeonTown != null) && (preferredDungeonTown !== "auto") && TownList[preferredDungeonTown])
        {
            const preferredTown = TownList[preferredDungeonTown];
            if (preferredTown.isUnlocked() && !this.__internal__isDungeonShinyCompleted(preferredTown))
            {
                return preferredTown;
            }
        }

        const unlockedDungeons = Object.values(TownList).filter((town) =>
            Automation.Utils.isInstanceOf(town, "DungeonTown") && town.isUnlocked());
        unlockedDungeons.sort((a, b) => a.region - b.region || a.subRegion - b.subRegion || a.name.localeCompare(b.name));

        return unlockedDungeons.find((town) => !this.__internal__isDungeonShinyCompleted(town)) ?? null;
    }

    static __internal__runDungeonHunt()
    {
        this.__internal__disableFarmPokeballFilter();

        if (Automation.Utils.LocalStorage.getValue(Automation.Safari.Settings.FeatureEnabled) === "true")
        {
            Automation.Menu.forceAutomationState(Automation.Safari.Settings.FeatureEnabled, false);
        }

        if (!this.__internal__isDungeonUnlocked())
        {
            return;
        }

        const targetTown = this.__internal__findDungeonWithMissingShiny();

        if (!targetTown)
        {
            this.__internal__log("No dungeon with missing shiny found, returning to route shiny hunt");
            this.__internal__setState(this.States.HUNT_ROUTE, "all unlocked dungeons shiny completed");
            return;
        }

        // Force dungeon shiny completion workflow
        Automation.Utils.LocalStorage.setValue(Automation.Dungeon.Settings.StopOnPokedex, true);
        Automation.Dungeon.setCatchMode(1); // UncaughtShiny
        Automation.Dungeon.AutomationRequestedMode = Automation.Dungeon.InternalModes.ForcePokemonFight;

        if (!Automation.Utils.Route.isPlayerInTown(targetTown.name))
        {
            this.__internal__log(`Moving to dungeon ${targetTown.name} for missing shiny completion`);
            Automation.Utils.Route.moveToTown(targetTown.name);
            return;
        }

        if (Automation.Utils.LocalStorage.getValue(Automation.Dungeon.Settings.FeatureEnabled) !== "true")
        {
            this.__internal__log(`Starting auto dungeon shiny hunt in ${targetTown.name}`);
            Automation.Menu.forceAutomationState(Automation.Dungeon.Settings.FeatureEnabled, true);
        }
    }

    static __internal__runSafariHunt()
    {
        this.__internal__disableFarmPokeballFilter();

        if (Automation.Utils.LocalStorage.getValue(Automation.Dungeon.Settings.FeatureEnabled) === "true")
        {
            Automation.Dungeon.stopAfterThisRun();
            Automation.Menu.forceAutomationState(Automation.Dungeon.Settings.FeatureEnabled, false);
        }

        if (!this.__internal__isSafariUnlocked())
        {
            return;
        }

        if (Automation.Utils.LocalStorage.getValue(Automation.Safari.Settings.FeatureEnabled) !== "true")
        {
            Automation.Menu.forceAutomationState(Automation.Safari.Settings.FeatureEnabled, true);
        }
    }

    static __internal__runDungeonTokenFarm()
    {
        this.__internal__stopExternalAutomations();
        this.__internal__setupFarmPokeballs();

        const targetRoute = this.__internal__findPreferredRoute(this.Settings.PreferredDungeonTokenRoute,
                                                                this.__internal__findBestDungeonTokenRoute.bind(this));
        if (targetRoute)
        {
            this.__internal__log(`Farming dungeon tokens on ${GameConstants.Region[targetRoute.region]} route ${targetRoute.number} with ${GameConstants.Pokeball[this.__internal__getBestFarmBall()]}`);
            this.__internal__moveToRouteWithRegionChange(targetRoute);
        }
    }

    static __internal__runSafariCurrencyFarm()
    {
        this.__internal__stopExternalAutomations();
        this.__internal__setupFarmPokeballs();

        const targetRoute = this.__internal__findPreferredRoute(this.Settings.PreferredSafariCurrencyRoute,
                                                                this.__internal__findBestSafariCurrencyRoute.bind(this));
        if (targetRoute)
        {
            this.__internal__log(`Farming safari currency on ${GameConstants.Region[targetRoute.region]} route ${targetRoute.number} with ${GameConstants.Pokeball[this.__internal__getBestFarmBall()]}`);
            this.__internal__moveToRouteWithRegionChange(targetRoute);
        }
    }

    static __internal__findPreferredRoute(settingKey, autoRouteProvider)
    {
        const preferredRoute = Automation.Utils.LocalStorage.getValue(settingKey);
        const allowAutoRoute = (Automation.Utils.LocalStorage.getValue(this.Settings.AllowAutoBestRoute) === "true");

        if ((preferredRoute != null) && (preferredRoute !== "auto"))
        {
            const routeParts = preferredRoute.split(":");
            if (routeParts.length === 2)
            {
                const region = parseInt(routeParts[0]);
                const number = parseInt(routeParts[1]);
                if (Automation.Utils.Route.canMoveToRoute(number, region))
                {
                    return { region, number };
                }
            }
        }

        if (!allowAutoRoute)
        {
            return null;
        }

        return autoRouteProvider();
    }

    static __internal__findBestDungeonTokenRoute()
    {
        let bestRoute = null;
        let bestRouteIncome = 0;

        const selectedBall = this.__internal__getBestFarmBall();
        const playerClickAttack = Automation.Utils.Battle.calculateClickAttack();
        const totalAtkPerSecondByRegion = Automation.Utils.Battle.getPlayerWorstAttackPerSecondForAllRegions(playerClickAttack);
        const catchTimeTicks = App.game.pokeballs.calculateCatchTime(selectedBall ?? GameConstants.Pokeball.Pokeball) / 50

        const dungeonTokenBonus = App.game.wallet.calcBonus(new Amount(1, GameConstants.Currency.dungeonToken));
        const pokeballBonus = App.game.pokeballs.getCatchBonus(selectedBall);
        const oakBonus = App.game.oakItems.calculateBonus(OakItemType.Magic_Ball);

        for (const route of Routes.regionRoutes)
        {
            if (!Automation.Utils.Route.canMoveToRoute(route.number, route.region, route)
                || Automation.Utils.Route.isInMagikarpJumpIsland(route.region, route.subRegion))
            {
                continue;
            }

            const pokemons = RouteHelper.getAvailablePokemonList(route.number, route.region);
            let currentRouteRate = 0;
            for (const pokemon of pokemons)
            {
                currentRouteRate += PokemonFactory.catchRateHelper(pokemonMap[pokemon].catchRate, true);
            }

            currentRouteRate = (currentRouteRate / pokemons.length) + pokeballBonus + oakBonus;

            const rawIncome = PokemonFactory.routeDungeonTokens(route.number, route.region);
            const routeAvgHp = PokemonFactory.routeHealth(route.number, route.region);
            const nbGameTickToDefeat = Automation.Utils.Battle.getGameTickCountNeededToDefeatPokemon(
                routeAvgHp, playerClickAttack, totalAtkPerSecondByRegion.get(route.region));

            const routeIncome = (rawIncome * dungeonTokenBonus * (currentRouteRate / 100)) / (nbGameTickToDefeat + catchTimeTicks);

            if (Math.ceil(routeIncome * 1000) >= Math.ceil(bestRouteIncome * 1000))
            {
                bestRoute = route;
                bestRouteIncome = routeIncome;
            }
        }

        return bestRoute;
    }

    static __internal__findBestSafariCurrencyRoute()
    {
        let bestRoute = null;
        let bestRate = 0;

        const selectedBall = this.__internal__getBestFarmBall();
        const playerClickAttack = Automation.Utils.Battle.calculateClickAttack();
        const totalAtkPerSecondByRegion = Automation.Utils.Battle.getPlayerWorstAttackPerSecondForAllRegions(playerClickAttack);
        const catchTimeTicks = App.game.pokeballs.calculateCatchTime(selectedBall ?? GameConstants.Pokeball.Pokeball) / 50
        const pokeballBonus = App.game.pokeballs.getCatchBonus(selectedBall);
        const oakBonus = App.game.oakItems.calculateBonus(OakItemType.Magic_Ball);

        for (const route of Routes.regionRoutes)
        {
            if (!Automation.Utils.Route.canMoveToRoute(route.number, route.region, route)
                || Automation.Utils.Route.isInMagikarpJumpIsland(route.region, route.subRegion))
            {
                continue;
            }

            const pokemons = RouteHelper.getAvailablePokemonList(route.number, route.region);
            let catchRateAverage = 0;
            for (const pokemon of pokemons)
            {
                catchRateAverage += PokemonFactory.catchRateHelper(pokemonMap[pokemon].catchRate, true);
            }

            catchRateAverage = (catchRateAverage / pokemons.length) + pokeballBonus + oakBonus;
            const expectedCatchPerEncounter = catchRateAverage / 100;

            const routeAvgHp = PokemonFactory.routeHealth(route.number, route.region);
            const nbGameTickToDefeat = Automation.Utils.Battle.getGameTickCountNeededToDefeatPokemon(
                routeAvgHp, playerClickAttack, totalAtkPerSecondByRegion.get(route.region));

            // Heuristic: maximize captured encounters per game tick
            const estimatedRate = expectedCatchPerEncounter / (nbGameTickToDefeat + catchTimeTicks);
            if (Math.ceil(estimatedRate * 1000000) >= Math.ceil(bestRate * 1000000))
            {
                bestRoute = route;
                bestRate = estimatedRate;
            }
        }

        return bestRoute;
    }

    static __internal__setupFarmPokeballs()
    {
        const selectedBall = this.__internal__getBestFarmBall();
        if (selectedBall == null)
        {
            this.__internal__log("No available pokeballs for farming filter");
            return;
        }

        Automation.Utils.Pokeball.catchEverythingWith(selectedBall);
        this.__internal__filterActive = true;
    }

    static __internal__disableFarmPokeballFilter()
    {
        if (this.__internal__filterActive)
        {
            Automation.Utils.Pokeball.disableAutomationFilter();
            this.__internal__filterActive = false;
        }
    }

    static __internal__getBestFarmBall()
    {
        const useUltraBalls = (Automation.Utils.LocalStorage.getValue(this.Settings.UseUltraBallsForFarming) === "true");
        if (useUltraBalls && (App.game.pokeballs.getBallQuantity(GameConstants.Pokeball.Ultraball) > 0))
        {
            return GameConstants.Pokeball.Ultraball;
        }

        const priorities = (Automation.Utils.LocalStorage.getValue(this.Settings.FallbackBallPriority) ?? "").split(",");
        for (let ballName of priorities)
        {
            ballName = ballName.trim();
            if (ballName === "")
            {
                continue;
            }

            const ballId = GameConstants.Pokeball[ballName];
            if ((ballId !== undefined) && (App.game.pokeballs.getBallQuantity(ballId) > 0))
            {
                return ballId;
            }
        }

        for (const ball of [ GameConstants.Pokeball.Greatball, GameConstants.Pokeball.Pokeball ])
        {
            if (App.game.pokeballs.getBallQuantity(ball) > 0)
            {
                return ball;
            }
        }

        return null;
    }

    static __internal__runTelemetry()
    {
        if (Automation.Utils.LocalStorage.getValue(this.Settings.DebugTelemetry) !== "true")
        {
            return;
        }

        const now = Date.now();
        if ((now - this.__internal__lastTelemetryAt) < 10000)
        {
            return;
        }

        this.__internal__lastTelemetryAt = now;
        const location = (player.route === 0) ? player.town.name : `${GameConstants.Region[player.region]} route ${player.route}`;
        const currentBall = this.__internal__getBestFarmBall();
        this.__internal__log(`Telemetry | state=${this.__internal__state} | location=${location} | tokens=${this.__internal__getDungeonTokens()} | safari=${this.__internal__getSafariCurrency()} | farmBall=${GameConstants.Pokeball[currentBall]}`);
    }

    static __internal__handleShinyEncounter()
    {
        const enemy = this.__internal__getCurrentEnemyPokemon();
        const isShiny = !!enemy && enemy.shiny === true;

        if (!isShiny)
        {
            if (this.__internal__filterActive && !this.__internal__isFarmingState())
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

    static __internal__isFarmingState()
    {
        return (this.__internal__state === this.States.FARM_DUNGEON_TOKENS)
            || (this.__internal__state === this.States.FARM_SAFARI_CURRENCY);
    }

    static __internal__autoAdvanceRoute()
    {
        if ((this.__internal__state !== this.States.HUNT_ROUTE)
            && !this.__internal__isFarmingState())
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

    static __internal__isDungeonUnlocked()
    {
        return (App?.game?.keyItems != null) && App.game.keyItems.hasKeyItem(KeyItemType.Dungeon_ticket);
    }

    static __internal__isSafariUnlocked()
    {
        return (typeof Safari !== "undefined") && (typeof Safari.canAccess === "function" ? Safari.canAccess() : true);
    }

    static __internal__getDungeonTokens()
    {
        return App.game.wallet.currencies[GameConstants.Currency.dungeonToken]();
    }

    static __internal__getSafariCurrency()
    {
        if (App.game.wallet?.currencies?.[GameConstants.Currency.questPoint])
        {
            return App.game.wallet.currencies[GameConstants.Currency.questPoint]();
        }

        if ((typeof Safari !== "undefined") && (typeof Safari.balls === "function"))
        {
            return Safari.balls();
        }

        return 0;
    }

    static __internal__readNumericSetting(settingName, defaultValue)
    {
        const parsed = parseInt(Automation.Utils.LocalStorage.getValue(settingName));
        return isNaN(parsed) ? defaultValue : parsed;
    }

    static __internal__log(message)
    {
        console.log(`[${GameConstants.formatDate(new Date())}] %cShiny:%c ${message}`,
                    "color:#f1c40f;font-weight:900;",
                    "color:inherit;");
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

        const targetRoute = this.__internal__findNextUncompletedShinyRoute(player.route, player.region);
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
