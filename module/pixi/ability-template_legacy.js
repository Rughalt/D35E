/**
 * A helper class for building MeasuredTemplates for 5e spells and abilities
 * @extends {MeasuredTemplate}
 */
export class AbilityTemplateLegacy extends MeasuredTemplate {

  /**
   * A factory method to create an AbilityTemplate instance using provided data
   * @param {string} type -             The type of template ("cone", "circle", "rect" or "ray")
   * @param {number} distance -         The distance/size of the template
   * @return {AbilityTemplate|null}     The template object, or null if the data does not produce a template
   */
  static fromData(options) {
    let type = options.type;
    let distance = options.distance;
    if (!type) return null;
    if (!distance) return null;
    if (!["cone", "circle", "rect", "ray"].includes(type)) return null;

    // Prepare template data
    const templateData = {
      t: type,
      user: game.user._id,
      distance: distance || 5,
      direction: 0,
      x: 0,
      y: 0,
      fillColor: options.color ? options.color : game.user.color,
      texture: options.texture ? options.texture : null,
    };

    // Additional type-specific data
    switch (type) {
      case "cone":
        if (game.settings.get("D35E", "measureStyle") === true) templateData.angle = 90;
        else templateData.angle = 53.13;
        break;
      case "rect":
        templateData.distance = distance || 5;
        templateData.width = target.value;
        templateData.direction = 45;
        break;
      case "ray":
        templateData.width = 5;
        break;
      default:
        break;
    }

    // Return the template constructed from the item data
    return new this(templateData);
  }

  /* -------------------------------------------- */

  /**
   * Creates a preview of the spell template
   * @param {Event} event   The initiating click event
   */
  async drawPreview(event) {
    const initialLayer = canvas.activeLayer;
    this.draw();
    this.layer.activate();
    this.layer.preview.addChild(this);
    return this.activatePreviewListeners(initialLayer);
  }

  /* -------------------------------------------- */

  /**
   * Activate listeners for the template preview
   * @param {CanvasLayer} initialLayer  The initially active CanvasLayer to re-activate after the workflow is complete
   * @returns {Promise<boolean>} Returns true if placed, or false if cancelled
   */
  activatePreviewListeners(initialLayer) {
    return new Promise(resolve => {
      const handlers = {};
      let moveTime = 0;

      const pfStyle = game.settings.get("D35E", "measureStyle") === true;

      // Update placement (mouse-move)
      handlers.mm = event => {
        event.stopPropagation();
        let now = Date.now(); // Apply a 20ms throttle
        if ( now - moveTime <= 20 ) return;
        const center = event.data.getLocalPosition(this.layer);
        let pos;
        if (pfStyle && this.data.t === "cone") {
          const cs = canvas.dimensions.size * 0.5;
          pos = canvas.grid.getSnappedPosition(center.x - cs, center.y - cs, 1);
          pos.x += cs;
          pos.y += cs;
        }
        else if (pfStyle && this.data.t === "circle") {
          pos = canvas.grid.getSnappedPosition(center.x, center.y, 1);
        }
        else pos = canvas.grid.getSnappedPosition(center.x, center.y, 2);
        this.data.x = pos.x;
        this.data.y = pos.y;
        this.refresh();
        moveTime = now;
      };

      // Cancel the workflow (right-click)
      handlers.rc = (event, canResolve=true) => {
        this.layer.preview.removeChildren();
        canvas.stage.off("mousemove", handlers.mm);
        canvas.stage.off("mousedown", handlers.lc);
        canvas.app.view.oncontextmenu = null;
        canvas.app.view.onwheel = null;
        initialLayer.activate();
        if (canResolve) resolve(false);
      };

      // Confirm the workflow (left-click)
      handlers.lc = event => {
        handlers.rc(event, false);

        // Confirm final snapped position
        const destination = canvas.grid.getSnappedPosition(this.x, this.y, 2);
        this.data.x = destination.x;
        this.data.y = destination.y;

        // Create the template
        canvas.scene.createEmbeddedEntity("MeasuredTemplate", this.data);
        resolve(true);
      };

      // Rotate the template by 3 degree increments (mouse-wheel)
      handlers.mw = event => {
        if (event.ctrlKey) event.preventDefault(); // Avoid zooming the browser window
        event.stopPropagation();
        let delta, snap;
        if (pfStyle && this.data.t === "cone") {
          delta = 90;
          snap = event.shiftKey ? delta : 45;
        }
        else {
          delta = canvas.grid.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
          snap = event.shiftKey ? delta : 5;
        }
        this.data.direction += (snap * Math.sign(event.deltaY));
        this.refresh();
      };

      // Activate listeners
      canvas.stage.on("mousemove", handlers.mm);
      canvas.stage.on("mousedown", handlers.lc);
      canvas.app.view.oncontextmenu = handlers.rc;
      canvas.app.view.onwheel = handlers.mw;
    });
  }
}
