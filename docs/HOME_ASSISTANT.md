## Home Assistant Notes

### Why MQTT Discovery?
MQTT Discovery allows Home Assistant to automatically create devices and entities
without manual YAML configuration.

### Device vs Entities
- One Home Assistant **device** is created (the Shelly Plus RGBW PM)
- Two **light entities** are created under that device

### Color Temperature Handling
The script calculates color temperature dynamically based on the warm/cold
brightness ratio and publishes updates whenever the light state changes.

### Troubleshooting
- Ensure MQTT is enabled on the Shelly
- Ensure Home Assistant MQTT integration is running
- Check retained MQTT messages if entities do not update
- Verify the color temperature range matches your LED strips
