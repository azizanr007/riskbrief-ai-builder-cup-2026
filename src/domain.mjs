// Small independent browser-side demonstration based on RiskBrief's public
// synthetic-only contract. It is not a port of the Python service.
const SEGMENTS = new Set(['Retail', 'SME', 'Mortgage', 'Auto']);
const FINDINGS = new Set(['CONCENTRATION', 'DELINQUENCY_ELEVATED', 'DELINQUENCY_WORSENING', 'FRAUD_ALERT_VOLUME', 'NO_THRESHOLD_FLAG']);
const UNCERTAINTY = new Set(['SYNTHETIC_ONLY', 'UNCALIBRATED', 'ANALYST_REVIEW_REQUIRED']);

function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join('|') === [...keys].sort().join('|');
}

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

export function validateDataset(input) {
  if (!exactKeys(input, ['label', 'segments']) || input.label !== 'SYNTHETIC_TEST_DATA') {
    throw new Error('Only an explicitly labeled synthetic dataset is accepted.');
  }
  if (!Array.isArray(input.segments) || input.segments.length < 2 || input.segments.length > 8) {
    throw new Error('Provide 2 to 8 synthetic portfolio segments.');
  }
  const seen = new Set();
  let total = 0;
  for (const row of input.segments) {
    if (!exactKeys(row, ['segment', 'exposure_usd', 'delinquency_rate', 'prior_delinquency_rate', 'fraud_alerts'])) {
      throw new Error('Segment data contains unsupported fields.');
    }
    if (!SEGMENTS.has(row.segment) || seen.has(row.segment)) throw new Error('Segment names must be unique supported categories.');
    seen.add(row.segment);
    if (!Number.isSafeInteger(row.exposure_usd) || row.exposure_usd < 1 || row.exposure_usd > 1000000000) {
      throw new Error('Exposure must be a positive integer within the demo limit.');
    }
    for (const rate of [row.delinquency_rate, row.prior_delinquency_rate]) {
      if (typeof rate !== 'number' || !Number.isFinite(rate) || rate < 0 || rate > 1) throw new Error('Rates must be numbers between zero and one.');
    }
    if (!Number.isSafeInteger(row.fraud_alerts) || row.fraud_alerts < 0 || row.fraud_alerts > 100000) {
      throw new Error('Fraud-alert counts must be bounded nonnegative integers.');
    }
    total += row.exposure_usd;
  }
  if (!Number.isSafeInteger(total) || total <= 0 || total > 8000000000) throw new Error('Total exposure exceeds the demo limit.');
  return JSON.parse(canonical(input));
}

export async function analyze(input) {
  const data = validateDataset(input);
  const inputHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(data)));
  const hash = Array.from(new Uint8Array(inputHash), b => b.toString(16).padStart(2, '0')).join('');
  const total = data.segments.reduce((sum, row) => sum + row.exposure_usd, 0);
  const evidence = data.segments.map((row, index) => {
    const delta = row.delinquency_rate - row.prior_delinquency_rate;
    const flags = [];
    if (row.exposure_usd / total >= 0.5) flags.push('CONCENTRATION');
    if (row.delinquency_rate >= 0.08) flags.push('DELINQUENCY_ELEVATED');
    if (delta >= 0.025) flags.push('DELINQUENCY_WORSENING');
    if (row.fraud_alerts >= 10) flags.push('FRAUD_ALERT_VOLUME');
    return {
      id: 'E' + String(index + 1).padStart(3, '0'),
      segment: row.segment,
      exposure_usd: row.exposure_usd,
      exposure_share: Number((row.exposure_usd / total).toFixed(6)),
      delinquency_rate: row.delinquency_rate,
      prior_delinquency_rate: row.prior_delinquency_rate,
      delinquency_delta: Number(delta.toFixed(6)),
      fraud_alerts: row.fraud_alerts,
      flags,
    };
  });
  return { inputHash: hash, totalExposure: total, evidence, thresholdVersion: 'riskbrief-demo-thresholds-v1', label: 'SYNTHETIC_TEST_DATA' };
}

export function validateGeminiSelection(selection, evidence) {
  if (!exactKeys(selection, ['findings', 'uncertaintyCodes']) || !Array.isArray(selection.findings) || selection.findings.length < 1 || selection.findings.length > 15 || !Array.isArray(selection.uncertaintyCodes) || selection.uncertaintyCodes.length !== 3) {
    throw new Error('Gemini response does not match the expected structured schema.');
  }
  const byId = new Map(evidence.map(item => [item.id, item]));
  const seen = new Set();
  for (const item of selection.findings) {
    if (!exactKeys(item, ['evidenceId', 'findingCode']) || !FINDINGS.has(item.findingCode)) throw new Error('Gemini returned an unsupported finding.');
    const key = item.evidenceId + ':' + item.findingCode;
    if (seen.has(key)) throw new Error('Gemini returned a duplicate citation.');
    seen.add(key);
    const evidenceItem = byId.get(item.evidenceId);
    if (!evidenceItem) throw new Error('Gemini cited unknown evidence.');
    const supported = evidenceItem.flags.length ? evidenceItem.flags : ['NO_THRESHOLD_FLAG'];
    if (!supported.includes(item.findingCode)) throw new Error('Gemini cited a finding not supported by the deterministic evidence.');
  }
  const uncertainties = new Set();
  for (const code of selection.uncertaintyCodes) {
    if (!UNCERTAINTY.has(code) || uncertainties.has(code)) throw new Error('Gemini returned an unsupported or duplicate uncertainty label.');
    uncertainties.add(code);
  }
  return { findings: selection.findings.map(x => ({ ...x })), uncertaintyCodes: [...selection.uncertaintyCodes] };
}

export function renderValidatedNarrative(selection, evidence) {
  const phrases = {
    CONCENTRATION: 'Illustrative exposure concentration threshold crossed.',
    DELINQUENCY_ELEVATED: 'Illustrative elevated delinquency threshold crossed.',
    DELINQUENCY_WORSENING: 'Illustrative delinquency deterioration threshold crossed.',
    FRAUD_ALERT_VOLUME: 'Illustrative fraud alert volume threshold crossed.',
    NO_THRESHOLD_FLAG: 'No illustrative threshold flag was produced for this segment.',
  };
  const uncertainty = {
    SYNTHETIC_ONLY: 'Inputs are synthetic and were not independently verified.',
    UNCALIBRATED: 'Thresholds are illustrative and uncalibrated.',
    ANALYST_REVIEW_REQUIRED: 'A human reviewer must assess this brief before export or use.',
  };
  const byId = new Map(evidence.map(item => [item.id, item]));
  const lines = selection.findings.map(item => byId.get(item.evidenceId).segment + ': ' + phrases[item.findingCode] + ' [' + item.evidenceId + ']');
  return { title: 'AI-selected evidence summary', findings: lines, uncertainty: selection.uncertaintyCodes.map(code => uncertainty[code]) };
}

export function sampleDataset() {
  return {
    label: 'SYNTHETIC_TEST_DATA',
    segments: [
      { segment: 'Retail', exposure_usd: 520000, delinquency_rate: 0.091, prior_delinquency_rate: 0.061, fraud_alerts: 12 },
      { segment: 'SME', exposure_usd: 310000, delinquency_rate: 0.052, prior_delinquency_rate: 0.047, fraud_alerts: 4 },
      { segment: 'Mortgage', exposure_usd: 170000, delinquency_rate: 0.025, prior_delinquency_rate: 0.023, fraud_alerts: 1 },
    ],
  };
}
