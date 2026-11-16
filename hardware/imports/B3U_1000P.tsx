import type { PushButtonProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["pin1"],
  pin2: ["pin2"]
} as const

const pinAttributes = {
  pin2: {isPassive: true},
  pin1: {isPassive: true}
} satisfies NonNullable<PushButtonProps["pinAttributes"]>

export const B3U_1000P = (props: PushButtonProps<typeof pinLabels>) => {
  const { name = "SW1", ...restProps } = props

  return (
    <pushbutton
      name={name}
      pinLabels={pinLabels}
      supplierPartNumbers={{
  "jlcpcb": [
    "C231329"
  ]
}}
      manufacturerPartNumber="B3U-1000P"
      pinAttributes={pinAttributes}
      footprint="smdpads2_p3.4mm_pw0.8mm_ph1.7mm_cyw4.7mm_cyh3mm"
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C231329.obj?uuid=d904b040d8194ce99b3ace65083437b8",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C231329.step?uuid=d904b040d8194ce99b3ace65083437b8",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: 0, y: 0.000012699999842880061, z: -0.01 },
      }}
      {...restProps}
    />
  )
}