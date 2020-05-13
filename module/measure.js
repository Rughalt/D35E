import { degtorad } from "./lib.js";

// Use 90 degrees cone in PF1 style
const TemplateLayer__onDragStart = TemplateLayer.prototype._onDragStart;
TemplateLayer.prototype._onDragStart = function(event) {
  if (!game.settings.get("pf1", "measureStyle")) return TemplateLayer__onDragStart.call(this, event);

  PlaceablesLayer.prototype._onDragStart.call(this, event);

  // Create the new preview template
  const tool = game.activeTool;
  const origin = event.data.origin;
  let pos;
  if (["cone", "circle"].includes(tool)) {
    pos = canvas.grid.getSnappedPosition(origin.x, origin.y, 1);
    if (tool === "cone") {
      pos.x -= canvas.dimensions.size * 0.5;
      pos.y -= canvas.dimensions.size * 0.5;
    }
  }
  else pos = canvas.grid.getSnappedPosition(origin.x, origin.y, 2);
  origin.x = pos.x;
  origin.y = pos.y;

  // Create the template
  const data = {
    user: game.user._id,
    t: tool,
    x: pos.x,
    y: pos.y,
    distance: 0,
    direction: 0,
    fillColor: game.user.data.color || "#FF0000"
  };
  if (tool === "cone") data["angle"] = 90;
  else if (tool === "ray") data["width"] = 5;

  // Assign the template
  let template = new MeasuredTemplate(data);
  event.data.object = this.preview.addChild(template);
  template.draw();
};


const TemplateLayer__onMouseMove = TemplateLayer.prototype._onMouseMove;
TemplateLayer.prototype._onMouseMove = function(event) {
  if (!game.settings.get("pf1", "measureStyle")) return TemplateLayer__onMouseMove.call(this, event);

  PlaceablesLayer.prototype._onMouseMove.call(this, event);
  if (event.data.createState >= 1) {
    // Snap the destination to the grid
    let dest = event.data.destination;
    let {x, y} = canvas.grid.getSnappedPosition(dest.x, dest.y, 2);
    dest.x = x;
    dest.y = y;

    // Compute the ray
    let template = event.data.object,
        ray = new Ray(event.data.origin, event.data.destination),
        ratio = (canvas.dimensions.size / canvas.dimensions.distance);

    // Update the shape data
    if (["cone", "circle"].includes(template.data.t)) {
      const direction = ray.angle;
      template.data.direction = toDegrees(Math.floor((direction + (Math.PI * 0.125)) / (Math.PI * 0.25)) * (Math.PI * 0.25));
      const distance = ray.distance / ratio;
      template.data.distance = Math.floor(distance / canvas.dimensions.distance) * canvas.dimensions.distance;
    }
    else {
      template.data.direction = toDegrees(ray.angle);
      template.data.distance = ray.distance / ratio;
    }

    // Draw the pending shape
    template.refresh();
    event.data.createState = 2;
  }
};


// Highlight grid in PF1 style
const MeasuredTemplate_highlightGrid = MeasuredTemplate.prototype.highlightGrid;
MeasuredTemplate.prototype.highlightGrid = function() {
  if (!game.settings.get("pf1", "measureStyle") || !(["circle", "cone"].includes(this.data.t))) return MeasuredTemplate__highlightGrid.call(this);

  const grid = canvas.grid,
        d = canvas.dimensions,
        bc = this.borderColor,
        fc = this.fillColor;

  // Only highlight for objects which have a defined shape
  if ( !this.id || !this.shape ) return;

  // Clear existing highlight
  const hl = grid.getHighlightLayer(`Template.${this.id}`);
  hl.clear();

  // Get number of rows and columns
  let nr = Math.ceil(((this.data.distance * 1.5) / d.distance) / (d.size / grid.h)),
      nc = Math.ceil(((this.data.distance * 1.5) / d.distance) / (d.size / grid.w));

  // Get the center of the grid position occupied by the template
  let x = this.data.x,
    y = this.data.y;

  let [cx, cy] = grid.getCenter(x, y),
    [col0, row0] = grid.grid.getGridPositionFromPixels(cx, cy),
    minAngle = (360 + ((this.data.direction - this.data.angle * 0.5) % 360)) % 360,
    maxAngle = (360 + ((this.data.direction + this.data.angle * 0.5) % 360)) % 360;

  const within_angle = function(min, max, value) {
    min = (360 + min % 360) % 360;
    max = (360 + max % 360) % 360;
    value = (360 + value % 360) % 360;

    if (min < max) return (value >= min && value <= max);
    return (value >= min || value <= max);
  };

  const measureDistance = function(p0, p1) {
    let gs = canvas.dimensions.size,
    ray = new Ray(p0, p1),
    nx = Math.abs(Math.ceil(ray.dx / gs)),
    ny = Math.abs(Math.ceil(ray.dy / gs));

    // Get the number of straight and diagonal moves
    let nDiagonal = Math.min(nx, ny),
        nStraight = Math.abs(ny - nx);
        
    let nd10 = Math.floor(nDiagonal / 2);
    let spaces = (nd10 * 2) + (nDiagonal - nd10) + nStraight;
    return spaces * canvas.dimensions.distance;
  };

  for (let a = -nc; a < nc; a++) {
    for (let b = -nr; b < nr; b++) {
      let [gx, gy] = canvas.grid.grid.getPixelsFromGridPosition(col0 + a, row0 + b);
      let [gx2, gy2] = [gx + d.size * 0.5, gy + d.size * 0.5];

      // Determine point of origin
      let p1 = {x: this.data.x, y: this.data.y};
      let originOffset = {x: 0, y: 0};
      // Offset measurement for cones
      if (this.data.t === "cone") {
        const dir = (this.data.direction >= 0 ? 360 - this.data.direction : -this.data.direction) % 360;
        originOffset = {
          x: Math.sign(1 * (Math.round(Math.cos(degtorad(dir)) * 100)) / 100),
          y: -Math.sign(1 * (Math.round(Math.sin(degtorad(dir)) * 100)) / 100),
        };
      }
      p1.x += (originOffset.x * d.size);
      p1.y += (originOffset.y * d.size);

      let ray = new Ray(p1, {x: gx2, y: gy2});

      let rayAngle = (360 + (ray.angle / (Math.PI / 180)) % 360) % 360;
      // if (this.data.t === "cone" && ray.distance === 0) continue;
      if (this.data.t === "cone" && ray.distance > 0 && !within_angle(minAngle, maxAngle, rayAngle)) {
        continue;
      }

      // Determine point of measurement
      let p0 = {x: gx, y: gy};
      if (this.data.x / d.size !== Math.floor(this.data.x / d.size)) p0.x = gx2;
      if (this.data.y / d.size !== Math.floor(this.data.y / d.size)) p0.y = gy2;
      // Offset measurement for non-cones
      if (this.data.t !== "cone") {
        if (p0.x > this.data.x) p0.x += d.size;
        if (p0.y > this.data.y) p0.y += d.size;
      }
      // Reset point of origin for cones
      if (this.data.t === "cone") {
        p1.x -= (originOffset.x * d.size);
        p1.y -= (originOffset.y * d.size);
      }

      if (measureDistance(p0, p1) <= this.data.distance) {
        grid.grid.highlightGridPosition(hl, { x: gx, y: gy, color: fc, border: bc });
      }
    }
  }
};
