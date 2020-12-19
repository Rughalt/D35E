import { CompendiumBrowser } from "../apps/compendium-browser.js";

export class CompendiumDirectoryPF extends CompendiumDirectory {
  static browser;
  constructor(...args) {
    super(...args);

    this.compendiums = {
      spells: new CompendiumBrowser({ type: "spells", entityType: "Item" }),
      items: new CompendiumBrowser({ type: "items", entityType: "Item" }),
      bestiary: new CompendiumBrowser({ type: "bestiary", entityType: "Actor" }),
      feats: new CompendiumBrowser({ type: "feats", entityType: "Item" }),
      enhancements: new CompendiumBrowser({ type: "enhancements", entityType: "Item" }),
      buffs: new CompendiumBrowser({ type: "buffs", entityType: "Item" }),
    };
    CompendiumDirectoryPF.browser = this;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/D35E/templates/sidebar/compendium.html"
    });
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".compendium-footer .compendium.spells").click(e => this._onBrowseCompendium(e, "spells"));
    html.find(".compendium-footer .compendium.items").click(e => this._onBrowseCompendium(e, "items"));
    html.find(".compendium-footer .compendium.bestiary").click(e => this._onBrowseCompendium(e, "bestiary"));
    html.find(".compendium-footer .compendium.feats").click(e => this._onBrowseCompendium(e, "feats"));
    html.find(".compendium-footer .compendium.enhancements").click(e => this._onBrowseCompendium(e, "enhancements"));
    html.find(".compendium-footer .compendium.buffs").click(e => this._onBrowseCompendium(e, "buffs"));
  }

  _onBrowseCompendium(event, type) {
    event.preventDefault();

    this.compendiums[type]._render(true);
  }

  static browseCompendium(type) {
    CompendiumDirectoryPF.browser.compendiums[type]._render(true);
  }
}
