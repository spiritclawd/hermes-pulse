import React from 'react';
import { createRoot } from 'react-dom/client';
import { PulseDashboard } from './PulseDashboard';
import { SidebarWidget } from './SidebarWidget';
import { exposePluginSDK } from '@/plugins/registry';

// Expose the SDK
exposePluginSDK();

// Register plugin
const SDK = window.__HERMES_PLUGIN_SDK__;
const PLUGINS = window.__HERMES_PLUGINS__;

if (SDK && PLUGINS && PLUGINS.register) {
  // Main tab component
  PLUGINS.register('hermes-pulse', PulseDashboard);
  
  // Sidebar slot — only renders when theme has layoutVariant="cockpit"
  if (PLUGINS.registerSlot) {
    PLUGINS.registerSlot('hermes-pulse', 'sidebar', SidebarWidget);
    console.log('[hermes-pulse] plugin + sidebar slot registered');
  } else {
    console.log('[hermes-pulse] plugin registered (slot system not available)');
  }
} else {
  console.warn('[hermes-pulse] SDK not available — dashboard may be outdated');
}
