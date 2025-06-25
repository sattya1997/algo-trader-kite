import React, { useEffect, useState } from "react";
import { postRequest } from "../utility/config";
import { searchStockName } from "../utility/mapping";

const Cards = ({ tokens, closeCard, handleBuy, handleSell, triggerChart }) => {
  const [cardsData, setCardsData] = useState([]);

  useEffect(() => {
    tokens.forEach((token) => {
      const tokenExists = cardsData.some(
        (data) => parseInt(data.token) === parseInt(token)
      );
      if (!tokenExists) {
        const tsym = searchStockName(token);
        if (token && tsym.length > 0) {
          setCardsData((prevData) => [...prevData, { token, tsym }]);
        }
      }
    });
  }, [tokens]);


  const classValue = (data) => {
    const priceChange = data.lp - data.o;
    const percentChange = ((priceChange * 100) / data.o).toFixed(2);
    return percentChange > 0
      ? "rgba(151, 255, 236, 0.86)"
      : "rgba(255, 157, 157, 0.9)";
  };

  const change = (data) => {
    if (data && data.lp && data.o) {
    const priceChange = data.lp - data.o;
    const percentChange = ((priceChange * 100) / data.o).toFixed(2);
    return `${priceChange.toFixed(2)} (${percentChange}%)`;
    }
  };

  const updateCardBar = (
    cardElement,
    openPrice,
    currentPrice,
    highPrice,
    lowPrice
  ) => {
    cardElement.querySelector("#low-price").innerHTML = lowPrice;
    cardElement.querySelector("#low-price").style.fontWeight = "500";
    cardElement.querySelector("#high-price").innerHTML = highPrice;
    cardElement.querySelector("#high-price").style.fontWeight = "500";

    const currentPercentage =
      ((currentPrice - lowPrice) / (highPrice - lowPrice)) * 100;
    const openPercent = ((openPrice - lowPrice) / (highPrice - lowPrice)) * 100;

    const barElement = cardElement.querySelector("#priceBar");
    const arrowElement = cardElement.querySelector("#arrow");
    const arrowText = cardElement.querySelector("#arrowText");

    barElement.style.backgroundColor =
      currentPrice >= openPrice ? "#95d899" : "#ff8181";
    barElement.style.left = `${openPercent}%`;

    arrowElement.style.left = `${currentPercentage}%`;
    arrowText.innerHTML = currentPrice;

    if (currentPrice >= openPrice) {
      barElement.style.left = `${openPercent}%`;
      barElement.style.width = `${currentPercentage - openPercent}%`;
    } else {
      barElement.style.left = `${currentPercentage}%`;
      barElement.style.width = `${openPercent - currentPercentage}%`;
    }

    if (openPrice === highPrice || currentPrice === highPrice) {
      barElement.style.borderBottomRightRadius = "10px";
      barElement.style.borderTopRightRadius = "10px";
    } else {
      barElement.style.borderBottomRightRadius = "0";
      barElement.style.borderTopRightRadius = "0";
    }

    if (openPrice === lowPrice || currentPrice === lowPrice) {
      barElement.style.borderBottomLeftRadius = "10px";
      barElement.style.borderTopLeftRadius = "10px";
    } else {
      barElement.style.borderBottomLeftRadius = "0";
      barElement.style.borderTopLeftRadius = "0";
    }
  };

  const triggerHandleBuy = (e) => {
    handleBuy(e.target.getAttribute("token"));
  };

  const triggerHandleSell = (e) => {
    handleSell(e.target.getAttribute("token"));
  };

  function makeElementDraggable(draggableElement, handleElement) {
    let isDragging = false;
    let startX, startY, initialX, initialY;
  
    handleElement.addEventListener('mousedown', startDrag);
    handleElement.addEventListener('touchstart', startDrag);
  
    function startDrag(e) {
      e.preventDefault();
      isDragging = true;
      if (e.type === "touchstart") {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      } else {
        startX = e.clientX;
        startY = e.clientY;
      }
      initialX = draggableElement.offsetLeft;
      initialY = draggableElement.offsetTop;
      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', stopDrag);
      document.addEventListener('touchmove', dragTouch);
      document.addEventListener('touchend', stopDrag);
    }
  
    function drag(e) {
      e.preventDefault();
      if (isDragging) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        draggableElement.style.left = initialX + dx + 'px';
        draggableElement.style.top = initialY + dy + 'px';
      }
    }
  
    function stopDrag() {
      isDragging = false;
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', stopDrag);
      document.removeEventListener('touchmove', drag);
      document.removeEventListener('touchend', stopDrag);
    }
  
    function dragTouch(e) {
      if (!isDragging) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      draggableElement.style.left = initialX + dx + "px";
      draggableElement.style.top = initialY + dy + "px";
    }
  }
  
  function callCardDraggable(token) {
    const card = document.getElementById('card-'+token);
    if (card) {
      const rect = card.getBoundingClientRect();
      const cardElement = document.getElementById('card-'+token);
      cardElement.style.position = "absolute";
      cardElement.style.top = `${window.scrollY + rect.top - 50}px`;
      cardElement.style.left = `${window.scrollX + rect.left}px`;
      cardElement.style.zIndex = "500";
      const headerElement = cardElement.querySelector('.card-header');
      headerElement.style.color = "#4757f4";
      headerElement.style.backgroundColor = "#1e2320";
      headerElement.style.borderRadius = "5px";
      headerElement.style.cursor = "pointer";
      makeElementDraggable(cardElement, headerElement);
    }
  }
  
  const closeThisCard = (token) => {
    setCardsData((prev) => prev.filter((item) => parseInt(token) !== parseInt(item.token)));
    closeCard(token)
  }

  return (
    <div id="details-list">
      {cardsData.map((data) => (
        <div className="card" id={`card-${data.token}`} key={data.token}>
          <div className="card-content">
            <div
              className="close-modal"
              onClick={() => closeThisCard(data.token)}
            ></div>
            <div className="card-header">{data.tsym}</div>
            <div id="card-header-btns">
              <button
                id="enable-drag-btn"
                onClick={() => callCardDraggable(data.token)}
              >
                <img src="./icons/pop.png" alt="drag" />
              </button>
              <a
                className="btn-go-to-chart"
                data-name={data.tsym}
                onClick={() => triggerChart(data.token, data.tsym)}
              >
                <img src="./icons/stockChart.png" alt="chart" />
              </a>
            </div>
            <div className="bar">
              <div className="bar-container" data-name="details-days-range">
                <div className="bar-header">
                  <span className="price" id="low-price">
                    {data.l}
                  </span>
                  <span className="title">Day's Range</span>
                  <span className="price" id="high-price">
                    {data.h}
                  </span>
                </div>
                <div style={{display:"flex", flexDirection:"row", justifyContent:"center", alignItems:"center"}}>
                  <span style={{width:"10px"}}>L</span>
                  <div className="range">
                    <div className="range-bar" id="priceBar"></div>
                    <div className="arrowContainer">
                      <div className="arrow" id="arrow">
                        <img src="./icons/arrow.svg" alt="^" />
                        <span id="arrowText">{data.lp}</span>
                      </div>
                    </div>
                  </div>
                  <span style={{width:"10px"}}>H</span>
                </div>
              </div>
            </div>
            <div className="info">
              <div className="sub-info">
                <button
                  data-id={`btn-buy-${data.token}`}
                  token={data.token}
                  className="auto"
                  onClick={triggerHandleBuy}
                >
                  Buy
                </button>
                <label style={{ color: classValue(data) }}>
                  <p className="fontBolder">Last Price: </p>
                  <p className="fontBolder" id={`${data.token}-last-price`}>
                    {data.lp}
                  </p>
                </label>
                <label>
                  <p className="fontBolder">Prev close: </p>
                  <p id={`${data.token}-prev-close`}>{data.c}</p>
                </label>
                <label style={{ color: "#d3d332" }}>
                  <p className="fontBolder">Open: </p>
                  <p id={`${data.token}-open`}>{data.o}</p>
                </label>
                <label style={{ color: "#18bc9c" }}>
                  <p className="fontBolder">High: </p>
                  <p id={`${data.token}-high`}>{data.h}</p>
                </label>
                <label style={{ color: "rgba(233, 144, 144, 0.9)" }}>
                  <p className="fontBolder">Low: </p>
                  <p id={`${data.token}-low`}>{data.l}</p>
                </label>
              </div>
              <div className="sub-info" id={`${data.token}-price-info`}>
                <button
                  data-id={`btn-sell-${data.token}`}
                  token={data.token}
                  className="cancel"
                  onClick={triggerHandleSell}
                >
                  Sell
                </button>
                <label style={{ color: classValue(data) }}>
                  <p className="fontBolder">Change: </p>
                  <p className="fontBolder" id={`${data.token}-change`}>
                    {change(data)}
                  </p>
                </label>
                <label style={{ color: "#7c73ff" }}>
                  <p className="fontBolder">Volume: </p>
                  <p id={`${data.token}-vol`}>{data.v}</p>
                </label>
                <label>
                  <p className="fontBolder">Avg Price: </p>
                  <p id={`${data.token}-avg-price`}>{data.ap}</p>
                </label>
                <label>
                  <p className="fontBolder">Trade Time: </p>
                  <p id={`${data.token}-ltt`}>{data.ltt}</p>
                </label>
                <label>
                  <p className="fontBolder">Last Trade Qty: </p>
                  <p id={`${data.token}-ltq`}>{data.ltq}</p>
                </label>
              </div>
            </div>
            <div className="orders font-green">
              <div className="buy-orders">
                <label className="fontBolder">Pending buy Orders: </label>
                {[...Array(5)].map((_, i) => (
                  <span key={i} id={`${data.token}-buy-price-${i}`}>
                    {0} × {0}
                  </span>
                ))}
                <span
                  id={`${data.token}-total-buy-price`}
                  style={{ marginTop: "5px" }}
                >
                  Total: 0
                </span>
              </div>
              <div className="sell-orders font-red">
                <label className="fontBolder">Pending sell Orders: </label>
                {[...Array(5)].map((_, i) => (
                  <span key={i} id={`${data.token}-sell-price-${i}`}>
                    {0} × {0}
                  </span>
                ))}
                <span
                  id={`${data.token}-total-sell-price`}
                  style={{ marginTop: "5px" }}
                >
                  Total: 0
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Cards;
