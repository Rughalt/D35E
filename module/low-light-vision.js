import { TokenConfigPF } from "./token-config.js";


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

const Token_update = Token.prototype.update;
Token.prototype.update = async function(data, options={}) {
  const updateData = {};

  if (data.visionLL != null) {
    updateData["data.attributes.vision.lowLight"] = data.visionLL;
  }
  if (data.darkvision != null) {
    updateData["data.attributes.vision.darkvision"] = data.darkvision;
  }

  if (Object.keys(updateData).length) {
    await this.actor.update(updateData);
  }

  return Token_update.call(this, data, options);
};

SightLayer.prototype.hasLowLight = function() {
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

SightLayer.prototype.hasDarkvision = function() {
  const relevantTokens = canvas.tokens.placeables.filter(o => {
    return o.actor && o.actor.hasPerm(game.user, "OBSERVER");
  });
  const darkvisionTokens = relevantTokens.filter(o => o.getDarkvisionRadius() > 0);
  if (game.user.isGM) {
    return darkvisionTokens.filter(o => o._controlled).length > 0;
  }
  if (game.settings.get("pf1", "lowLightVisionMode")) {
    return darkvisionTokens.filter(o => o._controlled).length > 0;
  }
  return (!relevantTokens.filter(o => o._controlled).length && darkvisionTokens.length) || darkvisionTokens.filter(o => o._controlled).length > 0;
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

Token.prototype.getDarkvisionRadius = function() {
  return this.getLightRadius(getProperty(this, "actor.data.data.attributes.vision.darkvision") || 0);
};

Token.prototype.getDarkvisionSight = function() {
  const radius = this.getDarkvisionRadius();
  if (!radius) return null;

  const walls = canvas.walls.blockVision;
  const globalLight = canvas.scene.data.globalLight;
  const maxR = globalLight ? Math.max(canvas.dimensions.width, canvas.dimensions.height) : null;
  let [cullMult, cullMin, cullMax] = canvas.sight._cull;
  if (globalLight) cullMin = maxR;

  return canvas.sight.constructor.computeSight(this.getSightOrigin(), radius, {
    angle: this.data.angle,
    cullMult: cullMult,
    cullMin: cullMin,
    cullMax: cullMax,
    density: 6,
    rotation: this.data.rotation,
    walls: walls,
  });
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
  let displayVision = token._controlled;
  if ( !displayVision && !game.user.isGM && !canvas.tokens.controlled.length ) {
    displayVision = token.actor && token.actor.hasPerm(game.user, "OBSERVER");
  }

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
    const darkvision = this.hasDarkvision() ? token.getDarkvisionRadius() : 0;
    if ((dim === 0) && (bright === 0) && (darkvision === 0)) dim = canvas.dimensions.size * 0.6;
    const radius = Math.max(Math.abs(dim), Math.abs(bright), Math.abs(darkvision));
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
      bright: Math.max(bright, darkvision),
      color: "#ffffff",
      alpha: 1,
    });
    this.sources.vision.set(sourceId, source);

    // Update fog exploration for the token position
    this.updateFog(center.x, center.y, Math.max(dim, bright, darkvision), token.data.sightAngle !== 360, forceUpdateFog);
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

  if (canvas.sight.hasDarkvision) {
    this.updateDarkvision();
  }
};

LightingLayer.prototype.updateDarkvision = function() {
  const c = this.lighting;

  // Draw token darkvision
  const vision = canvas.sight.sources.vision;
  for (let k of vision.keys()) {
    const t = canvas.tokens.placeables.find(o => `Token.${o.id}` === k);
    if (!t) continue;
    const sight = t.getDarkvisionSight();
    if (!sight) continue;
    const fov = sight.fov;
    c.lights.beginFill(0xFFFFFF, 1).drawPolygon(fov).endFill();
  }
};
