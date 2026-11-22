"use client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { useI18n } from "@/lib/i18n";

type ChartPoint = Record<string, string | number | boolean | null | undefined>;

type MetricChartProps = {
  data: ChartPoint[];
  xKey: string;
  yKey: string;
  seriesName: string;
  unit?: string;
  variant?: "line" | "area";
  color?: string;
  height?: number;
  xFormatter?: (value: string | number) => string;
  tooltipLabelFormatter?: (value: string | number) => string;
  valueFormatter?: (value: number | null | undefined) => string;
  yDomain?: [number | "auto" | "dataMin" | "dataMax", number | "auto" | "dataMin" | "dataMax" | ((max: number) => number)];
  referenceY?: number;
  referenceLabel?: string;
  referenceColor?: string;
  minTickGap?: number;
  gradientId?: string;
};

type TooltipPayloadItem = {
  value?: number | string | null;
  name?: string;
  color?: string;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  labelFormatter?: (value: string | number) => string;
  valueFormatter?: (value: number | null | undefined) => string;
  seriesName: string;
  unit?: string;
};

function MetricTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  seriesName,
  unit,
  locale,
  noDataLabel,
}: CustomTooltipProps & { locale: string; noDataLabel: string }) {
  if (!active || !payload?.length) return null;
  const raw = payload[0]?.value;
  const num = raw === null || raw === undefined || raw === "" ? null : Number(raw);
  const formattedLabel = label !== undefined ? (labelFormatter ? labelFormatter(label) : String(label)) : "";
  const formattedValue = valueFormatter
    ? valueFormatter(num)
    : num === null || Number.isNaN(num)
      ? noDataLabel
      : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(num)}${unit ? ` ${unit}` : ""}`;

  return (
    <div className="metric-tooltip">
      <div className="metric-tooltip-label">{formattedLabel}</div>
      <div className="metric-tooltip-row">
        <span className="metric-tooltip-dot" style={{ background: payload[0]?.color ?? "var(--accent)" }} />
        <span>{seriesName}</span>
        <strong>{formattedValue}</strong>
      </div>
    </div>
  );
}

export default function MetricChart({
  data,
  xKey,
  yKey,
  seriesName,
  unit,
  variant = "line",
  color = "var(--accent)",
  height = 228,
  xFormatter,
  tooltipLabelFormatter,
  valueFormatter,
  yDomain = ["auto", "auto"],
  referenceY,
  referenceLabel,
  referenceColor = "var(--warn)",
  minTickGap = 28,
  gradientId = "metric-area-grad",
}: MetricChartProps) {
  const { locale, tr } = useI18n();
  const axisTick = { fontSize: 12, fill: "var(--muted)" };
  const commonGrid = <CartesianGrid stroke="var(--line)" strokeDasharray="3 5" vertical={false} />;
  const commonXAxis = (
    <XAxis
      dataKey={xKey}
      tick={axisTick}
      axisLine={{ stroke: "var(--line)" }}
      tickLine={false}
      minTickGap={minTickGap}
      tickFormatter={xFormatter ? (v) => xFormatter(v as string | number) : undefined}
    />
  );
  const commonYAxis = (
    <YAxis
      width={44}
      domain={yDomain as [number | "auto", number | "auto"]}
      tick={axisTick}
      axisLine={false}
      tickLine={false}
    />
  );
  const commonTooltip = (
    <Tooltip
      content={
        <MetricTooltip
          labelFormatter={tooltipLabelFormatter}
          valueFormatter={valueFormatter}
          seriesName={seriesName}
          unit={unit}
          locale={locale}
          noDataLabel={tr("Sin dato", "No data")}
        />
      }
      cursor={{ stroke: "var(--line)", strokeWidth: 1.5, strokeDasharray: "3 3" }}
    />
  );

  return (
    <div className="metric-chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {variant === "area" ? (
          <AreaChart data={data} margin={{ top: 14, right: 14, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            {commonGrid}
            {commonXAxis}
            {commonYAxis}
            {commonTooltip}
            {referenceY !== undefined && (
              <ReferenceLine
                y={referenceY}
                stroke={referenceColor}
                strokeDasharray="4 4"
                label={
                  referenceLabel
                    ? { value: referenceLabel, position: "insideTopRight", fill: "var(--muted)", fontSize: 11 }
                    : undefined
                }
              />
            )}
            <Area
              type="monotone"
              dataKey={yKey}
              name={seriesName}
              stroke={color}
              fill={`url(#${gradientId})`}
              strokeWidth={2.5}
              dot={data.length <= 2 ? { r: 4, fill: color } : false}
              activeDot={{ r: 5, fill: color, stroke: "var(--card)", strokeWidth: 2 }}
              connectNulls={false}
            />
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ top: 14, right: 14, left: 0, bottom: 4 }}>
            {commonGrid}
            {commonXAxis}
            {commonYAxis}
            {commonTooltip}
            {referenceY !== undefined && (
              <ReferenceLine
                y={referenceY}
                stroke={referenceColor}
                strokeDasharray="4 4"
                label={
                  referenceLabel
                    ? { value: referenceLabel, position: "insideTopRight", fill: "var(--muted)", fontSize: 11 }
                    : undefined
                }
              />
            )}
            <Line
              type="monotone"
              dataKey={yKey}
              name={seriesName}
              stroke={color}
              strokeWidth={2.75}
              dot={{ r: 4, fill: "var(--card)", stroke: color, strokeWidth: 2.25 }}
              activeDot={{ r: 6, fill: color, stroke: "var(--card)", strokeWidth: 2 }}
              connectNulls={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
