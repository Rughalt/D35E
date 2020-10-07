import {TokenConfigPF} from "./token-config.js";
import {isMinimumCoreVersion} from "./lib.js";

// Patch Token's sheet template
Object.defineProperties(Token.prototype, {
    sheet: {
        get() {
            if (!this._sheet) this._sheet = new TokenConfigPF(this);
            return this._sheet;
        }
    },
    actorVision: {
        get() {
            return this.actor.data.data.attributes.vision || {};
        }
    }
});


SightLayer.prototype.hasLowLight = function () {
    const relevantTokens = canvas.tokens.placeables.filter(o => {
        return o.actor && o.actor.hasPerm(game.user, "OBSERVER");
    });
    const lowLightTokens = relevantTokens.filter(o => getProperty(o, "actorVision.lowLight"));
    if (game.user.isGM) {
        return lowLightTokens.filter(o => o._controlled).length > 0;
    }
    if (game.settings.get("pf1", "lowLightVisionMode")) {
        return lowLightTokens.filter(o => o._controlled).length > 0;
    }
    return (!relevantTokens.filter(o => o._controlled).length && lowLightTokens.length) || lowLightTokens.filter(o => o._controlled).length > 0;
};

const AmbientLight__get__dimRadius = Object.getOwnPropertyDescriptor(AmbientLight.prototype, "dimRadius").get;
Object.defineProperty(AmbientLight.prototype, "dimRadius", {
    get: function () {
        let result = AmbientLight__get__dimRadius.call(this);
        if (canvas.sight.hasLowLight() && result > 0) result *= 2;
        return result;
    }
});


const Token__get__dimLightRadius = Object.getOwnPropertyDescriptor(Token.prototype, "dimLightRadius").get;
Object.defineProperty(Token.prototype, "dimLightRadius", {
    get: function () {
        let result = Token__get__dimLightRadius.call(this);
        if (canvas.sight.hasLowLight() && result > 0) result *= 2;
        return result;
    }
});

const Token__get__brightRadius = Object.getOwnPropertyDescriptor(Token.prototype, "brightRadius").get;
Object.defineProperty(Token.prototype, "brightLightRadius", {
    get: function () {
        let result = Token__get__brightRadius.call(this);
        if (canvas.sight.hasLowLight() && result > 0) result *= 2;
        return result;
    }
});

const SightLayer_initializeTokens = SightLayer.prototype.initializeTokens;
SightLayer.prototype.initializeTokens = function (options) {
    options = options || {};
    const defer = options.defer || false;
    options.defer = true;

    SightLayer_initializeTokens.call(this, options);
    this.initializeLights(options);
    canvas.lighting.update();

    if (!defer) {
        this.update({forceUpdateFog: true});
        canvas.lighting.drawLights();
        // this.update();
    }
};

const SightLayer_update = SightLayer.prototype.update;
SightLayer.prototype.update = function () {
    SightLayer_update.call(this);
};

if (isMinimumCoreVersion("0.7.3")) {
    Token.prototype.updateSource = function ({defer = false, deleted = false, noUpdateFog = false} = {}) {
        if (CONFIG.debug.sight) {
            SightLayer._performance = {start: performance.now(), tests: 0, rays: 0}
        }

        // Prepare some common data
        const origin = this.getSightOrigin();
        const sourceId = this.sourceId;
        const maxR = canvas.scene.data.globalLight ? Math.max(canvas.dimensions.width, canvas.dimensions.height) : null;

        // Update light source
        const isLightSource = this.emitsLight && !this.data.hidden && !deleted;
        if (isLightSource) {
            let bright = this.getLightRadius(this.data.brightLight);
            let dim = this.getLightRadius(this.data.dimLight);
            if (canvas.sight.hasLowLight()) {
                bright *= 2;
                dim *= 2;
            }
            this.light.initialize({
                x: origin.x,
                y: origin.y,
                dim: dim,
                bright: bright,
                angle: this.data.lightAngle,
                rotation: this.data.rotation,
                color: this.data.lightColor,
                alpha: this.data.lightAlpha,
                animation: this.data.lightAnimation
            });
            canvas.lighting.sources.set(sourceId, this.light);
            if (!defer) {
                this.light.drawLight();
                this.light.drawColor();
            }
        } else canvas.lighting.sources.delete(sourceId);

        // Update vision source
        const isVisionSource = this._isVisionSource() && !deleted;
        if (isVisionSource) {
            const bright = maxR ?? this.getLightRadius(this.data.brightSight);
            let dim = this.getLightRadius(this.data.dimSight);
            if ((dim === 0) && (bright === 0)) dim = canvas.dimensions.size * 0.6;
            this.vision.initialize({
                x: origin.x,
                y: origin.y,
                dim: dim,
                bright: bright,
                angle: this.data.sightAngle,
                rotation: this.data.rotation
            });
            canvas.sight.sources.set(sourceId, this.vision);
            if (!defer) {
                this.vision.drawLight();
                canvas.sight.refresh({noUpdateFog});
            }
        } else canvas.sight.sources.delete(sourceId);
    };

    const AmbientLight__get__dimRadius = Object.getOwnPropertyDescriptor(AmbientLight.prototype, "dimRadius").get;
    Object.defineProperty(AmbientLight.prototype, "dimRadius", {
        get: function () {
            let result = AmbientLight__get__dimRadius.call(this);
            if (canvas.sight.hasLowLight()) return result * 2;
            return result;
        },
    });

    const AmbientLight__get__brightRadius = Object.getOwnPropertyDescriptor(AmbientLight.prototype, "brightRadius").get;
    Object.defineProperty(AmbientLight.prototype, "brightRadius", {
        get: function () {
            let result = AmbientLight__get__brightRadius.call(this);
            if (canvas.sight.hasLowLight()) return result * 2;
            return result;
        },
    });
} else {
    SightLayer.prototype.updateToken = function (token, {defer = false, deleted = false, walls = null} = {}) {
        if (CONFIG.debug.sight) {
            SightLayer._performance = {start: performance.now(), tests: 0, rays: 0}
        }

        // Clear the prior Token source
        let sourceId = `Token.${token.id}`;
        if (deleted) {
            this.sources.lights.delete(sourceId);
            this.sources.vision.delete(sourceId);
            return defer ? null : this.update();
        }

        // Determine whether the Token is a viable source
        const isVisionSource = this._isTokenVisionSource(token);
        const isLightSource = token.emitsLight && !token.data.hidden;

        // Prepare some common data
        const globalLight = canvas.scene.data.globalLight;
        const origin = token.getSightOrigin();
        const center = token.center;
        const maxR = globalLight ? Math.max(canvas.dimensions.width, canvas.dimensions.height) : null;
        let [cullMult, cullMin, cullMax] = this._cull;
        if (globalLight) cullMin = maxR;

        // Prepare vision sources
        if (isVisionSource) {

            // Compute vision polygons
            let dim = globalLight ? 0 : token.getLightRadius(token.data.dimSight);
            const bright = globalLight ? maxR : token.getLightRadius(token.data.brightSight);
            if ((dim === 0) && (bright === 0)) dim = canvas.dimensions.size * 0.6;
            const radius = Math.max(Math.abs(dim), Math.abs(bright));
            const {los, fov} = this.constructor.computeSightQuadtree4(origin, radius, {
                angle: token.data.sightAngle,
                cullMult: cullMult,
                cullMin: cullMin,
                cullMax: cullMax,
                rotation: token.data.rotation,
                walls: walls
            });

            // Add a vision source
            const sourceData = {
                x: center.x,
                y: center.y,
                los: los,
                fov: fov,
                dim: dim,
                bright: bright,
                limited: token.data.sightAngle.between(0, 360, false)
            };
            let visionSource = this.sources.vision.get(sourceId);
            if (visionSource) visionSource.initialize(sourceData);
            else this.sources.vision.set(sourceId, new SightLayerSource(sourceData));
        } else this.sources.vision.delete(sourceId);

        // Prepare light sources
        if (isLightSource) {

            // Compute light emission polygons
            const dim = token.getLightRadius(token.data.dimLight);
            const bright = token.getLightRadius(token.data.brightLight);
            const radius = Math.max(Math.abs(dim), Math.abs(bright));
            const {fov} = this.constructor.computeSightQuadtree4(origin, radius, {
                angle: token.data.lightAngle,
                cullMult: cullMult,
                cullMin: cullMin,
                cullMax: cullMax,
                rotation: token.data.rotation,
                walls: walls
            });

            // Add a light source
            const sourceData = {
                x: center.x,
                y: center.y,
                los: null,
                fov: fov,
                dim: dim,
                bright: bright,
                color: token.data.lightColor,
                alpha: token.data.lightAlpha,
                limited: token.data.lightAngle.between(0, 360, false)
            };
            let lightSource = this.sources.lights.get(sourceId);
            if (lightSource) lightSource.initialize(sourceData);
            else {
                lightSource = new SightLayerSource(sourceData);
                token.lightSource = lightSource;
                this.sources.lights.set(sourceId, lightSource);
            }
        } else this.sources.lights.delete(sourceId);

        // Maybe update
        if (CONFIG.debug.sight) console.debug(`Updated SightLayer source for ${sourceId}`);
        if (!defer) this.update();

    };
}
