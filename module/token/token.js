import { hasTokenVision } from "../misc/vision-permission.js";

export class TokenPF extends Token {
  async _onUpdate(data, options, ...args) {
    await super._onUpdate(data, options, ...args);

    // Get the changed attributes
    const keys = Object.keys(data).filter((k) => k !== "_id");
    const changed = new Set(keys);
    const changedFlags = Object.keys(data.flags?.D35E ?? {});

    const testFlags = [
      "disableLowLight",
      "lowLightVision",
      "lowLightVisionMultiplier",
      "lowLightVisionMultiplierBright",
    ].some((s) => changedFlags.includes(s));

    if (testFlags || changed.has("light")) {
      canvas.perception.schedule({
        lighting: { initialize: true, refresh: true },
        sight: { initialize: true, refresh: true },
      });
    }
  }

  async toggleEffect(effect, { active, overlay = false, midUpdate } = {}) {
    let call;
    if (typeof effect == "string") {
      const buffItem = this.actor.items.get(effect);
      if (buffItem) {
        call = await buffItem.update({ "data.active": !buffItem.data.data.active });
      } else call = await super.toggleEffect(effect, { active, overlay });
    } else if (effect && !midUpdate && Object.keys(CONFIG.D35E.conditions).includes(effect.id)) {
      const updates = {};
      updates["data.attributes.conditions." + effect.id] = !this.actor.data.data.attributes.conditions[effect.id];
      call = await this.actor.update(updates);
    } else if (effect) {
      call = await super.toggleEffect(effect, { active, overlay });
    }
    if (this.hasActiveHUD) canvas.tokens.hud.refreshStatusIcons();
    return call;
  }

  get actorVision() {
    return {
      lowLight: getProperty(this.data, "flags.D35E.lowLightVision"),
      lowLightMultiplier: getProperty(this.data, "flags.D35E.lowLightVisionMultiplier"),
      lowLightMultiplierBright: getProperty(this.data, "flags.D35E.lowLightVisionMultiplierBright"),
    };
  }

  get disableLowLight() {
    return getProperty(this.data, "flags.D35E.disableLowLight") === true;
  }

  // Token patch for shared vision
  _isVisionSource() {
    if (!canvas.sight.tokenVision || !this.hasSight) return false;

    // Only display hidden tokens for the GM
    const isGM = game.user.isGM;
    if (this.data.hidden && !isGM) return false;

    // Always display controlled tokens which have vision
    if (this._controlled) return true;

    // Otherwise vision is ignored for GM users
    if (isGM) return false;

    // If a non-GM user controls no other tokens with sight, display sight anyways
    const canObserve = this.actor && hasTokenVision(this);
    if (!canObserve) return false;
    const others = this.layer.controlled.filter((t) => !t.data.hidden && t.hasSight);
    return !others.length || game.settings.get("D35E", "sharedVisionMode") === "1";
  }

  // Token#observer patch to make use of vision permission settings
  get observer() {
    return game.user.isGM || hasTokenVision(this);
  }

  /**
   * @override
   * Update an emitted light source associated with this Token.
   * @param {boolean} [defer]           Defer refreshing the LightingLayer to manually call that refresh later.
   * @param {boolean} [deleted]         Indicate that this light source has been deleted.
   */
  updateLightSource({ defer = false, deleted = false } = {}) {
    // Prepare data
    const origin = this.getSightOrigin();
    const sourceId = this.sourceId;
    const d = canvas.dimensions;
    const isLightSource = this.emitsLight && !this.data.hidden;

    // Initialize a light source
    if (isLightSource && !deleted) {
      let dim = this.getLightRadius(this.data.light.dim);
      let bright = this.getLightRadius(this.data.light.bright);
      if (this.data.light.luminosity >= 0 && !this.disableLowLight) {
        let multiplier = canvas.sight.lowLightMultiplier();
        dim *= multiplier.dim;
        bright *= multiplier.bright;
      }

      const lightConfig = foundry.utils.mergeObject(this.data.light.toObject(false), {
        x: origin.x,
        y: origin.y,
        dim: Math.clamped(dim, 0, d.maxR),
        bright: Math.clamped(bright, 0, d.maxR),
        z: this.document.getFlag("core", "priority"),
        seed: this.document.getFlag("core", "animationSeed"),
        rotation: this.data.rotation,
      });
      this.light.initialize(lightConfig);
      canvas.lighting.sources.set(sourceId, this.light);
    }

    // Remove a light source
    else canvas.lighting.sources.delete(sourceId);

    // Schedule a perception update
    if (!defer && (isLightSource || deleted)) {
      canvas.perception.schedule({
        lighting: { refresh: true },
        sight: { refresh: true },
      });
    }
  }
}
