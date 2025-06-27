import React from 'react';

const CandlestickChart = ({
  rangeValue,
  timeframe, setTimeframe,
  tooltip, triggerTooltip,
  volumeAxis, triggerVolumeAxis,
  handleClose, handleRefresh,
  changeValueOnly, handleDownload,
  currentPrice, currentVol, graphTotalVol,
  stockName, chartToken
}) => {
  
  const rangeChange = (e) => {
    sessionStorage.setItem("pro-slider-value", e.target.value);
  };

  const handleChangeSlider = (e) => {
    changeValueOnly(e.target.value)
  }

  const handleTimeframeChange = (e) => {
    setTimeframe(e.target.value);
  };

  const handleTooltip = () => {
    sessionStorage.setItem('pro-tooltip', !tooltip);
    triggerTooltip(!tooltip);
  }

  const handleVolumeAxis = () => {
    sessionStorage.setItem('pro-volume-axis', !volumeAxis);
    triggerVolumeAxis(!volumeAxis);
  }

  return (
    <div id="main-graph" data-token={chartToken} data-vol="">
      <div id="control-bar">
        <span>
          <select name="timeframe" id="timeframe" value={timeframe} onChange={handleTimeframeChange}>
            <option value="0">2h</option>
            <option value="1">1d</option>
            <option value="2">1w</option>
            <option value="3">1m</option>
            <option value="4">6m</option>
            <option value="5">1Y</option>
          </select>
        </span>
        <label className="checkbox-container">
          <span>Tooltip</span>
          <input type="checkbox" id="tooltip-toggle" checked={tooltip} onChange={handleTooltip} />
          <span className="checkmark"></span>
        </label>
        <label className="checkbox-container">
          <span>Vol</span>
          <input type="checkbox" id="volume-axis-toggle" checked={volumeAxis} onChange={handleVolumeAxis} />
          <span className="checkmark"></span>
        </label>
        <label className="checkbox-container">
          <i className="fas fa-download" onClick={handleDownload} style={{color: "yellow", transform: "scale(1.3)"}}></i>
        </label>
        <label className="checkbox-container" onClick={handleRefresh}>
          <i class="fa-solid fa-rotate-right" style={{color: "#63E6BE", transform: "scale(1.3)"}}></i>
        </label>
        <div className="close-modal" id="candle-graph-close" onClick={handleClose}></div>
      </div>
      <div className="view-bar">
        <label style={{color: '#a2a2a2'}}>
          <span id="stock-name"></span>
        </label>
        <label style={{color: '#a2a2a2'}}>
          <span>Price: </span>
          <span>{currentPrice}</span>
        </label>
        <label style={{color: '#7e7eff'}}>
          <span>Last V: </span>
          <span>{currentVol}</span>
        </label>
        <label style={{color: '#00b9b9'}}>
          <span>Total V: </span>
          <span>{graphTotalVol}</span>
        </label>
      </div>
      <div id="candle-stick">
        <canvas id="candlestickChart"></canvas>
      </div>
      <div className="slidecontainer">
        <div className="graph-slider-text">
          <span>Candle number limit: </span>
          <span id="candle-number">{rangeValue}</span>
        </div>
        <input
          type="range"
          min="20"
          max="3000"
          value={rangeValue}
          className="graph-slider"
          id="candle-range"
          onChange={handleChangeSlider}
          onMouseUp={rangeChange} 
          onTouchEnd={rangeChange}
        />
      </div>
    </div>
  );
};

export default CandlestickChart;
