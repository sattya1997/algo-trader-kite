import React, { useEffect, useState, useRef} from "react";
import {
  postRequest,
  getCashAvailable,
  getBalance,
} from "../utility/config";

const PlaceOrder = ({ orderType, hidePlaceOrder, placeOrderTokenId, placeOrderRect, placeOrderSym }) => {
  const [quantity, setQuantity] = useState(1);
  const [limitPrice, setLimitPrice] = useState(0);
  const [cashBalance, setCashBalance] = useState(getCashAvailable());
  const [orderValue, setOrderValue] = useState(0);
  const [data, setData] = useState({});
  const userToken = localStorage.getItem("kite-userToken");
  const [ltp, setLtp] = useState(0);
  const popupRef = useRef(null);

  useEffect(() => {
    if (popupRef.current) {
      const left = window.innerWidth/2 - 125;
      let top = placeOrderRect.top - 140 + window.scrollY;
      popupRef.current.style.left = `${left}px`;
      popupRef.current.style.top = `${top}px`;
    }
  }, [placeOrderRect])

  useEffect(() => {
    const tag = document.getElementById("order-"+placeOrderTokenId);
    if (tag) {
      let price = tag.querySelector("div span:nth-child(2)").textContent;
      setData({symname: tag.querySelector("div span:nth-child(1)").textContent.split(":")[0]});
      setLtp(price);
      setLimitPrice(calculateInitialPrice(price || 0));
    }
  }, [placeOrderTokenId]);

  useEffect(() => {
    setOrderValue((quantity * limitPrice).toFixed(2));
  }, [quantity, limitPrice]);

  function calculateInitialPrice(data) {
    let curPrice = parseFloat(data);
    curPrice += orderType === "buy" ? -(curPrice / 300) : curPrice / 300;
    return curPrice.toFixed(1);
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    // if (
    //   orderType === "buy" &&
    //   parseFloat(quantity) * parseFloat(limitPrice) >
    //     parseFloat(getCashAvailable())
    // ) {
    //   alert("Warning: Order value exceeds cash balance!");
    //   return;
    // }

    const newOrderType = orderType === "buy" ? "BUY" : "SELL";
    const jData = {
      variety: "regular",
      transaction_type: newOrderType,
      exchange: "NSE",
      tradingsymbol: placeOrderSym,
      quantity: quantity.toString(),
      order_type: "LIMIT",
      product: "CNC",
      price: limitPrice.toString(),
      token: userToken,
    };

    try {
      const res = await postRequest("placeorder", jData);
      const msgElement = document.getElementById("msg");
      if (res && res.data && res.data.status && res.data.status === "success") {
        hidePlaceOrder();
        msgElement.innerHTML = "Order placed";
        msgElement.style.opacity = "1";
        setTimeout(() => {
          msgElement.style.opacity = "1";
        }, 1500);
        setTimeout(() => {
          msgElement.style.opacity = "0";
        }, 1500);
        getBalance(userToken);
      } else {
        msgElement.innerHTML = "Could not place order...";
        msgElement.style.backgroundColor = "#e88888";
        msgElement.style.opacity = "1";
        setTimeout(() => {
          msgElement.style.opacity = "1";
        }, 1500);
        setTimeout(() => {
          msgElement.style.opacity = "0";
        }, 1500);
      }
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="place-order-list" id="place-order-list" ref={popupRef} >
      <span
        style={{
          color: orderType === "buy" ? "green" : "red",
          fontSize: "12px",
          fontWeight: 500,
        }}
      >
        {orderType === "buy" ? "Buy" : "Sell"}&nbsp;{data.symname}&nbsp;LTP: {ltp}
      </span>
      <span
        className="close-modal"
        id="close-order-form"
        onClick={hidePlaceOrder}
      ></span>
      <form id="place-order-form" onSubmit={handleSubmit}>
        <div id="place-order-top-label">
          <label>
            <span id="cash-balance">
              Balance:{parseFloat(cashBalance).toFixed(2)}
            </span>
          </label>
          <label>
            <span id="order-value">
              Value:{parseFloat(orderValue).toFixed(2)}
            </span>
          </label>
        </div>
        <div className="place-order-inputs">
          <label>Qty</label>
          <input
            type="number"
            name="quantity"
            value={quantity}
            min="1"
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <div className="place-order-inputs">
          <label>Prc</label>
          <input
            type="number"
            name="limitPrice"
            value={limitPrice}
            min="0"
            step="0.01"
            onChange={(e) => setLimitPrice(e.target.value)}
          />
        </div>
        <button type="submit">Submit Order</button>
      </form>
    </div>
  );
};

export default PlaceOrder;
