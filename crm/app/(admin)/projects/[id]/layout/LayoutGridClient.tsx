'use client';

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ProjectNav from "@/components/projects/ProjectNav";
import { getLayoutRenderer } from "./renderers";
import BackLink from "@/components/ui/BackLink";
import { DH3_ACTIVE_PLOTS, AEROTOWN_RESIDENCY_ACTIVE_PLOTS } from "@/lib/analytics/projectStats";

export default function LayoutGridClient({ project, plots }: { project: any, plots: any[] }) {
  const router = useRouter();
  const projectId = project.id;

  const gridRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const detailsBarRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(0.7);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.3));
  const handleResetZoom = () => setScale(0.7);

  useEffect(() => {
    const grid = gridRef.current;
    const tooltip = tooltipRef.current;
    const detailsBar = detailsBarRef.current;
    if (!grid || !tooltip || !detailsBar) return;

    // 1. Process Plot Data
    const dataMap: any = {};
    plots?.forEach((p: any) => {
      // Pick the most relevant active bookings
      const allBookings: any[] = p.bookings || [];
      const isSold = p.status === 'sold';
      
      let relevantBookings: any[] = [];
      if (isSold) {
        relevantBookings = allBookings.filter((b: any) => b.status === 'confirmed');
      } else {
        relevantBookings = allBookings.filter((b: any) => b.status === 'pending');
      }

      const mappedBookings = relevantBookings.map((b: any) => {
        const totalAmount = b.total_amount - (b.discount_amount || 0);
        const amountPaid = Number(b.amount_paid) || 0;
        const percent = totalAmount > 0 ? (amountPaid / totalAmount) * 100 : 0;
        
        let clientName = b.client?.name || "—";
        if (b.booking_partners && b.booking_partners.length > 0) {
            const partnerNames = b.booking_partners.map((bp: any) => bp.client?.name).filter(Boolean);
            if (partnerNames.length > 0) {
                clientName += ' + ' + partnerNames.join(', ');
            }
        }

        return {
          id: b.id,
          clientName: clientName,
          status: b.status,
          amountPaid: `₹${parseInt(String(amountPaid)).toLocaleString("en-IN")}`,
          paymentPercentage: Math.round(percent)
        };
      });

      const plotData = {
        plot: p.plot_number,
        area: p.area_sqyd ? `${p.area_sqyd} sq.yd` : "N/A",
        status: p.status === "sold" ? "Sold" :
            p.status === "fully_paid" ? "Fully Paid" :
            p.status === "token_paid" ? "Token Paid" : "Available",
        price: `₹${parseInt(String(p.price)).toLocaleString("en-IN")}`,
        colorClass:
          p.status === "sold" ? "status-sold" :
            p.status === "fully_paid" ? "status-fully-paid" :
            p.status === "token_paid" ? "status-token" : "status-available",
        bookings: mappedBookings
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

      const isAerotownResidency = project?.name?.toLowerCase().includes('aerotown residency') && !project?.name?.toLowerCase().includes('aerotown residency ii') && !project?.name?.toLowerCase().includes('aerotown residency 2');
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
          showTooltip(num, data, ev.clientX, rect.top + window.scrollY - 30);
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

    function showTooltip(num: any, data: any, x: number, y: number) {
      if (!tooltip) return;
      
      let badgeColor = "bg-gray-100 text-gray-800";
      if (data.status === 'Sold') badgeColor = "bg-rose-500 text-white";
      if (data.status === 'Available') badgeColor = "bg-emerald-500 text-white";
      if (data.status === 'Token Paid') badgeColor = "bg-amber-500 text-white";
      if (data.status === 'Fully Paid') badgeColor = "bg-purple-500 text-white";

      let bookingsHtml = "";
      if (data.bookings && data.bookings.length > 0) {
        bookingsHtml = `<div class="mt-3 pt-3 border-t border-gray-600 flex flex-col gap-2">
          ${data.bookings.map((b: any) => `
            <div class="flex items-center justify-between text-xs bg-gray-800 p-2 rounded border border-gray-600">
              <div class="flex flex-col gap-1">
                <span class="font-bold text-gray-100">${b.clientName}</span>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-gray-700 text-gray-300 w-max">${b.status}</span>
              </div>
              <div class="flex flex-col items-end gap-1">
                <span class="font-medium text-emerald-400">${b.amountPaid}</span>
                <span class="text-[10px] text-gray-400">${b.paymentPercentage}% paid</span>
              </div>
            </div>
          `).join('')}
        </div>`;
      } else if (data.status !== 'Available') {
        bookingsHtml = `<div class="mt-3 pt-3 border-t border-gray-600 text-xs text-gray-400 italic">No active negotiations</div>`;
      }

      tooltip.innerHTML = `
        <div class="flex flex-col min-w-[240px]">
          <div class="flex justify-between items-start mb-2">
            <div class="font-bold text-white text-sm">Plot ${num}</div>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${badgeColor}">${data.status}</span>
          </div>
          <div class="flex justify-between text-xs text-gray-300">
            <span>Area: <span class="text-white font-medium">${data.area}</span></span>
            <span>List Price: <span class="text-white font-medium">${data.price}</span></span>
          </div>
          ${bookingsHtml}
        </div>
      `;

      // Prevent tooltip from overflowing the viewport
      const tooltipRect = tooltip.getBoundingClientRect();
      const left = Math.min(x, window.innerWidth - (tooltipRect.width || 250) - 20);
      
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${y}px`;
      tooltip.style.display = "block";
    }

    function hideTooltip() {
      if (!tooltip) return;
      tooltip.style.display = "none";
    }

    function updateDetailsBar(data: any) {
      if (!detailsBar) return;
      detailsBar.innerHTML = `
        <div class="flex items-center gap-2 text-gray-400 text-sm">
          <span class="font-medium">Hover over any plot to view details</span>
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
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm border border-purple-500 bg-purple-50"></div><span className="text-xs font-medium text-gray-600">Fully Paid</span></div>
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
        .project-layout-container .status-fully-paid { background-color: #faf5ff; border-color: #a855f7; color: #7e22ce; }
        .project-layout-container .status-fully-paid:hover { background-color: #f3e8ff; color: #6b21a8; }
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
