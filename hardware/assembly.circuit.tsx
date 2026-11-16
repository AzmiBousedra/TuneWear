// TuneWear assembly preview: the PCB plus the parts that are not soldered on (3D only).
// Fab exports (Gerbers, BOM, pick & place) come from index.circuit.tsx, so nothing here reaches the factory.
//
// All geometry below is in board coordinates (mm): x right, y up, z = 0 at the PCB top surface,
// PCB bottom surface at z = -1.6. Board spans x -34..34, y -17..17.
import { TuneWearBoard } from "./index.circuit"

type V3 = [number, number, number]
const C = {
  glass: [0.74, 0.77, 0.8] as V3,
  frontPlane: [0.55, 0.56, 0.58] as V3,
  ink: [0.95, 0.95, 0.91] as V3,
  driverIc: [0.12, 0.12, 0.13] as V3,
  fpc: [0.85, 0.52, 0.12] as V3,
  pouch: [0.78, 0.8, 0.84] as V3,
  label: [0.16, 0.32, 0.62] as V3,
  kapton: [0.96, 0.78, 0.18] as V3,
  red: [0.85, 0.12, 0.1] as V3,
  black: [0.08, 0.08, 0.08] as V3,
  plug: [0.95, 0.95, 0.93] as V3,
}

// One mechanical piece = one pinless part. The 3D viewer re-centres each model on its part's
// pcbX/pcbY and keeps one colour per model, so every box is its own part positioned by its centre.
type Piece = { name: string; min: V3; max: V3; color: V3; rounded?: number }
const box = (name: string, min: V3, max: V3, color: V3, rounded = 0): Piece => ({ name, min, max, color, rounded })
const Mech = ({ p }: { p: Piece }) => {
  const size = [p.max[0] - p.min[0], p.max[1] - p.min[1], p.max[2] - p.min[2]]
  const shape = p.rounded ? { type: "roundedCuboid", size, roundRadius: p.rounded } : { type: "cuboid", size }
  return (
    <chip
      name={p.name}
      pcbX={(p.min[0] + p.max[0]) / 2}
      pcbY={(p.min[1] + p.max[1]) / 2}
      footprint={<footprint></footprint>}
      cadModel={{ jscad: { type: "colorize", color: p.color, shape: { type: "translate", vector: [0, 0, (p.min[2] + p.max[2]) / 2], shape } } }}
    />
  )
}
// Wire of square section `d` through a list of points (axis-aligned legs), one piece per leg.
const wire = (name: string, pts: V3[], color: V3, d = 0.8) =>
  pts.slice(1).map((p, i) => {
    const q = pts[i]
    const lo = q.map((v, k) => Math.min(v, p[k]) - d / 2) as V3
    const hi = q.map((v, k) => Math.max(v, p[k]) + d / 2) as V3
    return box(`${name}${i + 1}`, lo, hi, color)
  })

// ---- Waveshare 2.13" e-Paper raw panel (250x122 B/W), taken off the HAT: 59.2 x 29.2 x 1.05 mm ----
// Glued to the bare PCB underside = device front. Left end clears the antenna keepout (x < -26.8).
// FPC exits the right end, wraps round the board edge and plugs into J3 (24-pin, centred y = 1).
const P = { x0: -26.7, x1: 32.5, y: 14.6, z0: -1.7 } // 0.1 mm adhesive gap under the board
const glassBottom = P.z0 - 0.7
const faceZ = glassBottom - 0.35
const ledgeX = P.x1 - 3.2 // glass ledge (no e-ink film) where the driver IC and FPC are bonded
const activeCx = (P.x0 + ledgeX) / 2
const display: Piece[] = [
    box("DISP_GLASS", [P.x0, -P.y, glassBottom], [P.x1, P.y, P.z0], C.glass), // TFT glass
    box("DISP_FILM", [P.x0, -P.y, faceZ], [ledgeX, P.y, glassBottom], C.frontPlane), // e-ink film + cover sheet (dark border)
    // shortcut: active area centred on the film; check the spec drawing offset if an enclosure window depends on it
    box("DISP_INK", [activeCx - 48.55 / 2, -23.71 / 2, faceZ - 0.03], [activeCx + 48.55 / 2, 23.71 / 2, faceZ], C.ink),
    box("DISP_IC", [ledgeX + 0.4, -7, glassBottom - 0.3], [ledgeX + 1.4, 7, glassBottom], C.driverIc), // COG driver IC
    // FPC: under the ledge -> round the right edge (x = 34) -> back over the top into J3's mouth
    box("FPC1", [P.x1 - 1.5, -5.5, glassBottom - 0.12], [34.6, 7.5, glassBottom - 0.02], C.fpc),
    box("FPC2", [34.5, -5.5, glassBottom - 0.12], [34.6, 7.5, 1.0], C.fpc),
    box("FPC3", [30.2, -5.5, 0.9], [34.6, 7.5, 1.0], C.fpc),
]

// ---- 503040 LiPo pouch, 3.7 V ~600 mAh (5 x 30 x 40 mm incl. protection board) ----
// Component side, on foam 4.5 mm above the board (clears J2 / USB-C). Taped protection-board end faces left.
const B = { x0: -7, x1: 33, y: 15, z0: 4.5, t: 5 }
const pcmEnd = B.x0 + 3.5
const zMid = B.z0 + B.t / 2
// JST-GH plug in J2: J2 mouth faces +y at y ~ 14.25; pin 1 (VBAT, red) at x 8.42, pin 2 (GND, black) at x 7.17.
const plug = { x0: 5.6, x1: 10.0, y0: 13.9, y1: 16.2, z0: 0.6, z1: 3.2 }
const battery: Piece[] = [
    box("BAT_CELL", [pcmEnd, -B.y, B.z0], [B.x1, B.y, B.z0 + B.t], C.pouch, 1), // cell pouch
    box("BAT_LABEL", [pcmEnd + 6, -11, B.z0 + B.t - 0.05], [B.x1 - 4, 11, B.z0 + B.t + 0.05], C.label), // printed label
    box("BAT_PCM", [B.x0, -B.y + 1, B.z0 + 0.6], [pcmEnd + 0.5, B.y - 1, B.z0 + B.t - 0.6], C.kapton), // protection board in yellow tape
    box("BAT_PLUG", [plug.x0, plug.y0, plug.z0], [plug.x1, plug.y1, plug.z1], C.plug), // GH plug
    // wires: out of the plug, up, along the top edge (inside the outline), down the left end into the protection board
    ...wire("WIRE_R", [[8.42, 16.2, 1.9], [8.42, 16.4, 1.9], [8.42, 16.4, zMid + 0.6], [-8.0, 16.4, zMid + 0.6], [-8.0, 3, zMid + 0.6], [B.x0, 3, zMid + 0.6]], C.red),
    ...wire("WIRE_K", [[7.17, 16.2, 1.9], [7.17, 15.6, 1.9], [7.17, 15.6, zMid - 0.6], [-8.9, 15.6, zMid - 0.6], [-8.9, 1.5, zMid - 0.6], [B.x0, 1.5, zMid - 0.6]], C.black),
]

export default () => (
  <TuneWearBoard mechanical>
    {[...display, ...battery].map((p) => (
      <Mech key={p.name} p={p} />
    ))}
  </TuneWearBoard>
)
