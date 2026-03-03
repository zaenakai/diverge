"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, LineSeries, type IChartApi } from "lightweight-charts";

interface PriceChartProps {
  polyData: { date: string; value: number }[];
  kalshiData: { date: string; value: number }[];
  height?: number;
}

export function PriceChart({ polyData, kalshiData, height = 300 }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255,255,255,0.4)",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      width: chartContainerRef.current.clientWidth,
      height,
      crosshair: {
        vertLine: { color: "rgba(255,255,255,0.1)", width: 1, style: 2, labelBackgroundColor: "#1a1a1a" },
        horzLine: { color: "rgba(255,255,255,0.1)", width: 1, style: 2, labelBackgroundColor: "#1a1a1a" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.1)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.1)",
      },
    });

    const polySeries = chart.addSeries(LineSeries, {
      color: "#60a5fa",
      lineWidth: 2,
      title: "Polymarket",
    });

    const kalshiSeries = chart.addSeries(LineSeries, {
      color: "#fb923c",
      lineWidth: 2,
      title: "Kalshi",
    });

    polySeries.setData(polyData.map(d => ({ time: d.date, value: d.value })) as any);
    kalshiSeries.setData(kalshiData.map(d => ({ time: d.date, value: d.value })) as any);

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [polyData, kalshiData, height]);

  return <div ref={chartContainerRef} className="w-full" />;
}
