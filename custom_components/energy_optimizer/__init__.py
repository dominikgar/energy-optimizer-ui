"""EnergyOptimizer integration for Home Assistant."""

from __future__ import annotations

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


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up EnergyOptimizer from a config entry."""
    session: ClientSession = async_get_clientsession(hass)
    data = entry.data

    client = EnergyOptimizerClient(
        session,
        data[CONF_URL],
        data[CONF_API_TOKEN],
    )
    schedule_request = DeviceScheduleRequest(
        device_name=data[CONF_DEVICE_NAME],
        energy_kwh=float(data[CONF_ENERGY_KWH]),
        power_kw=float(data[CONF_POWER_KW]),
        earliest_start=data[CONF_EARLIEST_START],
        latest_end=data[CONF_LATEST_END],
        contiguous=bool(data[CONF_CONTIGUOUS]),
    )
    coordinator = EnergyOptimizerCoordinator(hass, entry, client, schedule_request)
    await coordinator.async_config_entry_first_refresh()

    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = coordinator
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload an EnergyOptimizer config entry."""
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return unloaded
