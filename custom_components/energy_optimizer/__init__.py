"""EnergyOptimizer integration for Home Assistant."""

from __future__ import annotations

from typing import Any

from aiohttp import ClientSession

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_URL
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import DeviceScheduleRequest, EnergyOptimizerClient
from .const import (
    CONF_API_TOKEN,
    CONF_CONTIGUOUS,
    CONF_DEVICE_NAME,
    CONF_EARLIEST_START,
    CONF_ENERGY_KWH,
    CONF_LATEST_END,
    CONF_POWER_KW,
    DOMAIN,
    PLATFORMS,
)
from .coordinator import EnergyOptimizerCoordinator
from .services import async_setup_services, async_unload_services


def _entry_config(entry: ConfigEntry) -> dict[str, Any]:
    """Return config entry data merged with editable options."""
    return {**entry.data, **entry.options}


def _schedule_request(data: dict[str, Any]) -> DeviceScheduleRequest:
    """Build a schedule request from merged config data."""
    return DeviceScheduleRequest(
        device_name=data[CONF_DEVICE_NAME],
        energy_kwh=float(data[CONF_ENERGY_KWH]),
        power_kw=float(data[CONF_POWER_KW]),
        earliest_start=data[CONF_EARLIEST_START],
        latest_end=data[CONF_LATEST_END],
        contiguous=bool(data[CONF_CONTIGUOUS]),
    )


async def _async_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload integration when options are changed."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up EnergyOptimizer from a config entry."""
    session: ClientSession = async_get_clientsession(hass)
    data = _entry_config(entry)

    client = EnergyOptimizerClient(
        session,
        entry.data[CONF_URL],
        entry.data[CONF_API_TOKEN],
    )
    coordinator = EnergyOptimizerCoordinator(hass, entry, client, _schedule_request(data))
    await coordinator.async_config_entry_first_refresh()

    entry.async_on_unload(entry.add_update_listener(_async_update_listener))
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = coordinator
    await async_setup_services(hass)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload an EnergyOptimizer config entry."""
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        hass.data[DOMAIN].pop(entry.entry_id, None)
        if not any(
            isinstance(value, EnergyOptimizerCoordinator)
            for value in hass.data.get(DOMAIN, {}).values()
        ):
            await async_unload_services(hass)
    return unloaded
