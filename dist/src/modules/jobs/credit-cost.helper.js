"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCreditCost = calculateCreditCost;
const SERVICE_CREDIT_MAP = {
    handyman: 4,
    'cleaning-services': 3,
    'garden-landscaping': 5,
    'pest-control': 4,
    locksmith: 4,
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
    'loft-conversion': 20,
    extensions: 25,
    'house-extensions': 25,
    'new-build': 25,
    conservatory: 18,
    'driveway-paving': 15,
    'garage-conversion': 18,
    'basement-conversion': 22,
    architectural: 25,
    'structural-engineer': 28,
    surveying: 22,
    'interior-design': 20,
};
function calculateCreditCost(serviceSlug, _answersJson) {
    const base = SERVICE_CREDIT_MAP[serviceSlug] ?? 10;
    return base;
}
//# sourceMappingURL=credit-cost.helper.js.map