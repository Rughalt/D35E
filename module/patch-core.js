import { _rollInitiative, _getInitiativeFormula } from "./combat.js";
import "./misc/vision-permission.js";
import { _preProcessDiceFormula } from "./dice.js";
import { ActorPF } from "./actor/entity.js";


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
          console.log(`Foundry VTT | Retrieved and compiled template ${path}`);
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

  const ActorTokenHelpers_update = ActorTokenHelpers.prototype.update;
  ActorTokenHelpers.prototype.update = async function(data, options={}) {
    // Pre update
    if (isMinimumCoreVersion("0.7.4")) {
      await this.prepareUpdateData(data);
    }

    // Update changes
    let diff = data;
    if (options.updateChanges !== false) {
      const updateObj = await this._updateChanges({data: data});
      if (updateObj.diff.items) delete updateObj.diff.items;
      diff = mergeObject(diff, updateObj.diff);
    }
    if (Object.keys(diff).length) {
      await ActorTokenHelpers_update.call(this, diff, options);
    }
    //await this.toggleConditionStatusIcons();
  };

  const ActorTokenHelpers_createEmbeddedEntity = ActorTokenHelpers.prototype.createEmbeddedEntity;
  ActorTokenHelpers.prototype.createEmbeddedEntity = async function(...args) {
    await ActorTokenHelpers_createEmbeddedEntity.call(this, ...args);

    return ActorPF.prototype.update.call(this, {});
  };
  // Patch ActorTokenHelpers.updateEmbeddedEntity
  const ActorTokenHelpers_updateEmbeddedEntity = ActorTokenHelpers.prototype.updateEmbeddedEntity;
  ActorTokenHelpers.prototype.updateEmbeddedEntity = async function(embeddedName, data, options={}) {
    await ActorTokenHelpers_updateEmbeddedEntity.call(this, embeddedName, data, options);


    return ActorPF.prototype.update.call(this, {});
  };
  // Patch ActorTokenHelpers.deleteEmbeddedEntity
  const ActorTokenHelpers_deleteEmbeddedEntity = ActorTokenHelpers.prototype.deleteEmbeddedEntity;
  ActorTokenHelpers.prototype.deleteEmbeddedEntity = async function(embeddedName, id, options={}) {
    await ActorTokenHelpers_deleteEmbeddedEntity.call(this, embeddedName, id, options);


    return ActorPF.prototype.update.call(this, {});
  };




  // Patch, patch, patch
  Combat.prototype._getInitiativeFormula = _getInitiativeFormula;
  Combat.prototype.rollInitiative = _rollInitiative;
  window.getTemplate = D35E_getTemplate;

  if (isMinimumCoreVersion("0.7.2")) {
    await import("./low-light-vision.js");
  }
  else {
    await import("./legacy/low-light-vision.js");
  }

  import("./lib/intro.js")

}




import { isMinimumCoreVersion } from "./lib.js";

import "./measure.js";
