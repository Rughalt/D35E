/**
 * Measure the distance between two pixel coordinates
 * See BaseGrid.measureDistance for more details
 */
export const measureDistances = function(segments, options={}) {
  if ( !options.gridSpaces ) return BaseGrid.prototype.measureDistances.call(this, segments, options);

  // Track the total number of diagonals
  let nDiagonal = 0;
  const rule = this.parent.diagonalRule;
  const d = canvas.dimensions;

  // Iterate over measured segments
  return segments.map(s => {
    let r = s.ray;

    // Determine the total distance traveled
    let nx = Math.abs(Math.ceil(r.dx / d.size));
    let ny = Math.abs(Math.ceil(r.dy / d.size));

    // Determine the number of straight and diagonal moves
    let nd = Math.min(nx, ny);
    let ns = Math.abs(ny - nx);
    nDiagonal += nd;

    // Alternative DMG Movement
    if (rule === "5105") {
      let nd10 = Math.floor(nDiagonal / 2) - Math.floor((nDiagonal - nd) / 2);
      let spaces = (nd10 * 2) + (nd - nd10) + ns;
      return spaces * canvas.dimensions.distance;
    }

    // Standard PHB Movement
    else return (ns + nd) * canvas.scene.data.gridDistance;
  });
};

export const measureDistance = function(p0, p1, {gridSpaces=true}={}) {
  if ( !gridSpaces ) return BaseGrid.prototype.measureDistance.bind(this)(p0, p1, {gridSpaces});
  let gs = canvas.dimensions.size,
      ray = new Ray(p0, p1),
      nx = Math.abs(Math.ceil(ray.dx / gs)),
      ny = Math.abs(Math.ceil(ray.dy / gs));

  // Get the number of straight and diagonal moves
  let nDiagonal = Math.min(nx, ny),
      nStraight = Math.abs(ny - nx);

  // Alternative DMG Movement
  if ( this.parent.diagonalRule === "5105" ) {
    let nd10 = Math.floor(nDiagonal / 2);
    let spaces = (nd10 * 2) + (nDiagonal - nd10) + nStraight;
    return spaces * canvas.dimensions.distance;
  }

  // Standard PHB Movement
  else return (nStraight + nDiagonal) * canvas.scene.data.gridDistance;
};

/* -------------------------------------------- */

/**
 * Hijack Token health bar rendering to include temporary and temp-max health in the bar display
 * TODO: This should probably be replaced with a formal Token class extension
 */
const _TokenGetBarAttribute = Token.prototype.getBarAttribute;
Token.prototype.getBarAttribute = function(barName, {alternative=null}={}) {
  let data;
  try {
    data = _TokenGetBarAttribute.call(this, barName, {alternative: alternative});
  } catch (e) {
    data = null;
  }
  if (data != null && data.attribute === "attributes.hp") {
    data.value += parseInt(data['temp'] || 0);
  }
  return data;
};

TokenHUD.prototype._onAttributeUpdate = function(event) {
  // Filter keydown events for Enter
  if ( event.type === "keydown" ) {
    if (event.keyCode === KEYS.ENTER) this.clear();
    return;
  }
  event.preventDefault();

  // Determine new bar value
  let input = event.currentTarget,
      strVal = input.value.trim(),
      isDelta = strVal.startsWith("+") || strVal.startsWith("-"),
      value = Number(strVal);
  if ( !Number.isFinite(value) ) return;

  // For attribute bar values, update the associated Actor
  let bar = input.dataset.bar;
  if ( bar ) {
    const actor = this.object.actor;
    const data = this.object.getBarAttribute(bar);
    const current = getProperty(actor.data.data, data.attribute);
    const updateData = {};
    let dt = value;
    if (data.attribute === "attributes.hp" && actor.data.data.attributes.hp.temp > 0 && isDelta && value < 0) {
      dt = Math.min(0, actor.data.data.attributes.hp.temp + value);
      updateData["data.attributes.hp.temp"] = Math.max(0, actor.data.data.attributes.hp.temp + value);
      value = Math.min(0, value - dt);
    }
    if ( isDelta ) value = Math.clamped(current.min || 0, current.value + dt, current.max);
    updateData[`data.${data.attribute}.value`] = value;
    actor.update(updateData);
  }

  // Otherwise update the Token
  else this.object.update({[input.name]: value});
};

/**
 * Condition/ status effects section
 */
export const getConditions = function () {
  var core = CONFIG.statusEffects,
      sys = Object.keys(CONFIG.D35E.conditions).filter(c => c !== 'wildshaped' && c !== 'polymorphed').map((c) => {
        return { id: c, label: CONFIG.D35E.conditions[c], icon: CONFIG.D35E.conditionTextures[c] };
      });
  if (game.settings.get("D35E", "coreEffects")) sys.push(...core);
  else sys = [core[0]].concat(sys);
  return sys;
};

const _TokenHUD_getStatusEffectChoices = TokenHUD.prototype._getStatusEffectChoices;
TokenHUD.prototype._getStatusEffectChoices = function () {
  let core = _TokenHUD_getStatusEffectChoices.call(this),
      buffs = {};
  Object.entries(this.object.actor._calcBuffTextures()).forEach((obj) => {
    let [idx, buff] = obj;
    if (buffs[buff.icon] && buff.label) buffs[buff.icon].title = buff.label;
    else {
      buffs[buff.icon] = {
        id: buff.id,
        title: buff.label,
        src: buff.icon,
        isActive: buff.active,
        isOverlay: false,
        cssClass: buff.active ? "active" : "",
      };
    }
  });
  return Object.assign({}, core, buffs);
};

//const TokenHUD__onToggleEffect = TokenHUD.prototype._onToggleEffect;
TokenHUD.prototype._onToggleEffect = function (event, { overlay = false } = {}) {
  event.preventDefault();
  let img = event.currentTarget;
  const effect =
      img.dataset.statusId && this.object.actor
          ? CONFIG.statusEffects.find((e) => e.id === img.dataset.statusId) ?? img.dataset.statusId
          : img.getAttribute("src");
  return this.object.toggleEffect(effect, { overlay });
};

const Token_toggleEffect = Token.prototype.toggleEffect;
Token.prototype.toggleEffect = async function (effect, { active, overlay = false, midUpdate } = {}) {
  let call;
  if (typeof effect == "string") {
    let buffItem = this.actor.items.get(effect);
    if (buffItem) {
      call = await buffItem.update({ "data.active": !buffItem.data.data.active });
    } else call = Token_toggleEffect.call(this, effect, { active, overlay });
  } else if (!midUpdate && Object.keys(CONFIG.D35E.conditions).includes(effect.id)) {
    const updates = {};
    updates["data.attributes.conditions." + effect.id] = !this.actor.data.data.attributes.conditions[effect.id];
    call = this.actor.update(updates);
  } else {
    call = Token_toggleEffect.call(this, effect, { active, overlay });
  }
  if (this.hasActiveHUD) canvas.tokens.hud.refreshStatusIcons();
  return call;
};

TokenHUD.prototype._onAttributeUpdate = function (event) {
  event.preventDefault();

  // Determine new bar value
  let input = event.currentTarget,
      strVal = input.value.trim(),
      operator,
      value,
      isDelta = false;
  if (strVal.match(/(=?[+-]-?)([0-9.]+)/)) {
    operator = RegExp.$1;
    value = parseFloat(RegExp.$2);
    isDelta = ["-", "+"].includes(operator);
    operator = operator?.replace("=", "");
  } else if (strVal.match(/=?([0-9.]+)/)) {
    value = parseFloat(RegExp.$1);
  } else return;

  let bar = input.dataset.bar;

  // For attribute bar values, update the associated Actor
  // TODO: Switch to Actor#modifyTokenAttribute
  if (bar) {
    const actor = this.object?.actor;
    if (!actor) return;
    const data = this.object.getBarAttribute(bar);
    const current = getProperty(actor.data.data, data.attribute);
    const updateData = {};

    // Set to specified negative value
    if (operator === "--" || (!isDelta && operator == "-")) {
      updateData[`data.${data.attribute}.value`] = -value;
    }

    // Add relative value
    else {
      let dt = value;
      if (data.attribute === "attributes.hp" && actor.data.data.attributes.hp.temp > 0 && operator === "-") {
        dt = Math.min(0, actor.data.data.attributes.hp.temp - value);
        updateData["data.attributes.hp.temp"] = Math.max(0, actor.data.data.attributes.hp.temp - value);
        value = actor.data.data.attributes.hp.value + dt;
      } else if (operator === "-") {
        if (data.attribute === "attributes.hp") value = Math.min(current.value - dt, current.max);
        else value = Math.clamped(current.min || 0, current.value - dt, current.max);
      } else if (operator === "+") {
        if (data.attribute === "attributes.hp") value = Math.min(current.value + dt, current.max);
        else value = Math.clamped(current.min || 0, current.value + dt, current.max);
      }
      updateData[`data.${data.attribute}.value`] = value;
    }

    actor.update(updateData);
  }

  // Otherwise update the Token
  else {
    if (operator === "--" || (!isDelta && operator == "-")) value = -value;
    else if (isDelta) {
      const current = getProperty(this.object.data, input.name);
      if (operator === "-") value = current - value;
      else if (operator === "+") value = current + value;
    }
    this.object.update({ [input.name]: value });
  }

  // Clear the HUD
  this.clear();
};

