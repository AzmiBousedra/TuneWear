import type { DiodeProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["anode","pos"],
  pin2: ["cathode","neg"]
} as const

export const B5819W = (props: DiodeProps) => {
  const { name = "D1", ...restProps } = props

  return (
    <diode
      name={name}
      pinLabels={pinLabels}
      supplierPartNumbers={{
  "jlcpcb": [
    "C908224"
  ]
}}
      manufacturerPartNumber="B5819W"
      footprint="diode_p3.5001mm_pw1.05mm_ph1mm_rounded0_cyw5.0501mm_cyh2.1mm_anodepin1"
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C908224.obj?uuid=1196701c3f5948c6be8c042569133be4",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C908224.step?uuid=1196701c3f5948c6be8c042569133be4",
        pcbRotationOffset: 180,
        modelOriginPosition: { x: 0, y: 0, z: -0.55 },
      }}
      {...restProps}
    />
  )
}