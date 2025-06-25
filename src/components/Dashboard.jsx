import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { postRequest, getBalance, USER_TOKEN_KEY } from "./utility/config";
import TagPopup from "./dashboard-components/TagPopup";
import Tags from "./dashboard-components/Tags";
import SearchBox from "./dashboard-components/SearchBox";
import CandlestickChart from "./dashboard-components/CandlestickChart";
import Cards from "./dashboard-components/Cards";
import Orders from "./dashboard-components/Orders";
import AnalyzeTab from "./analyze-tab/AnalyzeTab";
import HoldingsTab from "./holdings-tab/HoldingsTab";
import WatchlistPopup from "./dashboard-components/WatchListPopup";
import Automation from "./automation-tab/Automation";
import PlaceOrder from "./dashboard-components/PlaceOrder";
import { updateCardBar } from "./utility/cardBar";
import MainLoader from "./MainLoader";
import { searchStockName } from "./utility/mapping";

const Dashboard = () => {
  const tKey = "kite-userToken";
  const [isShowPopup, setIsShowPopup] = useState(false);
  const [popupData, setPopupData] = useState({
    name: "",
    tokenId: null,
    orderTagRect: {},
  });
  const [chartInit, setChartInit] = useState(false);
  const [trigger, setTrigger] = useState({});
  const [depth, setDepth] = useState({});
  const [cardTokens, setCardTokens] = useState([]);
  const tagsRef = useRef(null);
  const ordersRef = useRef(null);
  const searchBoxRef = useRef(null);
  const automationRef = useRef(null);
  const navigate = useNavigate();
  const userToken = localStorage.getItem(tKey);
  const [watchListVisible, setWatchListVisible] = useState(false);

  const [showPlaceOrder, setShowPlaceOrder] = useState(false);
  const [orderType, setOrderType] = useState(null);
  const [placeOrderTokenId, setPlaceOrderTokenId] = useState(null);
  const [placeOrderSym, setPlaceOrderSym] = useState(null);

  //candle states
  const [stockSymbol, setStockSymbol] = useState("");
  const sliderValueOld = sessionStorage.getItem("pro-slider-value");
  const [rangeValue, setRangeValue] = useState(
    parseInt(sliderValueOld) >= 20 ? parseInt(sliderValueOld) : 100
  );
  const [timeframe, setTimeframe] = useState("0");
  const [tooltip, setTooltip] = useState(
    sessionStorage.getItem("pro-tooltip") === "true" ? true : false
  );
  const [volumeAxis, setVolumeAxis] = useState(
    sessionStorage.getItem("pro-volume-axis") === "true" ? true : false
  );

  const [triggerGetWatchList, setTriggerGetWatchList] = useState(false);

  const [showLoader, setShowLoader] = useState(true);
  const [profileInitial, setProfileInitial] = useState("");
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const overlayRef = useRef(null);
  
  const oldVRef = useRef(0);
  const uVRef = useRef(-1);
  var ctx = null;
  const chart = useRef(null);

  // Chart UI values in state
  const [currentPrice, setCurrentPrice] = useState(0);
  const [currentVol, setCurrentVol] = useState(0);
  const [graphTotalVol, setGraphTotalVol] = useState(0);

  //tab handle
  const [activeTab, setActiveTab] = useState(1);
  const [canLoadComponents, setCanLoadComponents] = useState(false);
  const [userData, setUserData] = useState({});

  const [placeOrderRect, setPlaceOrderRect] = useState({ left: 0, top: 0 });

  // Debounce ref for chart updates
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (showProfileDetails) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileDetails]);

  useEffect(() => {
    if (canLoadComponents && userData) {
      setTriggerGetWatchList(true);
      let uname = userData.uname;
      uname = uname.split(" ");
      let initial = "";
      uname.forEach((element) => {
        initial = initial + element[0];
      });
      setProfileInitial(initial);
      getBalance(userToken);
      if (ordersRef.current) {
        ordersRef.current.getOrders();
      }
      let ordersTag = document.getElementById("orders-tag");
      const handleOrderTagClick = (event) => {
        let orderTag = event.target.closest(".order-tag");
        if (orderTag) {
          let tokenId = orderTag.dataset.token;
          let name = orderTag.dataset.name;
          let rect = orderTag.getBoundingClientRect();
          setPopupData({ name, tokenId, orderTagRect: rect });
          setIsShowPopup(true);
        }
      };
      if (ordersTag) {
        ordersTag.removeEventListener("click", handleOrderTagClick);
        ordersTag.addEventListener("click", handleOrderTagClick);
      }
    }
  }, [canLoadComponents, userData]);

  useEffect(() => {
    if (chart.current && stockSymbol !== "") {
      chart.current.options.scales.volumeAxis.display = volumeAxis;
      chart.current.update();
    }
  }, [volumeAxis]);

  useEffect(() => {
    if (chart.current && stockSymbol !== "") {
      chart.current.options.plugins.tooltip.enabled = tooltip;
      chart.current.update();
    }
  }, [tooltip]);

  useEffect(() => {
    if (chart.current && stockSymbol !== "") {
      // Debounce getCandlestickChartData
      const handler = setTimeout(() => {
        getCandlestickChartData(stockSymbol);
      }, 1000);
      return () => clearTimeout(handler);
    }
  }, [timeframe, rangeValue]);

  useEffect(() => {
    let tab = sessionStorage.getItem("tab-number");
    if (tab) {
      setActiveTab(parseInt(tab));
    } else {
      setActiveTab(1);
    }

    if (!userToken) {
      navigate("/login");
    } else {
      try {
        postRequest("userDetails", { token: userToken })
          .then((res) => {
            if (
              res &&
              res.data &&
              res.data.status &&
              res.data.status === "success"
            ) {
              setCanLoadComponents(true);
              setUserData({
                uname: res.data.data.user_name,
                uid: res.data.data.user_id,
              });
              createChartOptions();
            } else {
              localStorage.removeItem(tKey);
              navigate("/login");
            }
          })
          .catch((error) => {
            console.error("Error:", error);
            alert("Some errors happened. Please login again");
            localStorage.removeItem(tKey);
            navigate("/login");
          });
      } catch (error) {
        localStorage.removeItem(tKey);
        navigate("/login");
      }
    }

    return () => {
      if (chart.current) {
        chart.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (
      document.getElementById("main-graph").style.display === "block" &&
      trigger.lp
    ) {
      let time = new Date();
      let marketEndTime = new Date(time);
      marketEndTime.setHours(15, 31, 0, 0);
      let marketStartTime = new Date(time);
      marketStartTime.setHours(9, 15, 0, 0);

      if (
        parseInt(stockSymbol) === parseInt(trigger.tk) &&
        marketStartTime < time &&
        marketEndTime > time &&
        !chartInit
      ) {
        if (trigger.tk.toString() === "256265") {
          updateNiftyCandle(trigger);
        } else {
          updateCandleStick(trigger);
        }
      }
    }
    if (document.getElementById("card-" + trigger.tk)) {
      try {
        refreshCardData(trigger);
      } catch (error) {
        console.log(error);
      }
      
    }
  }, [trigger, rangeValue, stockSymbol]);

  useEffect(() => {
    if (document.getElementById("card-" + trigger.tk)) {
      refreshCardData(trigger);
    }
  }, [depth]);

  const createChartOptions = () => {
    let chartContainerRef = document.getElementById("candlestickChart");
    ctx = chartContainerRef.getContext("2d");
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
          backgroundColor: {},
          tooltip: {
            enabled: tooltip,
          },
        },
      },
    });
  };

  function exportCandleGraph() {
    let link = document.createElement("a");
    if (chart.current) {
      link.href = chart.current.toBase64Image();
      let date = Math.floor(Date.now() / 1000);
      link.download = "candle_chart" + "_" + date + ".png";
      link.click();
    }
  }

  const handleNewMessage = (message) => {
    setTrigger(message);
  };

  const handleNewDepth = (message) => {
    setDepth(message);
  };

  function refreshCardData(data) {
    let token = data.tk;
    if (!token) {
      return;
    }

    let card = document.getElementById("card-" + token);
    if (!card) {
      console.log("Card not found", data);
      return;
    }
    let elements = {
      lastPrice: document.getElementById(`${token}-last-price`),
      open: document.getElementById(`${token}-open`),
      change: document.getElementById(`${token}-change`),
      volume: document.getElementById(`${token}-vol`),
      ltq: document.getElementById(`${token}-ltq`),
      ltt: document.getElementById(`${token}-ltt`),
      avgPrice: document.getElementById(`${token}-avg-price`),
      high: document.getElementById(`${token}-high`),
      low: document.getElementById(`${token}-low`),
      close: document.getElementById(`${token}-prev-close`),
    };

    let curPrice = data.lp || 0;
    let openPrice = data.closePrice || data.openPrice || 0;
    let highPrice = data.h || 0;
    let lowPrice = data.l || 0;

    if (!elements.open.textContent && data && data.openPrice) {
      elements.open.textContent = data.openPrice;
    }

    if (!elements.close.textContent && data && data.closePrice) {
      elements.close.textContent = data.closePrice;
    }

    if (data.lp) {
      elements.lastPrice.textContent = data.lp;
      elements.lastPrice.parentNode.style.color =
        data.lp > openPrice
          ? "rgba(151, 255, 236, 0.86)"
          : "rgba(255, 157, 157, 0.9)";
    }

    if (data.pc) {
      const changeValue = openPrice + (data.pc * openPrice) / 100;
      const change = (changeValue - openPrice).toFixed(2);
      elements.change.innerText = `${change} (${data.pc.toFixed(2)}%)`;
      elements.change.parentNode.style.color =
        data.pc > 0 ? "rgba(151, 255, 236, 0.86)" : "rgba(255, 157, 157, 0.9)";
    }

    if (data.v) elements.volume.innerText = data.v;
    if (data.lastTradedQuantity)
      elements.ltq.innerText = data.lastTradedQuantity;
    if (data.lastTradeTime) {
      let date = new Date(data.lastTradeTime * 1000);
      date =
        date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
      elements.ltt.innerText = date;
    }
    if (data.averagePrice) elements.avgPrice.innerText = data.averagePrice;
    if (data.h) elements.high.innerText = data.h;
    if (data.l) elements.low.innerText = data.l;

    updateLevels(data.depth);
    document.getElementById(
      `${token}-total-buy-price`
    ).innerHTML = `Total: ${data.totalBuyQuantity}`;
    document.getElementById(
      `${token}-total-sell-price`
    ).innerHTML = `Total: ${data.totalSellQuantity}`;

    // Update bar
    if (!curPrice) curPrice = parseFloat(elements.lastPrice?.innerHTML || 0);
    if (!highPrice) highPrice = parseFloat(elements.high?.innerHTML || 0);
    if (!lowPrice) lowPrice = parseFloat(elements.low?.innerHTML || 0);

    updateCardBar(card, openPrice, curPrice, highPrice, lowPrice);

    function updateLevels(data) {
      for (let i = 0; i <= 4; i++) {
        updateElement(
          `buy-price-${i}`,
          data.buy[i].price,
          data.buy[i].quantity
        );
        updateElement(
          `sell-price-${i}`,
          data.sell[i].price,
          data.sell[i].quantity
        );
      }
    }

    function updateElement(suffix, price, quantity) {
      let element = document.getElementById(`${token}-${suffix}`);
      if (!element) return;
      let [currentPrice, currentQuantity] = element.innerText.split(" × ");
      let newPrice =
        price !== null && price !== undefined ? price : currentPrice;
      let newQuantity =
        quantity !== null && quantity !== undefined
          ? quantity
          : currentQuantity;
      element.innerText = `${newPrice} × ${newQuantity}`.trim();
    }
  }

  function updateNiftyCandle(data) {
    try {
      if (chart.current && data.lp) {
        let newCandlestickData = chart.current.data.datasets[0].data;
        let newPrice = data.lp;
        if (newCandlestickData.length > 1) {
          let newDate = new Date();
          let minutes = newDate.getMinutes();
          let position = newCandlestickData.length - 1;
          let oldDate = new Date(newCandlestickData[position].x);
          newDate.setSeconds(oldDate.getSeconds());
          newDate.setMilliseconds(oldDate.getMilliseconds());
          let oldMinutes = oldDate.getMinutes();

          let hp = newCandlestickData[position].h;
          let lp = newCandlestickData[position].l;

          if (minutes === oldMinutes) {
            newCandlestickData[position].c = data.lp;
            if (parseFloat(data.lp) > parseFloat(hp)) {
              newCandlestickData[position].h = data.lp;
            }
            if (parseFloat(data.lp) < parseFloat(lp)) {
              newCandlestickData[position].l = data.lp;
            }
          } else {
            let newObject = {
              x: newDate.getTime(),
              o: data.lp,
              h: data.lp,
              l: data.lp,
              c: data.lp,
              v: "0",
            };
            newCandlestickData.push(newObject);
          }

          chart.current.data.datasets[0].data = newCandlestickData;
          chart.current.options.plugins.annotation.annotations.line1.yMin =
            newPrice;
          chart.current.options.plugins.annotation.annotations.line1.yMax =
            newPrice;
          chart.current.options.plugins.annotation.annotations.label1.content =
            newPrice;
          chart.current.options.plugins.annotation.annotations.label1.xValue =
            newCandlestickData[newCandlestickData.length - 1].x;
          chart.current.options.plugins.annotation.annotations.label1.yValue =
            newPrice;
          chart.current.update('none'); // No animation for live update
          setCurrentPrice(newCandlestickData[newCandlestickData.length - 1].c);
        }
      }
    } catch (error) {
      console.log("SOme error happened during updaing the nifty chart", error);
    }
  }

  function updateCandleStick(data) {
    try {
      let token = document.getElementById("main-graph").dataset.token;
      if (parseInt(data.tk) === parseInt(token)) {
        let candlesticks = chart.current.data.datasets[0].data;
        let volumeData = chart.current.data.datasets[1].data;
        let lastIndex = candlesticks.length - 1;

        let extraVolSize = parseInt(rangeValue / 3.5) + 1;
        let newPrice = data.lp;
        let newTime = new Date(data.exchangeTimestamp * 1000);
        let oldTime = new Date(candlesticks[lastIndex].x);

        newTime.setSeconds(oldTime.getSeconds());
        newTime.setMilliseconds(oldTime.getMilliseconds());

        let isSameMinute = newTime.getMinutes() === oldTime.getMinutes();

        if (newPrice || data.v) {
          if (isSameMinute) {
            // Updating existing candle
            if (newPrice) {
              candlesticks[lastIndex].c = newPrice;
              if (
                parseFloat(newPrice) > parseFloat(candlesticks[lastIndex].h)
              ) {
                candlesticks[lastIndex].h = newPrice;
              }
              if (
                parseFloat(newPrice) < parseFloat(candlesticks[lastIndex].l)
              ) {
                candlesticks[lastIndex].l = newPrice;
              }
            }

            if (data.v) {
              if (uVRef.current === -1) {
                uVRef.current = parseInt(data.v);
                volumeData[lastIndex].y = oldVRef.current;
              } else {
                let newV = parseInt(data.v) - uVRef.current;
                if (newV < 0) newV = 0;
                let updatedVol = newV + oldVRef.current;
                volumeData[lastIndex].y = updatedVol;
                oldVRef.current = updatedVol;
                uVRef.current = data.v;
              }
            }
          } else {
            // Push new candle
            let newCandle = {
              x: newTime.getTime(),
              o: newPrice,
              h: newPrice,
              l: newPrice,
              c: newPrice,
            };
            candlesticks.push(newCandle);
            // Add new volume bar for the new candle
            volumeData.push({ x: newTime.getTime(), y: 0 });
            oldVRef.current = 0;
          }
        }

        // Extend volume data
        let futureVol = [];
        let minuteMs = 60000;
        let lastTime = candlesticks[candlesticks.length - 1].x;

        for (let i = 1; i < extraVolSize; i++) {
          futureVol.push({ x: lastTime + i * minuteMs, y: 0 });
        }

        // Only update the chart's data arrays if a new candle or volume bar was added
        chart.current.data.datasets[0].data = candlesticks;
        chart.current.data.datasets[1].data = [...volumeData, ...futureVol];

        // Update price annotation safely
        if (chart.current?.options?.plugins?.annotation?.annotations?.line1) {
          chart.current.options.plugins.annotation.annotations.line1.yMin =
            newPrice;
          chart.current.options.plugins.annotation.annotations.line1.yMax =
            newPrice;
        }
        if (chart.current?.options?.plugins?.annotation?.annotations?.label1) {
          chart.current.options.plugins.annotation.annotations.label1.content =
            newPrice;
          chart.current.options.plugins.annotation.annotations.label1.xValue =
            lastTime;
          chart.current.options.plugins.annotation.annotations.label1.yValue =
            newPrice;
        }

        chart.current.update('none'); // No animation for live update

        // Update UI state
        setCurrentPrice(candlesticks[candlesticks.length - 1].c);
        setCurrentVol(oldVRef.current);
        if (data.v) setGraphTotalVol(data.v);
      }
    } catch (error) {
      console.error("Error while updating the chart:", error);
    }
  }

  function triggerSubscribeTouchline(data) {
    if (tagsRef.current) {
      tagsRef.current.triggerSubscribeTouchline(data);
    }
  }

  function refreshOrders(data) {
    if (ordersRef.current) {
      ordersRef.current.updateLtp(data);
    }
  }

  async function getCandlestickChartData(symbol) {
    if (chart.current) {
      chart.current.data.datasets[0].data = [];
      chart.current.data.datasets[1].data = [];
    }
    setTrigger({});
    const now = new Date();
    const marketEndTime = new Date(now);
    marketEndTime.setHours(15, 30, 0, 0);
    const morningLimit = new Date(now);
    morningLimit.setHours(9, 35, 0, 0);
    let endTime;
    let startTime;
    if (now < morningLimit) {
      if (now.getDay() === 1) {
        endTime = new Date(now);
        endTime.setDate(now.getDate() - 3);
        startTime = new Date(endTime);
        endTime = new Date(now);
      } else {
        endTime = new Date(now);
        endTime.setDate(now.getDate() - 1);
        startTime = new Date(endTime);
        endTime = new Date(now);
      }
    } else {
      endTime = now > marketEndTime ? marketEndTime : now;
      startTime = new Date(endTime);
    }
    let type = document.getElementById("timeframe").value;
    let dayValue = 0;
    let intr = "minute";

    if (type !== "0") {
      if (type === "2") {
        dayValue = 7;
        intr = "15minute";
      }

      if (type === "3") {
        dayValue = 30;
        intr = "30minute";
      }
      if (type === "4") {
        dayValue = 180;
        intr = "60minute";
      }
      if (type === "5") {
        dayValue = 365;
        intr = "day";
      }
      startTime.setDate(endTime.getDate() - dayValue);
    }

    let et = endTime.toISOString().split("T")[0];
    let st = startTime.toISOString().split("T")[0];
    let jData = {
      token: userToken,
      instrument_token: symbol,
      from: st,
      to: et,
      interval: intr,
    };

    postRequest("TPSeries", jData)
      .then((res) => {
        let candlestickDataM = [];
        if (res && res.data && res.data.historicalData.length > 0) {
          let stockData = res.data.historicalData;
          stockData = stockData.slice(-rangeValue);
          let totalVol = 0;
          candlestickDataM = stockData.map((item) => {
            let time = new Date(item.date);
            time = Math.floor(time.getTime() + 5.5 * 3600);
            let utcDate = new Date(time);
            // Convert to IST (UTC + 5:30)
            let istOffset = 5.5 * 60; // in minutes
            const istDate = new Date(utcDate.getTime() + istOffset * 60);
            totalVol = totalVol + parseInt(item.volume);
            return {
              t: istDate.getTime(),
              o: item.open,
              h: item.high,
              l: item.low,
              c: item.close,
              v: item.volume,
              vol: item.volume,
            };
          });

          oldVRef.current = parseInt(stockData[stockData.length - 1].volume);
          let timeoutId = setTimeout(() => {
            let msgElement = document.getElementById("msg");
            msgElement.style.opacity = "0";
          }, 1500);
          let newTimes = [];
          let newCandlestickData = [];
          let newVolumeData = [];
          let volumeColors = [];
          for (let index = 0; index < candlestickDataM.length; index++) {
            let item = candlestickDataM[index];
            newCandlestickData.push({
              x: item.t,
              o: item.o,
              h: item.h,
              l: item.l,
              c: item.c,
            });
            newVolumeData.push({ x: item.t, y: item.v });

            // Determine color based on whether volume increased or decreased
            if (index > 0 && item.v > candlestickDataM[index - 1].v) {
              volumeColors.push("rgba(75, 192, 192, .35)");
            } else {
              volumeColors.push("rgba(255, 99, 132, .35)");
            }
            newTimes.push(item.t);
          }
          chart.current.data.labels = newTimes;
          chart.current.data.datasets[0].data = [...newCandlestickData];
          chart.current.data.datasets[1].data = [...newVolumeData];
          chart.current.data.datasets[1].backgroundColor = volumeColors;

          let extraVolSize = parseInt(rangeValue / 3.5) + 1;
          let extraVol = [];
          let mul = 60000;
          for (let index = 1; index < extraVolSize; index++) {
            extraVol.push({
              x:
                newCandlestickData[newCandlestickData.length - 1].x +
                index * mul,
              y: "",
            });
          }
          chart.current.data.datasets[1].data = [...newVolumeData, ...extraVol];
          let newPrice = newCandlestickData[newCandlestickData.length - 1].c;
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
            backgroundColor: "rgba(58, 234, 88, 0.3)",
            borderColor: "rgba(0,0,0,0)",
            color: "rgb(224, 210, 210)",
            borderWidth: 0.1,
            borderRadius: 3,
            content: newPrice,
            font: { size: 12 },
            position: "center",
            xAdjust: 33,
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
          chart.current.update();
          candlestickVisible();
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }

  async function refreshCandleChart() {
    await getCandlestickChartData(stockSymbol);
  }

  const changeValueOnly = useCallback((value) => {
    setRangeValue(value);
  }, []);

  const handleBuy = useCallback(async (tokenId) => {
    const clickedItem = document.getElementById("order-" + tokenId);
    if (clickedItem) {
      const rect = clickedItem.getBoundingClientRect();
      setPlaceOrderRect({ left: rect.left, top: rect.top });
    } else {
      setPlaceOrderRect({ left: 50, top: 300 });
    }
    const sym = searchStockName(tokenId);
    setPlaceOrderTokenId(tokenId);
    setPlaceOrderSym(sym);
    setOrderType("buy");
    setShowPlaceOrder(true);
    closeDynamicPopup();
  }, []);

  const handleSell = useCallback(async (tokenId) => {
    const clickedItem = document.getElementById("order-" + tokenId);
    if (clickedItem) {
      const rect = clickedItem.getBoundingClientRect();
      setPlaceOrderRect({ left: rect.left, top: rect.top });
    }
    const sym = searchStockName(tokenId);
    setPlaceOrderSym(sym);
    setPlaceOrderTokenId(tokenId);
    setOrderType("sell");
    setShowPlaceOrder(true);
    closeDynamicPopup();
  }, []);

  const hidePlaceOrder = () => {
    setShowPlaceOrder(false);
  };

  function closeDynamicPopup() {
    setIsShowPopup(false);
  }

  function addToDetailsList(token, name = null) {
    setCardTokens((prevTokens) => {
      if (
        prevTokens.find((oldToken) => parseInt(oldToken) === parseInt(token))
      ) {
        return prevTokens;
      } else return [...prevTokens, token];
    });
    closeDynamicPopup();
    if (name) {
      triggerSubscribeTouchline({ token: token, tsym: name });
    }
  }

  async function setData(symbol, stockElement) {
    setChartInit(true);
    uVRef.current = -1;
    oldVRef.current = 0;
    await getCandlestickChartData(symbol);
    const stockName = stockElement.dataset.name;
    if (stockName) {
      triggerSubscribeTouchline({ token: symbol, tsym: stockName });
    }

    if (stockName && stockName.length > 0) {
      document.getElementById("stock-name").innerHTML = stockName;
    }
    setStockSymbol(symbol);
    const element = document.getElementById("main-graph");
    element.dataset.token = symbol;
    closeDynamicPopup();
    setChartInit(false);
  }

  async function getNiftyChart() {
    candlestickVisible();
    const stockName = "Nifty 50";
    const symbol = "256265";
    document.getElementById("stock-name").innerHTML = stockName;
    setStockSymbol(symbol);
    const element = document.getElementById("main-graph");
    element.dataset.token = symbol;
    await getCandlestickChartData(symbol);
  }

  function candlestickVisible() {
    document.getElementById("main-graph").style.display = "block";
  }

  function handleCandleChartClose() {
    document.getElementById("main-graph").style.display = "none";
  }

  const handleSearchContainerBtnClick = useCallback((eventType, token, name = "") => {
    if (searchBoxRef.current) {
      searchBoxRef.current.closeSearchList();
    }
    if (eventType === "buy") {
      handleBuy(token);
    }
    if (eventType === "sell") {
      handleSell(token);
    }

    if (eventType === "card") {
      addToDetailsList(token, name);
    }

    if (eventType === "chart") {
      setData(token, { dataset: { name: name } });
    }
  }, [handleBuy, handleSell]);

  const closeCard = useCallback((token) => {
    setCardTokens(
      cardTokens.filter((oldToken) => parseInt(oldToken) != parseInt(token))
    );
  }, []);

  const handleGetOrders = useCallback(() => {
    ordersRef.current.getOrders();
  }, []);

  const setActiveTabFromClick = useCallback((tab) => {
    setActiveTab(tab);
    sessionStorage.setItem("tab-number", tab);
  }, []);

  const showEditWatchList = useCallback(() => {
    setWatchListVisible(true);
    document.getElementById("body").classList.add("blur");
  }, []);

  const closeWatchList = useCallback(() => {
    setWatchListVisible(false);
    document.getElementById("body").classList.remove("blur");
  }, []);

  const setAutomationData = useCallback((data) => {
    if (automationRef.current) {
      automationRef.current.updateAutomationDataFromOrders(data);
    }
  }, []);

  const logoutUser = useCallback(() => {
    setCanLoadComponents(false);
    localStorage.removeItem(USER_TOKEN_KEY);
    navigate("/login");
  }, [navigate]);

  const triggerChartFromCard = useCallback((token, name) => {
    setData(token, { dataset: { name: name } });
  }, []);

  const hideLoadingPage = useCallback(() => {
    setTimeout(() => {
      setShowLoader(false);
    }, 1000);
  }, []);

  const showExtendedProfile = useCallback(() => {
    setShowProfileDetails(show => !show);
  }, []);

  const handleClickOutside = useCallback((event) => {
    if (overlayRef.current && !overlayRef.current.contains(event.target)) {
      setShowProfileDetails(false);
    }
  }, []);

  const triggerDepth = useCallback((data) => {
    triggerSubscribeTouchline(data);
  }, []);

  return (
    <section>
      {watchListVisible && (
        <WatchlistPopup
          closeWatchList={closeWatchList}
          triggerTouchLine={triggerSubscribeTouchline}
        />
      )}
      {showLoader && (
        <div className="loader-section">
          <MainLoader />
        </div>
      )}
      <div
        ref={overlayRef}
        className={`user-profile-extended ${showProfileDetails ? "show" : ""}`}
        id="user-profile-extended"
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span>{userData.uid}</span>
            <span>{userData.uname}</span>
            <span id="nav-bar-total-cash">Loading...</span>
            <span id="nav-bar-cash-balance"></span>
            <span id="nav-bar-pl"></span>
            <button id="logout-btn" onClick={logoutUser}>
              Logout
            </button>
          </div>
          <span
            className="close-modal px-1 py-2"
            id="profile-close-btn"
            onClick={showExtendedProfile}
          ></span>
        </div>
      </div>
      <div id="body">
        <div id="nav-bar">
          <span
            className="user-profile"
            id="user-profile"
            onClick={showExtendedProfile}
          >
            {profileInitial}
          </span>
          <span>
            <div className="tabs">
              <button
                className={`tab-button ${activeTab === 1 ? "active" : ""}`}
                onClick={() => setActiveTabFromClick(1)}
              >
                Home
              </button>
              <button
                className={`tab-button ${activeTab === 2 ? "active" : ""}`}
                onClick={() => setActiveTabFromClick(2)}
              >
                Analyze
              </button>
              <button
                className={`tab-button ${activeTab === 3 ? "active" : ""}`}
                onClick={() => setActiveTabFromClick(3)}
              >
                Holdings
              </button>
              <button
                className={`tab-button ${activeTab === 4 ? "active" : ""}`}
                onClick={() => setActiveTabFromClick(4)}
              >
                Automation
              </button>
            </div>
          </span>
        </div>
        <div id="main-container">
          <div
            id="home"
            style={{ display: activeTab === 1 ? "block" : "none" }}
          >
            <div id="home-container">
              <div id="table-list"></div>
              <ul id="trade-list"></ul>
              <div className="orders-list" id="main-orders-list">
                <div id="left-components">
                  <SearchBox
                    handleBtnClick={handleSearchContainerBtnClick}
                    ref={searchBoxRef}
                  />
                  {canLoadComponents && (
                    <Tags
                      handleNewMessage={handleNewMessage}
                      handleNewDepth={handleNewDepth}
                      getOrders={handleGetOrders}
                      getNiftyChart={getNiftyChart}
                      ref={tagsRef}
                      editWatchList={showEditWatchList}
                      triggerGetWatchList={triggerGetWatchList}
                      hideLoadingPage={hideLoadingPage}
                    />
                  )}
                  {showPlaceOrder && (
                    <PlaceOrder
                      orderType={orderType}
                      hidePlaceOrder={hidePlaceOrder}
                      placeOrderTokenId={placeOrderTokenId}
                      placeOrderRect={placeOrderRect}
                      placeOrderSym={placeOrderSym}
                    />
                  )}
                  <p id="msg">Success</p>
                </div>
                <div id="right-components">
                  <div>
                    <CandlestickChart
                      rangeValue={rangeValue}
                      timeframe={timeframe}
                      setTimeframe={setTimeframe}
                      tooltip={tooltip}
                      volumeAxis={volumeAxis}
                      triggerTooltip={setTooltip}
                      triggerVolumeAxis={setVolumeAxis}
                      handleClose={handleCandleChartClose}
                      handleRefresh={refreshCandleChart}
                      changeValueOnly={changeValueOnly}
                      handleDownload={exportCandleGraph}
                      currentPrice={currentPrice}
                      currentVol={currentVol}
                      graphTotalVol={graphTotalVol}
                    />
                  </div>
                  <Cards
                    tokens={cardTokens}
                    closeCard={closeCard}
                    handleBuy={handleBuy}
                    handleSell={handleSell}
                    triggerChart={triggerChartFromCard}
                  />
                  {canLoadComponents && (
                    <Orders
                      ref={ordersRef}
                      trigger={trigger}
                      setAutomationData={setAutomationData}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
          {canLoadComponents && (
            <div
              id="analyze-container"
              style={{ display: activeTab === 2 ? "block" : "none" }}
            >
              <AnalyzeTab />
            </div>
          )}

          {canLoadComponents && (
            <>
              <div
                id="holdings-container"
                style={{ display: activeTab === 3 ? "block" : "none" }}
              >
                <HoldingsTab trigger={trigger} />
              </div>
              <div
                id="automation-container"
                style={{
                  display: activeTab === 4 ? "block" : "none",
                  width: "100%",
                }}
              >
                <Automation
                  trigger={trigger}
                  ref={automationRef}
                  depth={depth}
                  triggerSubscribeTouchline={triggerSubscribeTouchline}
                />
              </div>
            </>
          )}
        </div>
      </div>
      <div>
        {isShowPopup && (
          <TagPopup
            {...popupData}
            closePopup={closeDynamicPopup}
            handleBuy={handleBuy}
            handleSell={handleSell}
            addToDetailsList={addToDetailsList}
            setData={setData}
          />
        )}{" "}
      </div>
    </section>
  );
};

export default Dashboard;
