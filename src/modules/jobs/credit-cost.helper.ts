/**
 * Calculates the lead credit cost for a given service and job answers.
 * Mirrors the business-logic specification.
 */
const SERVICE_CREDIT_MAP: Record<string, number> = {
  // Handyman / small jobs (3-5)
  handyman: 4,
  'cleaning-services': 3,
  'garden-landscaping': 5,
  'pest-control': 4,
  'locksmith': 4,

  // Standard trades (8-12)
  plumbing: 10,
  electrical: 10,
  tiling: 8,
  plastering: 8,
  carpentry: 8,
  painting: 8,
  'painting-decorating': 8,
  flooring: 9,
  roofing: 12,
  'window-fitting': 10,
  'door-fitting': 9,
  'bathroom-fitting': 11,
  'kitchen-fitting': 12,
  'boiler-installation': 12,
  'central-heating': 12,
  'gas-engineer': 12,

  // Large projects (15-25)
  'loft-conversion': 20,
  extensions: 25,
  'house-extensions': 25,
  'new-build': 25,
  conservatory: 18,
  'driveway-paving': 15,
  'garage-conversion': 18,
  'basement-conversion': 22,

  // Specialist (20-30)
  architectural: 25,
  'structural-engineer': 28,
  'surveying': 22,
  'interior-design': 20,
};

export function calculateCreditCost(
  serviceSlug: string,
  _answersJson?: Record<string, unknown>,
): number {
  const base = SERVICE_CREDIT_MAP[serviceSlug] ?? 10;
  // Future: apply multipliers based on answersJson complexity
  return base;
}
