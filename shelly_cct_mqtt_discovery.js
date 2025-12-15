// Shelly Script – 2 × Tunable White (CCT) with MQTT Discovery for Home Assistant
//
// This script combines four physical light channels of a Shelly Plus RGBW PM
// into two logical Tunable White lights (CCT) and exposes them to Home Assistant
// via MQTT Discovery.
//
// Channel mapping:
//   Light 0 = Warm White 1
//   Light 1 = Cold White 1
//   Light 2 = Warm White 2
//   Light 3 = Cold White 2

// -----------------------------------------------------------------------------
// MQTT configuration
// -----------------------------------------------------------------------------

// Read MQTT configuration from Shelly
const mqttConf = Shelly.getComponentConfig("mqtt");
const topicPrefix = mqttConf.topic_prefix;

// -----------------------------------------------------------------------------
// CCT channel mapping
// -----------------------------------------------------------------------------

// Logical CCT lights mapped to physical Shelly outputs
const CCT = {
  cct1: { warm: 0, cold: 1 },
  cct2: { warm: 2, cold: 3 }
};

// -----------------------------------------------------------------------------
// Color temperature range (Kelvin)
// -----------------------------------------------------------------------------

const MIN_KELVIN = 3000;
const MAX_KELVIN = 6000;

// -----------------------------------------------------------------------------
// Utility functions
// -----------------------------------------------------------------------------

// Returns true if at least one physical light output is on
function anyOn() {
  for (let i = 0; i < 4; i++) {
    if (Shelly.getComponentStatus("light:" + i).output === true) {
      return true;
    }
  }
  return false;
}

// Converts 8-bit brightness (0–255) to percentage (0–100)
function eightbitBrigtnessToRatio(brightness) {
  return Math.round(brightness / 255 * 100);
}

// Converts percentage brightness (0–100) to 8-bit value (0–255)
function brightnessToEightbit(brightness) {
  return Math.round(brightness / 100 * 255);
}

// Formats a MAC address by inserting colons
function macWithColons(mac) {
  let result = "";
  for (let i = 0; i < mac.length; i += 2) {
    if (i > 0) result += ":";
    result += mac.substring(i, i + 2);
  }
  return result;
}

// Publishes a retained MQTT message as JSON
function mqttPub(topic, message) {
  MQTT.publish(topic, JSON.stringify(message), 1, true);
}

// -----------------------------------------------------------------------------
// Home Assistant MQTT Discovery
// -----------------------------------------------------------------------------

// Publishes MQTT discovery configuration for both CCT lights
function publishDiscovery() {
  Object.keys(CCT).forEach(function (name) {
    let configTopic =
      "homeassistant/light/" + topicPrefix + "_" + name + "/config";

    let config = {
      name: "Shelly " + name.toUpperCase(),
      unique_id: topicPrefix + "_" + name,
      schema: "json",
      command_topic: topicPrefix + "/set/" + name,
      state_topic: topicPrefix + "/status/" + name,
      availability: {
        topic: topicPrefix + "/online",
        payload_available: "true",
        payload_not_available: "false"
      },
      payload_on: "ON",
      payload_off: "OFF",
      brightness: true,
      color_temp_kelvin: true,
      supported_color_modes: ["color_temp"],
      min_kelvin: MIN_KELVIN,
      max_kelvin: MAX_KELVIN,
      qos: 1,
      device: {
        identifiers: [topicPrefix],
        name: topicPrefix,
        hw_version: "gen" + Shelly.getDeviceInfo().gen,
        model: "Shelly Plus RGBW PM (" + Shelly.getDeviceInfo().model + ")",
        manufacturer: "Shelly",
        sw_version: Shelly.getDeviceInfo().fw_id,
        connections: [
          ["mac", macWithColons(Shelly.getComponentConfig("sys").device.mac)]
        ],
        configuration_url:
          "http://" + Shelly.getComponentStatus("wifi").sta_ip
      }
    };

    mqttPub(configTopic, config);
  });
}

// -----------------------------------------------------------------------------
// State publishing
// -----------------------------------------------------------------------------

// Publishes the current state of a CCT light to Home Assistant
function publishStatus(name, state, brightness, color_temp) {
  let statusTopic = topicPrefix + "/status/" + name;

  mqttPub(statusTopic, {
    state: state,
    brightness: brightnessToEightbit(brightness),
    color_temp: color_temp,
    color_temp_kelvin: color_temp,
    color_options: null,
    color_mode: "color_temp",
    effect: null
  });
}

// -----------------------------------------------------------------------------
// CCT calculation helpers
// -----------------------------------------------------------------------------

// Converts a Kelvin value to a warm/cold ratio (0.0–1.0)
function kelvinToRatio(kelvin) {
  kelvin = Math.max(MIN_KELVIN, Math.min(MAX_KELVIN, kelvin));
  return (kelvin - MIN_KELVIN) / (MAX_KELVIN - MIN_KELVIN);
}

// Returns ON or OFF depending on both warm and cold channels
function getOnOff(name) {
  let warmStatus =
    Shelly.getComponentStatus("light:" + CCT[name].warm).output;
  let coldStatus =
    Shelly.getComponentStatus("light:" + CCT[name].cold).output;

  return warmStatus === true && coldStatus === true ? "ON" : "OFF";
}

// Calculates combined brightness from warm and cold channels
function getBrightness(name) {
  let warmBrightness =
    Shelly.getComponentStatus("light:" + CCT[name].warm).brightness;
  let coldBrightness =
    Shelly.getComponentStatus("light:" + CCT[name].cold).brightness;

  return Math.min(warmBrightness + coldBrightness, 100);
}

// Calculates the current color temperature based on channel brightness
function getColorTemp(name) {
  let warmBrightness =
    Shelly.getComponentStatus("light:" + CCT[name].warm).brightness;
  let coldBrightness =
    Shelly.getComponentStatus("light:" + CCT[name].cold).brightness;

  let sum = warmBrightness + coldBrightness;
  if (sum === 0) {
    return MIN_KELVIN;
  }

  let ratioCold = coldBrightness / sum;
  let kelvin = MIN_KELVIN + ratioCold * (MAX_KELVIN - MIN_KELVIN);

  return Math.round(kelvin);
}

// -----------------------------------------------------------------------------
// Light control
// -----------------------------------------------------------------------------

// Sets a CCT light by distributing brightness between warm and cold channels
function setCCT(name, on, brightness, color_temp) {
  let r = kelvinToRatio(color_temp);
  let warmLevel = Math.round(brightness * (1 - r));
  let coldLevel = Math.round(brightness * r);

  Shelly.call("Light.Set", {
    id: CCT[name].warm,
    on: on,
    brightness: warmLevel,
    transition_duration: 2
  });

  Shelly.call("Light.Set", {
    id: CCT[name].cold,
    on: on,
    brightness: coldLevel,
    transition_duration: 2
  });

  publishStatus(name, on ? "ON" : "OFF", brightness, color_temp);
}

// -----------------------------------------------------------------------------
// MQTT command handling
// -----------------------------------------------------------------------------

// Handles incoming MQTT commands from Home Assistant
function onMqtt(topic, message) {
  try {
    let payload = JSON.parse(message);
    let parts = topic.split("/");
    let name = parts[parts.length - 1];

    if (!(name in CCT)) return;

    let on = false;
    if (payload.state && payload.state.toUpperCase() === "ON") {
      on = true;
    }

    let brightness =
      payload.brightness !== undefined
        ? Math.max(
            0,
            Math.min(100, eightbitBrigtnessToRatio(payload.brightness))
          )
        : getBrightness(name);

    let color_temp =
      payload.color_temp !== undefined
        ? payload.color_temp
        : getColorTemp(name);

    setCCT(name, on, brightness, color_temp);
  } catch (e) {
    print("MQTT parse error:", e);
  }
}

// -----------------------------------------------------------------------------
// Input handling
// -----------------------------------------------------------------------------

// Publishes state updates after a physical input action
function notifyInputAction(name, on) {
  let brightness = getBrightness(name);
  let color_temp = getColorTemp(name);
  publishStatus(name, on, brightness, color_temp);
}

// Handles single push on input 0 to toggle all lights
Shelly.addEventHandler(function (event) {
  if (event.component === "input:0" && event.info.event === "single_push") {
    if (anyOn()) {
      Shelly.call("Light.SetAll", {
        on: false,
        transition_duration: 2
      });

      Timer.set(2000, false, function () {
        for (const cct of Object.keys(CCT)) {
          notifyInputAction(cct, "OFF");
        }
      });
    } else {
      Shelly.call("Light.SetAll", {
        on: true,
        transition_duration: 2
      });

      Timer.set(2000, false, function () {
        for (const cct of Object.keys(CCT)) {
          notifyInputAction(cct, "ON");
        }
      });
    }
  }
}, null);

// -----------------------------------------------------------------------------
// Startup
// -----------------------------------------------------------------------------

// Publish discovery and subscribe to command topics
publishDiscovery();
MQTT.subscribe(topicPrefix + "/set/cct1", onMqtt);
MQTT.subscribe(topicPrefix + "/set/cct2", onMqtt);

print("Shelly CCT MQTT Discovery script started.");
