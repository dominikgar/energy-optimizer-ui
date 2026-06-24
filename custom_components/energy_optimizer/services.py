"""Services for EnergyOptimizer."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv

from .api import EnergyOptimizerApiError
from .const import (
    ATTR_DEVICE_NAME,
    ATTR_ENDED_AT,
    ATTR_ENERGY_KWH,
    ATTR_ENTRY_ID,
    ATTR_EXECUTION_ID,
    ATTR_METER_END_KWH,
    ATTR_METER_START_KWH,
    ATTR_METADATA,
    ATTR_POWER_KW,
    ATTR_REASON,
    ATTR_REFERENCE_RATE_PLN_KWH,
    ATTR_STARTED_AT,
    DOMAIN,
    EVENT_EXECUTION_SERVICE,
    SERVICE_CANCEL_EXECUTION,
    SERVICE_START_EXECUTION,
    SERVICE_STOP_EXECUTION,
)
from .coordinator import EnergyOptimizerCoordinator

SERVICE_SETUP_KEY = "services_registered"

START_EXECUTION_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_ENTRY_ID): cv.string,
        vol.Optional(ATTR_DEVICE_NAME): cv.string,
        vol.Required(ATTR_REFERENCE_RATE_PLN_KWH): vol.Coerce(float),
        vol.Optional(ATTR_METER_START_KWH): vol.Coerce(float),
        vol.Optional(ATTR_POWER_KW): vol.Coerce(float),
        vol.Optional(ATTR_STARTED_AT): cv.string,
        vol.Optional(ATTR_METADATA): dict,
    }
)

STOP_EXECUTION_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_ENTRY_ID): cv.string,
        vol.Optional(ATTR_EXECUTION_ID): cv.string,
        vol.Optional(ATTR_DEVICE_NAME): cv.string,
        vol.Optional(ATTR_METER_END_KWH): vol.Coerce(float),
        vol.Optional(ATTR_ENERGY_KWH): vol.Coerce(float),
        vol.Optional(ATTR_POWER_KW): vol.Coerce(float),
        vol.Optional(ATTR_ENDED_AT): cv.string,
        vol.Optional(ATTR_METADATA): dict,
    }
)

CANCEL_EXECUTION_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_ENTRY_ID): cv.string,
        vol.Optional(ATTR_EXECUTION_ID): cv.string,
        vol.Optional(ATTR_DEVICE_NAME): cv.string,
        vol.Optional(ATTR_REASON): cv.string,
        vol.Optional(ATTR_ENDED_AT): cv.string,
        vol.Optional(ATTR_METADATA): dict,
    }
)


def _coordinators(hass: HomeAssistant) -> dict[str, EnergyOptimizerCoordinator]:
    """Return configured EnergyOptimizer coordinators."""
    domain_data = hass.data.get(DOMAIN, {})
    return {
        entry_id: coordinator
        for entry_id, coordinator in domain_data.items()
        if isinstance(coordinator, EnergyOptimizerCoordinator)
    }


def _resolve_coordinator(
    hass: HomeAssistant,
    call: ServiceCall,
) -> EnergyOptimizerCoordinator:
    """Resolve the coordinator targeted by a service call."""
    coordinators = _coordinators(hass)
    if not coordinators:
        raise HomeAssistantError("EnergyOptimizer is not configured")

    entry_id = call.data.get(ATTR_ENTRY_ID)
    if entry_id:
        coordinator = coordinators.get(str(entry_id))
        if coordinator is None:
            raise HomeAssistantError(f"EnergyOptimizer entry {entry_id} not found")
        return coordinator

    device_name = call.data.get(ATTR_DEVICE_NAME)
    if device_name:
        matches = [
            coordinator
            for coordinator in coordinators.values()
            if coordinator.schedule_request.device_name == str(device_name)
        ]
        if len(matches) == 1:
            return matches[0]
        if len(matches) > 1:
            raise HomeAssistantError(
                f"More than one EnergyOptimizer entry uses device {device_name}. Pass entry_id."
            )

    if len(coordinators) == 1:
        return next(iter(coordinators.values()))

    raise HomeAssistantError("Pass entry_id or device_name when more than one EnergyOptimizer entry exists")


def _device_name(coordinator: EnergyOptimizerCoordinator, call: ServiceCall) -> str:
    """Resolve device name for a service call."""
    return str(call.data.get(ATTR_DEVICE_NAME) or coordinator.schedule_request.device_name)


def _metadata(call: ServiceCall) -> dict[str, Any] | None:
    """Return metadata from a service call."""
    value = call.data.get(ATTR_METADATA)
    return value if isinstance(value, dict) else None


def _execution_field(payload: dict[str, Any], field: str) -> Any:
    """Return a field from the nested execution payload."""
    execution = payload.get("execution")
    if isinstance(execution, dict):
        return execution.get(field)
    return None


def _fire_service_event(
    hass: HomeAssistant,
    service: str,
    payload: dict[str, Any],
) -> None:
    """Publish the last execution service result on the Home Assistant event bus."""
    hass.bus.async_fire(
        EVENT_EXECUTION_SERVICE,
        {
            "service": service,
            "status": payload.get("status"),
            "execution_id": _execution_field(payload, "execution_id"),
            "device_name": _execution_field(payload, "device_name"),
            "idempotent": payload.get("idempotent"),
            "api_version": payload.get("api_version"),
            "error_code": payload.get("error_code"),
        },
    )


async def async_setup_services(hass: HomeAssistant) -> None:
    """Register EnergyOptimizer services once."""
    domain_data = hass.data.setdefault(DOMAIN, {})
    if domain_data.get(SERVICE_SETUP_KEY):
        return

    async def async_start(call: ServiceCall) -> None:
        coordinator = _resolve_coordinator(hass, call)
        try:
            payload = await coordinator.client.async_start_execution(
                device_name=_device_name(coordinator, call),
                reference_rate_pln_kwh=float(call.data[ATTR_REFERENCE_RATE_PLN_KWH]),
                meter_start_kwh=call.data.get(ATTR_METER_START_KWH),
                power_kw=call.data.get(ATTR_POWER_KW) or coordinator.schedule_request.power_kw,
                started_at=call.data.get(ATTR_STARTED_AT),
                metadata=_metadata(call),
            )
        except EnergyOptimizerApiError as err:
            raise HomeAssistantError(str(err)) from err
        _fire_service_event(hass, SERVICE_START_EXECUTION, payload)
        await coordinator.async_request_refresh()

    async def async_stop(call: ServiceCall) -> None:
        coordinator = _resolve_coordinator(hass, call)
        execution_id = call.data.get(ATTR_EXECUTION_ID)
        device_name = call.data.get(ATTR_DEVICE_NAME)
        if not execution_id and not device_name:
            device_name = coordinator.schedule_request.device_name
        try:
            payload = await coordinator.client.async_stop_execution(
                execution_id=execution_id,
                device_name=device_name,
                meter_end_kwh=call.data.get(ATTR_METER_END_KWH),
                energy_kwh=call.data.get(ATTR_ENERGY_KWH),
                power_kw=call.data.get(ATTR_POWER_KW),
                ended_at=call.data.get(ATTR_ENDED_AT),
                metadata=_metadata(call),
            )
        except EnergyOptimizerApiError as err:
            raise HomeAssistantError(str(err)) from err
        _fire_service_event(hass, SERVICE_STOP_EXECUTION, payload)
        await coordinator.async_request_refresh()

    async def async_cancel(call: ServiceCall) -> None:
        coordinator = _resolve_coordinator(hass, call)
        execution_id = call.data.get(ATTR_EXECUTION_ID)
        device_name = call.data.get(ATTR_DEVICE_NAME)
        if not execution_id and not device_name:
            device_name = coordinator.schedule_request.device_name
        try:
            payload = await coordinator.client.async_cancel_execution(
                execution_id=execution_id,
                device_name=device_name,
                reason=call.data.get(ATTR_REASON),
                ended_at=call.data.get(ATTR_ENDED_AT),
                metadata=_metadata(call),
            )
        except EnergyOptimizerApiError as err:
            raise HomeAssistantError(str(err)) from err
        _fire_service_event(hass, SERVICE_CANCEL_EXECUTION, payload)
        await coordinator.async_request_refresh()

    hass.services.async_register(
        DOMAIN,
        SERVICE_START_EXECUTION,
        async_start,
        schema=START_EXECUTION_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_STOP_EXECUTION,
        async_stop,
        schema=STOP_EXECUTION_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_CANCEL_EXECUTION,
        async_cancel,
        schema=CANCEL_EXECUTION_SCHEMA,
    )
    domain_data[SERVICE_SETUP_KEY] = True


async def async_unload_services(hass: HomeAssistant) -> None:
    """Unregister EnergyOptimizer services."""
    domain_data = hass.data.get(DOMAIN, {})
    if not domain_data.get(SERVICE_SETUP_KEY):
        return

    for service in (
        SERVICE_START_EXECUTION,
        SERVICE_STOP_EXECUTION,
        SERVICE_CANCEL_EXECUTION,
    ):
        hass.services.async_remove(DOMAIN, service)
    domain_data.pop(SERVICE_SETUP_KEY, None)
