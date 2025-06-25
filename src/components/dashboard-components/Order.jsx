import React, { useState, useEffect, useRef,  } from "react";
import { postRequest } from "../utility/config";

const Order = ({ order, id, count, trigger, pnlData, unsoldQty, buyPrice }) => {
  const [updateOrder, setUpdateOrder] = useState(false);
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(1);
  const [orderData, setOrderData] = useState({});
  const [showFryWarning, setShowFryWarning] = useState(false);

  const userToken = localStorage.getItem('kite-userToken');
  const [ltp, setLtp] = useState(null);
  const [availbale, setAvailable] = useState(false);
  const [position, setPosition] = useState(0);

  const [fryParentElement, setFryParentElement] = useState(null);

  useEffect(() => {
    if (pnlData && pnlData.length > 0) {
      pnlData.forEach(pnl => {
        if (pnl && pnl.stock && pnl.totalPnL && pnl.stock === order.token) {
          if (pnl.totalPnL === "0.00" || (pnl.buyQty - pnl.sellQty > 0) ) {
            setAvailable(true);
          } else {
            setAvailable(false);
          }
        }
      })
    }
  }, [pnlData, order])

  useEffect(() => {
    //console.log(trigger)

    if (trigger && trigger.tk && trigger.tk.toString() === order.token.toString()) {
      const ltp = trigger.lp;
      if (ltp !== undefined) {
        setLtp(ltp);
      }
    }
  }, [trigger]);

  useEffect(() => {
    if (fryParentElement && fryParentElement.getAttribute("norenordno")) setShowFryWarning(true);
  }, [fryParentElement]);

  function modifyOrder(modifyType, buttonElement) {
    const parentElement = buttonElement.closest("div");
    const norenordno = parentElement.getAttribute("norenordno");
    var jData = {
      token: userToken,
      order_id: norenordno.toString(),
      variety: "regular",
      transaction_type: "",
      exchange: "",
      tradingsymbol: order.name,
      quantity: "",
      order_type: "",
      product: "CNC",
      price: "",
      user_id: "KAH660",
      tag: "quick",
    };

    let tranType = parentElement.getAttribute("trantype");
    jData["transaction_type"] = tranType === "B" ? "BUY" : "SELL";

    if (modifyType === 3) {
      modifiedOrderPlace(norenordno, "cancelorder", jData);
    }
  
    if (modifyType === 6) {
      setFryParentElement(parentElement);
    }
  
    if (modifyType === 1) {
      var prc = parseFloat(parentElement.getAttribute("prc"));
      prc = prc - prc / 300;
      prc = Math.floor(prc / 0.05) * 0.05;
      prc = prc.toFixed(2);
      jData["tradingsymbol"] = order.name.toString();
      jData["quantity"] = order.qty.toString();
      jData["exchange"] = "NSE";
      jData["order_type"] = "LIMIT";
      jData["price"] = prc;
      modifiedOrderPlace(norenordno, "modifyorder", jData);
    }
  
    if (modifyType === 5) {
      var prc = parseFloat(parentElement.getAttribute("prc"));
      prc = prc + prc / 300;
      prc = Math.ceil(prc / 0.05) * 0.05;
      prc = prc.toFixed(2);
      jData["tradingsymbol"] = parentElement.getAttribute("tsym");
      jData["quantity"] = parentElement.getAttribute("qty");
      jData["exchange"] = "NSE";
      jData["order_type"] = "LIMIT";
      jData["price"] = prc;
      modifiedOrderPlace(norenordno, "modifyorder", jData);
    }
  
    if (modifyType === 2) {
      var prc = parseFloat(parentElement.getAttribute("prc"));
      jData["tradingsymbol"] = parentElement.getAttribute("tsym");
      jData["quantity"] = parentElement.getAttribute("qty");
      jData["exchange"] = "NSE";
      jData["order_type"] = "LIMIT";
      jData["price"] = prc;

      let tranType = parentElement.getAttribute("trantype");
      jData["transaction_type"] = tranType === "B" ? "BUY" : "SELL";
  
      createModifiedPlaceOrderForm(jData);
    }
  }

  function createModifiedPlaceOrderForm(data) {
    setOrderData(data);
    setQty(data['quantity']);
    setPrice(data['price']);
    setUpdateOrder(true);
  }

  function modifiedOrderPlace(norenordno, modifyType, jData) {
    postRequest(modifyType, jData).then((res) => {
      if (res && res.data && res.data.status === "success") {
        setOrderData({});
      }
      
    })
    .catch((error) => {
      console.error("Error:", error);
    });
  }

  const closeModifyOrder = () => {
    setUpdateOrder(false);
  }

  const placeModifiedOrder = () => {
    var jData = orderData;
    jData['price'] = price.toString();
    jData['quantity'] = qty.toString();
    postRequest("modifyorder", jData).then((res) => {
      if (res && res.data && res.data.stat && res.data.stat === "Ok") {
        closeModifyOrder();
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });
  }

  const handlePriceChange = (event) => {
    setPrice(event.target.value);
  };

  const handleQtyChange = (event) => {
    setQty(event.target.value);
  };

  const hideFryWarning = () => {
    setShowFryWarning(false);
  }

  const fryOrder = () => {
    const norenordno = fryParentElement.getAttribute("norenordno");
    var jData = {
      token: userToken,
      order_id: norenordno.toString(),
      variety: "regular",
      transaction_type: "",
      exchange: "",
      tradingsymbol: order.name,
      quantity: "",
      order_type: "MARKET",
      product: "CNC",
      price: "0",
    };

    var type = fryParentElement.getAttribute('trantype');
    if(type === "B") {
      jData["transaction_type"] = "BUY";
    } else if (type === "S") {
      jData["transaction_type"] = "SELL";
    }

    jData["exchange"] = "NSE";
    jData["tradingsymbol"] = fryParentElement.getAttribute("tsym");
    jData["quantity"] = fryParentElement.getAttribute("qty");

    postRequest("modifyorder", jData).then((res) => {
      if (res && res.data && res.data.status && res.data.status === "success") {
        closeModifyOrder();
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });
  }

  return (
    <div className="single-order-list" key={order.norenordno}>
      <label>{count}.&nbsp;</label>
      <span style={{color: "cyan"}}>{order.name}&nbsp;&nbsp;</span>
      <label></label>
      <span>{order.prc}&nbsp;&nbsp;</span>
      <label>Qty:&nbsp;</label>
      <span>
        {order.fillshares
          ? order.fillshares + "/" + order.qty
          : order.status === "COMPLETE"
          ? order.qty + "/" + order.qty
          : "0/" + order.qty}
        &nbsp;&nbsp;
      </span>
      <label>LTP:&nbsp;</label>
      <span id="ltp">{ltp}&nbsp;&nbsp;</span>
      <label>&nbsp;</label>
      <span>
        {order.status === "COMPLETE"
          ? `Avg: ${order.avgprc || order.prc}`
          : "Opn"}
        &nbsp;&nbsp;
      </span>
      {order.trantype === "B" && unsoldQty > 0 && ltp !== null && buyPrice !== undefined && order.status === "COMPLETE" && (
        <>
          <label>PL:&nbsp;</label>
          <span style={{ color: (ltp - buyPrice) * unsoldQty > 0 ? "#44b42e" : (ltp - buyPrice) * unsoldQty < 0 ? "#e66a6a" : undefined }}>
            {((ltp - buyPrice) * unsoldQty).toFixed(2)}
          </span>
          &nbsp;&nbsp;
        </>
      )}
      <span
        id={"data-order-"+order.norenordno}
        data-pos-id={order.token}
        data-pos-prc={order.avgprc || order.prc}
        data-pos-qty={order.qty}
        data-pos-status={order.status}
        data-pos-type={order.trantype}
        data-pos-tsym={order.name}
        data-pos-exchange={order.exchange}
      ></span>
      <>
      <div className="order-extra-inf">
        <span>{order.ts.split(" ")[1]}</span>
        <span>{order.order_type}</span>
        <span>{order.product}</span>
      </div>
      </>
      {updateOrder && (
        <>
          <br />
          <div className="modify-order">
            <label>
              Qty:
              <input
                type="number"
                name="quantity"
                value={qty}
                onChange={handleQtyChange}
                min="1"
              />
            </label>
            <label>
              Price:
              <input
                type="number"
                name="limitPrice"
                value={price}
                onChange={handlePriceChange}
                min="0"
                step="0.01"
              />
            </label>
            <button onClick={placeModifiedOrder}>Submit</button>
            <span
              className="close-modal"
              id="close-modify-order"
              onClick={closeModifyOrder}
            ></span>
          </div>
        </>
      )}
      {showFryWarning && (
        <>
          <br />
          <div>
            <label>It will trigger the order at current price</label>
            <br />
            <button className="cancel" onClick={fryOrder}>
              Ok
            </button>
            <button className="auto" onClick={hideFryWarning}>
              Cancel
            </button>
          </div>
        </>
      )}
      {id !== "other-order-list" && order.status !== "COMPLETE" && (
        <>
          <br />
          <div
            norenordno={order.norenordno}
            prc={order.prc}
            tsym={order.name}
            qty={order.qty}
            trantype={order.trantype}
            token={order.token}
          >
            <button className="auto" onClick={(e) => modifyOrder(1, e.target)}>
              --
            </button>
            <button
              className="modify"
              onClick={(e) => modifyOrder(2, e.target)}
            >
              Modify
            </button>
            <button
              className="cancel"
              onClick={(e) => modifyOrder(3, e.target)}
            >
              Cancel
            </button>
            <button
              className="cancel"
              onClick={(e) => modifyOrder(5, e.target)}
            >
              ++
            </button>
            <button
              className="cancel"
              onClick={(e) => modifyOrder(6, e.target)}
            >
              Fry
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Order;
