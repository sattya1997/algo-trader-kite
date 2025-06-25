import { useEffect, useRef, useState } from "react";
import { postRequest } from "../utility/config";

const AutoChart = ({ data, token }) => {
  const [chartCreated, setChartCreated] = useState(false);
  const userToken = localStorage.getItem("kite-userToken");
  const chartId = 'auto-chart-'+token

  const [candlestickChartData, setCandlestickChartData] = useState([]);
  var ctx = null;
  const chart = useRef(null);

  useEffect(() => {
    if (chartCreated && chart.current) {
      var newPrice = candlestickChartData[candlestickChartData.length - 1].c;
      var newVolumeData = candlestickChartData.map(item => {
        return { x: item.t, y: item.v };
      });
      var extraVolSize = parseInt(candlestickChartData.length / 4) + 1;
      var extraVol = [];
      const mul = 60000;
      for (let index = 1; index < extraVolSize; index++) {
        extraVol.push({
          x: candlestickChartData[candlestickChartData.length - 1].x + index * mul,
          y: "",
        });
      }

      chart.current.data.datasets[0].data = candlestickChartData;
      chart.current.data.datasets[1].data = [...newVolumeData, ...extraVol];
      chart.current.options.plugins.annotation.annotations.line1.yMin = newPrice;
      chart.current.options.plugins.annotation.annotations.line1.yMax = newPrice;
      chart.current.options.plugins.annotation.annotations.label1.content = newPrice;
      chart.current.options.plugins.annotation.annotations.label1.xValue = candlestickChartData[candlestickChartData.length - 1].x;
      chart.current.options.plugins.annotation.annotations.label1.yValue = newPrice;
      chart.current.update();
    }
  }, [candlestickChartData]);



  useEffect(() => {
    if (chartCreated && data.tk === parseInt(token) && data.lp && candlestickChartData.length > 0) {
      var newCandlestickData = [...candlestickChartData];
      var newDate = new Date();

      const minutes = newDate.getMinutes();
      const position = newCandlestickData.length - 1;
      const oldDate = new Date(newCandlestickData[position].x);
      newDate.setSeconds(oldDate.getSeconds());
      newDate.setMilliseconds(oldDate.getMilliseconds());
      const oldMinutes = oldDate.getMinutes();
      var hp = newCandlestickData[position].h;
      var lp = newCandlestickData[position].l;
      if (minutes === oldMinutes) {
        newCandlestickData[position].c = data.lp;
        if (parseFloat(data.lp) > parseFloat(hp)) {
          newCandlestickData[position].h = data.lp;
        }
        if (parseFloat(data.lp) < parseFloat(lp)) {
          newCandlestickData[position].l = data.lp;
        } 
      } else {
        const newObject = {
          x: newDate.getTime(),
          o: data.lp,
          h: data.lp,
          l: data.lp,
          c: data.lp,
        };
        newCandlestickData.push(newObject);
      }
      setCandlestickChartData(newCandlestickData);
    }
  }, [data]);

  useEffect(() => {
    createChart();
    getChartData();
  }, []);

  const createChart = () => {
    const chartContainerRef = document.getElementById("auto-chart-"+token);
    ctx = chartContainerRef.getContext("2d");
    if (chart.current) {
      chart.current.destroy();
    }
    chart.current = new Chart(ctx, {
      type: "candlestick",
      data: {
        labels: [],
        datasets: [
          {
            label: "price",
            data: null,
            yAxisID: "priceAxis",
            backgroundColor: "rgba(75, 192, 192, 1)",
          },
          {
            type: "bar",
            label: "Volume",
            data: null,
            yAxisID: "volumeAxis",
            backgroundColor: "rgba(140, 132, 255, 0.29)",
            barPercentage: 0.35,
            parsing: {
              yAxisKey: "y",
            },
          },
        ],
      },

      options: {
        animation: true,
        scales: {
          x: {
            backgroundColor: "",
          },
          priceAxis: {
            position: "left",
            backgroundColor: "rgb(0, 0, 0, 0)",
          },
          volumeAxis: {
            position: "right",
            display: false, // Hide the volume y-axis
            beginAtZero: true,
          },
        },
        plugins: {
          annotation: {
            annotations: {
              line1: {
                type: "line",
                yScaleID: "priceAxis",
                yMin: 0,
                yMax: 0,
                borderColor: "rgb(82, 93, 0)",
                borderWidth: 0.3,
              },
            },
          },
          backgroundColor: {
            color: "rgba(0, 0, 0, 1)", 
          },
          tooltip: {
            enabled: false,
          },
        },
      },
    });

    return () => {
      if (chart.current) {
        chart.current.destroy();
      }
    };
  }

  const getChartData = () => {
    const now = new Date();
    const et = now.toISOString().split("T")[0];
    const jData = {
      token: userToken,
      instrument_token: token,
      from: et,
      to: et,
      interval: "minute",
    };
    postRequest("TPSeries", jData)
      .then((res) => {
        var candlestickDataM = [];
        if (res && res.data && res.data.historicalData.length > 0) {
          var stockData = res.data.historicalData;
          let spliceNumber = 80;
          if (stockData.length < 50) {
            spliceNumber = stockData.length;
          }
          stockData = stockData.slice(-spliceNumber);
          candlestickDataM = stockData.map((item) => {
            var time = new Date(item.date);
            time = Math.floor(time.getTime() + 5.5 * 3600);
            const utcDate = new Date(time);
            const istOffset = 5.5 * 60;
            const istDate = new Date(utcDate.getTime() + istOffset * 60);
            return {
              t: istDate.getTime(),
              o: item.open,
              h: item.high,
              l: item.low,
              c: item.close,
            };
          });
          var newTimes = [];
          var newCandlestickData = [];
          var newVolumeData = [];

          for (let index = 0; index < candlestickDataM.length; index++) {
            const item = candlestickDataM[index];
            newCandlestickData.push({
              x: item.t,
              o: item.o,
              h: item.h,
              l: item.l,
              c: item.c,
            });
            newVolumeData.push({ x: item.t, y: '0' });
          }
          var extraVolSize = parseInt(newCandlestickData.length / 4) + 1;
          var extraVol = [];
          const mul = 60000;
          for (let index = 1; index < extraVolSize; index++) {
            extraVol.push({
              x:
                newCandlestickData[newCandlestickData.length - 1].x +
                index * mul,
              y: "",
            });
          }
          chart.current.data.labels = newTimes;
          chart.current.data.datasets[0].data = [...newCandlestickData];
          chart.current.data.datasets[1].data = [...newVolumeData, ...extraVol];
          var newPrice = newCandlestickData[newCandlestickData.length - 1].c;
          chart.current.options.plugins.annotation.annotations.line1 = {
            type: "line",
            yScaleID: "priceAxis",
            yMin: newPrice,
            yMax: newPrice,
            borderColor: "rgb(0, 195, 255)",
            borderWidth: 0.8,
            borderDash: [5, 5],
          };

          chart.current.options.plugins.annotation.annotations.label1 = {
            type: "label",
            xValue: newCandlestickData[newCandlestickData.length - 1].x,
            yValue: newPrice,
            backgroundColor: "rgba(58, 234, 88, 0.2)",
            borderColor: "rgba(0,0,0,0)",
            color: "rgb(224, 210, 210)",
            borderWidth: 0.1,
            borderRadius: 3,
            content: newPrice,
            font: { size: 10 },
            position: "center",
            xAdjust: 28,
          };

          chart.current.options.scales.priceAxis.ticks.color =
            "rgba(205, 205, 205, 0.6)";
          chart.current.options.scales.x.ticks.color =
            "rgba(205, 205, 205, 0.6)";
          chart.current.options.scales.x.grid = {
            color: "rgba(173, 151, 255, 0.1)",
          };
          chart.current.options.scales.priceAxis.grid = {
            color: "rgba(173, 151, 255, 0.1)",
          };
          //chart.current.options.animation = true;
          chart.current.update();
          setCandlestickChartData(newCandlestickData);
          setChartCreated(true);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });

      const convertToMilliseconds = (timeString) => {
        const [date, time] = timeString.split(" ");
        const [day, month, year] = date.split("-");
        const [hours, minutes, seconds] = time.split(":");
        const dateObj = new Date(year, month - 1, day, hours, minutes, seconds);
        return dateObj.getTime();
      }
  };

  return (
    <>
      <canvas id={chartId}></canvas>
    </>
  )
};

export default AutoChart;
