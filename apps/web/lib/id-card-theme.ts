export const idCardTheme = {
  page: {
    orientation: "landscape" as const,
    unit: "mm" as const,
    format: [85.6, 54] as number[],
    background: [255, 250, 244] as const
  },
  card: {
    width: 85.6,
    height: 54,
    radius: 2.6,
    gap: 0
  },
  colors: {
    primary: [240, 90, 40] as const,
    primaryDark: [216, 76, 31] as const,
    accent: [242, 138, 84] as const,
    wave: [246, 199, 170] as const,
    waveSoft: [255, 243, 232] as const,
    cream: [255, 248, 239] as const,
    text: [37, 32, 28] as const,
    muted: [111, 98, 88] as const,
    white: [255, 255, 255] as const,
    border: [238, 229, 220] as const
  },
  text: {
    organization: 3,
    slogan: 2.1,
    name: 4,
    label: 2.2,
    value: 2.35,
    heading: 3,
    body: 2.25,
    signature: 4
  },
  assets: {
    photoWidth: 21,
    photoHeight: 25,
    logoSize: 8.4,
    qrSize: 12
  },
  signatures: {
    president: "Demo Sign",
    secretary: "Demo Sign"
  }
};

export type IdCardTheme = typeof idCardTheme;
