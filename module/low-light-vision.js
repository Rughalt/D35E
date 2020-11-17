import {isMinimumCoreVersion} from "./lib.js";


// Patch Token's sheet template
Object.defineProperties(Token.prototype, {
    actorVision: {
        get() {
            return {
                lowLight: getProperty(this.data, "flags.D35E.lowLightVision"),
            };
        }
    }
});

SightLayer.prototype.hasLowLight = function() {
    const relevantTokens = canvas.tokens.placeables.filter(o => {
        return o.actor && o.actor.hasPerm(game.user, "OBSERVER");
    });
    const lowLightTokens = relevantTokens.filter(o => getProperty(o, "actorVision.lowLight"));
    if (game.user.isGM) {
        return lowLightTokens.filter(o => o._controlled).length > 0;
    }
    if (game.settings.get("D35E", "lowLightVisionMode")) {
        return lowLightTokens.filter(o => o._controlled).length > 0;
    }
    return (!relevantTokens.filter(o => o._controlled).length && lowLightTokens.length) || lowLightTokens.filter(o => o._controlled).length > 0;
};

const Token__getLightRadius = Token.prototype.getLightRadius;
Token.prototype.getLightRadius = function(units) {
    const radius = Token__getLightRadius.call(this, units);
    if (canvas.sight.hasLowLight()) {
        return radius * 2;
    }
    return radius;
};

const AmbientLight__get__dimRadius = Object.getOwnPropertyDescriptor(AmbientLight.prototype, "dimRadius").get;
Object.defineProperty(AmbientLight.prototype, "dimRadius", {
    get: function() {
        let result = AmbientLight__get__dimRadius.call(this);
        if (canvas.sight.hasLowLight()) return result * 2;
        return result;
    },
});

const AmbientLight__get__brightRadius = Object.getOwnPropertyDescriptor(AmbientLight.prototype, "brightRadius").get;
Object.defineProperty(AmbientLight.prototype, "brightRadius", {
    get: function() {
        let result = AmbientLight__get__brightRadius.call(this);
        if (canvas.sight.hasLowLight()) return result * 2;
        return result;
    },
});
