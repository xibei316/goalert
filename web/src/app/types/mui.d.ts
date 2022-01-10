import { Theme, Palette, PaletteOptions } from '@mui/material'

declare module '@mui/material/styles' {
  interface Palette {
    anchor: Palette['primary']
  }
  interface PaletteOptions {
    anchor: PaletteOptions['primary']
  }
}
