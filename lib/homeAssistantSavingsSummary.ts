const SAVINGS_SUMMARY_URL = 'https://www.energyoptimizer.pl/api/v1/savings/summary';

function normalizeScanInterval(value: number): number {
  const parsed = Math.round(Number(value) || 900);
  return Math.max(300, Math.min(86400, parsed));
}

export function buildHomeAssistantSavingsSummaryYaml(
  token: string,
  scanIntervalSeconds = 900
): string {
  const scanInterval = normalizeScanInterval(scanIntervalSeconds);

  return `# Wklej ten element pod istniejącą sekcją rest: w configuration.yaml.
# Nie twórz drugiego nagłówka rest:.
  - resource: "${SAVINGS_SUMMARY_URL}"
    method: GET
    headers:
      Authorization: "Bearer ${token}"
      Accept: "application/json"
    scan_interval: ${scanInterval}
    timeout: 20

    sensor:
      - name: "EO Savings Total"
        unique_id: eo_savings_total
        availability: >-
          {{ value_json.status == 'success' }}
        value_template: >-
          {{ value_json.total_savings_pln | default(0) | float(0) | round(2) }}
        unit_of_measurement: "PLN"
        device_class: monetary
        state_class: total

      - name: "EO Savings This Month"
        unique_id: eo_savings_this_month
        availability: >-
          {{ value_json.status == 'success' }}
        value_template: >-
          {{ value_json.month_savings_pln | default(0) | float(0) | round(2) }}
        unit_of_measurement: "PLN"
        device_class: monetary

      - name: "EO Shifted Energy Total"
        unique_id: eo_shifted_energy_total
        availability: >-
          {{ value_json.status == 'success' }}
        value_template: >-
          {{ value_json.total_energy_kwh | default(0) | float(0) | round(3) }}
        unit_of_measurement: "kWh"
        device_class: energy
        state_class: total

      - name: "EO Shifted Energy This Month"
        unique_id: eo_shifted_energy_this_month
        availability: >-
          {{ value_json.status == 'success' }}
        value_template: >-
          {{ value_json.month_energy_kwh | default(0) | float(0) | round(3) }}
        unit_of_measurement: "kWh"
        device_class: energy

      - name: "EO Completed Cycles Total"
        unique_id: eo_completed_cycles_total
        availability: >-
          {{ value_json.status == 'success' }}
        value_template: >-
          {{ value_json.total_cycles | default(0) | int(0) }}

      - name: "EO Completed Cycles This Month"
        unique_id: eo_completed_cycles_this_month
        availability: >-
          {{ value_json.status == 'success' }}
        value_template: >-
          {{ value_json.month_cycles | default(0) | int(0) }}

      - name: "EO Last Cycle Savings"
        unique_id: eo_last_cycle_savings
        availability: >-
          {{ value_json.status == 'success' }}
        value_template: >-
          {{ value_json.last_cycle_savings_pln | default(0, true) | float(0) | round(2) }}
        unit_of_measurement: "PLN"
        device_class: monetary

      - name: "EO Last Cycle Device"
        unique_id: eo_last_cycle_device
        availability: >-
          {{ value_json.status == 'success' }}
        value_template: >-
          {{ value_json.last_cycle_device | default('Brak', true) }}

      - name: "EO Active Executions"
        unique_id: eo_active_executions
        availability: >-
          {{ value_json.status == 'success' }}
        value_template: >-
          {{ value_json.active_executions | default(0) | int(0) }}

    binary_sensor:
      - name: "EO Execution Active"
        unique_id: eo_execution_active
        availability: >-
          {{ value_json.status == 'success' }}
        value_template: >-
          {{ value_json.running_executions | default(0) | int(0) > 0 }}

      - name: "EO Savings Waiting For Prices"
        unique_id: eo_savings_waiting_for_prices
        availability: >-
          {{ value_json.status == 'success' }}
        value_template: >-
          {{ value_json.awaiting_price_executions | default(0) | int(0) > 0 }}`;
}
