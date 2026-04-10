import { cn } from "@/lib/utils";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { IconTrendingUp as ArrowTrendingUpIcon, IconTrendingDown as ArrowTrendingDownIcon } from "@tabler/icons-react";
import { statLabelClass, statValueClass, cardGap } from "@/lib/design-system";

export interface DashboardMetric {
    label: string;
    value: string | number;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
    icon: React.ElementType;
    color?: string;
    bg?: string;
    changeLabel?: string;
}

export interface DashboardMetricsProps {
    metrics: DashboardMetric[];
    className?: string;
}

export function DashboardMetrics({ metrics, className }: DashboardMetricsProps) {
    return (
        <div className={cn(`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${cardGap} px-4 md:px-6 lg:px-10`, className)}>
            {metrics.map((metric, i) => (
                <Card key={i} className="border-border shadow-none overflow-hidden rounded-2xl">
                    <CardContent className="p-4 md:p-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className={statLabelClass}>{metric.label}</span>
                            <div className={`p-2 rounded-xl ${metric.bg || 'bg-secondary'}`}>
                                <metric.icon className={`w-5 h-5 ${metric.color || 'text-muted-foreground'}`} />
                            </div>
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <h3 className={statValueClass}>{metric.value}</h3>
                                {metric.change && (
                                    <div className="flex items-center gap-1 mt-1">
                                        {metric.trend === 'up' && <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-emerald-500" />}
                                        {metric.trend === 'down' && <ArrowTrendingDownIcon className="w-3.5 h-3.5 text-rose-500" />}
                                        <span className={cn(
                                            "text-xs font-semibold",
                                            metric.trend === 'up' ? "text-emerald-500" : metric.trend === 'down' ? "text-rose-500" : "text-muted-foreground"
                                        )}>
                                            {metric.change}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground ml-1">{metric.changeLabel || "vs last month"}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

interface DashboardPageProps {
    children: React.ReactNode;
    className?: string;
}

export function DashboardPage({ children, className }: DashboardPageProps) {
    return (
        <div className={cn("space-y-6 pb-12", className)}>
            {children}
        </div>
    );
}

interface DashboardHeaderProps {
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
}

export function DashboardHeader({ title, subtitle, children }: DashboardHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 md:px-6 lg:px-10">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                {subtitle && (
                    <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
                )}
            </div>
            {children && (
                <div className="flex items-center gap-3 shrink-0">
                    {children}
                </div>
            )}
        </div>
    );
}

interface DashboardControlsProps {
    children: React.ReactNode;
}

export function DashboardControls({ children }: DashboardControlsProps) {
    return (
        <div className="relative flex items-center justify-between gap-3 px-4 md:px-6 lg:px-10">
            {children}
        </div>
    );
}
