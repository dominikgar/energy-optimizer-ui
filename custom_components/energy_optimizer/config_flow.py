"""Config flow for EnergyOptimizer."""

from __future__ import annotations

import re
from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.const import CONF_URL
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import (
    DeviceScheduleRequest,
    EnergyOptimizerApiError,
    EnergyOptimizerAuthError,
    EnergyOptimizerClient,
    EnergyOptimizerSubscriptionError,
)
from .const import (
    CONF_API_TOKEN,
    CONF_CONTIGUOUS,
    CONF_DEVICE_NAME,
    CONF_EARLIEST_START,
    CONF_ENERGY_KWH,
    CONF_LATEST_END,
    CONF_POWER_KW,
    DEFAULT_BASE_URL,
    DEFAULT_CONTIGUOUS,
    DEFAULT_DEVICE_NAME,
    DEFAULT_EARLIEST_START,
    DEFAULT_ENERGY_KWH,
    DEFAULT_LATEST_END,
    DEFAULT_POWER_KW,
    DOMAIN,
)

TIME_PATTERN = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
OPTION_KEYS = (
    CONF_DEVICE_NAME,
    CONF_ENERGY_KWH,
    CONF_POWER_KW,
    CONF_EARLIEST_START,
    CONF_LATEST_END,
    CONF_CONTIGUOUS,
)


class InvalidTimeWindow(ValueError):
    """Raised when a time window is invalid."""


def _option_defaults(source: dict[str, Any]) -> dict[str, Any]:
    """Return option defaults from a data/options mapping."""
    return {
        CONF_DEVICE_NAME: source.get(CONF_DEVICE_NAME, DEFAULT_DEVICE_NAME),
        CONF_ENERGY_KWH: source.get(CONF_ENERGY_KWH, DEFAULT_ENERGY_KWH),
        CONF_POWER_KW: source.get(CONF_POWER_KW, DEFAULT_POWER_KW),
        CONF_EARLIEST_START: source.get(CONF_EARLIEST_START, DEFAULT_EARLIEST_START),
        CONF_LATEST_END: source.get(CONF_LATEST_END, DEFAULT_LATEST_END),
        CONF_CONTIGUOUS: source.get(CONF_CONTIGUOUS, DEFAULT_CONTIGUOUS),
    }


def _options_schema(defaults: dict[str, Any] | None = None) -> vol.Schema:
    """Return schema for editable device options."""
    values = _option_defaults(defaults or {})
    return vol.Schema(
        {
            vol.Required(CONF_DEVICE_NAME, default=values[CONF_DEVICE_NAME]): str,
            vol.Required(CONF_ENERGY_KWH, default=values[CONF_ENERGY_KWH]): vol.Coerce(float),
            vol.Required(CONF_POWER_KW, default=values[CONF_POWER_KW]): vol.Coerce(float),
            vol.Required(CONF_EARLIEST_START, default=values[CONF_EARLIEST_START]): str,
            vol.Required(CONF_LATEST_END, default=values[CONF_LATEST_END]): str,
            vol.Required(CONF_CONTIGUOUS, default=values[CONF_CONTIGUOUS]): bool,
        }
    )


def _schema(user_input: dict[str, Any] | None = None) -> vol.Schema:
    """Return the user step schema."""
    defaults = user_input or {}
    setup_schema = {
        vol.Required(CONF_URL, default=defaults.get(CONF_URL, DEFAULT_BASE_URL)): str,
        vol.Required(CONF_API_TOKEN, default=defaults.get(CONF_API_TOKEN, "")): str,
    }
    setup_schema.update(_options_schema(defaults).schema)
    return vol.Schema(setup_schema)


def _normalize_options(user_input: dict[str, Any]) -> dict[str, Any]:
    """Normalize and validate editable device options."""
    earliest_start = str(user_input[CONF_EARLIEST_START]).strip()
    latest_end = str(user_input[CONF_LATEST_END]).strip()
    if not TIME_PATTERN.match(earliest_start) or not TIME_PATTERN.match(latest_end):
        raise InvalidTimeWindow

    energy_kwh = float(user_input[CONF_ENERGY_KWH])
    power_kw = float(user_input[CONF_POWER_KW])
    if energy_kwh <= 0 or power_kw <= 0:
        raise InvalidTimeWindow

    return {
        CONF_DEVICE_NAME: str(user_input[CONF_DEVICE_NAME]).strip() or DEFAULT_DEVICE_NAME,
        CONF_ENERGY_KWH: energy_kwh,
        CONF_POWER_KW: power_kw,
        CONF_EARLIEST_START: earliest_start,
        CONF_LATEST_END: latest_end,
        CONF_CONTIGUOUS: bool(user_input[CONF_CONTIGUOUS]),
    }


def _normalize_input(user_input: dict[str, Any]) -> dict[str, Any]:
    """Normalize and validate user input."""
    base_url = str(user_input[CONF_URL]).strip().rstrip("/")
    if not base_url.startswith(("http://", "https://")):
        base_url = f"https://{base_url}"

    return {
        CONF_URL: base_url,
        CONF_API_TOKEN: str(user_input[CONF_API_TOKEN]).strip(),
        **_normalize_options(user_input),
    }


def _schedule_request_from(data: dict[str, Any]) -> DeviceScheduleRequest:
    """Build API schedule request from normalized config data."""
    return DeviceScheduleRequest(
        device_name=data[CONF_DEVICE_NAME],
        energy_kwh=float(data[CONF_ENERGY_KWH]),
        power_kw=float(data[CONF_POWER_KW]),
        earliest_start=data[CONF_EARLIEST_START],
        latest_end=data[CONF_LATEST_END],
        contiguous=bool(data[CONF_CONTIGUOUS]),
    )


async def _validate_input(hass: HomeAssistant, data: dict[str, Any]) -> None:
    """Validate credentials and device parameters against the API."""
    session = async_get_clientsession(hass)
    client = EnergyOptimizerClient(session, data[CONF_URL], data[CONF_API_TOKEN])
    await client.async_get_device_schedule(_schedule_request_from(data))
    await client.async_get_summary()


class EnergyOptimizerConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle an EnergyOptimizer config flow."""

    VERSION = 1

    @staticmethod
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> config_entries.OptionsFlow:
        """Return the options flow handler."""
        return EnergyOptimizerOptionsFlowHandler(config_entry)

    async def async_step_user(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Handle the initial setup step."""
        errors: dict[str, str] = {}

        if user_input is not None:
            try:
                data = _normalize_input(user_input)
                await _validate_input(self.hass, data)
            except InvalidTimeWindow:
                errors["base"] = "invalid_time_window"
            except EnergyOptimizerAuthError:
                errors["base"] = "invalid_auth"
            except EnergyOptimizerSubscriptionError:
                errors["base"] = "subscription_required"
            except EnergyOptimizerApiError:
                errors["base"] = "cannot_connect"
            except Exception:  # noqa: BLE001 - Home Assistant config flows map unexpected setup failures.
                errors["base"] = "unknown"
            else:
                title = f"EnergyOptimizer {data[CONF_DEVICE_NAME]}"
                await self.async_set_unique_id(f"{data[CONF_URL]}:{data[CONF_DEVICE_NAME]}")
                self._abort_if_unique_id_configured(updates=data)
                return self.async_create_entry(title=title, data=data)

        return self.async_show_form(
            step_id="user",
            data_schema=_schema(user_input),
            errors=errors,
        )


class EnergyOptimizerOptionsFlowHandler(config_entries.OptionsFlow):
    """Handle EnergyOptimizer options."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        """Initialize options flow."""
        self.config_entry = config_entry

    async def async_step_init(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Manage editable device options."""
        errors: dict[str, str] = {}
        defaults = {
            **_option_defaults(self.config_entry.data),
            **self.config_entry.options,
        }

        if user_input is not None:
            try:
                options = _normalize_options(user_input)
                validation_data = {
                    **self.config_entry.data,
                    **options,
                }
                await _validate_input(self.hass, validation_data)
            except InvalidTimeWindow:
                errors["base"] = "invalid_time_window"
            except EnergyOptimizerAuthError:
                errors["base"] = "invalid_auth"
            except EnergyOptimizerSubscriptionError:
                errors["base"] = "subscription_required"
            except EnergyOptimizerApiError:
                errors["base"] = "cannot_connect"
            except Exception:  # noqa: BLE001 - Home Assistant options flows map unexpected failures.
                errors["base"] = "unknown"
            else:
                return self.async_create_entry(title="", data=options)

        return self.async_show_form(
            step_id="init",
            data_schema=_options_schema(defaults if user_input is None else user_input),
            errors=errors,
        )
