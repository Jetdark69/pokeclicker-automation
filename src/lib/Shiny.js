/**
 * @class The AutomationShiny regroups the shiny hunting helpers
 */
class AutomationShiny
{
    static Settings = {
        FeatureEnabled: "Shiny-Enabled",
        UseMasterball: "Shiny-UseMasterball",
        AutoAdvanceRoutes: "Shiny-AutoAdvanceRoutes"
    };

    static initialize(initStep)
    {
        if (initStep == Automation.InitSteps.BuildMenu)
        {
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.UseMasterball, true);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.AutoAdvanceRoutes, true);

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
        }
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__loop = null;
    static __internal__filterActive = false;
    static __internal__lastAutoAdvanceAt = 0;

    static __internal__buildMenu()
    {
        const container = document.createElement("div");

        const tooltip = "Auto-catch shiny encounters with a Masterball when available\n"
                      + "If no Masterball remains, keep the current ball selection\n"
                      + Automation.Menu.TooltipSeparator
                      + "Optional auto-advance when a route shiny-dex is complete";
        const button = Automation.Menu.addAutomationButton("Shiny hunt", this.Settings.FeatureEnabled, tooltip, container);
        button.addEventListener("click", this.toggleShinyHunt.bind(this), false);

        Automation.Menu.addSeparator(container);
        Automation.Menu.AutomationButtonsDiv.appendChild(container);

        const settingsPanel = Automation.Menu.addSettingPanel(button.parentElement.parentElement);
        const titleDiv = Automation.Menu.createTitleElement("Shiny hunt advanced settings");
        titleDiv.style.marginBottom = "10px";
        settingsPanel.appendChild(titleDiv);

        Automation.Menu.addLabeledAdvancedSettingsToggleButton(
            "Use Masterball when available",
            this.Settings.UseMasterball,
            "",
            settingsPanel
        );

        Automation.Menu.addLabeledAdvancedSettingsToggleButton(
            "Auto-advance route when all shinies are caught",
            this.Settings.AutoAdvanceRoutes,
            "",
            settingsPanel
        );
    }

    static __internal__tick()
    {
        this.__internal__handleShinyEncounter();
        this.__internal__autoAdvanceRoute();
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

        const nextRoute = this.__internal__findNextRouteInRegion(player.route, player.region);
        if (!nextRoute)
        {
            return;
        }

        this.__internal__lastAutoAdvanceAt = now;
        Automation.Utils.Route.moveToRoute(nextRoute.number, nextRoute.region);
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

    static __internal__findNextRouteInRegion(route, region)
    {
        const routes = Routes.regionRoutes.filter(r => r.region === region);
        const currentIndex = routes.findIndex(r => r.number === route);

        for (let i = currentIndex + 1; i < routes.length; i++)
        {
            if (routes[i].isUnlocked())
            {
                return routes[i];
            }
        }

        return null;
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
