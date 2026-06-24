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
