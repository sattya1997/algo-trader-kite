import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { uid, postRequest } from "../utility/config";
import AutoItem from "./AutoItem";
import AutoChart from "./AutoChart";
import { searchInstruments } from "../utility/mapping";

const Automation = forwardRef(
  ({ trigger, depth, triggerSubscribeTouchline }, ref) => {
    useImperativeHandle(ref, () => ({ updateAutomationDataFromOrders }));
    const [searchInput, setSearchInput] = useState("");
    const [results, setResults] = useState([]);
    const searchTimeoutRef = useRef(null);
    const userToken = localStorage.getItem("kite-userToken");
    const searchContainerRef = useRef(null);

    const [automationData, setAutomationData] = useState([]);
    const [autoQty, setAutoQty] = useState(30);

    const [analyzeData, setAnalyzeData] = useState([]);

    const [niftyChartActive, setNiftyChartActive] = useState(false);

    const [autoChartActive, setAutoChartActive] = useState(false);
    const [autoChartToken, setAutoChartToken] = useState("");
    const regSliceNumber = 120;

    useEffect(() => {
      let autoData = localStorage.getItem("auto-data");
      if (autoData) {
        autoData = autoData.split("/");
        const tempData = [];
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
          setAutomationData(tempData);
        }
      }
      const handleClickOutside = (event) => {
        if (
          searchContainerRef.current &&
          !searchContainerRef.current.contains(event.target)
        ) {
          closeSearchList();
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    useEffect(() => {
      var tempData = "";
      if (automationData.length > 0) {
        automationData.forEach((data, index) => {
          if (index === 0) {
            tempData =
              data.token +
              "," +
              data.name +
              "," +
              data.qty +
              "," +
              data.buyPending +
              "," +
              data.sellPending +
              "," +
              data.bought +
              "," +
              data.buyPrice;
          } else {
            tempData =
              tempData +
              "/" +
              data.token +
              "," +
              data.name +
              "," +
              data.qty +
              "," +
              data.buyPending +
              "," +
              data.sellPending +
              "," +
              data.bought +
              "," +
              data.buyPrice;
          }
        });
      }
      localStorage.setItem("auto-data", tempData);
    }, [automationData]);

    useEffect(() => {
      const handleSearchChange = (event) => {
        const input = event.target.value;
        setSearchInput(input);
        if (event.key === "Enter") {
          searchScrip(input);
        } else {
          clearTimeout(searchTimeoutRef.current);
          searchTimeoutRef.current = setTimeout(() => {
            searchScrip(input);
          }, 500);
        }
      };

      const searchInputElement = document.getElementById(
        "search-input-automation"
      );
      searchInputElement.addEventListener("keyup", handleSearchChange);

      return () => {
        if (searchInputElement) {
          searchInputElement.removeEventListener("keyup", handleSearchChange);
        }
      };
    }, []);

    useEffect(() => {
      const now = new Date();
      const marketEndTime = new Date(now);
      marketEndTime.setHours(15, 30, 0, 0);

      if (now > marketEndTime) {
        return;
      }
      analyzeMarket();

      const startAnalyzing = setInterval(() => {
        analyzeMarket();
      }, 30000);

      return () => {
        clearInterval(startAnalyzing);
      };
    }, [automationData]);

    const updateAutomationDataFromOrders = (data) => {
      setAutomationData(data);
    };

    async function getNiftyHistoricalData(startOfDay) {
      const payload = {
        token: userToken,
        instrument_token: 256265,
        from: startOfDay,
        to: startOfDay,
        interval: "minute",
      };

      try {
        const res = await postRequest("TPSeries", payload);
        let ohlcData = res.data;

        if (ohlcData && ohlcData.historicalData) {
          ohlcData = ohlcData.historicalData.map((element) => {
            let time = new Date(element.date);
            time = Math.floor((time.getTime() + 5.5 * 3.6) / 1000);
            return {
              time,
              open: element.open,
              high: element.high,
              low: element.low,
              close: element.close,
              volume: element.volume,
            };
          });
          return ohlcData;
        } else {
          return [];
        }
      } catch (error) {
        console.error("Error fetching OHLC data:", error);
        return [];
      }
    }

    async function analyzeMarket() {
      var stockAnalyzeData = [];
      var getRSICount = 0;
      let toTimestamp = Math.floor(Date.now() / 1000);
      const now = new Date();
      const marketEndTime = new Date(now);
      marketEndTime.setHours(15, 30, 0, 0);

      if (now > marketEndTime) {
        return;
      }
      let startOfDay = now.toISOString().split("T")[0];
      var niftyOhlcData = await getNiftyHistoricalData(startOfDay);

      for (let index = 0; index < automationData.length; index++) {
        var regData = {};
        var STA = 0;
        var LTA = 0;
        var LTMB = 0;
        var LTUB = 0;
        var LTLB = 0;

        var STMB = 0;
        var STUB = 0;
        var STLB = 0;

        var standardDeviationWithSma = 0;
        let token = automationData[index].token;
        try {
          let payload = {
            token: userToken,
            instrument_token: token,
            from: startOfDay,
            to: startOfDay,
            interval: "minute",
          };

          if (getRSICount < automationData.length) {
            stockAnalyzeData[token] = {
              SDSMA: 0,
              LTA: 0,
              STA: 0,
              RSI: 0,
              DTA: 0,
              LTUB: 0,
              LTMB: 0,
              LTLB: 0,
              STUB: 0,
              STMB: 0,
              STLB: 0,
            };
            //RSI = await getRSI(stockSymbol);
            //stockAnalyzeData[token].RSI = RSI;
            getRSICount++;
          }

          postRequest("TPSeries", payload)
            .then(async (res) => {
              var ohlcData = res.data;
              if (ohlcData && ohlcData.historicalData) {
                ohlcData = ohlcData.historicalData;
                ohlcData = ohlcData.map((element, index) => {
                  var time = new Date(element.date);
                  time = Math.floor((time.getTime() + 5.5 * 3.6) / 1000);
                  return {
                    time: time,
                    open: element.open,
                    high: element.high,
                    low: element.low,
                    close: element.close,
                    volume: element.volume,
                  };
                });

                var today = new Date();
                today.setDate(today.getDate());
                today.setHours(9, 15, 0, 0);
                var passedMinutes = Math.floor(
                  (toTimestamp - today / 1000) / 60
                );

                if (passedMinutes > 375) {
                  passedMinutes = 375;
                }

                if (passedMinutes >= 30) {
                  //predictTrend;
                  STA = calculateMovingAverage(ohlcData.slice(-5));
                  LTA = calculateMovingAverage(ohlcData.slice(-30));
                  calculateBollingerBands(ohlcData);
                  let x = niftyOhlcData;
                  let y = ohlcData;
                  regData = linearRegression(x, y);
                  stockAnalyzeData[token].SDSMA = standardDeviationWithSma;
                  stockAnalyzeData[token].LTA = LTA;
                  stockAnalyzeData[token].STA = STA;
                  stockAnalyzeData[token].LTUB = LTUB;
                  stockAnalyzeData[token].LTMB = LTMB;
                  stockAnalyzeData[token].LTLB = LTLB;
                  stockAnalyzeData[token].STUB = STUB;
                  stockAnalyzeData[token].STMB = STMB;
                  stockAnalyzeData[token].STLB = STLB;
                  stockAnalyzeData[token].regData = regData;
                }
              }
            })
            .catch((error) => {
              console.error("Error:", error);
            });

          const calculateMovingAverage = (data) => {
            var sum = 0;
            data.forEach((value) => {
              sum += parseFloat(value.close);
            });
            sum = sum / data.length;
            return sum;
          };

          const linearRegression = (x, y) => {
            var n = 0;
            if (x.length > y.length) {
              n = y.length
            } else {
              n = x.length;
            }
            x = x.slice(5,n);
            y = y.slice(5,n);

            if (x.length > regSliceNumber) {
              x = x.slice(-regSliceNumber);
              y = y.slice(-regSliceNumber);
            }
            x = x.map(item => item.close);
            y = y.map(item => item.close);

            const sumX = x.reduce((a, b) => a + b, 0);
            const sumY = y.reduce((a, b) => a + b, 0);
            const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
            const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

            const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
            const c = (sumY - m * sumX) / n;

            return { m, c };
          }

          const calculateBollingerBands = (data, period = 3) => {
            data = data.map((element) => parseFloat(element.close));
            standardDeviationWithSma = calculateStandardDeviation(data, period);
            standardDeviationWithSma = standardDeviationWithSma.filter(
              (element) => element.sd != 0 && element.sma != 0
            );
            const newSDArray = standardDeviationWithSma.map(
              (element) => element.sd
            );
            const lastestSD =
              standardDeviationWithSma[standardDeviationWithSma.length - 1].sd;
            const avgSD =
              newSDArray.reduce((a, b) => parseFloat(a) + parseFloat(b)) /
              newSDArray.length;
            const newSmaArray = standardDeviationWithSma.map(
              (element) => element.sma
            );
            const latestSma =
              standardDeviationWithSma[standardDeviationWithSma.length - 1].sma;
            LTMB =
              newSmaArray.reduce((a, b) => parseFloat(a) + parseFloat(b)) /
              newSmaArray.length;
            LTUB = LTMB + avgSD;
            LTLB = LTMB - avgSD;

            STMB = latestSma;
            STUB = latestSma + lastestSD;
            STLB = latestSma - lastestSD;
          };

          const calculateStandardDeviation = (data, period) => {
            let sdsma = [];
            for (let index = data.length; index >= 0; index -= period) {
              let sma =
                data
                  .slice(index - period, index)
                  .reduce((sum, val) => sum + val, 0) / period;
              if (index === data.length) {
              }
              let squareValue = data
                .slice(index - period, index)
                .reduce((sum, val) => sum + Math.pow(val - sma, 2), 0);
              sdsma.push({ sd: Math.sqrt(squareValue / period), sma: sma });
            }
            sdsma.filter((n) => n);
            sdsma.reverse();
            return sdsma;
          };
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      }

      setAnalyzeData(stockAnalyzeData);
    }

    const searchScrip = async (input) => {
      if (!input) return;
      let scrips = searchInstruments(input);

      if (scrips && scrips.length > 0) {
        scrips = scrips.filter((item) => item.exch === "NSE");
        setResults(scrips);
      }

      // try {
      //   const res = await postRequest("searchscrip", jData, userToken);
      //   const data = res.data;
      //   if (data.stat === "Ok") {
      //     setResults(data.values);
      //   } else if (data.stat === "Not_Ok") {
      //     window.location.href = "./login.html";
      //   } else {
      //     console.log("Search failed:", data.emsg);
      //   }
      // } catch (err) {
      //   console.error(err);
      // }
    };

    const closeSearchList = () => {
      setSearchInput("");
      setResults([]);
    };

    const handleBtnClick = (token, tsym, qty) => {
      setAutomationData((prev) => [
        ...prev,
        {
          token,
          name: tsym,
          qty,
          buyPending: false,
          sellPending: false,
          bought: false,
          buyPrice: 0,
        },
      ]);
      closeSearchList();
      triggerSubscribeTouchline({ token: token, name: tsym });
    };

    const changeAutoQty = (e) => {
      setAutoQty(e.target.value);
    };

    const closeAutoItem = (token) => {
      setAutomationData((prev) => prev.filter((item) => item.token !== token));
      localStorage.removeItem("pro-auto-msg");
    };

    const handleCheckboxChange = () => {
      setNiftyChartActive(!niftyChartActive);
    };

    const handleAutoChart = (showAutoChart, token = "") => {
      if (token) {
        setAutoChartToken(token);
      }
      setAutoChartActive(showAutoChart);
    };

    return (
      <>
        <div className="search-container" ref={searchContainerRef}>
          <div className="search-box">
            <input
              type="text"
              className="search-input"
              id="search-input-automation"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search..."
            />
            <span className="search-icon">🔍</span>
          </div>
          <div
            className="search-result-container"
            style={{ display: results.length > 0 ? "block" : "none" }}
          >
            <span
              className="close-modal px-1 py-2"
              onClick={closeSearchList}
            ></span>
            <ul className="results-list">
              <div style={{ padding: "10px 20px" }}>
                <label style={{ color: "whitesmoke", marginRight: "10px" }}>
                  Auto quantity
                </label>
                <input
                  type="number"
                  value={autoQty}
                  style={{
                    width: "50px",
                    borderRadius: "2px",
                    height: "20px",
                    padding: "1px 2px",
                  }}
                  onChange={changeAutoQty}
                ></input>
              </div>
              {results.map((item) => (
                <li key={item.token} className="result-item">
                  <span>
                    <label>
                      {item.exch}: {item.tsym} - {item.token}
                    </label>
                    <button
                      className="auto"
                      onClick={() =>
                        handleBtnClick(item.token, item.tsym, autoQty)
                      }
                    >
                      Add
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div
          className="flex flex-col items-center justify-center"
          style={{ width: "100%" }}
        >
          <div className="flex flex-row bg-slate-900 p-1 rounded-lg shadow-lg">
            <div>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  className="form-checkbox h-3 w-5 text-blue-600"
                  checked={niftyChartActive}
                  onChange={handleCheckboxChange}
                />
                <span className="text-xs text-gray-400">Show Nifty Chart</span>
              </label>
            </div>
          </div>
          <div className="flex flex-row flex-wrap !justify-around items-center">
            {niftyChartActive && (
              <div
                className="p-1 mb-1 bg-slate-900 mr-2 mt-3"
                style={{ width: "45vw", minWidth: "360px" }}
              >
                <AutoChart token={256265} data={trigger} />
              </div>
            )}
            {autoChartActive && (
              <div
                className="p-1 bg-neutral-900 mr-2"
                style={{ width: "45vw", minWidth: "360px" }}
              >
                <AutoChart token={autoChartToken} data={trigger} />
              </div>
            )}
          </div>
        </div>
        <div className="auto-items">
          {automationData.map((item) => (
            <AutoItem
              autoItem={item}
              closeAutoItem={closeAutoItem}
              key={"auto-item-key-" + item.token}
              trigger={trigger}
              depth={depth}
              analyzeData={analyzeData}
              handleAutoChart={handleAutoChart}
            />
          ))}
        </div>
      </>
    );
  }
);

export default Automation;
