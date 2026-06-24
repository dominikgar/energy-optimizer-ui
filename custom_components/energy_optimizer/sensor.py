"""Sensor platform for EnergyOptimizer."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorEntityDescription,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import UnitOfEnergy
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import EnergyOptimizerCoordinator


ValueFn = Callable[[dict[str, Any], dict[str, Any]], Any]
AttrFn = Callable[[dict[str, Any], dict[str, Any]], dict[str, Any]]


@dataclass(frozen=True, kw_only=True)
class EnergyOptimizerSensorEntityDescription(SensorEntityDescription):
    """Description of an EnergyOptimizer sensor."""

    value_fn: ValueFn
    attr_fn: AttrFn | None = None


def _schedule_value(path: str) -> ValueFn:
    """Return a getter for the schedule payload."""

    def getter(schedule: dict[str, Any], summary: dict[str, Any]) -> Any:
        value: Any = schedule
        for key in path.split("."):
            if not isinstance(value, dict):
                return None
            value = value.get(key)
        return value

    return getter


def _summary_value(path: str) -> ValueFn:
    """Return a getter for the summary payload."""

    def getter(schedule: dict[str, Any], summary: dict[str, Any]) -> Any:
        value: Any = summary
        for key in path.split("."):
            if not isinstance(value, dict):
                return None
            value = value.get(key)
        return value

    return getter


def _schedule_attrs(schedule: dict[str, Any], summary: dict[str, Any]) -> dict[str, Any]:
    """Return useful schedule attributes."""
    attrs = {
        "api_version": schedule.get("api_version"),
        "generated_at": schedule.get("generated_at"),
        "valid_until": schedule.get("valid_until"),
        "date": schedule.get("date"),
        "window_end_date": schedule.get("window_end_date"),
        "device_name": schedule.get("device_name"),
        "recommendation_reason": schedule.get("recommendation_reason"),
        "active_slot": schedule.get("active_slot"),
        "missing_price_dates": schedule.get("missing_price_dates"),
        "retry_after_seconds": schedule.get("retry_after_seconds"),
    }
    return {key: value for key, value in attrs.items() if value is not None}


def _schedule_slots_attrs(schedule: dict[str, Any], summary: dict[str, Any]) -> dict[str, Any]:
    """Return schedule slot attributes."""
    schedule_data = schedule.get("schedule")
    if not isinstance(schedule_data, dict):
        return {}
    return {
        "slots": schedule_data.get("slots", []),
        "feasible": schedule_data.get("feasible"),
        "crosses_midnight": schedule_data.get("crosses_midnight"),
        "runtime_hours": schedule_data.get("runtime_hours"),
    }


SENSOR_DESCRIPTIONS: tuple[EnergyOptimizerSensorEntityDescription, ...] = (
    EnergyOptimizerSensorEntityDescription(
        key="schedule_status",
        translation_key="schedule_status",
        value_fn=_schedule_value("status"),
        attr_fn=_schedule_attrs,
    ),
    EnergyOptimizerSensorEntityDescription(
        key="current_price",
        translation_key="current_price",
        native_unit_of_measurement="PLN/kWh",
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=4,
        value_fn=_schedule_value("current_price_pln_kwh"),
    ),
    EnergyOptimizerSensorEntityDescription(
        key="schedule_total_cost",
        translation_key="schedule_total_cost",
        device_class=SensorDeviceClass.MONETARY,
        native_unit_of_measurement="PLN",
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=2,
        value_fn=_schedule_value("schedule.total_cost_pln"),
        attr_fn=_schedule_slots_attrs,
    ),
    EnergyOptimizerSensorEntityDescription(
        key="schedule_average_price",
        translation_key="schedule_average_price",
        native_unit_of_measurement="PLN/kWh",
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=4,
        value_fn=_schedule_value("schedule.average_price_pln_kwh"),
    ),
    EnergyOptimizerSensorEntityDescription(
        key="total_savings",
        translation_key="total_savings",
        device_class=SensorDeviceClass.MONETARY,
        native_unit_of_measurement="PLN",
        state_class=SensorStateClass.TOTAL,
        suggested_display_precision=2,
        value_fn=_summary_value("total_savings_pln"),
    ),
    EnergyOptimizerSensorEntityDescription(
        key="month_savings",
        translation_key="month_savings",
        device_class=SensorDeviceClass.MONETARY,
        native_unit_of_measurement="PLN",
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=2,
        value_fn=_summary_value("month_savings_pln"),
    ),
    EnergyOptimizerSensorEntityDescription(
        key="total_energy",
        translation_key="total_energy",
        device_class=SensorDeviceClass.ENERGY,
        native_unit_of_measurement=UnitOfEnergy.KILO_WATT_HOUR,
        state_class=SensorStateClass.TOTAL,
        suggested_display_precision=2,
        value_fn=_summary_value("total_energy_kwh"),
    ),
    EnergyOptimizerSensorEntityDescription(
        key="month_energy",
        translation_key="month_energy",
        device_class=SensorDeviceClass.ENERGY,
        native_unit_of_measurement=UnitOfEnergy.KILO_WATT_HOUR,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=2,
        value_fn=_summary_value("month_energy_kwh"),
    ),
    EnergyOptimizerSensorEntityDescription(
        key="active_executions",
        translation_key="active_executions",
        state_class=SensorStateClass.MEASUREMENT,
        value_fn=_summary_value("active_executions"),
    ),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities,
) -> None:
    """Set up EnergyOptimizer sensors."""
    coordinator: EnergyOptimizerCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities(
        EnergyOptimizerSensor(coordinator, entry, description)
        for description in SENSOR_DESCRIPTIONS
    )


class EnergyOptimizerSensor(CoordinatorEntity[EnergyOptimizerCoordinator], SensorEntity):
    """EnergyOptimizer sensor entity."""

    entity_description: EnergyOptimizerSensorEntityDescription
    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: EnergyOptimizerCoordinator,
        entry: ConfigEntry,
        description: EnergyOptimizerSensorEntityDescription,
    ) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self.entity_description = description
        self._attr_unique_id = f"{entry.entry_id}_{description.key}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name="EnergyOptimizer",
            manufacturer="EnergyOptimizer",
        )

    @property
    def native_value(self) -> Any:
        """Return the sensor state."""
        data = self.coordinator.data
        if data is None:
            return None
        return self.entity_description.value_fn(data.schedule, data.summary)

    @property
    def extra_state_attributes(self) -> dict[str, Any] | None:
        """Return extra state attributes."""
        data = self.coordinator.data
        attr_fn = self.entity_description.attr_fn
        if data is None or attr_fn is None:
            return None
        return attr_fn(data.schedule, data.summary)
