import React from 'react';
import { createRoot } from 'react-dom/client';
import { PulseDashboard } from './PulseDashboard';
import { SidebarWidget } from './SidebarWidget';
import { AnalyticsTop } from './AnalyticsTop';
import { exposePluginSDK } from '@/plugins/registry';

exposePluginSDK();

const SDK = window.__HERMES_PLUGIN_SDK__;
const PLUGINS = window.__HERMES_PLUGINS__;

if (SDK && PLUGINS && PLUGINS.register) {
  PLUGINS.register('hermes-pulse', PulseDashboard);
  
  if (PLUGINS.registerSlot) {
    // Sidebar slot — cockpit themes
    PLUGINS.registerSlot('hermes-pulse', 'sidebar', SidebarWidget);
    // Analytics page top — inject overview directly into Analytics tab
    PLUGINS.registerSlot('hermes-pulse', 'analytics:top', AnalyticsTop);
    console.log('[hermes-pulse] plugin + sidebar + analytics:top slot registered');
  } else {
    console.log('[hermes-pulse] plugin registered (slot system outdated)');
  }
} else {
  console.warn('[hermes-pulse] SDK not available');
}
