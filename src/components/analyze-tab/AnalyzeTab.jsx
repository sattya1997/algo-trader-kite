import React, { useState, useEffect } from "react";
import axios from "axios";
import MmiSpeedometer from "./MmiSpeedometer";

const AnalyzeTab = () => {
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortSelect, setSortSelect] = useState("11");
  const [selectedValue, setSelectedValue] = useState("9");

  const [showCopyMessage, setShowCopyMessage] = useState(false);

  useEffect(() => {
    loadAndCreate();
  }, [selectedValue, sortSelect]);

  const loadAndCreate = async () => {
    const url = `https://kite-server.onrender.com/api/mc?id=${selectedValue}`;
    try {
      var data = await axios.get(url);
      data = data.data;
      data = sortDataArray(data);
      setHoldings(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  function sortDataArray(dataArray) {
    switch (sortSelect) {
      case "9":
        // Sort by change % up
        return dataArray.sort(
          (a, b) => parseFloat(a.percentchange) - parseFloat(b.percentchange)
        );
      case "10":
        // Sort by change % down
        return dataArray.sort(
          (a, b) => parseFloat(b.percentchange) - parseFloat(a.percentchange)
        );
      case "11":
        // Sort by stock name
        return dataArray.sort((a, b) => a.shortname.localeCompare(b.shortname));
      case "12":
        // Sort by market cap
        return dataArray.sort(
          (a, b) =>
            parseFloat(a.mktcap.replace(/,/g, "")) -
            parseFloat(b.mktcap.replace(/,/g, ""))
        );
      case "13":
        // Sort by volume * price
        return dataArray.sort((a, b) => {
          const volumeA = convertToNumber(a.volume);
          const priceA = parseFloat(a.lastvalue.replace(/,/g, ""));
          const volumeB = convertToNumber(b.volume);
          const priceB = parseFloat(b.lastvalue.replace(/,/g, ""));
          return volumeA * priceA - volumeB * priceB;
        });
      default:
        return dataArray;
    }
  }

  function convertToNumber(value) {
    return parseFloat(value.replace(/,/g, ""));
  }

  const changeIndexSelectAndGet = (event) => {
    setSelectedValue(event.target.value);
  };

  const changeSortSelect = (event) => {
    setSortSelect(event.target.value);
  };

  const copyToken = () => {
    const textToCopy = localStorage.getItem('kite-userToken');

    navigator.clipboard.writeText(textToCopy).then(() => {
      setShowCopyMessage(true);
      setTimeout(() => {
        setShowCopyMessage(false);
      }, 1500)
    }).catch((err) => {
      console.error('Error copying text:', err);
    });
    
  };

  return (
    <div id="analyze-container-content">
      <MmiSpeedometer />
      <div className="market-index-data">
        <div id="marketDropdown">
          <div className="sub-dropdown">
            <label htmlFor="marketSelect">Index</label>
            <select
              id="marketSelect"
              value={selectedValue}
              onChange={changeIndexSelectAndGet}
            >
              <option value="9">Nifty 50</option>
              <option value="4">Sensex</option>
              <option value="28">Nifty 100</option>
              <option value="49">Nifty 200</option>
              <option value="7">Nifty 500</option>
              <option value="136">Nifty Total Market</option>
              <option value="120">Nifty Momentum 30</option>
              <option value="119">Nifty low volatility</option>
              <option value="112">Nifty Midcap 150</option>
              <option value="114">Nifty Smallcap 150</option>
              <option value="135">Nifty Microcap 250</option>
              <option value="126">Nifty OilGas</option>
              <option value="23">Nifty Bank</option>
              <option value="19">Nifty IT</option>
              <option value="52">Nifty Auto</option>
              <option value="123">Nifty Health</option>
              <option value="61">Nifty CPSE</option>
              <option value="50">Nifty Media</option>
              <option value="38">Nifty Energy</option>
              <option value="39">Nifty FMCG</option>
              <option value="42">Nifty PSE</option>
              <option value="41">Nifty Pharma</option>
              <option value="35">Nifty Infra</option>
              <option value="34">Nifty Realty</option>
              <option value="112">Nifty Quality 30</option>
            </select>
          </div>
          <div className="sub-dropdown">
            <label htmlFor="sortSelect">Sort</label>
            <select
              id="sortSelect"
              value={sortSelect}
              onChange={changeSortSelect}
            >
              <option value="9">Losers ▼</option>
              <option value="10">Gainers ▲</option>
              <option value="11">Stock name</option>
              <option value="12">Market cap</option>
              <option value="12">Vol * Price</option>
            </select>
          </div>
        </div>
        <div id="analyze-table-list">
          {loading ? (
            <div id="loading-message" style={{ color: "white" }}>
              Loading...
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Stock</th>
                  <th>Volume</th>
                  <th>Price</th>
                  <th>Capital</th>
                  <th>Chg</th>
                  <th>Chg %</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <a href={item.url}>{item.shortname}</a>
                    </td>
                    <td>{item.volume}</td>
                    <td
                      style={{
                        color: item.change > 0 ? "#009630" : "#e40000",
                        fontWeight: item.change > 0 ? "normal" : "500",
                      }}
                    >
                      <span>{item.lastvalue}</span>
                      <span>{item.change > 0 ? "\u2191" : "\u2193"}</span>
                    </td>
                    <td>{parseInt(item.mktcap.replace(/,/g, ""))}</td>
                    <td
                      style={{ color: item.change > 0 ? "#009630" : "#e40000" }}
                    >
                      {item.change}
                    </td>
                    <td
                      style={{ color: item.change > 0 ? "#009630" : "#e40000" }}
                    >
                      {item.percentchange}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="text-center"><button className="text-gray-800 mt-4 bg-emerald-400 font-semibold text-justify text-sm pl-2 pr-2 pt-0.5 pb-0.5 rounded-sm cursor-pointer hover:bg-cyan-300" onClick={copyToken}>Copy token</button></div>
        {showCopyMessage && <div className="text-lime-600">Token Copied</div>}
      </div>
    </div>
  );
};

export default AnalyzeTab;
