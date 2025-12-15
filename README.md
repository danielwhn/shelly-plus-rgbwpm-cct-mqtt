# Shelly Plus RGBW PM – Dual Tunable White (CCT) via MQTT Discovery

This Shelly Script combines **four physical light channels** of a **Shelly Plus RGBW PM**
into **two logical Tunable White (CCT) lights** and exposes them to **Home Assistant**
using **MQTT Discovery**.

The result:  
Home Assistant sees **two clean tunable white lights** in addition to the four separate channels.

---

## ✨ Features

- Combines **4 outputs → 2 Tunable White lights**
- Native **Home Assistant MQTT Discovery**
- Supports:
  - On / Off
  - Brightness
  - Color Temperature (Kelvin)
- Smooth transitions
- Works with **physical input button**
- Publishes state updates on **every change**
- Fully retained MQTT state

---

## 🧩 Hardware Requirements

- Shelly Plus RGBW PM
- Two Tunable White LED strips:
  - Strip 1: Warm + Cold
  - Strip 2: Warm + Cold
- Optional: Push button connected to **Input 0**

---

## 🔌 Channel Mapping

| Shelly Output | Function |
|--------------|----------|
| Light 0 | Warm White – CCT 1 |
| Light 1 | Cold White – CCT 1 |
| Light 2 | Warm White – CCT 2 |
| Light 3 | Cold White – CCT 2 |

---

## 📡 MQTT Topics

### Command Topics
```
<topic_prefix>/set/cct1
<topic_prefix>/set/cct2
```

### State Topics
```
<topic_prefix>/status/cct1
<topic_prefix>/status/cct2
```

### Availability
```
<topic_prefix>/online
```

---

## 🏠 Home Assistant Integration

This script uses **MQTT Discovery**, so **no manual YAML configuration is required**.

After:
1. Uploading the script
2. Enabling MQTT on the Shelly
3. Restarting the script

Home Assistant will automatically create:

- 1 device: **Shelly Plus RGBW PM**
- 2 light entities:
  - `light.shelly_cct1`
  - `light.shelly_cct2`

Each entity behaves like a **native Tunable White light**.

---

## 🎛 Supported Payload (JSON Schema)

Example MQTT command:

```json
{
  "state": "ON",
  "brightness": 128,
  "color_temp": 4000
}
```

- `brightness`: 0–255
- `color_temp`: Kelvin (3000–6000)

Partial updates are supported:
- Sending only `brightness` keeps color temperature unchanged
- Sending only `color_temp` keeps brightness unchanged

---

## 🔘 Physical Button Behavior

- **Single press (Input 0)**:
  - If any light is ON → all lights turn OFF
  - If all lights are OFF → all lights turn ON

State changes triggered by the button are also published to MQTT.

---

## ⚙️ Configuration Notes

- Color temperature range:
  - Minimum: **3000 K**
  - Maximum: **6000 K**
- MQTT messages are published with **retain = true**
- Smooth transitions are enabled (2 seconds)

---

## 🛠 Installation

1. Open Shelly Web UI
2. Go to **Scripts**
3. Create a new script
4. Paste `shelly_cct_mqtt_discovery.js`
5. Save and start the script
6. Restart Home Assistant MQTT integration (if needed)

---

## 📄 License

MIT License – free to use, modify and distribute.

---

## 🤝 Credits

Created for advanced Shelly + Home Assistant setups  
Optimized for clarity, stability and best practices  
Inspired by a [script](https://github.com/m-schaeffler/ShellyScripts/blob/main/DualLed.js) from Mathias Schäffler
