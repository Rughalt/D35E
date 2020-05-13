import { _rollInitiative, _getInitiativeFormula } from "./combat.js";
import { _preProcessDiceFormula } from "./dice.js";

const FormApplication_close = FormApplication.prototype.close;

export function PatchCore() {
  // Patch getTemplate to prevent unwanted indentation in things things like <textarea> elements.
  async function PF1_getTemplate(path) {
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
  const Roll__replaceData = Roll.prototype._replaceData;
  Roll.prototype._replaceData = function(formula) {
    let result = Roll__replaceData.call(this, formula);
    result = _preProcessDiceFormula(result, this.data);
    return result;
  };

  // Patch, patch, patch
  Combat.prototype._getInitiativeFormula = _getInitiativeFormula;
  Combat.prototype.rollInitiative = _rollInitiative;
  window.getTemplate = PF1_getTemplate;
}

import "./low-light-vision.js";
import "./measure.js";
