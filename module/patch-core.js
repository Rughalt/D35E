import { _rollInitiative, _getInitiativeFormula } from "./combat.js";
import "./misc/vision-permission.js";
import { _preProcessDiceFormula } from "./dice.js";
import { ActorPF } from "./actor/entity.js";
import { patchMeasureTools } from "./measure.js";

const FormApplication_close = FormApplication.prototype.close;

export async function PatchCore() {
  // Patch getTemplate to prevent unwanted indentation in things things like <textarea> elements.
  async function D35E_getTemplate(path) {
    if ( !_templateCache.hasOwnProperty(path) ) {
      await new Promise(resolve => {
        game.socket.emit('template', path, resp => {
          const compiled = Handlebars.compile(resp.html, { preventIndent: true });
          Handlebars.registerPartial(path, compiled);
          _templateCache[path] = compiled;
          //console.log(`Foundry VTT | Retrieved and compiled template ${path}`);
          resolve(compiled);
        });
      });
    } 
    return _templateCache[path];
  }

  // Patch TokenHUD.getData to show resource bars even if their value is 0
  const TokenHUD_getData = TokenHUD.prototype.getData;
  TokenHUD.prototype.getData = function() {
    const data = TokenHUD_getData.call(this);
    const bar1 = this.object.getBarAttribute("bar1");
    const bar2 = this.object.getBarAttribute("bar2");
    return mergeObject(data, {
      displayBar1: bar1 != null && bar1.attribute != null && bar1.value != null,
      displayBar2: bar2 != null && bar2.attribute != null && bar2.value != null
    });
  }
  const Token_drawEffects = Token.prototype.drawEffects;
  Token.prototype.drawEffects = async function() {
    this.effects.removeChildren().forEach(c => c.destroy());
    const tokenEffects = this.data.effects;
    const actorEffects = this.actor?.temporaryEffects || [];
    let overlay = {
      src: this.data.overlayEffect,
      tint: null
    };

    // Draw status effects
    if ( tokenEffects.length || actorEffects.length ) {
      const promises = [];
      let w = Math.round(canvas.dimensions.size / 2 / 5) * 2;
      let bg = this.effects.addChild(new PIXI.Graphics()).beginFill(0x000000, 0.40).lineStyle(1.0, 0x000000);
      let i = 0;

      // Draw actor effects first
      for ( let f of actorEffects ) {
        if ( !f.data.icon ) continue;
        if (f?.data?.flags?.D35E?.show && this.actor?.data?.data?.noBuffDisplay && !this.actor?.testUserPermission(game.user, "OWNER")) continue;
        const tint = f.data.tint ? colorStringToHex(f.data.tint) : null;
        if ( f.getFlag("core", "overlay") ) {
          overlay = {src: f.data.icon, tint};
          continue;
        }
        promises.push(this._drawEffect(f.data.icon, i, bg, w, tint));
        i++;
      }

      // Next draw token effects
      for ( let f of tokenEffects ) {
        promises.push(this._drawEffect(f, i, bg, w, null));
        i++;
      }
      await Promise.all(promises);
    }

    // Draw overlay effect
    return this._drawOverlay(overlay)
  }

  // Patch FormApplication
  FormApplication.prototype.saveMCEContent = async function(updateData=null) {};

  FormApplication.prototype.close = async function(options={}) {
    await this.saveMCEContent();
    return FormApplication_close.call(this, options);
  };

  // Patch Roll._replaceData
  if (!isMinimumCoreVersion("0.7.2")) {
    const Roll__replaceData = Roll.prototype._replaceData;
    Roll.prototype._replaceData = function(formula) {
      let result = Roll__replaceData.call(this, formula);
      result = _preProcessDiceFormula(result, this.data);
      return result;
    };
  }
  else {
    const Roll__identifyTerms = Roll.prototype._identifyTerms;
    Roll.prototype._identifyTerms = function(formula) {
      formula = _preProcessDiceFormula(formula, this.data);
      const terms = Roll__identifyTerms.call(this, formula);
      return terms;
    };
  }


  if (isMinimumCoreVersion("0.7.6") && !isMinimumCoreVersion("0.7.7")) {
    const Roll__splitDiceTerms = Roll.prototype._splitDiceTerms;
    Roll.prototype._splitDiceTerms = function (formula) {

      // Split on arithmetic terms and operators
      const operators = this.constructor.ARITHMETIC.concat(["(", ")"]);
      const arith = new RegExp(operators.map(o => "\\" + o).join("|"), "g");
      const split = formula.replace(arith, ";$&;").split(";");

      // Strip whitespace-only terms
      let terms = split.reduce((arr, term) => {
        term = term.trim();
        if (term === "") return arr;
        arr.push(term);
        return arr;
      }, []);

      // Categorize remaining non-whitespace terms
      terms = terms.reduce((arr, term, i, split) => {

        // Arithmetic terms
        if (this.constructor.ARITHMETIC.includes(term)) {
          if ((term !== "-" && !arr.length) || (i === (split.length - 1))) return arr; // Ignore leading or trailing arithmetic
          arr.push(term);
        }

        // Numeric terms
        else if (Number.isNumeric(term)) arr.push(Number(term));

        // Dice terms
        else {
          const die = DiceTerm.fromExpression(term);
          arr.push(die || term);
        }
        return arr;
      }, []);
      return terms;
    };
  }




  // const ActorTokenHelpers_createEmbeddedEntity = ActorTokenHelpers.prototype.createEmbeddedEntity;
  // ActorTokenHelpers.prototype.createEmbeddedEntity = async function(...args) {
  //   await ActorTokenHelpers_createEmbeddedEntity.call(this, ...args);
  //
  //   return ActorPF.prototype.update.call(this, {});
  // };

  const Token_animateMovement = Token.prototype.animateMovement;
  Token.prototype.animateMovement = async function(...args) {
    await Token_animateMovement.call(this, ...args);
    //console.log("D35E | Calling _calculateMinionDistance")
    ActorPF.prototype._calculateMinionDistance.call(this.actor, {});
    // Do something?
  };

  // Patch ActorTokenHelpers.updateEmbeddedEntity
  // const ActorTokenHelpers_updateEmbeddedEntity = ActorTokenHelpers.prototype.updateEmbeddedEntity;
  // ActorTokenHelpers.prototype.updateEmbeddedEntity = async function(embeddedName, data, options={}) {
  //   await ActorTokenHelpers_updateEmbeddedEntity.call(this, embeddedName, data, options);
  //
  //   if (options.stopUpdates) return;
  //   return ActorPF.prototype.update.call(this, options);
  // };
  // Patch ActorTokenHelpers.deleteEmbeddedEntity

  Object.defineProperty(ActiveEffect.prototype, "isTemporary", {
    get: function () {
      const duration = this.data.duration.seconds ?? (this.data.duration.rounds || this.data.duration.turns) ?? 0;
      return duration > 0 || this.getFlag("core", "statusId") || this.getFlag("D35E", "show");
    },
  });



  // Patch, patch, patch
  Combat.prototype._getInitiativeFormula = _getInitiativeFormula;
  Combat.prototype.rollInitiative = _rollInitiative;
  window.getTemplate = D35E_getTemplate;
  patchMeasureTools();
  patchLowLightVision();
// This system assumes that evalate should be run on StringTerm.eval
  const StringTerm_eval = StringTerm.prototype.evaluate;
  StringTerm.prototype.evaluate = async function(...args) {
    return this;
  };

  import("./lib/intro.js")

}




import { isMinimumCoreVersion } from "./lib.js";

import "./measure.js";
import {patchLowLightVision} from "./low-light-vision.js";
