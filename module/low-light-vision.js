/**
 * Apply patches to Core Foundry to implement Pathfinder's Low-Light Vision rules
 */
export function patchLowLightVision() {
    // Patch Token's sheet template
    Object.defineProperties(Token.prototype, {
        actorVision: {
            get() {
                return {
                    lowLight: getProperty(this.data, "flags.D35E.lowLightVision"),
                };
            },
        },
        disableLowLight: {
            get: function () {
                return getProperty(this.data, "flags.D35E.disableLowLight") === true;
            },
        },
    });

    SightLayer.prototype.hasLowLight = function () {
        const relevantTokens = canvas.tokens.placeables.filter((o) => {
            return o.actor && o.actor.hasPerm(game.user, "OBSERVER");
        });
        const lowLightTokens = relevantTokens.filter((o) => getProperty(o, "actorVision.lowLight"));
        if (game.user.isGM) {
            return lowLightTokens.filter((o) => o._controlled).length > 0;
        }
        if (game.settings.get("D35E", "lowLightVisionMode")) {
            return lowLightTokens.filter((o) => o._controlled).length > 0;
        }
        return (
            (!relevantTokens.filter((o) => o._controlled).length && lowLightTokens.length) ||
            lowLightTokens.filter((o) => o._controlled).length > 0
        );
    };

    const Token__getLightRadius = Token.prototype.getLightRadius;
    Token.prototype.getLightRadius = function (units) {
        const radius = Token__getLightRadius.call(this, units);
        if (canvas.sight.hasLowLight() && !this.disableLowLight) {
            return radius * 2;
        }
        return radius;
    };

    const Token__updateSource = Token.prototype.updateSource;
    Token.prototype.updateSource = function ({ defer = false, deleted = false, noUpdateFog = false } = {}) {
        if (CONFIG.debug.sight) {
            SightLayer._performance = { start: performance.now(), tests: 0, rays: 0 };
        }

        // Prepare some common data
        const origin = this.getSightOrigin();
        const sourceId = this.sourceId;
        const d = canvas.dimensions;
        const maxR = canvas.lighting.globalLight ? Math.hypot(d.sceneWidth, d.sceneHeight) : null;

        // Update light source
        const isLightSource = this.emitsLight && !this.data.hidden;
        if (isLightSource && !deleted) {
            const bright = this.getLightRadius(this.data.brightLight);
            const dim = this.getLightRadius(this.data.dimLight);
            this.light.initialize({
                x: origin.x,
                y: origin.y,
                dim: dim,
                bright: bright,
                angle: this.data.lightAngle,
                rotation: this.data.rotation,
                color: this.data.lightColor,
                alpha: this.data.lightAlpha,
                animation: this.data.lightAnimation,
            });
            canvas.lighting.sources.set(sourceId, this.light);
            if (!defer) {
                this.light.drawLight();
                this.light.drawColor();
            }
        } else {
            canvas.lighting.sources.delete(sourceId);
            if (isLightSource && !defer) canvas.lighting.refresh();
        }

        // Update vision source
        const isVisionSource = this._isVisionSource();
        if (isVisionSource && !deleted) {
            //-Override token vision sources to not receive low-light bonus-
            let dim = maxR ?? this.getLightRadius(this.data.dimSight);
            let bright = this.getLightRadius(this.data.brightSight);
            if (canvas.sight.hasLowLight()) {
                dim = dim / 2;
                bright = bright / 2;
            }
            //-End change-
            if (dim === 0 && bright === 0) dim = d.size * 0.6;
            this.vision.initialize({
                x: origin.x,
                y: origin.y,
                dim: dim,
                bright: bright,
                angle: this.data.sightAngle,
                rotation: this.data.rotation,
            });
            canvas.sight.sources.set(sourceId, this.vision);
            if (!defer) {
                this.vision.drawLight();
                canvas.sight.refresh({ noUpdateFog });
            }
        } else {
            canvas.sight.sources.delete(sourceId);
            if (isVisionSource && !defer) canvas.sight.refresh();
        }
    };

    Object.defineProperty(AmbientLight.prototype, "disableLowLight", {
        get: function () {
            return getProperty(this.data, "flags.D35E.disableLowLight") === true;
        },
    });

    const AmbientLight__get__dimRadius = Object.getOwnPropertyDescriptor(AmbientLight.prototype, "dimRadius").get;
    Object.defineProperty(AmbientLight.prototype, "dimRadius", {
        get: function () {
            let result = AmbientLight__get__dimRadius.call(this);
            if (canvas.sight.hasLowLight() && !this.disableLowLight) return result * 2;
            return result;
        },
    });

    const AmbientLight__get__brightRadius = Object.getOwnPropertyDescriptor(AmbientLight.prototype, "brightRadius").get;
    Object.defineProperty(AmbientLight.prototype, "brightRadius", {
        get: function () {
            let result = AmbientLight__get__brightRadius.call(this);
            if (canvas.sight.hasLowLight() && !this.disableLowLight) return result * 2;
            return result;
        },
    });

    const Token__onUpdate = Token.prototype._onUpdate;
    Token.prototype._onUpdate = async function (data, options, ...args) {
        await Token__onUpdate.call(this, data, options, ...args);

        if (hasProperty(data, "flags.D35E.disableLowLight") || hasProperty(data, "flags.D35E.lowLightVision")) {
            canvas.initializeSources();
        }
    };
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
    let checkboxStr = `<div class="form-group"><label>${game.i18n.localize(
        "D35E.DisableLightLowLightVision"
    )}</label><div class="form-group">`;
    checkboxStr += '<input type="checkbox" name="flags.D35E.disableLowLight" data-dtype="Boolean"';
    if (getProperty(obj.data, "flags.D35E.disableLowLight")) checkboxStr += " checked";
    checkboxStr += "/></div></div>";
    const checkbox = $(checkboxStr);

    // Insert new checkbox
    checkbox.insertBefore(html.find('button[type="submit"]'));
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
    let checkboxStr = `<div class="form-group"><label>${game.i18n.localize(
        "D35E.DisableLightLowLightVision"
    )}</label><div class="form-group">`;
    checkboxStr += '<input type="checkbox" name="flags.D35E.disableLowLight" data-dtype="Boolean"';
    if (getProperty(obj.data, "flags.D35E.disableLowLight")) checkboxStr += " checked";
    checkboxStr += "/></div></div>";
    const checkbox = $(checkboxStr);

    // Insert new checkbox
    html.find('.tab[data-tab="vision"]').append(checkbox);
};
