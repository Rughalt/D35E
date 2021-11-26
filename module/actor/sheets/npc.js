import { ActorSheetPF } from "../sheets/base.js";
import { CR } from "../../lib.js";

import {Roll35e} from "../../roll.js"

/**
 * An Actor sheet for NPC type characters in the D&D5E system.
 * Extends the base ActorSheetPF class.
 * @type {ActorSheetPF}
 */
export class ActorSheetPFNPC extends ActorSheetPF {

  /**
   * Define default rendering options for the NPC sheet
   * @return {Object}
   */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
      classes: ["D35E", "sheet", "actor", "npc"],
      width: 725,
      height: 800
    });
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * Get the correct HTML template path to use for rendering this particular sheet
   * @type {String}
   */
  get template() {
    if ( !game.user.isGM && this.actor.limited ) return "systems/D35E/templates/actors/limited-sheet.html";
    return "systems/D35E/templates/actors/npc-sheet.html";
  }

  static get name() {
    return game.i18n.localize("D35E.ActorSheetPFNPC");
  }

  /* -------------------------------------------- */

  /**
   * Add some extra data when rendering the sheet to reduce the amount of logic required within the template.
   */
  getData() {
    const data = super.getData();

    // Challenge Rating
    const cr = parseFloat(data.data.details.cr || 0);
    const total = parseFloat(data.data.details.totalCr || 0);
    data.labels.cr = CR.fromNumber(cr);
    data.labels.totalCr = CR.fromNumber(total)
    data.labels.totalExp = total*75*4;
    return data;
  }

  /* -------------------------------------------- */
  /*  Object Updates                              */
  /* -------------------------------------------- */

  /**
   * This method is called upon form submission after form data is validated
   * @param event {Event}       The initial triggering submission event
   * @param formData {Object}   The object of validated form data with which to update the object
   * @private
   */
  async _updateObject(event, formData) {

    // Format NPC Challenge Rating

    let crv = "data.details.cr";
    let cr = formData[crv];
    if (cr)
      formData[crv] = CR.fromString(cr);

    // Parent ActorSheet update steps
    super._updateObject(event, formData);
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
   */
	activateListeners(html) {
    super.activateListeners(html);

    // Rollable Health Formula
    html.find(".health .rollable").click(this._onRollHealthFormula.bind(this));


  }

  /* -------------------------------------------- */

  /**
   * Handle rolling NPC health values using the provided formula
   * @param {Event} event     The original click event
   * @private
   */
  _onRollHealthFormula(event) {
    event.preventDefault();
    const formula = this.actor.data.data.attributes.hp.formula;
    if ( !formula ) return;
    const hp = new Roll35e(formula).roll().total;
    AudioHelper.play({src: CONFIG.sounds.dice});
    this.actor.update({"data.attributes.hp.value": hp, "data.attributes.hp.max": hp});
  }
}
