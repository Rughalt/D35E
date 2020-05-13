import { ActorSheetPFNPC } from "./npc.js";
import { createTabs } from "../../lib.js";

export class ActorSheetPFNPCLoot extends ActorSheetPFNPC {

  /**
   * Define default rendering options for the NPC sheet
   * @return {Object}
   */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
      classes: ["D35E", "sheet", "actor", "npc", "loot"],
      width: 560,
      height: 420,
    });
  }
    
  get template() {
    return "systems/D35E/templates/actors/npc-sheet-loot.html";
  }

  static get name() {
    return game.i18n.localize("D35E.ActorSheetPFNPCLoot");
  }

  getData() {
    const data = super.getData();

    data.isLootSheet = true;
    data.inventoryTotalValue = this.calculateTotalItemValue() + this.actor.mergeCurrency();

    return data;
  }

  calculateTotalItemValue() {
    const items = this.actor.items;
    return Math.floor(items.reduce((cur, i) => {
      return cur + (i.data.data.price * i.data.data.quantity);
    }, 0) * 100) / 100;
  }

  createTabs(html) {
    const tabGroups = {
      "inventory": {},
    };
    createTabs.call(this, html, tabGroups);
  }
}