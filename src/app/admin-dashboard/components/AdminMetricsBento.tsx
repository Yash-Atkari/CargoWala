import React from 'react';
import {
  Truck, Package, Ship, AlertTriangle, Clock, Leaf, Weight, Activity,
} from 'lucide-react';
import MetricCard from '@/components/ui/MetricCard';

// Bento plan: 8 cards → grid-cols-4
// Row 1: hero Fleet Utilization (spans 2 cols) + Active Shipments + High-Risk Packages (alert)
// Row 2: Delayed Shipments (warning) + Weight Utilization + Carbon Emissions + Avg Loading Time + Total Packages

export default function AdminMetricsBento() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {/* Hero: Fleet Utilization — spans 2 cols */}
      <div className="sm:col-span-2 lg:col-span-2 xl:col-span-2 2xl:col-span-2">
        <MetricCard
          label="Avg Fleet Space Utilization"
          value="67.4"
          unit="%"
          subtext="5 of 8 trucks active · 2 available · 1 in maintenance"
          trend="up"
          trendValue="+4.2% vs last week"
          icon={Truck}
          iconColor="text-primary"
          variant="hero"
          className="h-full"
        />
      </div>

      {/* Active Shipments */}
      <MetricCard
        label="Active Shipments"
        value="4"
        subtext="3 in transit · 1 loading now"
        trend="neutral"
        trendValue="2 delivered today"
        icon={Ship}
        iconColor="text-info"
        variant="default"
      />

      {/* High-Risk Packages — ALERT */}
      <MetricCard
        label="High-Risk Packages"
        value="7"
        subtext="4 FRAGILE · 3 score > 70"
        trend="down"
        trendValue="+2 since yesterday"
        icon={AlertTriangle}
        iconColor="text-negative"
        variant="alert"
      />

      {/* Delayed Shipments — WARNING */}
      <MetricCard
        label="Delayed Shipments"
        value="1"
        subtext="SHP-004 · NH-275 road closure"
        trend="down"
        trendValue="ETA +28 hrs"
        icon={Clock}
        iconColor="text-warning"
        variant="warning"
      />

      {/* Weight Utilization */}
      <MetricCard
        label="Avg Weight Utilization"
        value="63.1"
        unit="%"
        subtext="Across 5 active trucks"
        trend="up"
        trendValue="+2.8%"
        icon={Weight}
        iconColor="text-primary"
        variant="default"
      />

      {/* Carbon Emissions */}
      <MetricCard
        label="Today's CO₂ Estimate"
        value="89"
        unit="kg"
        subtext="36 L fuel · 3 active routes"
        trend="down"
        trendValue="-71% vs yesterday"
        icon={Leaf}
        iconColor="text-positive"
        variant="positive"
      />

      {/* Avg Loading Time */}
      <MetricCard
        label="Avg Loading Session"
        value="47"
        unit="min"
        subtext="Last 6 completed sessions"
        trend="up"
        trendValue="-8 min vs avg"
        icon={Activity}
        iconColor="text-accent"
        variant="default"
      />

      {/* Total Packages */}
      <MetricCard
        label="Total Packages (Active)"
        value="25"
        subtext="7 pending · 11 in transit · 7 delivered"
        trend="neutral"
        trendValue="1 damaged"
        icon={Package}
        iconColor="text-muted-foreground"
        variant="default"
      />
    </div>
  );
}