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
