"""Constants for the EnergyOptimizer integration."""

from __future__ import annotations

from datetime import timedelta

DOMAIN = "energy_optimizer"
PLATFORMS = ["sensor", "binary_sensor"]

CONF_API_TOKEN = "api_token"
CONF_DEVICE_NAME = "device_name"
CONF_ENERGY_KWH = "energy_kwh"
CONF_POWER_KW = "power_kw"
CONF_EARLIEST_START = "earliest_start"
CONF_LATEST_END = "latest_end"
CONF_CONTIGUOUS = "contiguous"

ATTR_ENTRY_ID = "entry_id"
ATTR_EXECUTION_ID = "execution_id"
ATTR_DEVICE_NAME = "device_name"
ATTR_REFERENCE_RATE_PLN_KWH = "reference_rate_pln_kwh"
ATTR_METER_START_KWH = "meter_start_kwh"
ATTR_METER_END_KWH = "meter_end_kwh"
ATTR_ENERGY_KWH = "energy_kwh"
ATTR_POWER_KW = "power_kw"
ATTR_STARTED_AT = "started_at"
ATTR_ENDED_AT = "ended_at"
ATTR_REASON = "reason"
ATTR_METADATA = "metadata"

SERVICE_START_EXECUTION = "start_execution"
SERVICE_STOP_EXECUTION = "stop_execution"
SERVICE_CANCEL_EXECUTION = "cancel_execution"
EVENT_EXECUTION_SERVICE = "energy_optimizer_execution_service"

DEFAULT_NAME = "EnergyOptimizer"
DEFAULT_BASE_URL = "https://www.energyoptimizer.pl"
DEFAULT_DEVICE_NAME = "boiler"
DEFAULT_ENERGY_KWH = 6.0
DEFAULT_POWER_KW = 2.0
DEFAULT_EARLIEST_START = "00:00"
DEFAULT_LATEST_END = "07:00"
DEFAULT_CONTIGUOUS = True
DEFAULT_SCAN_INTERVAL = timedelta(minutes=5)

API_VERSION = "1.0"
API_TIMEOUT_SECONDS = 15

ATTR_API_VERSION = "api_version"
ATTR_ERROR_CODE = "error_code"
ATTR_RECOMMENDATION_REASON = "recommendation_reason"
ATTR_RETRY_AFTER_SECONDS = "retry_after_seconds"
