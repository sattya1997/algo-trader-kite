import React, { useEffect, useState } from "react";
import axios from "axios";

const FiiDii = () => {
  const [data, setData] = useState(null);
  const [showNetValues, setShowNetValues] = useState(false);
  const [categoryNetValues, setCategoryNetValues] = useState({});

  const url = "https://api.stockedge.com/Api/FIIDashboardApi/GetLatestFIIActivities?lang=en";

  // Calculate net values
  const calculateNetValues = (data) => {
    const netValues = {};
    data.forEach((day) => {
      day.FIIDIIData.forEach((item) => {
        if (!netValues[item.ShortName]) {
          netValues[item.ShortName] = 0;
        }
        netValues[item.ShortName] += item.Value;
      });
    });
    return netValues;
  };

  const renderChart = (data) => {
    const container = document.getElementById("fii-dii-chart");
    container.innerHTML = "";
    if (!data || !data.length) {
      container.textContent = "No data available.";
      return;
    }

    // Find the max absolute value for normalization
    let maxAbs = 0;
    data.forEach((day) => {
      day.FIIDIIData.forEach((item) => {
        maxAbs = Math.max(maxAbs, Math.abs(item.Value));
        if (item.ChildData && item.ChildData.length) {
          item.ChildData.forEach((child) => {
            maxAbs = Math.max(maxAbs, Math.abs(child.Value));
          });
        }
      });
    });
    if (maxAbs === 0) maxAbs = 1;

    // Helper for color
    const getBarColor = (v) => (v >= 0 ? "#10b981" : "#ef4444");

    // SVG gradient defs
    const svgDefs = `
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.08"/>
        </filter>
      </defs>
    `;

    // Render each date
    data.forEach((day) => {
      const dateStr = new Date(day.Date).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const section = document.createElement("section");
      section.className = "fii-dii-section";
      section.innerHTML = `<h2 class="fii-dii-date">${dateStr}</h2>`;

      // Responsive chart width and sizing
      let chartWidth, barHeight, barGap, labelPad;

      if (window.innerWidth < 768) {
        chartWidth = 400;
        barHeight = 28;
        barGap = 16;
        labelPad = 8;
      } else if (window.innerWidth < 1200) {
        chartWidth = 600;
        barHeight = 26;
        barGap = 15;
        labelPad = 7;
      } else {
        chartWidth = 700;
        barHeight = 22;
        barGap = 13;
        labelPad = 6;
      }

      // Define quarters
      const leftQuarter = chartWidth * 0.25;
      const centerLine = chartWidth * 0.5;
      const rightQuarter = chartWidth * 0.75;
      const barMaxWidth = chartWidth * 0.25;

      // SVG chart for this date
      let svgContent = svgDefs;
      let y = 10;
      let svgHeight = 0;

      // For each FIIDIIData item
      day.FIIDIIData.forEach((item, idx) => {
        const normalizedValue = Math.abs(item.Value) / maxAbs;
        const barLength = Math.min(normalizedValue * barMaxWidth, barMaxWidth);

        let x;
        if (item.Value >= 0) {
          x = centerLine;
        } else {
          x = centerLine - barLength;
        }

        svgContent += `
          <g class="bar-group" data-tip="${item.Name}: ${item.Value.toLocaleString()}" tabindex="0">
            <rect x="${x}" y="${y}" width="${barLength}" height="${barHeight}" fill="${getBarColor(
          item.Value
        )}" filter="url(#shadow)"/>
            
            <text x="${leftQuarter - labelPad}" y="${
          y + barHeight / 2 + 5
        }" text-anchor="end" class="bar-label" fill="#8091aa">${
          item.ShortName
        }</text>
            
            <text x="${rightQuarter + labelPad}" y="${
          y + barHeight / 2 + 5
        }" text-anchor="start" class="bar-label">
              <tspan class="bar-value" fill="${
                item.Value > 0 ? "#10a981" : "#fe3d00"
              }">${
          item.Value > 0 ? "+" : ""
        }${item.Value.toLocaleString()}</tspan>
            </text>
          </g>
        `;
        y += barHeight + barGap;
        svgHeight = y;
      });

      // Add center line
      svgContent += `<line x1="${centerLine}" y1="0" x2="${centerLine}" y2="${svgHeight}" stroke="black" stroke-width=".5"/>`;

      section.innerHTML += `<div class="svg-chart-wrap"><svg viewBox="0 0 ${chartWidth} ${svgHeight}" class="fii-dii-svg">${svgContent}</svg></div>`;

      // Add ClosePrice summary
      if (day.ClosePrice && day.ClosePrice.length) {
        section.innerHTML += `<div class="close-price-wrap">${day.ClosePrice.map(
          (cp) =>
            `<span class="close-price"><b>${
              cp.Symbol
            }</b>: ${cp.C.toLocaleString()} <span class="cp-cz">(${
              cp.CZ > 0 ? "+" : ""
            }${cp.CZ})</span> <span class="cp-czg">${cp.CZG > 0 ? "+" : ""}${
              cp.CZG
            }%</span></span>`
        ).join("")}</div>`;
      }

      container.appendChild(section);
    });

    // Tooltip logic
    let tooltip = document.getElementById("bar-tooltip");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.id = "bar-tooltip";
      document.body.appendChild(tooltip);
    }
    tooltip.style.position = "fixed";
    tooltip.style.pointerEvents = "none";
    tooltip.style.zIndex = 9999;
    tooltip.style.display = "none";
    tooltip.className = "bar-tooltip";

    document.querySelectorAll(".bar-group").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        tooltip.textContent = el.getAttribute("data-tip");
        tooltip.style.display = "block";
        tooltip.style.left = e.clientX + 16 + "px";
        tooltip.style.top = e.clientY - 10 + "px";
      });
      el.addEventListener("mouseleave", () => {
        tooltip.style.display = "none";
      });
      el.addEventListener("focus", (e) => {
        tooltip.textContent = el.getAttribute("data-tip");
        tooltip.style.display = "block";
        tooltip.style.left = window.innerWidth / 2 + "px";
        tooltip.style.top = e.target.getBoundingClientRect().top - 20 + "px";
      });
      el.addEventListener("blur", () => {
        tooltip.style.display = "none";
      });
    });
  };

  useEffect(() => {
    const fetchFiiDiiData = async () => {
      try {
        const res = await axios.get(url);
        const data = res.data;
        setData(data);
        setCategoryNetValues(calculateNetValues(data));
        renderChart(data);
      } catch (error) {
        console.log(error);
      }
    };
    fetchFiiDiiData();
  }, []);

  return (
    <>
      {/* Net Values Button */}
      <div style={{ textAlign: "center", marginBottom: "5px" }}>
        <button
          onClick={() => setShowNetValues(!showNetValues)}
          className="net-fii-dii"
        >
          {showNetValues ? "Hide Net Values" : "Show Net Values"}
        </button>
      </div>

      {/* Net Values Section */}
      {showNetValues && (
        <div
          style={{
            background: "#151b23",
            border: "1px solid rgb(18, 22, 28)",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "24px",
            maxWidth: "900px",
            margin: "0 auto 24px auto",
          }}
        >
          <h3
            style={{
              margin: "0 0 12px 0",
              fontSize: "1.1rem",
              fontWeight: "600",
              color: "#597195",
              textAlign: "center",
            }}
          >
            Last {data.length} days net FII-DII Activity
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
            }}
          >
            {Object.entries(categoryNetValues).map(([category, netValue]) => (
              <div
                key={category}
                style={{
                  background: netValue >= 0 ? "#151b23" : "#eef2f2",
                  border: `1px solid ${netValue >= 0 ? "#21262d" : "#361c1c"}`,
                  borderRadius: "8px",
                  padding: "12px",
                  textAlign: "center",
                  fontWeight: "600",
                  color: netValue >= 0 ? "#166534" : "#dc2626",
                }}
              >
                <div style={{ fontSize: "0.9rem", marginBottom: "4px", color: "#64748b" }}>
                  {category}
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: "700" }}>
                  {netValue > 0 ? "+" : ""}{netValue.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div
        id="fii-dii-chart"
        style={{
          width: "100%",
          margin: "10px auto 0 auto",
          minWidth: "350px",
          marginLeft: "auto",
          marginRight: "auto",
          backgroundColor: "#1b1c2163",
        }}
      ></div>
    </>
  );
};

export default FiiDii;