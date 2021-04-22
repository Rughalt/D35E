import { hasTokenVision } from "./misc/vision-permission.js";

import {Roll35e} from "../roll.js"

// Patch Token's sheet template
Object.defineProperties(Token.prototype, {
  actorVision: {
    get() {
      return {
        lowLight: getProperty(this.data, "flags.pf1.lowLightVision"),
      };
    }
  }
});

SightLayer.prototype.hasLowLight = function() {
  const relevantTokens = canvas.tokens.placeables.filter(o => {
    return o.actor && o.actor.testUserPermission(game.user, "OBSERVER");
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
  get: function() {
    let result = AmbientLight__get__dimRadius.call(this);
    if (canvas.sight.hasLowLight() && result > 0) result *= 2;
    return result;
  }
});

const AmbientLight__get__brightRadius = Object.getOwnPropertyDescriptor(AmbientLight.prototype, "brightRadius").get;
Object.defineProperty(AmbientLight.prototype, "brightRadius", {
  get: function() {
    let result = AmbientLight__get__brightRadius.call(this);
    if (canvas.sight.hasLowLight() && result > 0) result *= 2;
    return result;
  }
});

const Token__get__dimLightRadius = Object.getOwnPropertyDescriptor(Token.prototype, "dimLightRadius").get;
Object.defineProperty(Token.prototype, "dimLightRadius", {
  get: function() {
    let result = Token__get__dimLightRadius.call(this);
    if (canvas.sight.hasLowLight() && result > 0) result *= 2;
    return result;
  }
});

const Token__get__brightLightRadius = Object.getOwnPropertyDescriptor(Token.prototype, "brightLightRadius").get;
Object.defineProperty(Token.prototype, "brightLightRadius", {
  get: function() {
    let result = Token__get__brightLightRadius.call(this);
    if (canvas.sight.hasLowLight() && result > 0) result *= 2;
    return result;
  }
});

const SightLayer_initializeTokens = SightLayer.prototype.initializeTokens;
SightLayer.prototype.initializeTokens = function(options) {
  options = options || {};
  const defer = options.defer || false;
  options.defer = true;

  SightLayer_initializeTokens.call(this, options);
  this.initializeLights(options);
  canvas.lighting.update();

  if (!defer) this.update();
};

const SightLayer_update = SightLayer.prototype.update;
SightLayer.prototype.update = function() {
  SightLayer_update.call(this);
};

/**
 * Monkey patched updateToken method for SightLayer
 */
SightLayer.prototype.updateToken = function(token, {defer=false, deleted=false, walls=null, forceUpdateFog=false}={}) {
  let sourceId = `Token.${token.id}`;
  this.sources.vision.delete(sourceId);
  this.sources.lights.delete(sourceId);
  if ( deleted ) return defer ? null : this.update();
  if ( token.data.hidden && !game.user.isGM ) return;

  // Vision is displayed if the token is controlled, or if it is observed by a player with no tokens controlled
  let displayVision = this._isTokenVisionSource(token);
  // let displayVision = token._controlled;
  // if ( !displayVision && !game.user.isGM && !canvas.tokens.controlled.length ) {
  // displayVision = token.actor && hasTokenVision(token);
  // }

  // Take no action for Tokens which are invisible or Tokens that have no sight or light
  const globalLight = canvas.scene.data.globalLight;
  let isVisionSource = this.tokenVision && token.hasSight && displayVision;
  let isLightSource = token.emitsLight;

  // If the Token is no longer a source, we don't need further work
  if ( !isVisionSource && !isLightSource ) return;

  // Prepare some common data
  const center = token.getSightOrigin();
  const maxR = globalLight ? Math.max(canvas.dimensions.width, canvas.dimensions.height) : null;
  let [cullMult, cullMin, cullMax] = this._cull;
  if ( globalLight ) cullMin = maxR;

  // Prepare vision sources
  if ( isVisionSource ) {

    // Compute vision polygons
    let dim = globalLight ? 0 : token.getLightRadius(token.data.dimSight);
    const bright = globalLight ? maxR : token.getLightRadius(token.data.brightSight);
    if ((dim === 0) && (bright === 0)) dim = canvas.dimensions.size * 0.6;
    const radius = Math.max(Math.abs(dim), Math.abs(bright));
    const {los, fov} = this.constructor.computeSight(center, radius, {
      angle: token.data.sightAngle,
      cullMult: cullMult,
      cullMin: cullMin,
      cullMax: cullMax,
      density: 6,
      rotation: token.data.rotation,
      walls: walls
    });

    // Add a vision source
    const source = new SightLayerSource({
      x: center.x,
      y: center.y,
      los: los,
      fov: fov,
      dim: dim,
      bright: bright,
      color: "#ffffff",
      alpha: 1,
    });
    this.sources.vision.set(sourceId, source);

    // Update fog exploration for the token position
    this.updateFog(center.x, center.y, Math.max(dim, bright), token.data.sightAngle !== 360, forceUpdateFog);
  }

  // Prepare light sources
  if ( isLightSource ) {

    // Compute light emission polygons
    const dim = token.dimLightRadius;
    const bright = token.brightLightRadius;
    const radius = Math.max(Math.abs(dim), Math.abs(bright));
    const {fov} = this.constructor.computeSight(center, radius, {
      angle: token.data.lightAngle,
      cullMult: cullMult,
      cullMin: cullMin,
      cullMax: cullMax,
      density: 6,
      rotation: token.data.rotation,
      walls: walls
    });

    // Add a light source
    const source = new SightLayerSource({
      x: center.x,
      y: center.y,
      los: null,
      fov: fov,
      dim: dim,
      bright: bright,
      color: token.data.lightColor,
      alpha: token.data.lightAlpha
    });
    this.sources.lights.set(sourceId, source);
  }

  // Maybe update
  if ( CONFIG.debug.sight ) console.debug(`Updated SightLayer source for ${sourceId}`);
  if ( !defer ) this.update();
};

/**
 * Monkey patched update method for LightingLayer
 */
LightingLayer.prototype.update = function(alpha=null) {
  const d = canvas.dimensions;
  const c = this.lighting;

  // Draw darkness layer
  this._darkness = alpha !== null ? alpha : canvas.scene.data.darkness;
  c.darkness.clear();
  const darknessPenalty = 0.8;
  let darknessColor = canvas.scene.getFlag("core", "darknessColor") || CONFIG.Canvas.darknessColor;
  if ( typeof darknessColor === "string" ) darknessColor = colorStringToHex(darknessColor);
  c.darkness.beginFill(darknessColor, this._darkness * darknessPenalty)
      .drawRect(0, 0, d.width, d.height)
      .endFill();

  // Draw lighting atop the darkness
  c.lights.clear();
  for ( let s of canvas.sight.sources.lights.values() ) {
    if ( s.darknessThreshold <= this._darkness ) {
      c.lights.beginFill(s.color, s.alpha).drawPolygon(s.fov).endFill();
    }
  }
};
