// TuneWear — ESP32-S3 wearable with 2.13" SSD1680 e-paper, USB-C LiPo charging.
// Board coords: origin at board centre, +y up, mm. Antenna overhangs nothing: keep x < -27.5 copper-free.
import { ESP32_S3_WROOM_1_N8 } from "./imports/ESP32_S3_WROOM_1_N8"
import { MCP73831T_2ACI_OT } from "./imports/MCP73831T_2ACI_OT"
import { AP2112K_3_3TRG1 } from "./imports/AP2112K_3_3TRG1"
import { USBLC6_2SC6 } from "./imports/USBLC6_2SC6"
import { DMG2305UX_7 } from "./imports/DMG2305UX_7"
import { AO3400A } from "./imports/AO3400A"
import { B5819W } from "./imports/B5819W"
import { B3U_1000P } from "./imports/B3U_1000P"
import { TYPE_C_31_M_12 } from "./imports/TYPE_C_31_M_12"
// KiCad's own 3D models for the kicad: footprints (copied from the KiCad install; the online model cache 404s for these)
import ghStep from "./models/JST_GH_SM02B-GHS-TB_1x02-1MP_P1.25mm_Horizontal.step"
import fh12Step from "./models/Hirose_FH12-24S-0.5SH_1x24-1MP_P0.50mm_Horizontal.step"

const cap = (name: string, capacitance: string, a: string, b: string, x: number, y: number, rot = 0, footprint = "0402") => (
  <>
    <capacitor name={name} capacitance={capacitance} footprint={footprint} pcbX={x} pcbY={y} pcbRotation={rot} />
    <trace from={`.${name} > .pin1`} to={a} />
    <trace from={`.${name} > .pin2`} to={b} />
  </>
)
const res = (name: string, resistance: string, a: string, b: string, x: number, y: number, rot = 0) => (
  <>
    <resistor name={name} resistance={resistance} footprint="0402" pcbX={x} pcbY={y} pcbRotation={rot} />
    <trace from={`.${name} > .pin1`} to={a} />
    <trace from={`.${name} > .pin2`} to={b} />
  </>
)

// `children` lets assembly.circuit.tsx add non-electrical parts (display, battery) without touching fab outputs.
// `mechanical`: the assembly preview's model pieces are pinless parts that sit off the board edge and
// would fail placement DRC (which then skips autorouting), so only that preview turns the check off.
export const TuneWearBoard = ({ children, mechanical = false }: { children?: React.ReactNode; mechanical?: boolean }) => (
  <board
    placementDrcChecksDisabled={mechanical}
    width="68mm"
    height="34mm"
    borderRadius="2mm"
    layers={2}
    // Fab margin over JLCPCB 2-layer minimums (0.127 mm space, 0.15 mm annular ring)
    minTraceToPadEdgeClearance="0.15mm"
    minViaEdgeToPadEdgeClearance="0.15mm"
    minViaHoleEdgeToViaHoleEdgeClearance="0.25mm"
    minTraceToHoleEdgeClearance="0.2mm"
    minViaHoleDiameter="0.3mm"
    minViaPadDiameter="0.6mm"
  >
    {/* ESP32 PCB-antenna keepout: no copper/parts under the antenna end of U1 (x < -26.8), both layers */}
    <keepout shape="rect" pcbX={-30.4} pcbY={6.5} width="7.2mm" height="21mm" layers={["top", "bottom"]} excludeRefs={[".U1"]} />
    {/* Power rails carry up to ~500 mA (WiFi TX + charging): 0.4 mm ≈ 1 A on 1 oz outer copper */}
    {["VBUS", "VSYS", "VBAT", "VIN_SW", "V3V3"].map((n) => (
      <net name={n} isPowerNet nominalTraceWidth="0.4mm" />
    ))}
    <net name="GND" isGroundNet />
    <copperpour connectsTo="net.GND" layer="top" />
    <copperpour connectsTo="net.GND" layer="bottom" />
    {/* ---------------- MCU ---------------- */}
    <ESP32_S3_WROOM_1_N8
      name="U1"
      pcbX={-16.85}
      pcbY={5.9}
      pcbRotation={90}
      connections={{
        GND1: "net.GND",
        GND2: "net.GND",
        EP: "net.GND",
        "3V3": "net.V3V3",
        EN: "net.EN",
        IO0: "net.BOOT",
        IO1: "net.VBAT_SENSE",
        IO4: "net.USER_BTN",
        IO7: "net.EPD_BUSY",
        IO8: "net.EPD_RST",
        IO9: "net.EPD_DC",
        IO10: "net.EPD_CS",
        IO11: "net.EPD_MOSI",
        IO12: "net.EPD_SCK",
        IO19: "net.USB_DN",
        IO20: "net.USB_DP",
      }}
    />
    {cap("C5", "10uF", "net.V3V3", "net.GND", -26.4, -7.7, 270, "0603")}
    {cap("C6", "100nF", "net.V3V3", "net.GND", -24.7, -6.8, 270)}
    {res("R8", "10k", "net.V3V3", "net.EN", -22.4, -7.3, 270)}
    {cap("C7", "1uF", "net.EN", "net.GND", -21.2, -7.3, 270)}

    {/* Buttons: RESET (EN), BOOT (IO0), USER (IO4) — all to GND */}
    <B3U_1000P name="SW2" pcbX={-24} pcbY={-14.9} connections={{ pin1: "net.GND", pin2: "net.EN" }} />
    <B3U_1000P name="SW3" pcbX={-17.8} pcbY={-14.9} connections={{ pin1: "net.GND", pin2: "net.BOOT" }} />
    <B3U_1000P name="SW4" pcbX={-11.6} pcbY={-14.9} connections={{ pin1: "net.GND", pin2: "net.USER_BTN" }} />

    {/* ---------------- USB-C + ESD ---------------- */}
    <TYPE_C_31_M_12
      name="J1"
      pcbX={-1}
      pcbY={-11.6}  // receptacle face flush with bottom edge (plug overmold must clear the PCB)
      connections={{
        VBUS1: "net.VBUS", VBUS2: "net.VBUS", GND1: "net.GND", GND2: "net.GND",
        DP1: "net.USB_DP", DP2: "net.USB_DP", DN1: "net.USB_DN", DN2: "net.USB_DN",
        CC1: "net.USB_CC1", CC2: "net.USB_CC2",
        EH1: "net.GND", EH2: "net.GND", EH3: "net.GND", EH4: "net.GND",
      }}
    />
    <USBLC6_2SC6
      name="U4"
      pcbX={-5.2}
      pcbY={-6.2}
      connections={{
        pin1: "net.USB_DP",
        pin6: "net.USB_DP",
        pin3: "net.USB_DN",
        pin4: "net.USB_DN",
        pin2: "net.GND",
        pin5: "net.VBUS",
      }}
    />
    {res("R1", "5.1k", "net.USB_CC1", "net.GND", -2.1, -6.2, 90)}
    {res("R2", "5.1k", "net.USB_CC2", "net.GND", 1.4, -6.2, 90)}

    {/* ---------------- Charger (MCP73831, ~300 mA) ---------------- */}
    {cap("C1", "4.7uF", "net.VBUS", "net.GND", 7.5, -5.6, 0, "0603")}
    <MCP73831T_2ACI_OT
      name="U2"
      pcbX={8}
      pcbY={-8.6}
      pcbRotation={180}
      connections={{ VDD: "net.VBUS", VSS: "net.GND", VBAT: "net.VBAT", PROG: "net.PROG", STAT: "net.CHG_STAT" }}
    />
    {res("R3", "3.3k", "net.PROG", "net.GND", 7.3, -11.6)}
    <led name="D5" color="red" footprint="0603" supplierPartNumbers={{ jlcpcb: ["C2286"] }} pcbX={7.6} pcbY={-13.4} />
    <trace from=".D5 > .cathode" to="net.CHG_STAT" />
    <trace from=".D5 > .anode" to="net.LED_A" />
    {res("R4", "1k", "net.LED_A", "net.VBUS", 7.6, -15.3)}
    {cap("C2", "4.7uF", "net.VBAT", "net.GND", 14.6, -5.6, 0, "0603")}

    {/* ---------------- Load sharing + power switch + LDO ---------------- */}
    <B5819W name="D4" pcbX={15} pcbY={-8.4} connections={{ anode: "net.VBUS", cathode: "net.VSYS" }} />
    <DMG2305UX_7 name="Q2" pcbX={15} pcbY={-12} connections={{ G: "net.VBUS", S: "net.VSYS", D: "net.VBAT" }} />
    {res("R5", "100k", "net.VBUS", "net.GND", 14.3, -15.3, 180)}
    <chip
      name="SW1"
      manufacturerPartNumber="PCM12SMTR"
      supplierPartNumbers={{ jlcpcb: ["C221841"] }}
      // From KiCad SW_SPDT_PCM12 (y flipped). The kicad: import merged the shell tabs into pin1; here they are separate NC pins.
      // Courtyard covers the body only so the slider lever (local -y) can overhang the board edge.
      footprint={
        <footprint>
          <smtpad portHints={["pin1"]} pcbX={-2.25} pcbY={1.43} width={0.7} height={1.5} shape="rect" />
          <smtpad portHints={["pin2"]} pcbX={0.75} pcbY={1.43} width={0.7} height={1.5} shape="rect" />
          <smtpad portHints={["pin3"]} pcbX={2.25} pcbY={1.43} width={0.7} height={1.5} shape="rect" />
          <smtpad portHints={["pin4"]} pcbX={-3.65} pcbY={0.78} width={1} height={0.8} shape="rect" />
          <smtpad portHints={["pin5"]} pcbX={-3.65} pcbY={-1.43} width={1} height={0.8} shape="rect" />
          <smtpad portHints={["pin6"]} pcbX={3.65} pcbY={0.78} width={1} height={0.8} shape="rect" />
          <smtpad portHints={["pin7"]} pcbX={3.65} pcbY={-1.43} width={1} height={0.8} shape="rect" />
          <hole pcbX={-1.5} pcbY={-0.33} diameter={0.9} />
          <hole pcbX={1.5} pcbY={-0.33} diameter={0.9} />
          <courtyardrect pcbX={0} pcbY={0.175} width={8.8} height={4.55} />
        </footprint>
      }
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C221841.obj?uuid=e1101fbc9b794272b747d9f489f7885e",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C221841.step?uuid=e1101fbc9b794272b747d9f489f7885e",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: -0.00005080000005364127, y: 0.5699188499999273, z: -0.7065009999999999 },
      }}
      pinLabels={{ pin1: "A", pin2: "COM", pin3: "B", pin4: "MP1", pin5: "MP2", pin6: "MP3", pin7: "MP4" }}
      noConnect={["B", "MP1", "MP2", "MP3", "MP4"]}
      pcbX={-2.4}
      pcbY={14.1}
      pcbRotation={180}
      connections={{ A: "net.VSYS", COM: "net.VIN_SW" }}
    />
    <AP2112K_3_3TRG1
      name="U3"
      pcbX={-18.5}
      pcbY={-8.6}
      connections={{ VIN: "net.VIN_SW", EN: "net.VIN_SW", GND: "net.GND", VOUT: "net.V3V3" }}
    />
    {cap("C3", "10uF", "net.VIN_SW", "net.GND", -15.4, -7.3, 270, "0603")}
    {cap("C4", "10uF", "net.V3V3", "net.GND", -15.4, -10.4, 90, "0603")}

    {/* ---------------- Battery + sense divider ---------------- */}
    <connector
      name="J2"
      manufacturerPartNumber="SM02B-GHS-TB"
      footprint="kicad:Connector_JST/JST_GH_SM02B-GHS-TB_1x02-1MP_P1.25mm_Horizontal"
      cadModel={{ stepUrl: ghStep }}
      pinLabels={{ pin1: "BAT_P", pin2: "BAT_N" }}
      pcbX={7.8}
      pcbY={11.8}
      pcbRotation={180}
      connections={{ BAT_P: "net.VBAT", BAT_N: "net.GND" }}
    />
    {res("R6", "100k", "net.VBAT", "net.VBAT_SENSE", -5, 9.4, 270)}
    {res("R7", "100k", "net.VBAT_SENSE", "net.GND", -3.6, 9.4, 90)}
    {cap("C8", "100nF", "net.VBAT_SENSE", "net.GND", -2.2, 9.4, 90)}

    {/* ---------------- E-paper FPC (24-pin SSD1680) ---------------- */}
    <connector
      name="J3"
      manufacturerPartNumber="FH12-24S-0.5SH(55)"
      footprint="kicad:Connector_FFC-FPC/Hirose_FH12-24S-0.5SH_1x24-1MP_P0.50mm_Horizontal"
      cadModel={{ stepUrl: fh12Step }}
      pinLabels={{
        pin2: "GDR", pin3: "RESE", pin8: "BS1", pin9: "BUSY", pin10: "RST", pin11: "DC", pin12: "CS",
        pin13: "SCK", pin14: "SDI", pin15: "VDDIO", pin16: "VCI", pin17: "VSS", pin18: "VDD", pin19: "VPP",
        pin20: "VSH", pin21: "PREVGH", pin22: "VSL", pin23: "PREVGL", pin24: "VCOM",
      }}
      pcbX={28.5}
      pcbY={1}
      pcbRotation={90}
      connections={{
        GDR: "net.EPD_GDR", RESE: "net.EPD_RESE", BS1: "net.GND", BUSY: "net.EPD_BUSY", RST: "net.EPD_RST",
        DC: "net.EPD_DC", CS: "net.EPD_CS", SCK: "net.EPD_SCK", SDI: "net.EPD_MOSI", VDDIO: "net.V3V3",
        VCI: "net.V3V3", VSS: "net.GND", VDD: "net.EPD_VDD", VPP: "net.EPD_VPP", VSH: "net.EPD_VSH",
        PREVGH: "net.EPD_PREVGH", VSL: "net.EPD_VSL", PREVGL: "net.EPD_PREVGL", VCOM: "net.EPD_VCOM",
      }}
    />
    {cap("C9", "1uF", "net.V3V3", "net.GND", 23, 2.4, 180)}
    {cap("C10", "1uF", "net.EPD_VDD", "net.GND", 23, 3.4, 180)}
    {cap("C11", "1uF", "net.EPD_VPP", "net.GND", 23, 4.4, 180)}
    {cap("C12", "1uF 25V", "net.EPD_VSH", "net.GND", 23, 5.4, 180)}
    {cap("C13", "1uF 25V", "net.EPD_PREVGH", "net.GND", 23, 6.4, 180)}
    {cap("C14", "1uF 25V", "net.EPD_VSL", "net.GND", 23, 7.4, 180)}
    {cap("C15", "1uF 25V", "net.EPD_PREVGL", "net.GND", 23, 8.4, 180)}
    {cap("C16", "1uF 25V", "net.EPD_VCOM", "net.GND", 23, 9.4, 180)}

    {/* EPD gate-drive boost (Waveshare reference) */}
    <inductor name="L1" inductance="10uH" footprint="0805" pcbX={24.6} pcbY={15.6} pcbRotation={180} />
    <trace from=".L1 > .pin1" to="net.V3V3" />
    <trace from=".L1 > .pin2" to="net.EPD_SW" />
    <AO3400A name="Q1" pcbX={22.8} pcbY={-7.4} connections={{ G: "net.EPD_GDR", S: "net.EPD_RESE", D: "net.EPD_SW" }} />
    {res("R9", "2.2", "net.EPD_RESE", "net.GND", 22.8, -10.6, 180)}
    <B5819W name="D1" pcbX={19.9} pcbY={15.7} connections={{ anode: "net.EPD_SW", cathode: "net.EPD_PREVGH" }} />
    {cap("C17", "1uF 25V", "net.EPD_SW", "net.EPD_NEG", 24, 13, 270)}
    <B5819W name="D2" pcbX={19.9} pcbY={13.4} connections={{ anode: "net.EPD_NEG", cathode: "net.GND" }} />
    <B5819W name="D3" pcbX={19.9} pcbY={11.1} connections={{ anode: "net.EPD_PREVGL", cathode: "net.EPD_NEG" }} />
    {children}
  </board>
)

export default () => <TuneWearBoard />
