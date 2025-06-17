import { useEffect, useRef, useState } from "react";
import { uid, postRequest } from "../utility/config";
import PlaceOrder from "../dashboard-components/PlaceOrder";

const AutoItem = ({
  autoItem,
  closeAutoItem,
  trigger,
  analyzeData,
  handleAutoChart,
  depth,
}) => {
  const [autoMsg, setAutoMsg] = useState([]);

  const [autoBuyAttempt, setAutoBuyAttempt] = useState(0);
  const [autoSellAttempt, setAutoSellAttempt] = useState(0);
  const userToken = localStorage.getItem("kite-userToken");
  const [showMsg, setShowMsg] = useState(false);
  const [showProcess, setShowProcess] = useState(false);

  const [process, setProcess] = useState([]);
  const [play, setPlay] = useState(false);
  const [autoChartActive, setAutoChartActive] = useState(false);
  const [nseOrdersActive, setNseOrdersActive] = useState(false);

  const [nseBuyOrders, setNseBuyOrders] = useState([]);
  const [nseSellOrders, setNseSellOrders] = useState([]);
  const [volume, setVolume] = useState(0);
  const [lastOrder, setLastOrder] = useState(null);
  const [totalBuy, setTotalBuy] = useState(0);
  const [totalSell, setTotalSell] = useState(0);
  const [stopLoss, setStopLoss] = useState(false);
  const [predictPrice, setPredictPrice] = useState(false);
  const [preditedPrice, setPredectedPrice] = useState(0);
  const [settingMenuVisible, setSettingMenuVisible] = useState(false);
  const searchTimeoutRef = useRef(null);
  const [firstRatio, setFirstRatio] = useState(0.25);
  const [secondRatio, setSecondRatio] = useState(0.35);
  const [thirdRatio, setThirdRatio] = useState(0.45);
  const [slRatio, setSlRatio] = useState(1.2);

  const [showPlaceOrder, setShowPlaceOrder] = useState(false);
  const [placeOrderRect, setPlaceOrderRect] = useState({ left: 0, top: 0 });
  const itemId = "auto-item-" + autoItem.token;
  const [orderType, setOrderType] = useState(null);

  useEffect(() => {
    if (trigger.tk === parseInt(autoItem.token) && trigger.lp && play) {
      //using delay in process for avoiding multiple orders
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        autoProcess(trigger);
      }, 400);
    }
  }, [trigger]);

  useEffect(() => {
    if (trigger.tk === parseInt(autoItem.token)) {
      updateOrders(trigger);
    }
  }, [trigger]);

  useEffect(()=> {
    // console.log(analyzeData)
  },[analyzeData])

  const updateOrders = (fragmentData) => {
    if (fragmentData.v) {
      setVolume(fragmentData.v);
    }

    if (fragmentData.lastTradedQuantity) {
      setLastOrder(fragmentData.lastTradedQuantity);
    }

    if (fragmentData.totalBuyQuantity) {
      setTotalBuy(fragmentData.totalBuyQuantity);
    }

    if (fragmentData.totalSellQuantity) {
      setTotalSell(fragmentData.totalSellQuantity);
    }
    if (fragmentData.depth && fragmentData.depth.buy) {
      let buy = [];
      fragmentData.depth.buy.forEach((item) => {
        buy.push({ qty: item.quantity, price: item.price });
      });
      setNseBuyOrders(buy);
    }

    if (fragmentData.depth && fragmentData.depth.sell) {
      let sell = [];
      fragmentData.depth.buy.forEach((item) => {
        sell.push({ qty: item.quantity, price: item.price });
      });
      setNseSellOrders(sell);
    }
  };

  useEffect(() => {
    var msg = localStorage.getItem("pro-auto-msg");
    if (msg) {
      msg = msg.split("/");
      const tempData = [];
      if (msg.length > 0) {
        msg.forEach((element) => {
          const splittedData = element.split(",");
          if (splittedData.length > 1) {
            const token = splittedData[0];
            if (token === autoItem.token) {
              tempData.push(splittedData[1]);
              setAutoMsg(tempData);
            }
          }
        });
      }
    }
  }, []);

  useEffect(() => {
    var token = autoItem.token;
    var tempData = "";
    if (autoMsg.length > 0) {
      autoMsg.forEach((data, index) => {
        if (index === 0) {
          tempData = token + "," + data;
        } else {
          tempData = tempData + "/" + token + "," + data;
        }
        localStorage.setItem("pro-auto-msg", tempData);
      });
    }
  }, [autoMsg]);

  const predictPriceData = (niftyValue, m, c) => m * niftyValue + c;

  function autoProcess(message) {
    try {
      const autoBought = autoItem.bought;
      let key = parseInt(autoItem.token);
      if (message.tk.toString() === key.toString()) {
        if (analyzeData[key].SDSMA) {
          const regData = analyzeData[key].regData;
          const niftyPrice = document.getElementById("nifty-lp").innerText;
          let predictedPrice = predictPriceData(niftyPrice, regData.m, regData.c);
          setPredectedPrice(predictedPrice);

          const orderDetails = determineOrder(analyzeData, key, message.lp);
          const myTime = new Date(message.exchangeTimestamp * 1000);
          console.log(
            orderDetails.orderType +
              ", " +
              orderDetails.triggerPrice +
              ", " +
              myTime.toLocaleTimeString()
          );
          setProcess((prev) => {
            // If the array length is 2000 or more, remove the first element
            const newProcess = prev.length >= 2000 ? prev.slice(1) : prev;
            return [
              ...newProcess,
              { type: orderDetails.orderType, price: message.lp },
            ];
          });
          const now = new Date();
          const buyTimeLimit = new Date(now);
          buyTimeLimit.setHours(15, 5, 0, 0);

          if (
            orderDetails.orderType === "strong buy" &&
            !autoBought &&
            !autoItem.buyPending &&
            !autoItem.sellPending &&
            now < buyTimeLimit
          ) {
            console.log(
              "LTMB : " + parseFloat(analyzeData[key].LTMB).toFixed(1)
            );
            console.log("lp : " + message.lp);
            if (
              parseFloat(analyzeData[key].LTMB).toFixed(2) >
              parseFloat(message.lp).toFixed(2)
            ) {

              if (regData && predictPrice) {
                const niftyPrice = document.getElementById("nifty-lp").innerText;
                const predictedPrice = predictPriceData(niftyPrice, regData.m, regData.c);
                if (predictedPrice < orderDetails.triggerPrice) {
                  return;
                }
              }
              console.log("place buy order at " + orderDetails.triggerPrice);
              placeAutoOrder("B", orderDetails.triggerPrice);
            }
          }
          if (
            orderDetails.orderType === "strong buy" &&
            !autoBought &&
            autoItem.buyPending
          ) {
            setAutoBuyAttempt((prev) => prev + 1);
            if (autoBuyAttempt > 4) {
              console.log("auto fry buy");
              //autoFry(message, 'positive');
              return;
            }
            console.log("modify buy order at " + orderDetails.triggerPrice);
            modifyAutoOrder(orderDetails.triggerPrice);
          }

          if (
            orderDetails.orderType === "strong sell" &&
            autoBought &&
            !autoItem.sellPending &&
            parseFloat(orderDetails.triggerPrice) * parseFloat(autoItem.qty) >
              parseFloat(autoItem.buyPrice) * parseFloat(autoItem.qty)
          ) {
            if (regData && predictPrice) {
              const niftyPrice = document.getElementById("nifty-lp").innerText;
              let predictedPrice = predictPriceData(niftyPrice, regData.m, regData.c);
              if (predictedPrice > orderDetails.triggerPrice) {
                return;
              }
            }
            console.log("place sell order at " + orderDetails.triggerPrice);
            placeAutoOrder("S", orderDetails.triggerPrice);
          }
          if (
            orderDetails.orderType === "strong sell" &&
            autoBought &&
            !autoItem.buyPending &&
            autoItem.sellPending &&
            parseFloat(orderDetails.triggerPrice) * parseFloat(autoItem.qty) >
              parseFloat(autoItem.buyPrice) * parseFloat(autoItem.qty)
          ) {
            setAutoSellAttempt((prev) => prev + 1);
            if (autoSellAttempt > 4) {
              console.log("auto fry sell");
              //autoFry(message, 'negative');
              return;
            }
            console.log("modify sell order at " + orderDetails.triggerPrice);
            modifyAutoOrder(orderDetails.triggerPrice);
          }
          buyTimeLimit.setHours(15, 27, 0, 0);
          if (now > buyTimeLimit && autoBought && !autoItem.sellPending) {
            if (autoItem.sellPending) {
              console.log("auto fry sell");
              autoFry(message, "negative");
            } else {
              console.log("place sell order at " + message.lp);
              placeAutoOrder("S", message.lp);
            }
          }

          const ratio =
            ((parseFloat(autoItem.buyPrice) - parseFloat(message.lp)) /
              parseFloat(autoItem.buyPrice)) *
            100;
          if (
            stopLoss &&
            ratio > slRatio &&
            autoBought &&
            !autoItem.sellPending
          ) {
            console.log(
              " Stop loss hit. Place sell order at " + orderDetails.triggerPrice
            );
            placeAutoOrder("S", message.lp);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  const placeAutoOrder = (orderType, limitPrice) => {
    const newOrderType = orderType === "B" ? "BUY" : "SELL";
    const jData = {
      variety: "regular",
      transaction_type: newOrderType,
      exchange: "NSE",
      tradingsymbol: autoItem.name,
      quantity: autoItem.qty.toString(),
      order_type: "LIMIT",
      product: "CNC",
      price: limitPrice.toString(),
      token: userToken,
    };

    // postRequest("placeorder", jData)
    //   .then((res) => {
    //     const msgElement = document.getElementById("msg");
    //     if (res.data && res.data.stat && res.data.stat === "Ok") {
    //       msgElement.innerHTML = "Success";
    //       msgElement.style.opacity = "1";
    //       setTimeout(() => {
    //         msgElement.style.opacity = "1";
    //       }, 1500);
    //       setTimeout(() => {
    //         msgElement.style.opacity = "0";
    //       }, 1500);
    //       const time = new Date().toLocaleTimeString();
    //       setAutoMsg((prev) => {
    //         return [
    //           ...prev,
    //           `${
    //             orderType === "S" ? "Sell" : "Buy"
    //           } Order placed at ${limitPrice} on ${time}`,
    //         ];
    //       });
    //     } else {
    //       msgElement.innerHTML = "Could not modify...";
    //       msgElement.style.backgroundColor = "#e88888";
    //       msgElement.style.opacity = "1";
    //       setTimeout(() => {
    //         msgElement.style.opacity = "1";
    //       }, 1500);
    //       setTimeout(() => {
    //         msgElement.style.opacity = "0";
    //       }, 1500);
    //     }
    //   })
    //   .catch((err) => {
    //     console.log(err);
    //   });
  };

  function getNorenOrderNo(posId) {
    const spanElements = document.querySelectorAll(
      `span[data-pos-id="${posId}"]`
    );
    var spanElement;
    if (spanElements.length > 0) {
      spanElements.forEach((element) => {
        if (element.dataset.posStatus === "OPEN") {
          spanElement = element;
        }
      });
    }

    if (spanElement) {
      const orderListElement = spanElement.closest(".single-order-list");

      if (orderListElement) {
        const divElement = orderListElement.querySelector("div[norenordno]");

        if (divElement) {
          const norenOrderNo = divElement.getAttribute("norenordno");
          return norenOrderNo;
        }
      }
    }
    return null;
  }

  function autoFry(message, type) {
    let key = parseInt(autoItem.token);
    const norenOrderNo = getNorenOrderNo(key);
    console.log(norenOrderNo);
    var jDataF = {
      norenordno: norenOrderNo.toString(),
      uid: uid,
    };
    jDataF["prctyp"] = "LMT";
    jDataF["tsym"] = autoItem.token.toString();
    jDataF["qty"] = autoItem.qty.toString();
    jDataF["exch"] = "NSE";
    jDataF["ret"] = "DAY";
    if (type === "positive") {
      jDataF["prc"] = (parseFloat(message.lp) + parseFloat(message.lp) / 50)
        .toFixed(2)
        .toString();
    } else if (type === "negative") {
      jDataF["prc"] = (parseFloat(message.lp) - parseFloat(message.lp) / 50)
        .toFixed(2)
        .toString();
    }

    const response = modifiedOrderPlace(
      norenOrderNo.toString(),
      "modifyorder",
      jDataF
    );
    if (response) {
      response.then((res) => {
        if (res.stat === "Ok") {
          const time = new Date().toLocaleTimeString();
          setAutoMsg((prev) => {
            return [
              ...prev,
              `${
                type === "negative" ? "Sell order" : "Buy order"
              } fried on ${time}`,
            ];
          });
        }
      });
    }

    if (autoBuyAttempt > 4) {
      setAutoBuyAttempt(0);
    } else {
      setAutoSellAttempt(0);
    }
  }

  function modifiedOrderPlace(norenordno, modifyType, jData) {
    return postRequest(modifyType, jData, userToken);
  }

  function modifyAutoOrder(price) {
    let key = parseInt(autoItem.token);
    const norenOrderNo = getNorenOrderNo(key);
    console.log(norenOrderNo);
    var jDataF = {
      norenordno: norenOrderNo.toString(),
      uid: uid,
    };
    jDataF["prctyp"] = "LMT";
    jDataF["tsym"] = autoItem.name.toString();
    jDataF["qty"] = autoItem.qty.toString();
    jDataF["exch"] = "NSE";
    jDataF["ret"] = "DAY";
    jDataF["prc"] = price.toString();
    const response = modifiedOrderPlace(
      norenOrderNo.toString(),
      "modifyorder",
      jDataF
    );
    if (response) {
      response.then((res) => {
        if (res.stat === "Ok") {
          const time = new Date().toLocaleTimeString();
          setAutoMsg((prev) => {
            return [
              ...prev,
              `${
                type === "negative" ? "Sell order" : "Buy order"
              } fried on ${time}`,
            ];
          });
          showOrderMessage(res);
        }
      });
    }
  }

  function determineOrder(data, key, currentPrice) {
    const sdsmaData = data[key].SDSMA;
    const STUB = data[key].STUB;
    const LTUB = data[key].LTUB;
    const STLB = data[key].STLB;
    const LTLB = data[key].LTLB;

    // Check if the last 3 or more SDSMA values are decreasing
    let decreasing = true;
    for (let i = sdsmaData.length - 3; i < sdsmaData.length; i++) {
      if (sdsmaData[i].sma >= sdsmaData[i - 1].sma) {
        decreasing = false;
        break;
      }
    }

    // Check if the last 3 or more SDSMA values are increasing
    let increasing = true;
    for (let i = sdsmaData.length - 3; i < sdsmaData.length; i++) {
      if (sdsmaData[i].sma <= sdsmaData[i - 1].sma) {
        increasing = false;
        break;
      }
    }

    const lastSMA = sdsmaData[sdsmaData.length - 1].sma;
    const secondLastSMA = sdsmaData[sdsmaData.length - 2].sma;
    const thirdLastSMA = sdsmaData[sdsmaData.length - 3].sma;
    const lastSD = sdsmaData[sdsmaData.length - 1].sd;

    // Determine the order type and trigger price
    let orderType, triggerPrice;
    if (decreasing && currentPrice < lastSMA) {
      if (lastSMA - currentPrice > lastSD) {
        orderType = "strong buy";
      } else {
        orderType = "buy";
      }
      determinePrice("B");
    } else if (increasing && currentPrice > lastSMA) {
      if (currentPrice - lastSMA > lastSD) {
        orderType = "strong sell";
      } else {
        orderType = "sell";
      }
      determinePrice("S");
    } else {
      orderType = "hold";
      triggerPrice = "0";
    }

    var difference = ((currentPrice - lastSMA) * 100) / lastSMA;
    if (difference > firstRatio) {
      orderType = "strong sell";
      determinePrice("S");
      console.log("return from .25");
      return {
        orderType: orderType,
        triggerPrice: triggerPrice,
      };
    } else if (difference < firstRatio * -1) {
      orderType = "strong buy";
      determinePrice("B");
      console.log("return from .25");
      return {
        orderType: orderType,
        triggerPrice: triggerPrice,
      };
    }

    difference = ((currentPrice - secondLastSMA) * 100) / secondLastSMA;
    if (difference < secondRatio * -1) {
      orderType = "strong buy";
      determinePrice("B");
      console.log("return from .35");
      return {
        orderType: orderType,
        triggerPrice: triggerPrice,
      };
    } else if (difference > secondRatio) {
      orderType = "strong sell";
      determinePrice("S");
      console.log("return from .35");
      return {
        orderType: orderType,
        triggerPrice: triggerPrice,
      };
    }

    difference = ((currentPrice - thirdLastSMA) * 100) / thirdLastSMA;
    if (difference < thirdRatio * -1) {
      orderType = "strong buy";
      determinePrice("B");
      console.log("return from .45");
      return {
        orderType: orderType,
        triggerPrice: triggerPrice,
      };
    } else if (difference > thirdRatio) {
      orderType = "strong sell";
      determinePrice("S");
      console.log("return from .45");
      return {
        orderType: orderType,
        triggerPrice: triggerPrice,
      };
    }

    return {
      orderType: orderType,
      triggerPrice: triggerPrice,
    };

    function determinePrice(type) {
      if (type === "S") {
        triggerPrice = parseFloat(STLB + lastSD).toFixed(2);
        if (triggerPrice < currentPrice) {
          triggerPrice = currentPrice;
        }
      }

      if (type === "B") {
        triggerPrice = parseFloat(STLB - lastSD).toFixed(2);
        if (triggerPrice > currentPrice) {
          triggerPrice = currentPrice;
        }
      }
    }
  }

  const toggleMsg = () => {
    setShowMsg(!showMsg);
  };

  const togglePlay = () => {
    setPlay(!play);
  };

  const toggleProcess = () => {
    setShowProcess(!showProcess);
  };

  const handleCheckboxChange = () => {
    setAutoChartActive(!autoChartActive);
  };

  useEffect(() => {
    handleAutoChart(autoChartActive, autoItem.token);
  }, [autoChartActive]);

  const handleOrdersActive = () => {
    setNseOrdersActive(!nseOrdersActive);
  };

  const toggleStopLoss = () => {
    setStopLoss(!stopLoss);
  };

  const togglePredictPrice = () => {
    setPredictPrice(!predictPrice)
  }

  const toggleSettingsMenu = () => {
    setSettingMenuVisible(!settingMenuVisible);
  };

  const handleFirstRatioChange = (e) => {
    setFirstRatio(e.target.value);
  };

  const handleSecondRatioChange = (e) => {
    setSecondRatio(e.target.value);
  };

  const handleThirdRatioChange = (e) => {
    setThirdRatio(e.target.value);
  };

  const handleSlRatioChange = (e) => {
    setSlRatio(e.target.value);
  };

  const handleBuy = async () => {
    const clickedItem = document.getElementById("auto-item-" + autoItem.token);
    if (clickedItem) {
      const rect = clickedItem.getBoundingClientRect();
      setPlaceOrderRect({ left: rect.left, top: rect.top });
    }
    setOrderType("buy");
    setShowPlaceOrder(true);
  };

  const handleSell = async () => {
    const clickedItem = document.getElementById("auto-item-" + autoItem.token);
    if (clickedItem) {
      const rect = clickedItem.getBoundingClientRect();
      setPlaceOrderRect({ left: rect.left, top: rect.top });
    }
    setOrderType("sell");
    setShowPlaceOrder(true);
  };

  const hidePlaceOrder = () => {
    setShowPlaceOrder(false);
  };

  return (
    <div className="auto-item" id={itemId}>
      {showPlaceOrder && (
        <PlaceOrder
          orderType={orderType}
          hidePlaceOrder={hidePlaceOrder}
          placeOrderTokenId={autoItem.token}
          placeOrderRect={placeOrderRect}
        />
      )}
      <ul className="auto-results-list">
        <li
          className="auto-result-item"
          key={autoItem.token}
          style={{ position: "relative" }}
        >
          <div className="auto-controls">
            <span
              className="play"
              onClick={togglePlay}
              style={{ color: play ? "#94c694" : "#ffaeae" }}
            >
              {play ? (
                <>
                  <i className="fa-solid fa-play fa-fade"></i> Running
                </>
              ) : (
                <>
                  <i className="fa-solid fa-pause"></i> Paused
                </>
              )}
            </span>
            <span>
              <label>
                <input
                  type="checkbox"
                  className="form-checkbox h-3 w-5 text-blue-600"
                  checked={autoChartActive}
                  onChange={handleCheckboxChange}
                />
                <span className="text-xs text-gray-400">Chart</span>
              </label>
            </span>
            <span>
              <label>
                <input
                  type="checkbox"
                  className="form-checkbox h-3 w-5 text-blue-600"
                  checked={nseOrdersActive}
                  onChange={handleOrdersActive}
                />
                <span className="text-xs text-gray-400">Depth</span>
              </label>
            </span>
            <span className="cursor-pointer" onClick={toggleSettingsMenu}>
              {settingMenuVisible ? (
                <i className="fa-solid fa-gear text-cyan-400"></i>
              ) : (
                <i className="fa-solid fa-gear text-zinc-500"></i>
              )}
            </span>
            <span
              className="close-modal"
              id="close-modal-auto-item"
              onClick={() => closeAutoItem(autoItem.token)}
            ></span>
          </div>
          {settingMenuVisible && (
            <div className="overlay-form">
              <div className="flex flex-col items-center">
                <label>Stop loss</label>
                <input
                  type="checkbox"
                  className="form-checkbox h-3 w-5 text-blue-600 rounded-sm"
                  checked={stopLoss}
                  onChange={toggleStopLoss}
                />
              </div>
              {stopLoss && (
                <div className="flex flex-col items-center">
                  <label>SL Ratio</label>
                  <input
                    type="number"
                    className="form-checkbox h-4 w-10 text-blue-950 rounded-sm"
                    value={slRatio}
                    onChange={handleSlRatioChange}
                  />
                </div>
              )}
              <div className="flex flex-col items-center">
                <label>Predict</label>
                <input
                  type="checkbox"
                  className="form-checkbox h-3 w-5 text-blue-600 rounded-sm"
                  checked={predictPrice}
                  onChange={togglePredictPrice}
                />
              </div>

              <div className="flex flex-col items-center">
                <label>Ratio 1</label>
                <input
                  type="number"
                  className="form-checkbox h-4 w-10 text-blue-950 rounded-sm"
                  value={firstRatio}
                  onChange={handleFirstRatioChange}
                />
              </div>
              <div className="flex flex-col items-center">
                <label>Ratio 2</label>
                <input
                  type="number"
                  className="form-checkbox h-4 w-10 text-blue-950 rounded-sm"
                  value={secondRatio}
                  onChange={handleSecondRatioChange}
                />
              </div>
              <div className="flex flex-col items-center">
                <label>Ratio 3</label>
                <input
                  type="number"
                  className="form-checkbox h-4 w-10 text-blue-950 rounded-sm"
                  value={thirdRatio}
                  onChange={handleThirdRatioChange}
                />
              </div>
            </div>
          )}
          <div className="auto-body">
            <span className="auto-title">{autoItem.name}</span>
            {predictPrice && (
              <span style={{color: "#c89bf2"}}>Predicted price: {preditedPrice.toFixed(2)}</span>
            )}
            {process.length > 0 && (
              <span>
                {process[process.length - 1].type} at price{" "}
                {process[process.length - 1].price}
              </span>
            )}
            <span>Qty:&nbsp;{autoItem.qty}</span>
            {autoItem.buyPending && (
              <span>
                Buy pending : &nbsp;&nbsp;
                <i
                  className="fa-solid fa-fan fa-xl rotate-item"
                  style={{ color: "#77dc77" }}
                ></i>
              </span>
            )}
            {autoItem.bought && (
              <span>Bought price : &nbsp;&nbsp;{autoItem.buyPrice}</span>
            )}
            {autoItem.sellPending && (
              <span>
                Sell pending : &nbsp;&nbsp;
                <i
                  className="fa-solid fa-arrows-spin fa-xl rotate-item"
                  style={{ color: "#ce5555" }}
                ></i>
              </span>
            )}
            <div className="auto-item-btn">
              <button
                onClick={handleBuy}
                className="text-sm bg-green-200 text-gray-700 px-2 rounded hover:bg-green-400 transition duration-300"
              >
                Buy
              </button>
              <button
                onClick={handleSell}
                className="text-sm bg-red-200 text-gray-700 px-2 rounded hover:bg-red-400 transition duration-300"
              >
                Sell
              </button>
            </div>
            <div className="expanding-feature">
              {autoMsg.length > 0 && (
                <span className="expand-btn" onClick={toggleMsg}>
                  <span
                    style={{ backgroundColor: showMsg ? "#336b38" : "#416673" }}
                    className="msg-count"
                  >
                    {showMsg && <i className="fa-solid fa-angles-up"></i>}
                    {!showMsg && <i className="fa-solid fa-angles-down"></i>}
                    &nbsp;&nbsp;{autoMsg.length}
                  </span>
                </span>
              )}
              {process.length > 0 && (
                <span className="expand-btn-process" onClick={toggleProcess}>
                  <span
                    style={{
                      backgroundColor: showProcess ? "#336b38" : "#416673",
                    }}
                    className="msg-count"
                  >
                    {showProcess && <i className="fas fa-hammer hammer"></i>}
                    {!showProcess && <i className="fas fa-hammer"></i>}
                    &nbsp;&nbsp;{process.length}
                  </span>
                </span>
              )}
              {/*  */}
              {showMsg && (
                <div className="auto-message">
                  {autoMsg.map((item, index) => (
                    <span className="message-item" key={index}>
                      {item}
                    </span>
                  ))}
                </div>
              )}
              {showProcess && (
                <div className="auto-message">
                  {process.map((item, index) => (
                    <span className="message-item" key={index}>
                      {item.type} at price {item.price}
                    </span>
                  ))}
                </div>
              )}

              {nseOrdersActive && (
                <div
                  className="auto-message"
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-around",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      color: "green",
                      width: "160px",
                    }}
                  >
                    Vol: {volume}
                    <span>Buy orders</span>
                    {nseBuyOrders.map((item, index) => (
                      <span className="text-green-300" key={index}>
                        {item.price} × {item.qty}
                      </span>
                    ))}
                    <span>Total : {totalBuy}</span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      color: "red",
                      width: "160px",
                    }}
                  >
                    Traded qty: {lastOrder}
                    <span>Sell orders</span>
                    {nseSellOrders.map((item, index) => (
                      <span className="text-red-400" key={index}>
                        {item.price} × {item.qty}
                      </span>
                    ))}
                    <span>Total : {totalSell}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </li>
      </ul>
    </div>
  );
};

export default AutoItem;
