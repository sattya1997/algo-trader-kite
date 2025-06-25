import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useRef,
} from "react";
import { postRequest, getBalance } from "../utility/config";
import Order from "./Order";
import StockPosition from "./StockPosition";

const Orders = forwardRef(({ trigger, setAutomationData }, ref) => {
  useImperativeHandle(ref, () => ({ getOrders }));
  const [orders, setOrders] = useState([]);
  const [autoBuyPrice, setAutoBuyPrice] = useState(0);
  const [autoBuyPending, setAutoBuyPending] = useState(false);
  const [autoSellPending, setAutoSellPending] = useState(false);
  const [autoBought, setAutoBought] = useState(false);
  const [autoToken, setAutoToken] = useState(0);
  const userToken = localStorage.getItem("kite-userToken");
  const [pnlData, setPnlData] = useState([]);
  const [unsoldQtyMap, setUnsoldQtyMap] = useState({});

  useEffect(() => {
    let autoData = localStorage.getItem("auto-data");
    if (autoData) {
      autoData = autoData.split("/");
      const tempData = [];
      if (autoData.length > 0) {
        autoData.forEach((element) => {
          const splittedData = element.split(",");
          if (parseInt(autoToken) === parseInt(splittedData[0])) {
            tempData.push({
              token: splittedData[0],
              name: splittedData[1],
              qty: splittedData[2],
              buyPending: autoBuyPending,
              sellPending: autoSellPending,
              bought: autoBought,
              buyPrice: autoBuyPrice,
            });
          } else {
            tempData.push({
              token: splittedData[0],
              name: splittedData[1],
              qty: splittedData[2],
              buyPending:
                splittedData[3] === "false" || splittedData[3] === false
                  ? false
                  : true,
              sellPending:
                splittedData[4] === "false" || splittedData[4] === false
                  ? false
                  : true,
              bought:
                splittedData[5] === "false" || splittedData[5] === false
                  ? false
                  : true,
              buyPrice: splittedData[6],
            });
          }
        });
        setAutomationData(tempData);
      }
    }
  }, [autoBought, autoBuyPrice, autoBuyPending, autoSellPending, autoToken]);

  const getOrders = async () => {
    setOrders([]);
    var orderDetailsForPnL = [];
    await getBalance(userToken);
    await postRequest("orderbook", {token: userToken})
      .then((response) => {
        var data = response.data;
        if (data && data.status === "success") {
          // Transform the data to match the expected format
          const transformedOrders = data.data.map(order => ({
            token: order.instrument_token.toString(),
            name: order.tradingsymbol,
            stat: "Ok",
            trantype: order.transaction_type === "BUY" ? "B" : "S",
            status: order.status,
            norenordno: order.order_id,
            qty: order.quantity,
            prc: order.price,
            avgprc: order.average_price,
            ts: order.order_timestamp,
            order_type: order.order_type,
            product: order.product,
            exchange: order.exchange,
          }));
          setOrders(transformedOrders);
          
          for (let index = 0; index < transformedOrders.length; index++) {
            const order = transformedOrders[index];
            const token = order.token;
            var autoToken = null;
            let autoData = localStorage.getItem("auto-data");
            if (autoData) {
              autoData = autoData.split("/");
              if (autoData.length > 0) {
                autoData.forEach((element) => {
                  const splittedData = element.split(",");
                  if (splittedData.length === 7 && splittedData[0] === token) {
                    autoToken = splittedData[0];
                    setAutoToken(autoToken);
                  }
                });
              }
            }
            if (
              order.stat === "Ok" &&
              order.trantype === "B" &&
              order.status !== "REJECTED" &&
              order.status !== "CANCELLED"
            ) {
              if (
                autoToken &&
                parseInt(order.token) === parseInt(autoToken) &&
                order.status === "COMPLETE"
              ) {
                setAutoBought(true);
                setAutoBuyPrice(order.avgprc || order.prc);
                setAutoBuyPending(false);
                setAutoSellPending(false);
              }
              orderDetailsForPnL = updateOrderDeatilsForPnL(
                order,
                "buy",
                orderDetailsForPnL
              );

              if (
                parseInt(order.token) === parseInt(autoToken) &&
                order.status === "OPEN"
              ) {
                setAutoBuyPending(true);
                setAutoSellPending(false);
              }
            } else if (
              order.stat === "Ok" &&
              order.trantype === "S" &&
              order.status !== "REJECTED" &&
              order.status !== "CANCELLED"
            ) {
              if (
                parseInt(order.token) === parseInt(autoToken) &&
                order.status === "COMPLETE"
              ) {
                setAutoBought(false);
                setAutoBuyPrice(0);
                setAutoSellPending(false);
                setAutoBuyPending(false);
              }
              orderDetailsForPnL = updateOrderDeatilsForPnL(
                order,
                "sell",
                orderDetailsForPnL
              );
              if (
                parseInt(order.token) === parseInt(autoToken) &&
                order.status === "OPEN"
              ) {
                setAutoSellPending(true);
                setAutoBuyPending(false);
              }
            }
          }
          const pnl = getPnLResults(orderDetailsForPnL);
          setPnlData(pnl);
          // Calculate unsold quantity per buy order (FIFO)
          const unsoldQtyMap = getUnsoldQtyPerBuyOrder(orderDetailsForPnL);
          setUnsoldQtyMap(unsoldQtyMap);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const getPnLResults = (orderDetailsForPnL) => {
    return orderDetailsForPnL.map((stock) => {
      let buyOrders = stock.buy.map((buyOrder) => ({ ...buyOrder }));
      let totalPnL = 0;
      var totalBuyQty = 0;
      var totalSellQty = 0;

      buyOrders.map(buyOrder => {
        totalBuyQty += buyOrder.qty;
      })

      stock.sell.forEach((sellOrder) => {
        let sellQty = parseInt(sellOrder.qty);
        totalSellQty += sellQty;
        while (sellQty > 0 && buyOrders.length > 0) {
          let buyOrder = buyOrders[0];
          let buyQty = parseInt(buyOrder.qty);
          let qtyMatched = Math.min(sellQty, buyQty);

          let pnl =
            (parseFloat(sellOrder.prc) - parseFloat(buyOrder.prc)) * qtyMatched;
          totalPnL += pnl;

          // Adjust quantities
          sellQty -= qtyMatched;
          buyOrder.qty -= qtyMatched;

          // Remove buy order if fully matched
          if (buyOrder.qty === 0) {
            buyOrders.shift();
          }
        }
      });
      return { stock: stock.stock, totalPnL: totalPnL.toFixed(2), buyQty: totalBuyQty, sellQty: totalSellQty };
    });
  };

  function getUnsoldQtyPerBuyOrder(orderDetailsForPnL) {
    const unsoldQtyMap = {}; // { [orderNo]: unsoldQty }
    orderDetailsForPnL.forEach(stock => {
      let buyOrders = stock.buy.map(buyOrder => ({
        ...buyOrder,
        remainingQty: buyOrder.qty // Track remaining qty for this buy order
      }));
      let sellOrders = stock.sell.map(sellOrder => ({ ...sellOrder }));
      let buyIndex = 0;
      let sellIndex = 0;

      while (buyIndex < buyOrders.length && sellIndex < sellOrders.length) {
        let buyOrder = buyOrders[buyIndex];
        let sellOrder = sellOrders[sellIndex];
        let qtyMatched = Math.min(buyOrder.remainingQty, sellOrder.qty);

        buyOrder.remainingQty -= qtyMatched;
        sellOrder.qty -= qtyMatched;

        if (buyOrder.remainingQty === 0) buyIndex++;
        if (sellOrder.qty === 0) sellIndex++;
      }
      // After matching, whatever remainingQty is left in each buyOrder is unsold
      buyOrders.forEach(buyOrder => {
        unsoldQtyMap[buyOrder.orderNo] = buyOrder.remainingQty;
      });
    });
    return unsoldQtyMap;
  }

  function updateOrderDeatilsForPnL(order, type, orderDetailsForPnL) {
    if (order.status === "COMPLETE") {
      let result = orderDetailsForPnL.find(
        (item) => item.stock === order.token
      );
      const orderDetails = {
        status: order.status,
        orderNo: order.norenordno,
        qty: parseInt(order.qty, 10),
        prc: order.avgprc || order.prc,
      };

      if (!result) {
        result = {
          stock: order.token,
          buy: type === "buy" ? [orderDetails] : [],
          sell: type === "sell" ? [orderDetails] : [],
          remaining: 0,
          remainingBuyQty: 0,
          remainingSellQty: 0,
        };
        orderDetailsForPnL.push(result);
      } else {
        result[type].push(orderDetails);
        result.remaining += orderDetails.qty;
      }
    }
    return orderDetailsForPnL;
  }
  
  const manageOrders = (order, index) => {
    return (
      <Order
        order={order}
        id={"order-list"}
        count={index + 1}
        key={order.norenordno}
        trigger={order.status === "CANCELLED" || order.status === "REJECTED" ? null : trigger}
        pnlData={order.trantype === "B" ? pnlData : undefined}
        unsoldQty={unsoldQtyMap[order.norenordno] || 0}
        buyPrice={order.avgprc || order.prc}
      />
    );
  };

  return (
    <div>
      <StockPosition orderDetailsForPnL={pnlData} />
      <h5 style={{ marginTop: "15px" }}>Buy order list:</h5>
      <div className="buy-order-list">
        {orders.map((order, index) =>
          order.trantype === "B" &&
          order.status != "REJECTED" &&
          order.status != "CANCELLED" ? (
            manageOrders(order, index)
          ) : null
        )}
      </div>
      <h5>Sell order list:</h5>
      <div className="sell-order-list">
        {orders.map((order, index) =>
          order.trantype === "S" &&
          order.status != "REJECTED" &&
          order.status != "CANCELLED" ? (
            <Order
              order={order}
              id={"sell-order-list"}
              count={index + 1}
              key={order.norenordno}
              trigger={trigger}
              remaining={-1}
            />
          ) : null
        )}
      </div>
      <h5>Cancelled/Rejected order list:</h5>
      <div className="other-order-list">
        {orders.map((order, index) =>
          order.status === "CANCELLED" || order.status === "REJECTED" ? (
            <Order
              order={order}
              id={"other-order-list"}
              count={index + 1}
              key={order.norenordno}
              trigger={null}
              remaining={-1}
            />
          ) : null
        )}
      </div>
    </div>
  );
});

export default Orders;
