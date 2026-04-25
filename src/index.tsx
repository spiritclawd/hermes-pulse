import React from 'react';
import { createRoot } from 'react-dom/client';
import { PulseDashboard } from './PulseDashboard';
import { exposePluginSDK } from '@/plugins/registry';

// Expose the SDK (dashboard does this too, but ensure it's there)
exposePluginSDK();

// Register our plugin component
const SDK = window.__HERMES_PLUGIN_SDK__;
const PLUGINS = window.__HERMES_PLUGINS__;

if (SDK && PLUGINS && PLUGINS.register) {
  PLUGINS.register('hermes-pulse', PulseDashboard);
  console.log('[hermes-pulse] plugin registered');
} else {
  console.warn('[hermes-pulse] SDK not available - dashboard may be outdated');
}
