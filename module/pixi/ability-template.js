import { D35E } from "../config.js";
import {Roll35e} from "../roll.js";

/**
 * A helper class for building MeasuredTemplates for 5e spells and abilities
 * @extends {MeasuredTemplate}
 */
export default class AbilityTemplate extends MeasuredTemplate {

  /**
   * A factory method to create an AbilityTemplate instance using provided data from an Item5e instance
   * @param {ItemD35E} item               The Item object for which to construct the template
   * @return {AbilityTemplate|null}     The template object, or null if the item does not produce a template
   */
  static fromItem(item, multiplier = 1, rollData = {}) {
    const target = getProperty(item.data, "data.measureTemplate") || {};
    const templateShape = D35E.areaTargetTypes[target.type];
    if ( !templateShape ) return null;
    let baseSize = new Roll35e(`${target.size}`, rollData).roll().total;
    let size = baseSize*multiplier || 5;
    // Prepare template data
    const templateData = {
      t: templateShape,
      user: game.user._id,
      distance: size,
      direction: 0,
      x: 0,
      y: 0,
      fillColor: target.customColor || game.user.color,
      _id: randomID(16),

    };

    let path = target.customTexture;


    // Additional type-specific data
    switch ( templateShape ) {
      case "cone": // 5e cone RAW should be 53.13 degrees
        if (game.settings.get("D35E", "measureStyle") === true) templateData.angle = 90;
        templateData.angle = 53.13;
        break;
      case "rect": // 5e rectangular AoEs are always cubes
        templateData.distance = Math.hypot(target.size*multiplier, target.size*multiplier);
        templateData.width = target.value;
        templateData.direction = 45;
        break;
      case "ray": // 5e rays are most commonly 1 square (5 ft) in width
        templateData.width = target.width ?? canvas.dimensions.distance;
        break;
      default:
        break;
    }


    const cls = CONFIG.MeasuredTemplate.documentClass;
    const template = new cls(templateData, { parent: canvas.scene });

    template.item = item

    if (path) {
      loadTexture(path).then((tex) => {
        template.texture = tex;
        template.data.texture = path;
        template.refresh();
      })
    }

    const object = new this(template);
    return object;
  }

  /**
   * Creates a preview of the spell template
   *
   * @param {Event} event   The initiating click event
   */
  async drawPreview(event) {
    const initialLayer = canvas.activeLayer;
    this.draw();
    this.active = true;
    this.layer.activate();
    this.layer.preview.addChild(this);
    return this.activatePreviewListeners(initialLayer);
  }

  /* -------------------------------------------- */

  /**
   * Activate listeners for the template preview
   *
   * @param {CanvasLayer} initialLayer  The initially active CanvasLayer to re-activate after the workflow is complete
   * @returns {Promise<boolean>} Returns true if placed, or false if cancelled
   */
  activatePreviewListeners(initialLayer) {
    return new Promise((resolve) => {
      const handlers = {};
      let moveTime = 0;

      const pfStyle = game.settings.get("D35E", "measureStyle") === true;

      // Update placement (mouse-move)
      handlers.mm = (event) => {
        event.stopPropagation();
        let now = Date.now(); // Apply a 20ms throttle
        if (now - moveTime <= 20) return;
        const center = event.data.getLocalPosition(this.layer);
        let pos = canvas.grid.getSnappedPosition(center.x, center.y, 2);
        this.data.x = pos.x;
        this.data.y = pos.y;
        this.refresh();
        canvas.app.render();
        moveTime = now;
      };

      // Cancel the workflow (right-click)
      handlers.rc = (event, canResolve = true) => {
        this.layer.preview.removeChildren();
        canvas.stage.off("mousemove", handlers.mm);
        canvas.stage.off("mousedown", handlers.lc);
        canvas.app.view.oncontextmenu = null;
        canvas.app.view.onwheel = null;
        // Clear highlight
        this.active = false;
        const hl = canvas.grid.getHighlightLayer(`Template.${this.id}`);
        hl.clear();

        initialLayer.activate();
        if (canResolve) resolve(false);
      };

      // Confirm the workflow (left-click)
      handlers.lc = async (event) => {
        handlers.rc(event, false);

        // Confirm final snapped position
        this.data.update(this.data);

        // Create the template
        const result = await canvas.scene.createEmbeddedDocuments("MeasuredTemplate", [this.data]);
        resolve(result);
      };

      // Rotate the template by 3 degree increments (mouse-wheel)
      handlers.mw = (event) => {
        if (event.ctrlKey) event.preventDefault(); // Avoid zooming the browser window
        event.stopPropagation();
        let delta, snap;
        if (event.ctrlKey) {
          if (this.data.t === "rect") {
            delta = Math.sqrt(canvas.dimensions.distance * canvas.dimensions.distance);
          } else {
            delta = canvas.dimensions.distance;
          }
          this.data.distance += delta * -Math.sign(event.deltaY);
        } else {
          if (pfStyle && this.data.t === "cone") {
            delta = 90;
            snap = event.shiftKey ? delta : 45;
          } else {
            delta = canvas.grid.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
            snap = event.shiftKey ? delta : 5;
          }
          if (this.data.t === "rect") {
            snap = Math.sqrt(Math.pow(5, 2) + Math.pow(5, 2));
            this.data.distance += snap * -Math.sign(event.deltaY);
          } else {
            this.data.direction += snap * Math.sign(event.deltaY);
          }
        }
        this.refresh();
      };

      // Activate listeners
      if (this.controlIcon) this.controlIcon.removeAllListeners();
      canvas.stage.on("mousemove", handlers.mm);
      canvas.stage.on("mousedown", handlers.lc);
      canvas.app.view.oncontextmenu = handlers.rc;
      canvas.app.view.onwheel = handlers.mw;
      this.hitArea = new PIXI.Polygon([]);
    });
  }

  refresh() {
    if (!this.template) return;
    if (!canvas.scene) return;

    super.refresh();

    if (this.active) {
      this.highlightGrid();
    }

    return this;
  }
}
