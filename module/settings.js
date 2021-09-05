import { HealthConfig } from "./config/health.js";
import { RollConfig } from "./config/roll-config.js";
import { isMinimumCoreVersion } from "./lib.js";
import {CurrencyConfig} from "./config/currency.js";

export const registerSystemSettings = function() {
  /**
   * Track the system version upon which point a migration was last applied
   */
  game.settings.register("D35E", "systemMigrationVersion", {
    name: "System Migration Version",
    scope: "world",
    config: false,
    type: String,
    default: "0.0.0"
  });

  // Health configuration
  game.settings.registerMenu(isMinimumCoreVersion("0.5.6") ? "D35E" : "system",
    "healthConfig", {
      name: "SETTINGS.D35EHealthConfigName",
      label: "SETTINGS.D35EHealthConfigLabel",
      hint: "SETTINGS.D35EHealthConfigHint",
      icon: "fas fa-heartbeat",
      type: HealthConfig,
      restricted: true
    }
  );


  game.settings.registerMenu(isMinimumCoreVersion("0.5.6") ? "D35E" : "system",
    "rollConfig", {
      name: "SETTINGS.D35ERollConfigName",
      label: "SETTINGS.D35ERollConfigLabel",
      hint: "SETTINGS.D35ERollConfigHint",
      icon: "fas fa-dice",
      type: RollConfig,
      restricted: true
    }
  );


  game.settings.registerMenu(isMinimumCoreVersion("0.5.6") ? "D35E" : "system",
      "currencyConfig", {
        name: "SETTINGS.D35ECurrencyConfigName",
        label: "SETTINGS.D35ECurrencyConfigLabel",
        hint: "SETTINGS.D35ECurrencyConfigHint",
        icon: "fas fa-coins",
        type: CurrencyConfig,
        restricted: true
      }
  );

  game.settings.register("D35E", "healthConfig", {
    name: "SETTINGS.D35EHealthConfigName",
    scope: "world",
    default: HealthConfig.defaultSettings,
    type: Object,
    config: false,
    onChange: () => {
      game.actors.contents.forEach(o => { o.update({}); });
      Object.values(game.actors.tokens).forEach(o => { o.update({}); });
    }
  });


  game.settings.register("D35E", "rollConfig", {
    name: "SETTINGS.D35ERollConfigName",
    scope: "world",
    default: RollConfig.defaultSettings,
    type: Object,
    config: false
  });

  game.settings.register("D35E", "currencyConfig", {
    name: "SETTINGS.D35ECurrencyConfigName",
    scope: "world",
    default: CurrencyConfig.defaultSettings,
    type: Object,
    config: false,
    onChange: () => {
      game.actors.contents.forEach(o => { o.update({}); });
      Object.values(game.actors.tokens).forEach(o => { o.update({}); });
    }
  });


  game.settings.register("D35E", "autosizeWeapons", {
    name: "SETTINGS.D35EAutosizeWeaponsN",
    hint: "SETTINGS.D35EAutosizeWeaponsL",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
  });

  game.settings.register("D35E", "psionicsAreDifferent", {
    name: "SETTINGS.D35EPsionicsAreDifferentN",
    hint: "SETTINGS.D35EPsionicsAreDifferentL",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
  });

  /**
   * Register diagonal movement rule setting
   */
  game.settings.register("D35E", "diagonalMovement", {
    name: "SETTINGS.D35EDiagN",
    hint: "SETTINGS.D35EDiagL",
    scope: "world",
    config: true,
    default: "5105",
    type: String,
    choices: {
      "555": "SETTINGS.D35EDiagPHB",
      "5105": "SETTINGS.D35EDiagDMG"
    },
    onChange: rule => canvas.grid.diagonalRule = rule
  });

  /**
   * Experience rate
   */
  game.settings.register("D35E", "experienceRate", {
    name: "SETTINGS.D35EExpRateN",
    hint: "SETTINGS.D35EExpRateL",
    scope: "world",
    config: true,
    default: "medium",
    type: String,
    choices: {
      "slow": "Slow",
      "medium": "Medium",
      "fast": "Fast",
    },
    onChange: () => {
      [...game.actors.contents, ...Object.values(game.actors.tokens)].filter(o => {
        return o.data.type === "character";
      }).forEach(o => {
        o.update({});
        if (o.sheet != null && o.sheet._state > 0) o.sheet.render();
      });
    },
  });
  
  /**
   * System of Units
   */
  game.settings.register("D35E", "units", {
    name: "SETTINGS.D35EUnitsN",
    hint: "SETTINGS.D35EUnitsL",
    scope: "world",
    config: true,
    default: "imperial",
    type: String,
    choices: {
      "imperial": "Imperial (feet, lbs)",
      "metric": "Metric (meters, kg)"
    },
    onChange: () => {
      [...game.actors.contents, ...Object.values(game.actors.tokens)].filter(o => {
        return o.data.type === "character";
      }).forEach(o => {
        if (o.sheet != null && o.sheet._state > 0) o.sheet.render();
      });
    },
  });

  /**
   * Option to disable XP bar for session-based or story-based advancement.
   */
  game.settings.register("D35E", "disableExperienceTracking", {
    name: "SETTINGS.D35ENoExpN",
    hint: "SETTINGS.D35ENoExpL",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
  });

  /**
   * Option to display class features in other tabs as well
   */
  game.settings.register("D35E", "classFeaturesInTabs", {
    name: "SETTINGS.D35EClassFeaturesInTabsN",
    hint: "SETTINGS.D35EClassFeaturesInTabsL",
    scope: "client",
    config: true,
    default: false,
    type: Boolean,
  });

  /**
   * Option to allow the background skills optional ruleset.
   */
  game.settings.register("D35E", "allowBackgroundSkills", {
    name: "SETTINGS.D35EBackgroundSkillsN",
    hint: "SETTINGS.D35EBackgroundSkillsH",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: () => {
      game.actors.contents.forEach(o => { if (o.sheet && o.sheet.rendered) o.sheet.render(true); });
      Object.values(game.actors.tokens).forEach(o => { if (o.sheet && o.sheet.rendered) o.sheet.render(true); });
    },
  });

  /**
   * Option to use the Fractional Base Bonuses optional ruleset.
   */
  game.settings.register("D35E", "useFractionalBaseBonuses", {
    name: "SETTINGS.D35EFractionalBaseBonusesN",
    hint: "SETTINGS.D35EFractionalBaseBonusesH",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: () => {
      game.actors.contents.forEach(o => { o.update({}); });
      Object.values(game.actors.tokens).forEach(o => { o.update({}); });
    },
  });

  /**
   * Option to use automatically scale weapon attacks using BAB
   */
  game.settings.register("D35E", "autoScaleAttacksBab", {
    name: "SETTINGS.D35EAutoScaleAttackBABN",
    hint: "SETTINGS.D35EAutoScaleAttackBABH",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  game.settings.register("D35E", "allowNoAmmo", {
    name: "SETTINGS.D35EAllowNoAmmoN",
    hint: "SETTINGS.D35EAllowNoAmmoH",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  game.settings.register("D35E", "useAutoAmmoRecovery", {
    name: "SETTINGS.D35EAutoAmmoRecoveryN",
    hint: "SETTINGS.D35EAutoAmmoRecoveryH",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  game.settings.register("D35E", "noAutoSpellpointsCost", {
    name: "SETTINGS.D35ENoAutoSpellpoinCost",
    hint: "SETTINGS.D35ENoAutoSpellpoinCostH",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  game.settings.register("D35E", "spellpointCostCustomFormula", {
    name: "SETTINGS.D35ESpellpointsCostFormula",
    hint: "SETTINGS.D35ESpellpointsCostFormulaH",
    scope: "world",
    config: true,
    default: "",
    type: String
  });

  /**
   * Option to automatically collapse Item Card descriptions
   */
  game.settings.register("D35E", "autoCollapseItemCards", {
    name: "SETTINGS.D35EAutoCollapseCardN",
    hint: "SETTINGS.D35EAutoCollapseCardL",
    scope: "client",
    config: true,
    default: false,
    type: Boolean,
    onChange: () => {
      ui.chat.render();
    }
  });


  game.settings.register("D35E", "hideSpellDescriptionsIfHasAction", {
    name: "SETTINGS.D35EHideSpellDescriptionsIfHasActionN",
    hint: "SETTINGS.D35EHideSpellDescriptionsIfHasActionL",
    scope: "client",
    config: true,
    default: false,
    type: Boolean,
    onChange: () => {
      ui.chat.render();
    }
  });

  game.settings.register("D35E", "showPartyHud", {
    name: "SETTINGS.D35EShowPartyHudN",
    hint: "SETTINGS.D35EShowPartyHudL",
    scope: "client",
    config: true,
    default: false,
    type: String,
    choices: {
      "full": "Full Party HUD",
      "narrow": "Narrow Party HUD",
      "none": "No party HUD"
    },
    onChange: () => {
      ui.nav.render()
    }
  });


  game.settings.register("D35E", "customSkin", {
    name: "SETTINGS.D35ECustomSkinN",
    hint: "SETTINGS.D35ECustomSkinL",
    scope: "client",
    config: true,
    default: true,
    type: Boolean,
    onChange: () => {
      $('body').toggleClass('d35ecustom', game.settings.get("D35E", "customSkin"));
    },
  });

  game.settings.register("D35E", "colorblindColors", {
    name: "SETTINGS.D35EColorblindN",
    hint: "SETTINGS.D35EColorblindL",
    scope: "client",
    config: true,
    default: false,
    type: Boolean,
    onChange: () => {
      $('body').toggleClass('color-blind', game.settings.get("D35E", "colorblindColors"));
    },
  });


  game.settings.register("D35E", 'transparentSidebarWhenUsingTheme', {
    name: `SETTINGS.D35ETransparentSidebarWhenUsingThemeN`,
    hint: 'SETTINGS.D35ETransparentSidebarWhenUsingThemeH',
    default: false,
    type: Boolean,
    config: true,
    scope: 'client',
    onChange: () => {
      $('body').toggleClass('transparent-sidebar', game.settings.get("D35E", "transparentSidebarWhenUsingTheme"));
    },
  });


  game.settings.register("D35E", "saveAttackWindow", {
    name: "SETTINGS.D35ESaveAttackWindowN",
    hint: "SETTINGS.D35ESaveAttackWindowL",
    scope: "client",
    config: true,
    default: false,
    type: Boolean
  });

  game.settings.register("D35E", "showFullAttackChatCard", {
    name: "SETTINGS.D35EFullAttackChatCardN",
    hint: "SETTINGS.D35EFullAttackChatCardL",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });



  game.settings.register("D35E", "hidePlayersList", {
    name: "SETTINGS.D35ENoPlayersListN",
    hint: "SETTINGS.D35ENoPlayersListL",
    scope: "client",
    config: true,
    default: false,
    type: Boolean,
    onChange: () => {
      $('body').toggleClass('no-players-list', game.settings.get("D35E", "hidePlayersList"));
    },
  });

  game.settings.register("D35E", "playersNoDamageDetails", {
    name: "SETTINGS.D35EPlayersNoDamageDetailsN",
    hint: "SETTINGS.D35EPlayersNoDamageDetailsL",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  game.settings.register("D35E", "playersNoDCDetails", {
    name: "SETTINGS.D35EPlayersNoDCDetailsN",
    hint: "SETTINGS.D35EPlayersNoDCDetailsL",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });
  /**
   * Option to change measure style
   */
  game.settings.register("D35E", "measureStyle", {
    name: "SETTINGS.D35EMeasureStyleN",
    hint: "SETTINGS.D35EMeasureStyleL",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
  });

  /**
   * Low-light Vision Mode
   */
  game.settings.register("D35E", "lowLightVisionMode", {
    name: "SETTINGS.D35ELowLightVisionModeN",
    hint: "SETTINGS.D35ELowLightVisionModeH",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
  });

  /**
   * Preload Compendiums
   */
  // game.settings.register("D35E", "preloadCompendiums", {
    // name: "SETTINGS.D35EPreloadCompendiumsN",
    // hint: "SETTINGS.D35EPreloadCompendiumsH",
    // scope: "client",
    // config: true,
    // default: false,
    // type: Boolean,
  // });


  game.settings.register("D35E", '__onboarding', {
    name: `Tutorial shown`,
    hint: 'Basic system usage tutorial already shown. Uncheck to view again after reload.',
    default: false,
    type: Boolean,
    config: true,
    scope: 'client',
  });

  game.settings.register("D35E", '__onboardingHidden', {
    name: `SETTINGS.D35EDisableTutorialN`,
    hint: 'SETTINGS.D35EDisableTutorialL',
    default: false,
    type: Boolean,
    config: true,
    scope: 'world',
  });



  game.settings.register("D35E", 'hideSpells', {
    name: `SETTINGS.D35EHideSpellDescriptionsN`,
    hint: 'SETTINGS.D35EHideSpellDescriptionsH',
    default: false,
    type: Boolean,
    config: true,
    scope: 'client',
  });



  game.settings.register("D35E", "allowPlayersApplyActions", {
    name: "SETTINGS.D35EAllowPlayersApplyActionsN",
    hint: "SETTINGS.D35EAllowPlayersApplyActionsH",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
  });



  game.settings.register("D35E", "repeatAnimations", {
    name: "SETTINGS.D35ERepeatAnimationsN",
    hint: "SETTINGS.D35ERepeatAnimationsL",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });


  game.settings.register("D35E", "globalDisableTokenLight", {
    name: "SETTINGS.D35EDisableTokenLightsN",
    hint: "SETTINGS.D35EDisableTokenLightsL",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  game.settings.register("D35E", "globalDisableTokenVision", {
    name: "SETTINGS.D35EDisableTokenVisionN",
    hint: "SETTINGS.D35EDisableTokenVisionL",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });


  /**
   * Hide token conditions
   */
  game.settings.register("D35E", "hideTokenConditions", {
    name: "SETTINGS.D35EHideTokenConditionsN",
    hint: "SETTINGS.D35EHideTokenConditionsH",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: () => {
      let promises = [];
      const actors = [
        ...Array.from(game.actors.contents.filter((o) => getProperty(o.data, "token.actorLink"))),
        ...Object.values(game.actors.tokens),
      ];
      for (let actor of actors) {
        promises.push(actor.toggleConditionStatusIcons());
      }
      return Promise.all(promises);
    },
  });

  /**
   * Display default token conditions alongside system ones
   */
  game.settings.register("D35E", "coreEffects", {
    name: "SETTINGS.D35ECoreEffectsN",
    hint: "SETTINGS.D35ECoreEffectsH",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: () => {
      window.location.reload();
    },
  });

  /**
   * Display default token conditions alongside system ones
   */
  game.settings.register("D35E", "currencyNames", {
    name: "SETTINGS.D35ECurrencyNamesN",
    hint: "SETTINGS.D35ECurrencyNamesH",
    scope: "world",
    config: true,
    default: "",
    type: String,
    onChange: () => {
      window.location.reload();
    },
  });

  game.settings.register("D35E", 'apiKeyWorld', {
    name: "SETTINGS.D35EApiKeyWorldN",
    hint: "SETTINGS.D35EApiKeyWorldH",
    default: "",
    type: String,
    config: true,
    scope: 'world',
  });

  game.settings.register("D35E", 'apiKeyPersonal', {
    name: "SETTINGS.D35EApiKeyPersonalN",
    hint: "SETTINGS.D35EApiKeyPersonalH",
    default: "",
    type: String,
    config: true,
    scope: 'client',
  });

  game.settings.register("D35E", "demoWorld", {
    name: "Demo Mode",
    hint: "This setting enables features related to Demo Mode. Do not set it in live games.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  game.settings.register("D35E", "randomizeHp", {
    name: "Randomize npc hp",
    hint: "This setting randomizes npc hp on canvas drop.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  // game.settings.register("D35E", 'displayItemsInContainers', {
  //   name: `SETTINGS.D35EDisplayItemsInContainersN`,
  //   hint: 'SETTINGS.D35EDisplayItemsInContainersH',
  //   default: false,
  //   type: Boolean,
  //   config: true,
  //   scope: 'client',
  // });
};
