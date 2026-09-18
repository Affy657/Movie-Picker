import { lazy } from 'react';

export const loadWheelModal = () => import('@/features/events/components/WheelModal');
export const loadHostEventSettingsPanel = () =>
  import('@/features/events/components/HostEventSettingsPanel');
export const loadEventShareDialog = () =>
  import('@/features/events/pages/event-detail/EventShareDialog');

export const OVERLAY_CHUNKS = [loadWheelModal, loadHostEventSettingsPanel, loadEventShareDialog];

export const WheelModal = lazy(loadWheelModal);
export const HostEventSettingsPanel = lazy(loadHostEventSettingsPanel);
export const EventShareDialog = lazy(loadEventShareDialog);
