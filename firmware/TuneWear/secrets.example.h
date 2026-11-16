// Copy this file to secrets.h (same folder) and fill in your own values.
// secrets.h is gitignored, so keep real credentials only there.
#pragma once

// Blynk (https://blynk.cloud): Device info → Firmware configuration
#define BLYNK_TEMPLATE_ID   "TMPLxxxxxxxxx"
#define BLYNK_TEMPLATE_NAME "TW"
#define BLYNK_AUTH_TOKEN    "your-blynk-device-auth-token"

// Last.fm (https://www.last.fm/api/account/create)
#define LFM_API_KEY   "your-lastfm-api-key"
#define LFM_USERNAME  "your-lastfm-username"

// Known Wi-Fi networks, tried in this order: { "ssid", "password" }
#define WIFI_NETWORKS { \
  { "home-ssid",    "home-password" },    \
  { "hotspot-ssid", "hotspot-password" }, \
}
