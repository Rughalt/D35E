/**
 * Apply patches to Core Foundry to implement Pathfinder's Low-Light Vision rules
 */
 export class SightLayerPF extends SightLayer {
  hasLowLight() {
    console.warn("SightLayer#hasLowLight is deprecated in favor of SightLayer#lowLightMultiplier");

    const relevantTokens = canvas.tokens.placeables.filter((o) => {
      return o.actor && o.actor.testUserPermission(game.user, "OBSERVER");
    });
    const lowLightTokens = relevantTokens.filter((o) => o.actorVision?.lowLight);
    if (game.user.isGM) {
      return lowLightTokens.filter((o) => o._controlled).length > 0;
    }
    if (game.settings.get("D35E", "lowLightVisionMode")) {
      return lowLightTokens.filter((o) => o._controlled).length > 0;
    }

    const hasControlledTokens = relevantTokens.filter((o) => o._controlled).length > 0;
    const hasControlledLowLightTokens = lowLightTokens.filter((o) => o._controlled).length > 0;
    const hasLowLightTokens = lowLightTokens.length > 0;
    return (!hasControlledTokens && hasLowLightTokens) || hasControlledLowLightTokens;
  }

  lowLightMultiplier() {
    const result = {
      dim: 1,
      bright: 1,
    };

    const relevantTokens = canvas.tokens.placeables.filter((o) => {
      return o.actor && o.actor.testUserPermission(game.user, "OBSERVER");
    });
    const lowLightTokens = relevantTokens.filter((o) => o.actorVision?.lowLight);

    if (game.user.isGM || game.settings.get("D35E", "lowLightVisionMode")) {
      for (const t of lowLightTokens.filter((o) => o._controlled)) {
        const multiplier = t.actorVision?.lowLightMultiplier || 2;
        const multiplierBright = t.actorVision?.lowLightMultiplierBright || 2;
        result.dim = Math.max(result.dim, multiplier);
        result.bright = Math.max(result.bright, multiplierBright);
      }
    } else {
      const hasControlledTokens = relevantTokens.filter((o) => o._controlled).length > 0;
      const hasControlledLowLightTokens = lowLightTokens.filter((o) => o._controlled).length > 0;
      const hasLowLightTokens = lowLightTokens.length > 0;
      if ((!hasControlledTokens && hasLowLightTokens) || hasControlledLowLightTokens) {
        for (const t of lowLightTokens) {
          const multiplier = t.actorVision?.lowLightMultiplier || 2;
          const multiplierBright = t.actorVision?.lowLightMultiplierBright || 2;
          result.dim = Math.max(result.dim, multiplier);
          result.bright = Math.max(result.bright, multiplierBright);
        }
      }
    }

    return result;
  }
}

/**
 * Add a checkbox to enable/disable low-light vision effects to a light's configuration
 *
 * @param {FormApplication} app - The LightConfig app
 * @param {jQuery} html - The jQuery of the inner html
 */
export const addLowLightVisionToLightConfig = function (app, html) {
  const obj = app.object;

  // Create checkbox HTML element
  let checkboxStr = `<div class="form-group"><label>${game.i18n.localize("D35E.DisableLightLowLightVision")}</label>`;
  checkboxStr += '<input type="checkbox" name="flags.D35E.disableLowLight" data-dtype="Boolean"';
  if (getProperty(obj.data, "flags.D35E.disableLowLight")) checkboxStr += " checked";
  checkboxStr += "/></div>";
  const checkbox = $(checkboxStr);

  // Insert new checkbox
  html.find('div.tab[data-tab="basic"]').append(checkbox);
};

/**
 * Add a checkbox to enable/disable low-light vision to a token's configuration
 *
 * @param {FormApplication} app - The TokenConfig app
 * @param {jQuery} html - The jQuery of the inner html
 */
export const addLowLightVisionToTokenConfig = function (app, html) {
  const obj = app.object;

  // Create checkbox HTML element
  let checkboxStr = `<div class="form-group"><label>${game.i18n.localize("D35E.DisableLightLowLightVision")}</label>`;
  checkboxStr += '<input type="checkbox" name="flags.D35E.disableLowLight" data-dtype="Boolean"';
  if (getProperty(obj.data, "flags.D35E.disableLowLight")) checkboxStr += " checked";
  checkboxStr += "/></div>";
  const checkbox = $(checkboxStr);

  // Insert new checkbox
  html.find('.tab[data-group="light"][data-tab="basic"]').append(checkbox);
};

export class AmbientLightPF extends AmbientLight {
  get disableLowLight() {
    return getProperty(this.data, "flags.D35E.disableLowLight") === true;
  }

  get dimRadius() {
    const result = super.dimRadius;
    if (this.data.config.luminosity < 0) return result;
    return Math.max(result, this.disableLowLight ? result : result * canvas.sight.lowLightMultiplier().dim);
  }

  get brightRadius() {
    const result = super.brightRadius;
    if (this.data.config.luminosity < 0) return result;
    return Math.max(result, this.disableLowLight ? result : result * canvas.sight.lowLightMultiplier().bright);
  }
}
