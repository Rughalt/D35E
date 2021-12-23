import { degtorad } from "./lib.js";

/**
 * Applies patches to core functions to integrate Pathfinder specific measurements.
 */
export class TemplateLayerPF extends TemplateLayer {
  // Use 90 degrees cone in D35E style
  async _onDragLeftStart(event) {
    if (!game.settings.get("D35E", "measureStyle")) return super._onDragLeftStart(event);

    // Create temporary highlight layer
    if (canvas.grid.getHighlightLayer(this.constructor.HIGHLIGHT_TEMP_LAYERNAME) == null) {
      canvas.grid.addHighlightLayer(this.constructor.HIGHLIGHT_TEMP_LAYERNAME);
    }

    // Create the new preview template
    const tool = game.activeTool;
    const origin = event.data.origin;
    const pos = canvas.grid.getSnappedPosition(origin.x, origin.y, 2);
    origin.x = pos.x;
    origin.y = pos.y;

    // Create the template
    const data = {
      user: game.user.id,
      t: tool,
      x: pos.x,
      y: pos.y,
      distance: 1,
      direction: 0,
      fillColor: game.user.data.color || "#FF0000",
    };
    if (tool === "cone") data["angle"] = 90;
    else if (tool === "ray") data["width"] = 5;

    // Assign the template
    const doc = new CONFIG.MeasuredTemplate.documentClass(data, { parent: canvas.scene });
    const template = new CONFIG.MeasuredTemplate.objectClass(doc);
    event.data.preview = this.preview.addChild(template);
    return template.draw();
  }

  _onDragLeftMove(event) {
    if (!game.settings.get("D35E", "measureStyle")) return super._onDragLeftMove(event);

    const { destination, createState, preview, origin } = event.data;
    if (createState === 0) return;

    // Snap the destination to the grid
    event.data.destination = canvas.grid.getSnappedPosition(destination.x, destination.y, 2);

    // Compute the ray
    const ray = new Ray(origin, destination);
    const dist = canvas.dimensions.distance;
    const ratio = canvas.dimensions.size / dist;

    // Update the preview object
    const type = event.data.preview.data.t;
    // Set direction
    if (["cone", "circle"].includes(type)) {
      preview.data.direction = Math.floor((Math.normalizeDegrees(Math.toDegrees(ray.angle)) + 45 / 2) / 45) * 45;
    } else if (type === "ray") {
      preview.data.direction = Math.floor((Math.normalizeDegrees(Math.toDegrees(ray.angle)) + 5 / 2) / 5) * 5;
    } else {
      preview.data.direction = Math.normalizeDegrees(Math.toDegrees(ray.angle));
    }
    // Set distance
    if (["cone", "circle", "ray"].includes(type)) {
      preview.data.distance = Math.floor(ray.distance / ratio / dist) * dist;
    } else {
      preview.data.distance = ray.distance / ratio;
    }
    preview.refresh();

    // Confirm the creation state
    event.data.createState = 2;
  }
}

export class MeasuredTemplatePF extends MeasuredTemplate {
  // Highlight grid in D35E style
  highlightGrid() {
    if (!game.settings.get("D35E", "measureStyle") || !["circle", "cone"].includes(this.data.t))
      return super.highlightGrid();

    const grid = canvas.grid,
      d = canvas.dimensions,
      bc = this.borderColor,
      fc = this.fillColor;

    // Only highlight for objects which have a defined shape
    if (!this.id || !this.shape) return;

    // Clear existing highlight
    const hl = grid.getHighlightLayer(`Template.${this.id}`);
    hl.clear();

    // Get number of rows and columns
    const nr = Math.ceil((this.data.distance * 1.5) / d.distance / (d.size / grid.h)),
      nc = Math.ceil((this.data.distance * 1.5) / d.distance / (d.size / grid.w));

    // Get the center of the grid position occupied by the template
    const x = this.data.x,
      y = this.data.y;

    const [cx, cy] = grid.getCenter(x, y),
      [col0, row0] = grid.grid.getGridPositionFromPixels(cx, cy),
      minAngle = (360 + ((this.data.direction - this.data.angle * 0.5) % 360)) % 360,
      maxAngle = (360 + ((this.data.direction + this.data.angle * 0.5) % 360)) % 360;

    const within_angle = function (min, max, value) {
      min = (360 + (min % 360)) % 360;
      max = (360 + (max % 360)) % 360;
      value = (360 + (value % 360)) % 360;

      if (min < max) return value >= min && value <= max;
      return value >= min || value <= max;
    };

    const measureDistance = function (p0, p1) {
      const gs = canvas.dimensions.size,
        ray = new Ray(p0, p1),
        // How many squares do we travel across to get there? If 2.3, we should count that as 3 instead of 2; hence, Math.ceil
        nx = Math.ceil(Math.abs(ray.dx / gs)),
        ny = Math.ceil(Math.abs(ray.dy / gs));

      // Get the number of straight and diagonal moves
      const nDiagonal = Math.min(nx, ny),
        nStraight = Math.abs(ny - nx);

      // Diagonals in PF pretty much count as 1.5 times a straight
      const distance = Math.floor(nDiagonal * 1.5 + nStraight);
      const distanceOnGrid = distance * canvas.dimensions.distance;
      return distanceOnGrid;
    };

    const originOffset = { x: 0, y: 0 };
    // Offset measurement for cones
    // Offset is to ensure that cones only start measuring from cell borders, as in https://www.d20pfsrd.com/magic/#Aiming_a_Spell
    if (this.data.t === "cone") {
      // Degrees anticlockwise from pointing right. In 45-degree increments from 0 to 360
      const dir = (this.data.direction >= 0 ? 360 - this.data.direction : -this.data.direction) % 360;
      // If we're not on a border for X, offset by 0.5 or -0.5 to the border of the cell in the direction we're looking on X axis
      const xOffset =
        this.data.x % d.size != 0
          ? Math.sign((1 * Math.round(Math.cos(degtorad(dir)) * 100)) / 100) / 2 // /2 turns from 1/0/-1 to 0.5/0/-0.5
          : 0;
      // Same for Y, but cos Y goes down on screens, we invert
      const yOffset =
        this.data.y % d.size != 0 ? -Math.sign((1 * Math.round(Math.sin(degtorad(dir)) * 100)) / 100) / 2 : 0;
      originOffset.x = xOffset;
      originOffset.y = yOffset;
    }

    for (let a = -nc; a < nc; a++) {
      for (let b = -nr; b < nr; b++) {
        // Position of cell's top-left corner, in pixels
        const [gx, gy] = canvas.grid.grid.getPixelsFromGridPosition(col0 + a, row0 + b);
        // Position of cell's center, in pixels
        const [cellCenterX, cellCenterY] = [gx + d.size * 0.5, gy + d.size * 0.5];

        // Determine point of origin
        const origin = { x: this.data.x, y: this.data.y };
        origin.x += originOffset.x * d.size;
        origin.y += originOffset.y * d.size;

        const ray = new Ray(origin, { x: cellCenterX, y: cellCenterY });

        const rayAngle = (360 + ((ray.angle / (Math.PI / 180)) % 360)) % 360;
        if (this.data.t === "cone" && ray.distance > 0 && !within_angle(minAngle, maxAngle, rayAngle)) {
          continue;
        }

        // Determine point we're measuring the distance to - always in the center of a grid square
        const destination = { x: cellCenterX, y: cellCenterY };

        const distance = measureDistance(destination, origin);
        if (distance <= this.data.distance) {
          grid.grid.highlightGridPosition(hl, { x: gx, y: gy, color: fc, border: bc });
        }
      }
    }
  }
}
