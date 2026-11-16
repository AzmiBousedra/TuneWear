# TuneWear firmware

The ESP32-S3 firmware isn't in the repo yet. Put the project (Arduino, PlatformIO or ESP-IDF) in this folder. The root `.gitignore` already covers `build/`, `.pio/`, `managed_components/` and `sdkconfig.old` anywhere under `firmware/`.

## Board pin map (ESP32-S3-WROOM-1-N8)

| Function | GPIO | Notes |
|---|---|---|
| EPD SCK | 12 | SPI to the SSD1680 2.13" e-paper (250×122) |
| EPD MOSI | 11 | |
| EPD CS | 10 | |
| EPD DC | 9 | |
| EPD RST | 8 | |
| EPD BUSY | 7 | Input |
| USER button | 4 | Active low to GND; enable the internal pull-up |
| BOOT button | 0 | Hold at reset to enter the bootloader |
| RESET button | EN | 10k pull-up + 1 µF to GND |
| Battery sense | 1 (ADC1_CH0) | 100k/100k divider: V_bat = 2 × V_pin. 100 nF filter cap, so sample slowly |
| USB D− / D+ | 19 / 20 | Native USB (CDC/JTAG): flash and debug over USB-C, no UART bridge |

Power is 3.3 V from an AP2112K LDO, fed by USB or the LiPo through a slide switch. The charge LED is driven by the MCP73831 charger itself and isn't connected to a GPIO.
