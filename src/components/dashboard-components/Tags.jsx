import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import { API, postRequest } from "../utility/config";
import { searchStockName } from "../utility/mapping";

const Tags = forwardRef(
  (
    {
      handleNewDepth,
      handleNewMessage,
      getOrders,
      getNiftyChart,
      editWatchList,
      triggerGetWatchList,
      hideLoadingPage,
    },
    ref
  ) => {
    useImperativeHandle(ref, () => ({
      triggerSubscribeTouchline,
      getWatchList,
    }));

    const [niftyData, setNiftyData] = useState({
      tk: "256265",
      name: "Nifty 50",
      o: 0,
      lp: 0,
      pc: 0,
      sym: "+",
    });
    const wlCode = "kite-watch-list-660";
    const mode = "ltpc";
    const depthMode = "full";
    const [ordersData, setOrdersData] = useState([]);
    const [watchList, setWatchList] = useState([]);
    const websocketRef = useRef(null);
    const intervalRef = useRef(null);
    const maxReconnectAttempts = 10;
    const reconnectAttemptsRef = useRef(0);
    const userToken = localStorage.getItem("kite-userToken");

    const red = "#c00";
    const green = "#049404";

    const websocketUrl = API.websocket();

    var api_key = "kitefront";
    var user_id = "KAH660";
    var uid = "1749642575725";
    var userAgent = "kite3-web";
    var version = "3.0.0";

    const queryParams = {
      api_key: api_key,
      user_id: user_id,
      enctoken: userToken,
      uid: uid,
      "user-agent": userAgent,
      version: version,
    };

    var defaultWatchlist = [
      { tsym: "NIFTY 50", token: 256265 },
      { tsym: "ICICIB22", token: 133633 },
      { tsym: "CESC", token: 160769 },
      { tsym: "NCC", token: 593665 },
      { tsym: "ONGC", token: 633601 },
      { tsym: "TATAMOTORS", token: 884737 },
      { tsym: "ALOKINDS", token: 4524801 },
      { tsym: "INOXWIND", token: 2010113 },
      { tsym: "BSE", token: 5013761 },
      { tsym: "MODEFENCE", token: 6385665 },
    ];
    // const defaultWatchlist = [{ tsym: "ICICIB22", token: 133633}, {tsym: "BSE", token: 5013761 }];
    const tempData = [];
    let fullModeTokenList = [];

    let storedLocalWL = localStorage.getItem(wlCode);

    if (storedLocalWL) {
      storedLocalWL = JSON.parse(storedLocalWL);
      if (storedLocalWL && storedLocalWL.length > 0)
        defaultWatchlist = storedLocalWL;
    }

    let autoData = localStorage.getItem("auto-data");
    if (autoData) {
      autoData = autoData.split("/");

      if (autoData.length > 0) {
        autoData.forEach((element) => {
          const splittedData = element.split(",");
          if (splittedData.length === 7) {
            tempData.push({
              token: splittedData[0],
              name: splittedData[1],
              qty: splittedData[2],
              buyPending: splittedData[3] === "true",
              sellPending: splittedData[4] === "true",
              bought: splittedData[5] === "true",
              buyPrice: parseInt(splittedData[6]),
            });
          }
        });
      }
    }

    const queryString = new URLSearchParams(queryParams).toString();

    const triggerSubscribeTouchline = useCallback((data) => {
      let watchListElement = watchList.find(
        (item) => item.token === parseInt(data.token)
      );
      if (!watchListElement) {
        if (data && data.addToWatchList) {
          setOrdersData((prev) => {
            // Check if the order already exists
            let existingOrderIndex = prev.findIndex(
              (prevItem) => parseInt(data.token) === parseInt(prevItem.token)
            );
            if (existingOrderIndex === -1) {
              let newItem = {
                tk: data.token,
                lp: 0,
                pc: 0,
                o: 0,
                name: data.tsym,
              };
              return [...prev, newItem];
            } else {
              return [...prev];
            }
          });
          subscribeTouchline(data);
          return;
        }
      }
      subscribeDepth(data);
    }, []);

    const saveWatchListToLocal = () => {
      localStorage.setItem(wlCode, JSON.stringify(defaultWatchlist));
    };

    const getWatchList = useCallback(async () => {
      if (ordersData.length < 1) {
        try {
          postRequest("watchlist", { id: "1", token: userToken }).then(
            (response) => {
              if (
                response &&
                response.data &&
                response.data.status &&
                response.data.status === "success"
              ) {
                var groups = response.data.data.groups;
                groups[0];
                setWatchList(response.data.values);
              } else {
                setWatchList(defaultWatchlist);
              }
            }
          );
        } catch (error) {
          setWatchList(defaultWatchlist);
        }
      }
    }, [ordersData, userToken]);

    useEffect(() => {
      if (triggerGetWatchList) {
        getWatchList();
      }
    }, [triggerGetWatchList, getWatchList]);

    const connectWebSocket = useCallback(() => {
      if (ordersData.length === 0) createInitialWatchList();
      hideLoadingPage();
      const wsUrl = `${websocketUrl}?${queryString}`;

      if (websocketRef.current) {
        websocketRef.current.close();
      }
      websocketRef.current = new WebSocket(wsUrl);

      websocketRef.current.onopen = () => {
        reconnectAttemptsRef.current = 0;
        let tokenList = [];
        defaultWatchlist.forEach((item) => tokenList.push(item.token));
        var connectRequest = {
          a: "subscribe",
          v: tokenList,
        };

        if (
          websocketRef.current &&
          websocketRef.current.readyState === WebSocket.OPEN
        ) {
          websocketRef.current.send(JSON.stringify(connectRequest));
          connectRequest = {
            a: "mode",
            v: [mode, tokenList],
          };
          websocketRef.current.send(JSON.stringify(connectRequest));

          //for auto items
          tempData.forEach((item) => {
            if (!fullModeTokenList.includes(parseInt(item.token))) {
              connectRequest = {
                a: "subscribe",
                v: [parseInt(item.token)],
              };
              websocketRef.current.send(JSON.stringify(connectRequest));
              connectRequest = {
                a: "mode",
                v: [depthMode, [parseInt(item.token)]],
              };
              websocketRef.current.send(JSON.stringify(connectRequest));
            }
          });
        }
      };

      websocketRef.current.onclose = (event) => {
        if (websocketRef.current) {
          websocketRef.current.close();
        }
        if (intervalRef.current) {
        }
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          setTimeout(
            connectWebSocket,
            5000 * Math.pow(2, reconnectAttemptsRef.current)
          );
        } else {
          console.error("Max reconnection attempts reached. Giving up.");
        }
      };

      websocketRef.current.onmessage = async (event) => {
        //
        if (typeof event.data === "string") {
          // If it's text-based JSON (Order updates, alerts, etc.)
          try {
            const message = JSON.parse(event.data);
            // if (message.type === "instruments_meta") {
            //   console.log("Received text message:", message);
            //   hideLoadingPage();
            // }

            if (message.type === "order") triggerGetOrders();
          } catch (error) {
            console.error("Error parsing text message:", error);
          }
        } else if (event.data instanceof Blob) {
          try {
            const buffer = await event.data.arrayBuffer();

            if (buffer.byteLength < 2) {
              return;
            }
            var data = parseBinary(buffer);
            if (data && data.length > 0) {
              data.forEach((item) => {
                if (item.tk.toString() === "256265") {
                  createNiftyDataField(item);
                } else {
                  createOrdersDataField(item);
                }
                handleNewMessage(item);
              });
            }
          } catch (error) {
            console.log(error);
          }
        }
      };

      websocketRef.current.onerror = (error) => {
        if (websocketRef.current) {
          websocketRef.current.close();
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }, [websocketUrl, queryString]);

    const createInitialWatchList = () => {
      setOrdersData([])
      defaultWatchlist.forEach((item) => {
        if (item.token !== 256265) {
          setOrdersData((prev) => {
            // Check if the order already exists
            let existingOrderIndex = prev.findIndex(
              (prevItem) => parseInt(item.tk) === parseInt(prevItem.tk)
            );
            if (existingOrderIndex === -1) {
              let newItem = {
                tk: item.token,
                lp: 0,
                pc: 0,
                o: 0,
                name: item.tsym,
              };
              return [...prev, newItem];
            } else {
              return [...prev];
            }
          });
        }
      });
    };

    const createNiftyDataField = (data) => {
      if (data && data.lp && data.pc) {
        const date = new Date(data.exchangeTime * 1000);
        var time = date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });
        if (time === "Invalid Date") {
          time = new Date();
          time = time.toLocaleTimeString();
        }
        setNiftyData((order) => {
          return {
            ...order,
            lp: data.lp,
            pc: data.pc.toFixed(2),
            time: time,
            o: data.closePrice || data.openPrice || 0,
          };
        });
      } else if (data && data.lp && data.closePrice && data.mode === "ltp") {
        let time = new Date();
        time = time.toLocaleTimeString();
        let pc = (((data.lp - data.closePrice) / data.lp) * 100).toFixed(2);
        setNiftyData((order) => {
          return {
            ...order,
            lp: data.lp,
            pc: pc,
            time: time,
            o: data.closePrice,
          };
        });
      }
    };

    const createOrdersDataField = (data) => {
      if (data && data.lp && data.pc) {
        setOrdersData((prev) => {
          // Check if the order already exists
          const existingOrderIndex = prev.findIndex(
            (item) => parseInt(item.tk) === parseInt(data.tk)
          );

          if (existingOrderIndex !== -1) {
            // Update existing order
            return prev.map((item, index) => {
              if (index === existingOrderIndex) {
                const updatedOrder = {
                  ...item,
                  lp: data.lp,
                  pc: data.pc.toFixed(2),
                  o: data.closePrice || data.openPrice || item.o || 0,
                };
                if (!item.name && data.tk) {
                  updatedOrder.name = searchStockName(data.tk);
                }
                return updatedOrder;
              }
              return item;
            });
          } else {
            // Add new order
            const newOrder = {
              tk: data.tk,
              lp: data.lp,
              pc: data.pc.toFixed(2),
              o: data.closePrice || data.openPrice,
              name: data.name || (data.tk ? searchStockName(data.tk) : ""),
            };
            return [...prev, newOrder];
          }
        });
      } else if (data && data.lp && data.closePrice && data.mode === "ltp") {
        let time = new Date();
        time = time.toLocaleTimeString();
        let pc = (((data.lp - data.closePrice) / data.lp) * 100).toFixed(2);
        setOrdersData((prev) => {
          const existingOrderIndex = prev.findIndex(
            (item) => parseInt(item.tk) === parseInt(data.tk)
          );

          if (existingOrderIndex !== -1) {
            return prev.map((item, index) => {
              if (index === existingOrderIndex) {
                const updatedOrder = {
                  ...item,
                  lp: data.lp,
                  pc: pc,
                  o: data.closePrice,
                };
                if (!item.name && data.tk) {
                  updatedOrder.name = searchStockName(data.tk);
                }
                return updatedOrder;
              }
              return item;
            });
          } else {
            const newOrder = {
              tk: data.tk,
              lp: data.lp,
              pc: pc,
              o: data.closePrice,
              name: data.name || (data.tk ? searchStockName(data.tk) : ""),
            };
            return [...prev, newOrder];
          }
        });
      }
    };

    const parseBinary = (buffer) => {
      const packets = splitPackets(buffer);
      const parsedData = [];

      for (const packet of packets) {
        const dataView = new DataView(packet);
        let offset = 0;
        const instrumentToken = dataView.getUint32(offset, false);
        offset += 4;

        let divisor = 100;

        let tickData = { tk: instrumentToken };

        switch (packet.byteLength) {
          case 8:
            tickData.mode = "ltp";
            tickData.lp = (dataView.getUint32(offset, false) / divisor).toFixed(
              2
            );
            offset += 4;
            break;
          case 12:
            tickData.mode = "ltp";
            tickData.lp = (dataView.getUint32(offset, false) / divisor).toFixed(
              2
            );
            offset += 4;
            tickData.closePrice = dataView.getUint32(offset, false) / divisor;
            offset += 4;
            break;
          case 28:
            tickData.mode = packet.byteLength === 28 ? "quote" : "full";
            tickData.lp = (dataView.getUint32(offset, false) / divisor).toFixed(
              2
            );
            offset += 4;
            tickData.h = dataView.getUint32(offset, false) / divisor;
            offset += 4;
            tickData.l = dataView.getUint32(offset, false) / divisor;
            offset += 4;
            tickData.openPrice = dataView.getUint32(offset, false) / divisor;
            offset += 4;
            tickData.closePrice = dataView.getUint32(offset, false) / divisor;
            offset += 4;
            tickData.pc = dataView.getUint32(offset, false);

            if (tickData.closePrice !== 0) {
              tickData.pc =
                ((tickData.lp - tickData.closePrice) * 100) /
                tickData.closePrice;
            }
            break;
          case 32: // Index Quote / Full Mode
            tickData.mode = packet.byteLength === 28 ? "quote" : "full";
            tickData.lp = (dataView.getUint32(offset, false) / divisor).toFixed(
              2
            );
            offset += 4;
            tickData.h = dataView.getUint32(offset, false) / divisor;
            offset += 4;
            tickData.l = dataView.getUint32(offset, false) / divisor;
            offset += 4;
            tickData.openPrice = dataView.getUint32(offset, false) / divisor;
            offset += 4;
            tickData.closePrice = dataView.getUint32(offset, false) / divisor;
            offset += 4;
            tickData.pc = dataView.getUint32(offset, false);

            if (tickData.closePrice !== 0) {
              tickData.pc =
                ((tickData.lp - tickData.closePrice) * 100) /
                tickData.closePrice;
            }

            if (packet.byteLength === 32) {
              tickData.exchangeTimestamp = dataView.getUint32(offset, false);
              offset += 4;
            }
            break;

          case 44:
            tickData.mode = packet.byteLength === 44 ? "quote" : "full";
            tickData.lp = (dataView.getUint32(offset, false) / divisor).toFixed(
              2
            );
            offset += 4;
            tickData.ltq = dataView.getUint32(offset, false);
            offset += 4;
            tickData.averagePrice = dataView.getUint32(offset, false) / divisor;
            offset += 4;
            tickData.v = dataView.getUint32(offset, false);
            offset += 4;
            tickData.totalBuyQuantity = dataView.getUint32(offset, false);
            offset += 4;
            tickData.totalSellQuantity = dataView.getUint32(offset, false);
            offset += 4;
            tickData.openPrice = dataView.getUint32(offset, false) / divisor;
            offset += 4;
            tickData.h = dataView.getUint32(offset, false) / divisor;
            offset += 4;
            tickData.l = dataView.getUint32(offset, false) / divisor;
            offset += 4;
            tickData.closePrice = dataView.getUint32(offset, false) / divisor;
            offset += 4;

            if (tickData.closePrice !== 0) {
              tickData.pc =
                ((tickData.lp - tickData.closePrice) * 100) /
                tickData.closePrice;
            }
            break;
          case 184: // Quote, Full Mode, or Extended Depth
            tickData.mode = packet.byteLength === 44 ? "quote" : "full";
            tickData.lp = (dataView.getUint32(offset, false) / divisor).toFixed(
              2
            );
            offset += 4;
            tickData.lastTradedQuantity = dataView.getUint32(offset, false);
            offset += 4;
            tickData.averagePrice = dataView.getUint32(offset, false) / divisor;
            offset += 4;
            tickData.v = dataView.getUint32(offset, false);
            offset += 4;
            tickData.totalBuyQuantity = dataView.getUint32(offset, false);
            offset += 4;
            tickData.totalSellQuantity = dataView.getUint32(offset, false);
            offset += 4;
            tickData.openPrice = dataView.getUint32(offset, false) / divisor;
            offset += 4;
            tickData.h = dataView.getUint32(offset, false) / divisor;
            offset += 4;
            tickData.l = dataView.getUint32(offset, false) / divisor;
            offset += 4;
            tickData.closePrice = dataView.getUint32(offset, false) / divisor;
            offset += 4;

            if (tickData.closePrice !== 0) {
              tickData.pc =
                ((tickData.lp - tickData.closePrice) * 100) /
                tickData.closePrice;
            }

            if (packet.byteLength >= 184) {
              tickData.lastTradeTime = dataView.getUint32(offset, false);
              offset += 4;
              tickData.oi = dataView.getUint32(offset, false);
              offset += 4;
              tickData.oiDayHigh = dataView.getUint32(offset, false);
              offset += 4;
              tickData.oiDayLow = dataView.getUint32(offset, false);
              offset += 4;
              tickData.exchangeTimestamp = dataView.getUint32(offset, false);
              offset += 4;

              tickData.depth = { buy: [], sell: [] };
              let depthSize = packet.byteLength === 184 ? 10 : 40;

              for (let j = 0; j < depthSize; j++) {
                const quantity = dataView.getUint32(offset, false);
                offset += 4;
                const price = dataView.getUint32(offset, false) / divisor;
                offset += 4;
                const orders = dataView.getUint16(offset, false);
                offset += 2;
                offset += 2; // Skip padding
                tickData.depth[j < depthSize / 2 ? "buy" : "sell"].push({
                  quantity,
                  price,
                  orders,
                });
              }
            }
            break;
        }

        parsedData.push(tickData);
      }

      return parsedData;
    };

    const splitPackets = (buffer) => {
      const numPackets = new DataView(buffer).getUint16(0, false);
      let offset = 2;
      const packets = [];

      for (let i = 0; i < numPackets; i++) {
        const packetSize = new DataView(buffer).getUint16(offset, false);
        offset += 2;
        packets.push(buffer.slice(offset, offset + packetSize));
        offset += packetSize;
      }

      return packets;
    };

    useEffect(() => {
      if (triggerGetWatchList) {
        connectWebSocket();
      }
    }, [watchList]);

    const triggerGetOrders = () => {
      getOrders();
    };

    const subscribeTouchline = (scrip) => {
      if (
        websocketRef.current &&
        websocketRef.current.readyState === WebSocket.OPEN
      ) {
        let connectRequest = {
          a: "subscribe",
          v: [parseInt(scrip.token)],
        };
        websocketRef.current.send(JSON.stringify(connectRequest));
      } else {
        console.error("WebSocket is not open yet.");
      }
    };

    function subscribeDepth(scrip) {
      let connectRequest = {
        a: "mode",
        v: [depthMode, [parseInt(scrip.token)]],
      };
      websocketRef.current.send(JSON.stringify(connectRequest));
    }

    return (
      <>
        <div
          id="watchlist-toolbar"
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px",
            position: "relative",
            marginTop: "10px",
          }}
        >
          <button
            id="save-watch-list-local"
            className="tooltip"
            onClick={(e) => {
              e.stopPropagation();
              saveWatchListToLocal();
            }}
          >
            <i className="fa-solid fa-sd-card"></i>
            <span className="tooltiptext">Save to Local</span>
          </button>
          <button
            id="edit-watch-list"
            className="tooltip"
            onClick={(e) => {
              e.stopPropagation();
              editWatchList();
            }}
          >
            <i className="fa-solid fa-pen-to-square"></i>
            <span className="tooltiptext">Edit Watchlist</span>
          </button>
        </div>
        <div
          className="scroll-box"
          style={{
            display: "flex",
            flexDirection: "column",
            color: "#ffffff",
          }}
        >
          <div
            className="nifty-tag"
            style={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              justifyContent: "space-between",
            }}
            onClick={getNiftyChart}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                width: "55%",
                justifyContent: "space-between",
                paddingLeft: "5px",
              }}
            >
              <span>Nifty 50</span>
              <span
                id="nifty-lp"
                style={{
                  color:
                    parseFloat(niftyData.lp - niftyData.o) >= 0
                      ? "#00c853"
                      : "#ff3d00",
                  textAlign: "right",
                }}
              >
                {niftyData.lp}
              </span>
            </div>
            <div
              style={{
                textAlign: "right",
                paddingRight: "5px",
                width: "33.33%",
              }}
            >
              <span
                style={{
                  color:
                    parseFloat(niftyData.lp - niftyData.o) >= 0
                      ? "#00c853"
                      : "#ff3d00",
                  fontSize: "13px"
                }}
              >
                {parseFloat(niftyData.lp - niftyData.o) >= 0 ? "+" : ""}
                {parseFloat(niftyData.lp - niftyData.o).toFixed(2)} (
                {niftyData.pc}%)
              </span>
            </div>
          </div>
          <div
            id="orders-tag"
            style={{ display: "flex", flexDirection: "column" }}
          >
            {ordersData.map((order) => (
              <div
                key={order.name + "-data-" + order.tk}
                className="order-tag"
                id={`order-${order.tk}`}
                data-token={order.tk}
                data-name={order.name}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "55%",
                    justifyContent: "space-between",
                    paddingLeft: "5px",
                  }}
                >
                  <span
                    style={{
                      color: "#a0a0a0",
                      fontSize: "143x"
                    }}
                  >
                    {order.name}
                  </span>
                  <span
                    style={{
                      color:
                        parseFloat(order.lp - order.o) >= 0
                          ? "#00c853"
                          : "#ff3d00",
                      textAlign: "right",
                    }}
                  >
                    {order.lp}
                  </span>
                </div>
                <div
                  style={{
                    alignItems: "center",
                    width: "33.33%",
                    textAlign: "right",
                    paddingRight: "5px",
                  }}
                >
                  <span
                    style={{
                      color:
                        parseFloat(order.lp - order.o) >= 0
                          ? "#00c853"
                          : "#ff3d00",
                      fontSize: "13px",
                      textAlign: "right",
                    }}
                  >
                    {parseFloat(order.lp - order.o) >= 0 ? "+" : ""}
                    {parseFloat(order.lp - order.o).toFixed(2)} ({order.pc}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }
);

export default Tags;
