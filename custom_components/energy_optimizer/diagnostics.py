"""Diagnostics support for EnergyOptimizer."""

from __future__ import annotations

from typing import Any

from homeassistant.components.diagnostics import async_redact_data
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import CONF_API_TOKEN, DOMAIN
from .coordinator import EnergyOptimizerCoordinator

TO_REDACT = {CONF_API_TOKEN}


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> dict[str, Any]:
    """Return diagnostics for a config entry."""
    coordinator: EnergyOptimizerCoordinator | None = hass.data.get(DOMAIN, {}).get(entry.entry_id)
    diagnostics: dict[str, Any] = {
        "entry": {
            "data": async_redact_data(dict(entry.data), TO_REDACT),
            "options": async_redact_data(dict(entry.options), TO_REDACT),
        }
    }

    if coordinator and coordinator.data:
        diagnostics["api"] = {
            "schedule_status": coordinator.data.schedule.get("status"),
            "schedule_api_version": coordinator.data.schedule.get("api_version"),
            "summary_status": coordinator.data.summary.get("status"),
            "summary_api_version": coordinator.data.summary.get("api_version"),
            "last_update_success": coordinator.last_update_success,
        }

    return diagnostics
