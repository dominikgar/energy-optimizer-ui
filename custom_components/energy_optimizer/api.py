"""Async API client for EnergyOptimizer."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import asyncio
import async_timeout
from aiohttp import ClientError, ClientResponseError, ClientSession

from .const import API_TIMEOUT_SECONDS


class EnergyOptimizerApiError(Exception):
    """Base EnergyOptimizer API error."""

    def __init__(
        self,
        message: str,
        *,
        status: int | None = None,
        error_code: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.error_code = error_code
        self.payload = payload or {}


class EnergyOptimizerAuthError(EnergyOptimizerApiError):
    """Raised when the API token is missing or invalid."""


class EnergyOptimizerSubscriptionError(EnergyOptimizerApiError):
    """Raised when the account has no active PRO subscription."""


class EnergyOptimizerRateLimitError(EnergyOptimizerApiError):
    """Raised when the API rate limit is reached."""


@dataclass(frozen=True)
class DeviceScheduleRequest:
    """Device schedule request parameters."""

    device_name: str
    energy_kwh: float
    power_kw: float
    earliest_start: str
    latest_end: str
    contiguous: bool
    day: str = "today"

    def as_params(self) -> dict[str, str]:
        """Return query parameters expected by the API."""
        return {
            "device_name": self.device_name,
            "energy_kwh": str(self.energy_kwh),
            "power_kw": str(self.power_kw),
            "earliest_start": self.earliest_start,
            "latest_end": self.latest_end,
            "contiguous": "true" if self.contiguous else "false",
            "day": self.day,
        }


class EnergyOptimizerClient:
    """Client for EnergyOptimizer API v1."""

    def __init__(
        self,
        session: ClientSession,
        base_url: str,
        api_token: str,
        *,
        timeout: int = API_TIMEOUT_SECONDS,
    ) -> None:
        self._session = session
        self._base_url = base_url.rstrip("/")
        self._api_token = api_token
        self._timeout = timeout

    async def async_get_summary(self) -> dict[str, Any]:
        """Fetch savings summary."""
        return await self._request("GET", "/api/v1/savings/summary")

    async def async_get_device_schedule(
        self,
        schedule_request: DeviceScheduleRequest,
    ) -> dict[str, Any]:
        """Fetch device schedule."""
        return await self._request(
            "GET",
            "/api/v1/schedule/device",
            params=schedule_request.as_params(),
        )

    async def async_start_execution(
        self,
        schedule_request: DeviceScheduleRequest,
    ) -> dict[str, Any]:
        """Start a savings execution cycle."""
        return await self._request(
            "POST",
            "/api/v1/savings/execution",
            json_data={
                "action": "start",
                "device_name": schedule_request.device_name,
                "energy_kwh": schedule_request.energy_kwh,
                "power_kw": schedule_request.power_kw,
                "earliest_start": schedule_request.earliest_start,
                "latest_end": schedule_request.latest_end,
                "contiguous": schedule_request.contiguous,
            },
        )

    async def async_stop_execution(self, execution_id: str) -> dict[str, Any]:
        """Stop a running savings execution cycle."""
        return await self._request(
            "POST",
            "/api/v1/savings/execution",
            json_data={"action": "stop", "execution_id": execution_id},
        )

    async def async_cancel_execution(self, execution_id: str) -> dict[str, Any]:
        """Cancel a savings execution cycle."""
        return await self._request(
            "POST",
            "/api/v1/savings/execution",
            json_data={"action": "cancel", "execution_id": execution_id},
        )

    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, str] | None = None,
        json_data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Execute an authenticated API request."""
        url = f"{self._base_url}{path}"
        headers = {
            "Authorization": f"Bearer {self._api_token}",
            "Accept": "application/json",
        }

        try:
            async with async_timeout.timeout(self._timeout):
                response = await self._session.request(
                    method,
                    url,
                    params=params,
                    json=json_data,
                    headers=headers,
                )
                payload = await self._read_json(response)
        except (asyncio.TimeoutError, ClientError) as err:
            raise EnergyOptimizerApiError("Cannot connect to EnergyOptimizer API") from err

        if response.status < 400:
            return payload

        message = str(payload.get("error") or f"EnergyOptimizer API returned HTTP {response.status}")
        error_code = payload.get("error_code")
        if not isinstance(error_code, str):
            error_code = None

        if response.status == 401:
            raise EnergyOptimizerAuthError(
                message,
                status=response.status,
                error_code=error_code,
                payload=payload,
            )
        if response.status == 403:
            raise EnergyOptimizerSubscriptionError(
                message,
                status=response.status,
                error_code=error_code,
                payload=payload,
            )
        if response.status == 429:
            raise EnergyOptimizerRateLimitError(
                message,
                status=response.status,
                error_code=error_code,
                payload=payload,
            )

        raise EnergyOptimizerApiError(
            message,
            status=response.status,
            error_code=error_code,
            payload=payload,
        )

    @staticmethod
    async def _read_json(response) -> dict[str, Any]:
        """Read a JSON response and normalize parser failures."""
        try:
            payload = await response.json(content_type=None)
        except (ClientResponseError, ValueError) as err:
            raise EnergyOptimizerApiError("Invalid JSON response from EnergyOptimizer API") from err

        if isinstance(payload, dict):
            return payload
        raise EnergyOptimizerApiError("Unexpected EnergyOptimizer API response")
