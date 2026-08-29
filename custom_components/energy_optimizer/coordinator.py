/Users/dominik/.zprofile:1: no such file or directory: /opt/homebrew/bin/brew
/Users/dominik/.zprofile:2: no such file or directory: /opt/homebrew/bin/brew
"""Data coordinator for EnergyOptimizer."""

from __future__ import annotations

from dataclasses import dataclass
import logging
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryAuthFailed
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import (
    DeviceScheduleRequest,
    EnergyOptimizerApiError,
    EnergyOptimizerAuthError,
    EnergyOptimizerClient,
    EnergyOptimizerSubscriptionError,
)
from .const import DEFAULT_SCAN_INTERVAL, DOMAIN

_LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
class EnergyOptimizerData:
    """Latest EnergyOptimizer API payloads."""

    schedule: dict[str, Any]
    summary: dict[str, Any]


class EnergyOptimizerCoordinator(DataUpdateCoordinator[EnergyOptimizerData]):
    """Fetch EnergyOptimizer schedule and summary in one polling cycle."""

    def __init__(
        self,
        hass: HomeAssistant,
        entry: ConfigEntry,
        client: EnergyOptimizerClient,
        schedule_request: DeviceScheduleRequest,
    ) -> None:
        """Initialize coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            config_entry=entry,
            update_interval=DEFAULT_SCAN_INTERVAL,
            always_update=False,
        )
        self.client = client
        self.schedule_request = schedule_request

    async def _async_update_data(self) -> EnergyOptimizerData:
        """Fetch data from the API."""
        try:
            schedule, summary = await self.client.async_get_home_assistant_data(self.schedule_request)
        except (EnergyOptimizerAuthError, EnergyOptimizerSubscriptionError) as err:
            raise ConfigEntryAuthFailed(str(err)) from err
        except EnergyOptimizerApiError as err:
            raise UpdateFailed(str(err)) from err

        return EnergyOptimizerData(schedule=schedule, summary=summary)
