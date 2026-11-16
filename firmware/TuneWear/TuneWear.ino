// TuneWear: shows the track you're playing on Last.fm on a 2.13" e-paper. Power on/off from Blynk.
// Board: TuneWear PCB (ESP32-S3-WROOM-1-N8). Credentials live in secrets.h (copy secrets.example.h).
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#include <GxEPD2_BW.h>
#include <Fonts/FreeMonoBold9pt7b.h>
#include <Fonts/FreeMonoBold12pt7b.h>

#if !__has_include("secrets.h")
#error "Copy secrets.example.h to secrets.h and fill in your credentials"
#endif
#include "secrets.h"  // must come before the Blynk include (BLYNK_* defines)

#include <BlynkSimpleEsp32.h>
BlynkTimer timer;

// ------------ Display: Waveshare 2.13" B/W (SSD1680, 250x122) on J3 ------------
// SCK 12 / MOSI 11 are the ESP32-S3 default SPI pins, so only CS/DC/RST/BUSY are given here.
GxEPD2_BW<GxEPD2_213_B74, GxEPD2_213_B74::HEIGHT> display(
  GxEPD2_213_B74(/*CS=*/ 10, /*DC=*/ 9, /*RST=*/ 8, /*BUSY=*/ 7));

// ------------ Known Wi-Fi networks (from secrets.h) ------------
struct Net { const char* ssid; const char* pass; };
Net nets[] = WIFI_NETWORKS;
const int NUM_NETS = sizeof(nets) / sizeof(nets[0]);

// Polling
uint32_t pollMsPlaying = 1500;
uint32_t pollMsIdle    = 4500;
uint32_t currentPoll   = 2000;
uint32_t lastPoll      = 0;      // global so Blynk can reset it

// ------------ Buffers ------------
char song[64]   = "Title";
char artist[64] = "Artist";
String lastTitleDrawn  = "";
String lastArtistDrawn = "";
bool lastWasIdle       = false;

// ------------ Power control flag ------------
bool deviceEnabled = true;      // controlled from Blynk V5

// ------------ Title cleaner ------------
// Drops " (feat. X)", " feat. X", " [feat X]". Only matches "feat" at a word start, so titles
// like "Defeated" or "Feathers" are left alone.
String stripFeat(const String& title) {
  String lower = title;
  lower.toLowerCase();
  for (int p = lower.indexOf("feat"); p > 0; p = lower.indexOf("feat", p + 1)) {
    char before = lower[p - 1];
    if (before == ' ' || before == '(' || before == '[') {
      String trimmed = title.substring(0, p - 1);
      trimmed.trim();
      return trimmed;
    }
  }
  return title;
}

// ------------ Drawing helpers ------------
// Centres text; if it's wider than the screen in `fnt`, retries with the smaller `fallback` font.
void centerPrint(const char* txt, int16_t y, const GFXfont* fnt, const GFXfont* fallback = nullptr) {
  int16_t x1, y1; uint16_t w, h;
  display.setFont(fnt);
  display.getTextBounds(txt, 0, 0, &x1, &y1, &w, &h);
  if (fallback && w > display.width()) {
    display.setFont(fallback);
    display.getTextBounds(txt, 0, 0, &x1, &y1, &w, &h);
  }
  int16_t x = ((int)display.width() - (int)w) / 2 - x1;
  display.setCursor(x, y);
  display.print(txt);
}

void drawNowPlaying(bool idleMode) {
  display.setRotation(1);
  display.setFullWindow();
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    display.setTextColor(GxEPD_BLACK);

    if (idleMode) {
      centerPrint("TuneWear", display.height() / 2 - 10, &FreeMonoBold12pt7b);
      centerPrint("Designed by Azmi", display.height() / 2 + 20, &FreeMonoBold9pt7b);
    } else {
      centerPrint("Currently Playing", 20, &FreeMonoBold9pt7b);
      centerPrint(song, 50, &FreeMonoBold12pt7b, &FreeMonoBold9pt7b);
      centerPrint("by", 80, &FreeMonoBold9pt7b);
      centerPrint(artist, 110, &FreeMonoBold12pt7b, &FreeMonoBold9pt7b);
    }
  } while (display.nextPage());
}

// ------------ Last.fm fetch ------------
bool fetchNowPlaying(String& outSong, String& outArtist, bool& outIsNowPlaying) {
  // shortcut: TLS without certificate check; pin the Last.fm root CA if the API key must stay private on hostile networks
  WiFiClientSecure client; client.setInsecure();
  HTTPClient http;

  String url = String("https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks")
             + "&user=" + LFM_USERNAME
             + "&api_key=" + LFM_API_KEY
             + "&format=json&limit=1";

  if (!http.begin(client, url)) return false;
  int code = http.GET();
  if (code != 200) { http.end(); return false; }

  String payload = http.getString();
  http.end();

  JsonDocument doc;
  if (deserializeJson(doc, payload)) return false;

  JsonVariant track = doc["recenttracks"]["track"][0];
  if (track.isNull()) return false;

  outSong = track["name"].as<String>();
  outArtist = track["artist"]["#text"].as<String>();
  outIsNowPlaying = (track["@attr"]["nowplaying"].as<String>() == "true");
  return true;
}

// ------------ Wi-Fi joiner ------------
bool tryConnect(const char* ssid, const char* pass, uint32_t timeoutMs) {
  Serial.printf("WiFi, trying, %s\n", ssid);
  WiFi.disconnect(true, true);
  delay(100);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(true);
  WiFi.begin(ssid, pass);
  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < timeoutMs) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("WiFi, connected, %s, RSSI, %d dBm, IP, %s\n",
                  ssid, WiFi.RSSI(), WiFi.localIP().toString().c_str());
    return true;
  }
  Serial.printf("WiFi, failed, %s\n", ssid);
  return false;
}

void ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.println("WiFi, scanning...");
  WiFi.scanNetworks(true, true);
  uint32_t t0 = millis();
  while (WiFi.scanComplete() == WIFI_SCAN_RUNNING && millis() - t0 < 5000) delay(50);
  int n = WiFi.scanComplete();
  if (n < 0) n = 0;

  bool seen[NUM_NETS]; for (int i = 0; i < NUM_NETS; i++) seen[i] = false;
  for (int i = 0; i < n; i++) {
    String ssid = WiFi.SSID(i);
    Serial.printf("Found, %s, RSSI, %d\n", ssid.c_str(), WiFi.RSSI(i));
    for (int k = 0; k < NUM_NETS; k++) {
      if (ssid == nets[k].ssid) seen[k] = true;
    }
  }
  WiFi.scanDelete();

  for (int i = 0; i < NUM_NETS; i++) {
    if (seen[i] && tryConnect(nets[i].ssid, nets[i].pass, 3000)) return;
  }
  for (int i = 0; i < NUM_NETS; i++) {
    if (tryConnect(nets[i].ssid, nets[i].pass, 3000)) return;
  }

  Serial.println("WiFi, not connected");
}

// ------------ Blynk handlers ------------
// Power button on V5
BLYNK_WRITE(V5) {
  deviceEnabled = (param.asInt() == 1);

  if (deviceEnabled) {
    Serial.println("TuneWear enabled from Blynk");
    lastPoll = 0;                     // force immediate poll
  } else {
    Serial.println("TuneWear disabled from Blynk");
    lastWasIdle = true;
    drawNowPlaying(true);             // show idle screen when turned off
  }
}

// ------------ Setup and loop ------------
void setup() {
  Serial.begin(115200);
  delay(100);

  display.init(115200, true, 2, false);
  drawNowPlaying(true);

  ensureWiFi();

  Blynk.config(BLYNK_AUTH_TOKEN);
  if (!Blynk.connect()) {
    Serial.println("Blynk, failed to connect");
  } else {
    Serial.println("Blynk, connected");
  }

  // Set initial power state in the app
  Blynk.virtualWrite(V5, deviceEnabled ? 1 : 0);

  // Send current song and artist to app every 2 seconds
  timer.setInterval(2000L, []() {
    Blynk.virtualWrite(V0, song);    // title label in app
    Blynk.virtualWrite(V1, artist);  // artist label in app
  });
}

void loop() {
  Blynk.run();
  timer.run();

  // If turned off from Blynk, skip all Last.fm logic
  if (!deviceEnabled) {
    delay(10);
    return;
  }

  if (millis() - lastPoll >= currentPoll) {
    lastPoll = millis();

    ensureWiFi();
    if (WiFi.status() == WL_CONNECTED) {
      String s, a;
      bool isNow = false;
      if (fetchNowPlaying(s, a, isNow)) {
        currentPoll = isNow ? pollMsPlaying : pollMsIdle;

        if (!isNow) {
          if (!lastWasIdle) {
            lastWasIdle = true;
            drawNowPlaying(true);
          }
        } else {
          String cleanTitle = stripFeat(s);

          if (cleanTitle != lastTitleDrawn || a != lastArtistDrawn || lastWasIdle) {
            cleanTitle.toCharArray(song, sizeof(song));
            a.toCharArray(artist, sizeof(artist));
            lastTitleDrawn = cleanTitle;
            lastArtistDrawn = a;
            lastWasIdle = false;
            drawNowPlaying(false);

            // Push to Blynk when track changes
            Blynk.virtualWrite(V0, song);
            Blynk.virtualWrite(V1, artist);
          }
        }
      }
    }
  }

  delay(10);
}
