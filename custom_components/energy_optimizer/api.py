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
        *,
        device_name: str,
        reference_rate_pln_kwh: float,
        meter_start_kwh: float | None = None,
        power_kw: float | None = None,
        started_at: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Start a savings execution cycle."""
        payload: dict[str, Any] = {
            "action": "start",
            "device_name": device_name,
            "reference_rate_pln_kwh": reference_rate_pln_kwh,
            "source": "home_assistant_hacs",
        }
        if meter_start_kwh is not None:
            payload["meter_start_kwh"] = meter_start_kwh
        if power_kw is not None:
            payload["power_kw"] = power_kw
        if started_at:
            payload["started_at"] = started_at
        if metadata:
            payload["metadata"] = metadata

        return await self._request(
            "POST",
            "/api/v1/savings/execution",
            json_data=payload,
        )

    async def async_stop_execution(
        self,
        *,
        execution_id: str | None = None,
        device_name: str | None = None,
        meter_end_kwh: float | None = None,
        energy_kwh: float | None = None,
        power_kw: float | None = None,
        ended_at: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Stop a running savings execution cycle."""
        payload: dict[str, Any] = {
            "action": "stop",
            "source": "home_assistant_hacs",
        }
        if execution_id:
            payload["execution_id"] = execution_id
        if device_name:
            payload["device_name"] = device_name
        if meter_end_kwh is not None:
            payload["meter_end_kwh"] = meter_end_kwh
        if energy_kwh is not None:
            payload["energy_kwh"] = energy_kwh
        if power_kw is not None:
            payload["power_kw"] = power_kw
        if ended_at:
            payload["ended_at"] = ended_at
        if metadata:
            payload["metadata"] = metadata

        return await self._request(
            "POST",
            "/api/v1/savings/execution",
            json_data=payload,
        )

    async def async_cancel_execution(
        self,
        *,
        execution_id: str | None = None,
        device_name: str | None = None,
        reason: str | None = None,
        ended_at: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Cancel a savings execution cycle."""
        payload: dict[str, Any] = {
            "action": "cancel",
            "source": "home_assistant_hacs",
        }
        if execution_id:
            payload["execution_id"] = execution_id
        if device_name:
            payload["device_name"] = device_name
        if reason:
            payload["reason"] = reason
        if ended_at:
            payload["ended_at"] = ended_at
        if metadata:
            payload["metadata"] = metadata

        return await self._request(
            "POST",
            "/api/v1/savings/execution",
            json_data=payload,
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
