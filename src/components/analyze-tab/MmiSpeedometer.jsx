import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const MmiSpeedometer = () => {
  const [comparisonData, setComparisonData] = useState(null);
  const [comparisonValue, setComparisonValue] = useState(1);
  const [vix, setVix] = useState("");
  const [fma, setFma] = useState("");
  const [sma, setSma] = useState("");
  const [mmiValue, setMmiValue] = useState(0);
  const [comparisonLabeltext, setComparisonLabeltext] = useState("Comparison data");

  const comparisonChart = useRef(null);

  useEffect(() => {
    const config = {
      type: "bar",
      data: data,
      options: {
        animation: false,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    };
  
    comparisonChart.current = new Chart(document.getElementById("comparisonChart"), config);
    const fetchData = async () => {
      try {
        const response = await axios.get("https://stock-server-qag4.onrender.com/mmi");
        const mmiCurrentValue = response.data.data.currentValue;
        updateNeedle(mmiCurrentValue);
        setComparisonData(response.data.data);
        setVix("VIX: " + parseFloat(response.data.data.vix).toFixed(2));
        setSma("SMA: " + parseFloat(response.data.data.sma).toFixed(2));
        setFma("FMA: " + parseFloat(response.data.data.fma).toFixed(2));
        updateComparisonGraph(response.data.data);
      } catch (error) {
        console.log(error);
      }
    };
    
    //fetchData();
    //const interval = setInterval(fetchData, 30000);
    
    // return () => {
    //   clearInterval(interval);
    //   return () => {
    //     if (comparisonChart.current) {
    //       comparisonChart.current.destroy();
    //     }
    //   };
    // }
  }, []);
  
  useEffect(() => {
    if (comparisonData) {
      updateComparisonGraph();
    }
  }, [comparisonValue, comparisonData, comparisonLabeltext]);

  const handleComparisonChange = (e) => {
    setComparisonValue(e.target.value);
  };

  const updateNeedle = (value) => {
    const rotation = (value / 100) * 180;
    setMmiValue(parseFloat(value).toFixed(2));

    let label;
    if (value < 25) {
      label = "Extreme fear";
    } else if (value < 50) {
      label = "Fear";
    } else if (value < 75) {
      label = "Greed";
    } else {
      label = "Extreme greed";
    }
    document.querySelector(".speedometerLabel").innerHTML = label;
    document.querySelector(".needle").style.transform = `rotate(${rotation}deg)`;
  };

  const fetchComparisonData = () => {
    if (comparisonData) {
      switch (parseInt(comparisonValue)) {
        case 1:
          setComparisonLabeltext("FII comparison data");
          return [
            comparisonData.fii ? comparisonData.fii : 0,
            comparisonData.lastDay ? comparisonData.lastDay.fii : 0,
            comparisonData.lastWeek ? comparisonData.lastWeek.fii : 0,
            comparisonData.lastMonth ? comparisonData.lastMonth.fii : 0,
            comparisonData.lastYear ? comparisonData.lastYear.fii : 0,
          ];
        case 2:
          setComparisonLabeltext("Nifty comparison data");
          return [
            comparisonData.nifty ? comparisonData.nifty : 0,
            comparisonData.lastDay ? comparisonData.lastDay.nifty : 0,
            comparisonData.lastWeek ? comparisonData.lastWeek.nifty : 0,
            comparisonData.lastMonth ? comparisonData.lastMonth.nifty : 0,
            comparisonData.lastYear ? comparisonData.lastYear.nifty : 0,
          ];
        case 3:
          setComparisonLabeltext("Gold comparison data");
          return [
            comparisonData.gold ? comparisonData.gold : 0,
            comparisonData.lastDay ? comparisonData.lastDay.gold : 0,
            comparisonData.lastWeek ? comparisonData.lastWeek.gold : 0,
            comparisonData.lastMonth ? comparisonData.lastMonth.gold : 0,
            comparisonData.lastYear ? comparisonData.lastYear.gold : 0,
          ];
        default:
          return [];
      }
    }
    return [];
  };

  const updateComparisonGraph = () => {
    const data = fetchComparisonData();

    const backgroundColors = data.map((value) => (value < 0 ? "rgba(255, 0, 0, 0.2)" : "rgba(0, 255, 0, 0.2)"));
    const borderColors = data.map((value) => (value < 0 ? "rgba(255, 0, 0, 1)" : "rgba(0, 255, 0, 1)"));

    comparisonChart.current.data.datasets[0].data = data.map((value) => Math.abs(value));
    comparisonChart.current.data.datasets[0].backgroundColor = backgroundColors;
    comparisonChart.current.data.datasets[0].borderColor = borderColors;
    comparisonChart.current.data.datasets[0].label = comparisonLabeltext;
    comparisonChart.current.update();
  };

  const data = {
    labels: ["Today", "Yesterday", "Week", "Month", "Year"],
    datasets: [
      {
        label: comparisonLabeltext,
        data: [],
        backgroundColor: ["rgba(255, 26, 104, 0.2)", "rgba(54, 162, 235, 0.2)", "rgba(255, 206, 86, 0.2)", "rgba(75, 192, 192, 0.2)", "rgba(153, 102, 255, 0.2)"],
        borderColor: ["rgba(255, 26, 104, 1)", "rgba(54, 162, 235, 1)", "rgba(255, 206, 86, 1)", "rgba(75, 192, 192, 1)", "rgba(153, 102, 255, 1)"],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div id="meterConsole">
      <div className="wrapper">
        <div className="gauge" >
          <div className="slice-colors"></div>
          <div className="needle"></div>
          <div className="gauge-center" style={{backgroundColor:mmiValue<25? "#d10000": mmiValue < 50 ? "#eb6d36":mmiValue<75 ? "#aef4af": "#00a502" }}>
            <div className="number speedometerNumber">{mmiValue}</div>
            <div className="label speedometerLabel"></div>
          </div>
        </div>
        <div className="speedometer-hint">
          <span style={{ color: "red", borderRadius: "2px" }}>&#8598;&nbsp;Fear</span>
          <span style={{ color: "#babcc0", paddingLeft: "5px", paddingRight: "5px" }}>MMI Speedometer</span>
          <span style={{color: "#36b736", borderRadius: "2px"}}>Greed&nbsp;&#8599;</span>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-around", fontSize: "14px", color: "#778110fb", fontWeight: "500", marginBottom: "7px" }}>
        <span>{vix}</span><span>{fma}</span><span>{sma}</span>
      </div>
      <div id="comparisonDropdown">
        <label htmlFor="comparisonSelect">Compare</label>
        <select id="comparisonSelect" value={comparisonValue} onChange={handleComparisonChange}>
          <option value="1">FII</option>
          <option value="2">Nifty</option>
          <option value="3">Gold</option>
        </select>
      </div>
      <div className="chartCard">
        <div className="chartBox">
          <canvas id="comparisonChart"></canvas>
        </div>
      </div>
    </div>
  );
};

export default MmiSpeedometer;
