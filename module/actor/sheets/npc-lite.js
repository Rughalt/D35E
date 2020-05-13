import { ActorSheetPFNPC } from "./npc.js";

export class ActorSheetPFNPCLite extends ActorSheetPFNPC {

  /**
   * Define default rendering options for the NPC sheet
   * @return {Object}
   */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
      classes: ["pf1", "sheet", "actor", "npc", "lite"],
      width: 440,
      height: 200,
    });
  }
    
  get template() {
    if ( !game.user.isGM && this.actor.limited ) return "systems/pf1/templates/actors/limited-sheet.html";
    return "systems/pf1/templates/actors/npc-sheet-lite.html";
  }

  static get name() {
    return game.i18n.localize("PF1.ActorSheetPFNPCLite");
  }
}