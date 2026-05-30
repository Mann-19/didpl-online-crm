'use client';

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ProjectNav from "@/components/projects/ProjectNav";
import { getLayoutRenderer } from "./renderers";
import BackLink from "@/components/ui/BackLink";
import { DH3_ACTIVE_PLOTS, AEROTOWN_RESIDENCY_ACTIVE_PLOTS } from "../../../../project-utils";

export default function LayoutGridClient({ project, plots }: { project: any, plots: any[] }) {
  const router = useRouter();
  const projectId = project.id;

  const gridRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const detailsBarRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.3));
  const handleResetZoom = () => setScale(1);

  useEffect(() => {
    const grid = gridRef.current;
    const tooltip = tooltipRef.current;
    const detailsBar = detailsBarRef.current;
    if (!grid || !tooltip || !detailsBar) return;

    // 1. Process Plot Data
    const dataMap: any = {};
    plots?.forEach((p: any) => {
      // Pick the most relevant active booking:
      // Priority: confirmed first (plot is sold), then pending (token paid), ignore cancelled
      const allBookings: any[] = p.bookings || [];
      const activeBooking =
        allBookings.find((b: any) => b.status === 'confirmed') ||
        allBookings.find((b: any) => b.status === 'pending') ||
        null;

      const totalAmount = activeBooking
        ? (activeBooking.total_amount - (activeBooking.discount_amount || 0))
        : p.price;
      const payments = activeBooking?.payments || [];
      const amountPaid = payments.reduce((sum: number, pay: any) => sum + (Number(pay.amount) || 0), 0);
      const percent = totalAmount > 0 ? (amountPaid / totalAmount) * 100 : 0;

      // Prefer the active booking's client name over the stale plot.client_id join
      const clientName =
        activeBooking?.client?.name ||
        p.clients?.name ||
        "—";

      const plotData = {
        plot: p.plot_number,
        area: p.area_sqyd ? `${p.area_sqyd} sq.yd` : "N/A",
        status: p.status === "sold" ? "Sold" :
            p.status === "token_paid" ? "Token Paid" : "Available",
        paymentPercentage: Math.round(percent),
        price: `₹${parseInt(String(totalAmount)).toLocaleString("en-IN")}`,
        amountPaid: `₹${parseInt(String(amountPaid)).toLocaleString("en-IN")}`,
        clientName,
        colorClass:
          p.status === "sold" ? "status-sold" :
            p.status === "token_paid" ? "status-token" : "status-available",
      };

      dataMap[p.plot_number] = plotData;
      const numericPlotNumber = parseInt(p.plot_number, 10);
      if (!isNaN(numericPlotNumber)) dataMap[numericPlotNumber] = plotData;
      const paddedPlotNumber = String(p.plot_number).padStart(3, '0');
      dataMap[paddedPlotNumber] = plotData;
    });

    // --- DOM HELPERS ---
    function placePlot(num: any, row: any, col: any, data: any, rowSpan = 1, colSpan = 1) {
      const el = document.createElement("div");
      
      // For Dholera Homes 3 and AeroTown Residency, plots not in the active set are shown as disabled
      const isDH3 = project?.name === 'Dholera Homes 3';
      const isDisabledDH3 = isDH3 && !DH3_ACTIVE_PLOTS.has(parseInt(String(num), 10));

      const isAerotownResidency = project?.name?.toLowerCase().includes('aerotown residency');
      const isDisabledAerotown = isAerotownResidency && !AEROTOWN_RESIDENCY_ACTIVE_PLOTS.has(parseInt(String(num), 10));

      const isDisabled = isDisabledDH3 || isDisabledAerotown;

      if (isDisabled) {
        el.className = "plot status-disabled";
        el.innerHTML = `<span class="num">${num}</span>`;
        el.style.gridRow = `${row} / span ${rowSpan}`;
        el.style.gridColumn = `${col} / span ${colSpan}`;
        grid!.appendChild(el);
        return;
      }

      el.className = `plot ${data?.colorClass || "status-available"}`;
      el.style.gridRow = `${row} / span ${rowSpan}`;
      el.style.gridColumn = `${col} / span ${colSpan}`;
      el.dataset.plot = num;
      el.innerHTML = `<span class="num">${num}</span>`;

      el.addEventListener("mouseenter", (ev) => {
        if (data) {
          updateDetailsBar(data);
          const rect = el.getBoundingClientRect();
          showTooltip(`Plot ${num}`, ev.clientX, rect.top + window.scrollY - 30);
        }
      });

      el.addEventListener("mouseleave", () => hideTooltip());
      el.addEventListener("click", () => router.push(`/projects/${projectId}/plot/${num}`));

      grid!.appendChild(el);
    }

    function placeCell({ row, col, span = 1, className, label }: any) {
      const el = document.createElement("div");
      el.className = className;
      el.style.gridRow = row;
      el.style.gridColumn = `${col} / ${col + span}`;
      el.innerHTML = label || '';
      grid!.appendChild(el);
    }

    function showTooltip(text: string, x: number, y: number) {
      if (!tooltip) return;
      tooltip.style.left = `${x}px`;
      tooltip.style.top = `${y}px`;
      tooltip.textContent = text;
      tooltip.style.display = "block";
    }

    function hideTooltip() {
      if (!tooltip) return;
      tooltip.style.display = "none";
    }

    function updateDetailsBar(data: any) {
      if (!detailsBar) return;

      if (!data) {
        detailsBar.innerHTML = `
          <div class="flex items-center gap-2 text-gray-400 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="m13 13 6 6"/></svg>
            <span class="font-medium">Hover over any plot to view details</span>
          </div>
        `;
        return;
      }

      let badgeColor = "bg-gray-100 text-gray-800";
      if (data.status === 'Sold') badgeColor = "bg-rose-100 text-rose-700 border-rose-200";
      if (data.status === 'Available') badgeColor = "bg-emerald-100 text-emerald-700 border-emerald-200";
      if (data.status === 'Token Paid') badgeColor = "bg-yellow-100 text-yellow-700 border-yellow-200";

      detailsBar.innerHTML = `
        <div class="flex items-center gap-6 animate-in fade-in slide-in-from-top-1 duration-200">
          <div class="flex items-center gap-3 pr-6 border-r border-gray-200">
            <div class="flex flex-col">
              <span class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Plot</span>
              <span class="text-lg font-bold text-gray-900 leading-none">${data.plot}</span>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${badgeColor}">${data.status}</span>
          </div>
          <div class="flex items-center gap-6">
            <div><span class="block text-[10px] uppercase text-gray-400 font-bold">Area</span><span class="block text-sm font-semibold text-gray-700">${data.area}</span></div>
            <div><span class="block text-[10px] uppercase text-gray-400 font-bold">Price</span><span class="block text-sm font-semibold text-gray-700">${data.price}</span></div>
            <div><span class="block text-[10px] uppercase text-gray-400 font-bold">Client</span><span class="block text-sm font-semibold text-violet-600 max-w-[150px] truncate">${data.clientName}</span></div>
          </div>
          <div class="pl-6 border-l border-gray-200 flex items-center gap-3">
            <div class="flex flex-col w-32">
              <div class="flex justify-between text-[10px] mb-1">
                <span class="text-gray-400 font-bold">PAYMENT</span>
                <span class="font-bold text-gray-900">${data.paymentPercentage}%</span>
              </div>
              <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div class="bg-violet-500 h-full rounded-full" style="width: ${data.paymentPercentage}%"></div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // --- RENDER LOGIC ---
    function render() {
      grid!.innerHTML = "";

      const renderer = getLayoutRenderer(project?.name);

      const utils = {
        placePlot,
        placeCell
      };

      try {
        renderer({ grid, dataMap, utils });
      } catch (error: any) {
        console.error("Error rendering layout:", error);
        grid!.innerHTML = `<div class="p-4 text-red-500">Error loading layout: ${error.message}</div>`;
      }

      updateDetailsBar(null);
    }

    render();
    return () => { if (grid) grid.innerHTML = ""; };
  }, [project, plots, router, projectId]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col project-layout-container">
      <div className="px-6 pt-4 shrink-0">
        <BackLink href="/projects" dirname="Projects" accent="violet" />
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{project.name}</h1>
          <span className="bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded text-xs font-medium">Layout View</span>
        </div>
      </div>

      <div className="px-6 shrink-0">
        <ProjectNav projectId={projectId} />
      </div>

      <div className="px-6 py-4 flex flex-wrap md:flex-nowrap items-center justify-between gap-4 md:gap-6 shrink-0 border-b border-gray-100 bg-white z-20 relative mt-4">
        <div className="flex flex-wrap items-center gap-4 md:gap-6 pr-0 md:pr-6 md:border-r border-gray-100 w-full md:w-auto">
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm border border-emerald-500 bg-white"></div><span className="text-xs font-medium text-gray-600">Available</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm border border-yellow-400 bg-yellow-50"></div><span className="text-xs font-medium text-gray-600">Token Paid</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm border border-rose-500 bg-rose-50"></div><span className="text-xs font-medium text-gray-600">Sold</span></div>
          {(project.name === 'Dholera Homes 3' || project.name?.toLowerCase().includes('aerotown residency')) && (
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm border border-slate-300 bg-slate-100"></div><span className="text-xs font-medium text-gray-600">Restricted</span></div>
          )}
        </div>
        <div ref={detailsBarRef} className="flex-1 w-full flex justify-start md:justify-end overflow-x-auto"></div>
      </div>

      <div className="flex-1 bg-white relative p-4 overflow-x-auto">
        <div className="fixed bottom-8 right-8 z-30 flex items-center gap-2 bg-white rounded-lg shadow-lg border border-gray-200 p-1">
          <button onClick={handleZoomOut} className="p-2 hover:bg-gray-100 rounded text-gray-600" disabled={scale <= 0.3}>-</button>
          <span className="px-2 text-xs font-bold text-gray-600">{Math.round(scale * 100)}%</span>
          <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100 rounded text-gray-600" disabled={scale >= 2.0}>+</button>
          <button onClick={handleResetZoom} className="p-2 hover:bg-gray-100 rounded text-xs font-medium text-gray-600 border-l ml-1 pl-2">Reset</button>
        </div>

        <div className="diamond-wrap" style={{ padding: '40px' }}>
          <div style={{ width: `${1400 * scale}px`, margin: '0 auto', transition: 'width 0.2s ease' }}>
            <div ref={gridRef} className="grid" style={{ width: '1400px', transform: `scale(${scale})`, transformOrigin: 'top left' }} id="grid"></div>
          </div>
        </div>
        <div ref={tooltipRef} className="tooltip"></div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .project-layout-container { --gap: 6px; --plot-radius: 3px; }
        .project-layout-container .diamond-wrap { width: 100%; min-height: 100%; display: flex; background-image: radial-gradient(#e5e7eb 1px, transparent 1px); background-size: 20px 20px; }
        .project-layout-container .grid { display: grid; grid-template-columns: repeat(40, 1fr); grid-auto-rows: 1fr; margin: 0; gap: var(--gap); transform-origin: top left; transition: transform 0.2s ease; }
        .project-layout-container .plot { display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); position: relative; border-width: 2px; border-style: solid; border-radius: var(--plot-radius); background-color: white; width: 100%; height: 100%; font-size: 12px; font-weight: 400; }
        .project-layout-container .plot:hover { transform: scale(1.15); z-index: 50; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .project-layout-container .status-available { background-color: #ffffff; border-color: #10b981; color: #10b981; }
        .project-layout-container .status-available:hover { background-color: #ecfdf5; color: #047857; }
        .project-layout-container .status-token { background-color: #fefce8; border-color: #eab308; color: #a16207; }
        .project-layout-container .status-partial { background-color: #fff7ed; border-color: #f97316; color: #c2410c; }
        .project-layout-container .status-sold { background-color: #fff1f2; border-color: #f43f5e; color: #be123c; }
        .project-layout-container .status-disabled { background-color: #f1f5f9; border-color: #cbd5e1; color: #94a3b8; cursor: not-allowed !important; opacity: 0.55; pointer-events: none; }
        .project-layout-container .status-disabled:hover { transform: none !important; box-shadow: none !important; }
        .project-layout-container .h-road, .project-layout-container .vertical-road { background: #f1f5f9; color: #64748b; font-size: 10px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: 800; border: 2px dashed #cbd5e1; }
        .project-layout-container .vertical-road { writing-mode: vertical-rl; transform: rotate(180deg); }
        .project-layout-container .vertical-road span { transform: rotate(0deg); white-space: nowrap; }
        .project-layout-container .wide-road { background: #e2e8f0; }
        .project-layout-container .bushes { background: #10b981; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: 700; }
        .project-layout-container .garden { background: #34d399; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: white; font-size: 11px; }
        .project-layout-container .common-plot { background: #22c55e; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: white; font-size: 9px; }
        .project-layout-container .entry-marker, .project-layout-container .entry-marker-dh { display: flex; align-items: center; justify-content: center; gap: 4px; color: #374151; font-weight: 800; font-size: 10px; }
        .project-layout-container .entry-marker { flex-direction: column; }
        .project-layout-container .entry-arrow { color: #f59e0b; font-size: 14px; animation: bounce 2s infinite; }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        .project-layout-container .tooltip { position: fixed; pointer-events: none; background: #1f2937; color: white; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; z-index: 100; transform: translate(-50%, -100%); white-space: nowrap; display: none; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
      ` }} />
    </div>
  );
}
