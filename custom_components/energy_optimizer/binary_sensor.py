"""Binary sensor platform for EnergyOptimizer."""

from __future__ import annotations

from typing import Any

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import EnergyOptimizerCoordinator


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities,
) -> None:
    """Set up EnergyOptimizer binary sensors."""
    coordinator: EnergyOptimizerCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([EnergyOptimizerTriggerBinarySensor(coordinator, entry)])


class EnergyOptimizerTriggerBinarySensor(
    CoordinatorEntity[EnergyOptimizerCoordinator],
    BinarySensorEntity,
):
    """Binary sensor showing whether the configured device should run now."""

    _attr_has_entity_name = True
    _attr_translation_key = "trigger_automation"

    def __init__(self, coordinator: EnergyOptimizerCoordinator, entry: ConfigEntry) -> None:
        """Initialize the binary sensor."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{entry.entry_id}_trigger_automation"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name="EnergyOptimizer",
            manufacturer="EnergyOptimizer",
        )

    @property
    def is_on(self) -> bool | None:
        """Return true when EnergyOptimizer recommends running the device."""
        data = self.coordinator.data
        if data is None:
            return None
        return bool(data.schedule.get("trigger_automation"))

    @property
    def extra_state_attributes(self) -> dict[str, Any] | None:
        """Return trigger diagnostics."""
        data = self.coordinator.data
        if data is None:
            return None
        schedule = data.schedule
        attrs = {
            "api_version": schedule.get("api_version"),
            "status": schedule.get("status"),
            "generated_at": schedule.get("generated_at"),
            "valid_until": schedule.get("valid_until"),
            "device_name": schedule.get("device_name"),
            "active_slot": schedule.get("active_slot"),
            "recommendation_reason": schedule.get("recommendation_reason"),
            "retry_after_seconds": schedule.get("retry_after_seconds"),
        }
        return {key: value for key, value in attrs.items() if value is not None}
