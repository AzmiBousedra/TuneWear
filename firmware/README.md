# TuneWear firmware

[`TuneWear/TuneWear.ino`](TuneWear/TuneWear.ino) is an Arduino sketch. It shows the track you're currently scrobbling on Last.fm on the e-paper display, and a Blynk app button turns the device on and off. While a track plays it shows "Currently Playing / title / by / artist"; when nothing is playing it shows the TuneWear splash. The title and artist are also sent to the Blynk app.

## Setup

1. **Credentials:** copy `TuneWear/secrets.example.h` to `TuneWear/secrets.h` and fill in your Blynk template and token, Last.fm API key and username, and Wi-Fi networks. `secrets.h` is gitignored.
2. **Libraries** (Library Manager): GxEPD2, Adafruit GFX, ArduinoJson (v7), Blynk.
3. **Board:** "ESP32S3 Dev Module" from the esp32 core (tested with 3.3.0). Tools settings:
   - **USB CDC On Boot: Enabled.** The board has no USB-UART chip, so serial output and uploads go over native USB.
   - **Flash Size: 8MB**
   - **PSRAM: Disabled.** The N8 module has no PSRAM.
4. **Upload:** if the board doesn't show up, hold **BOOT** while tapping **RESET**, then upload.

The sketch uses 88% of the default 1.3 MB app partition. If it grows, pick a partition scheme with a larger app (the flash is 8 MB).

## Blynk virtual pins

| Pin | Direction | Use |
|---|---|---|
| V0 | device → app | Track title |
| V1 | device → app | Artist |
| V5 | app → device | Power switch (1 = on, 0 = idle screen) |

## Known issues / TODO

- **Non-ASCII titles:** accents, CJK and emoji don't render, because the Adafruit GFX fonts are 7-bit ASCII only.
- **Long titles:** a title too wide for the 12 pt font drops to 9 pt; beyond about 22 characters it's still clipped. Scrolling or wrapping isn't implemented.
- **Battery life:** Wi-Fi stays connected and Last.fm is polled every 1.5 s while playing. Rough estimate: around a working day on the 600 mAh cell. Light sleep between polls would help a lot.
- **Unused hardware:** battery sense (GPIO1) and the USER button (GPIO4) aren't used yet.
- **TLS:** the HTTPS call to Last.fm skips certificate checks (`setInsecure()`). A spoofed network could read the API key from the request URL.
- **Blynk traffic:** title and artist are pushed to Blynk every 2 s even when they haven't changed.

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
