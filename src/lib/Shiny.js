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
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.FeatureEnabled, false);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.UseMasterball, true);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.AutoAdvanceRoutes, true);
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

            // Move immediately to the earliest available route with missing shiny
            this.__internal__moveToFirstUncompletedShinyRoute();
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

        const nextRoute = this.__internal__findNextUncompletedShinyRoute(player.route, player.region);
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

        const targetRoute = this.__internal__findNextUncompletedShinyRoute(player.route, player.region);
        if (!targetRoute)
        {
            return;
        }

        Automation.Utils.Route.moveToRoute(targetRoute.number, targetRoute.region);
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
