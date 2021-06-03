import TreasureGenerator from "../treasure/treasure.js";
import {
  armorAndShieldsTable,
  MagicItemTable,
  weaponsTable,
  potionsTable,
  ringsTable,
  rodsTable,
  scrollsTable,
  staffsTable,
  wandsTable,
  wondrousItemsTable,
  MundaneItemsTable,
} from "../treasure/treasureTables.js";

export class TreasureGeneratorDialog extends FormApplication {
  treasures = [];
  curQuality = "mundane";
  curType = "armors";
  curAmount = 1;

  constructor(...args) {
    super(...args);
  }

  //Window option stuff
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "treasure-generator",
      title: "Treasure Generator",
      template: "systems/D35E/templates/apps/treasure-generator-dialog.html",
      width: "auto",
      height: "auto",
      closeOnSubmit: false,
      submitOnClose: false,
      classes: ["dialog auto-height-dialog"],
    });
  }

  //function to calcutlate the EL
  funcELCalc(monsterArray) {
    //this function converts CR to (CR/2)^2 so we can combine all the numbers then bring them back down with log2*2
    function crConvert(arr) {
      return arr.map(function (x) {
        if (x > 2) {
          return Math.pow(2, x / 2);
        } else {
          return x;
        }
      });
    }

    //this is just to collapse the array together with .reduce to combine all the CR's and then we can log2*2 them
    const add = (a, b) => a + b;

    //crArray is all the monsters cr's in an array
    let crArray = new Array();

    //take the CR from monsters in monsterArray
    let targets = monsterArray;
    for (let target of targets) {
      crArray.push(target.cr);
    }

    //take the CR Array and convert them to (CR/2)^2 so they may be added together
    let crConverted = crConvert(crArray);

    //log2(of all converted CRs added together)*2
    let EL = Math.round(Math.log2(crConverted.reduce(add)) * 2);
    return EL;
  }

  async getData() {
    //Load the compendium and get those tables to display!
    let data = {
      treasures: this.treasures,
      curQuality: this.curQuality,
      curType: this.curType,
      curAmount: this.curAmount,
      identified: true,
      allowedItemTypes: (this.curQuality === "mundane" && [
        { id: "armors", description: "Armor and shields" },
        { id: "weapons", description: "Weapon" },
        { id: "alchemical", description: "Alchemical item" },
        { id: "tools", description: "Tools and gear" },
        { id: "any", description: "Any" },
      ]) || [
        { id: "armors", description: "Armor and shields" },
        { id: "weapons", description: "Weapon" },
        { id: "potions", description: "Potions" },
        { id: "rings", description: "Rings" },
        { id: "rods", description: "Rods" },
        { id: "scrolls", description: "Scrolls" },
        { id: "staffs", description: "Staffs" },
        { id: "wands", description: "Wands" },
        { id: "wondrousItems", description: "Wondrous items" },
        { id: "any", description: "Any" },
      ],
    };

    return data;
  }

  addTreasure() {
    let treasureType = document.getElementById("treasureType").value;
    let treasureTypeDesc = document.getElementById("treasureType").options[
      document.getElementById("treasureType").selectedIndex
    ].text;
    let treasureQuality = document.getElementById("treasureQuality").value;
    let treasureQualityDesc = document.getElementById("treasureQuality")
      .options[document.getElementById("treasureQuality").selectedIndex].text;
    let treasureAmount = parseInt(
      document.getElementById("treasureAmount").value
    );
    let identified = document.getElementById("identified").checked;

    //console.log(identified);
    this.curQuality = treasureQuality;
    this.curType = treasureType;
    this.curAmount = treasureAmount;

    this.treasures.push({
      treasureType,
      treasureTypeDesc,
      treasureAmount,
      treasureQuality,
      treasureQualityDesc,
      identified,
    });
    this.render(true);
  }

  delTreasure(evt) {
    const it = evt.currentTarget.closest("li");
    this.treasures.splice(it.dataset.index, 1);
    this.render(true);
  }

  async genTreasure() {
    let selectedNpcTokens = canvas.tokens.controlled.filter(
      (t) => game.actors.get(t.data.actorId).data.type === "npc"
    );
    if (selectedNpcTokens.length !== 1) {
      ui.notifications.info(`Please select a token and one only`);
      return;
    }
    let token = selectedNpcTokens[0];

    let treasureGen = new TreasureGenerator();
    for (let treasure of this.treasures) {
      let rolls = [];
      let itemsTable = {};

      switch (treasure.treasureType) {
        case "armors":
          itemsTable = armorAndShieldsTable;
          break;
        case "weapons":
          itemsTable = weaponsTable;
          break;
        case "potions":
          itemsTable = potionsTable;
          break;
        case "rings":
          itemsTable = ringsTable;
          break;
        case "rods":
          itemsTable = rodsTable;
          break;
        case "scrolls":
          itemsTable = scrollsTable;
          break;
        case "staffs":
          itemsTable = staffsTable;
          break;
        case "wands":
          itemsTable = wandsTable;
          break;
        case "wondrousItems":
          itemsTable = wondrousItemsTable;
          break;
        case "any":
          itemsTable = MagicItemTable;
          break;
        default:
          break;
      }

      let options = {
        masterwork: true,
        overrideNames: true,
      };
      if (treasure.treasureQuality === "mundane") {
        options = {
          masterwork: false,
          overrideNames: true,
        };

        switch (treasure.treasureType) {
          case "armors":
            itemsTable = MundaneItemsTable;
            rolls = [18];
            break;
          case "weapons":
            itemsTable = MundaneItemsTable;
            rolls = [51];
            break;
          case "alchemical":
            itemsTable = MundaneItemsTable;
            rolls = [1];
            break;
          case "tools":
            itemsTable = MundaneItemsTable;
            rolls = [84];
            break;
          case "any":
            itemsTable = MundaneItemsTable;
            break;
          default:
            break;
        }
      }

      options.identified = treasure.identified;
      treasureGen.genItems(
        treasure.treasureAmount,
        itemsTable,
        treasure.treasureQuality,
        rolls,
        options
      );
    }

    // debug purposes
    // treasureGen.toChat();

    let ItemPfArr = treasureGen.toItemPfArr();
    let actor = canvas.tokens.get(token.data._id).actor
    //TODO adding items to actor, verify 0.8 compatibility
    let itemsToCreate = []
    for await (let it of ItemPfArr) {
      if (it === null || it === undefined) continue;
      //console.log("item: ", item);
      itemsToCreate.push(it);
      
    }
    let createdItems = await canvas.tokens
        .get(token.data._id)
        .actor.createEmbeddedEntity("Item", itemsToCreate, { stopUpdates: true });
    for (let item of createdItems) {
      if (item.data.type === "weapon" || item.data.type === "equipment") {
        const updateData = {};
        let _enhancements = duplicate(
          getProperty(item.data, `data.enhancements.items`) || []
        );

        item.updateMagicItemName(updateData, _enhancements, true, true);
        item.updateMagicItemProperties(updateData, _enhancements, true);
        await item.update(updateData, { stopUpdates: true });
      }
    }
    actor.groupItems();
    actor.refresh();
    ui.notifications.info(`Treasure generation finished`);
  }

  activateListeners(html) {
    //This makes the button clickable ;D
    html.find(".addTreasure").click(this.addTreasure.bind(this));
    html.find(".delTreasure").click(this.delTreasure.bind(this));
    html.find(".genTreasure").click(this.genTreasure.bind(this));
    html.find("#treasureQuality").change((evt) => {
      this.curQuality = evt.target.value;
      this.render(true);
    });
  }
}
