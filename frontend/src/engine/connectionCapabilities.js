import { canForward } from './deviceCapabilities';

const SPEED_MULTIPLIER_BY_TYPE = {
  standard: 1.0,
  backbone: 1.5,
};

export function isValidConnectionType(connectionType, sourceDeviceType, targetDeviceType) {
  if (connectionType === 'backbone') {
    return canForward(sourceDeviceType) && canForward(targetDeviceType);
  }

  return connectionType === 'standard';
}

export function getSpeedMultiplier(connectionType) {
  return SPEED_MULTIPLIER_BY_TYPE[connectionType] ?? 1.0;
}

export const SPEED_OPTIONS_BY_TYPE = {
  standard: [10, 100, 1000],
  backbone: [1000, 10000, 40000],
};

export function getDefaultSpeed(type) {
  const options = SPEED_OPTIONS_BY_TYPE[type] ?? SPEED_OPTIONS_BY_TYPE.standard;
  return options.at(-1);
}

export function formatSpeedLabel(mbps) {
  return mbps >= 1000 ? `${mbps / 1000} Gbps` : `${mbps} Mbps`;
}
