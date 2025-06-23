import React, { useState, useEffect, useRef } from "react";
import { uid, postRequest } from "../utility/config";
import { searchInstruments } from "../utility/mapping";

const WatchlistPopup = ({ closeWatchList, triggerTouchLine }) => {
  const [watchList, setWatchList] = useState([]);
  const [searchInput, setSearchInput] = useState("");

  const [refresh, setRefresh] = useState(false);

  const searchTimeoutRef = useRef(null);
  const [results, setResults] = useState([]);

  const [showResults, setShowResults] = useState(false);

  const userToken = localStorage.getItem("kite-userToken");
  const wlCode = "kite-watch-list-660";

  useEffect(() => {
    fetchWatchList();
  }, [refresh]);

  const fetchWatchList = async () => {
    setWatchList([]);
    let storedLocalWL = localStorage.getItem(wlCode);

    if (storedLocalWL) {
      storedLocalWL = JSON.parse(storedLocalWL);
          console.log(storedLocalWL)
      if (storedLocalWL && storedLocalWL.length > 0) setWatchList(storedLocalWL);
    }
    // const jData = {
    //   uid: uid,
    //   wlname: "pro",
    // };
    // postRequest("watchlist", jData, userToken).then((response) => {
    //   if (response && response.data && response.data.values)
    //     setWatchList(response.data.values);
    // });
  };

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

    const searchInputElement = document.getElementById("search-bar");
    searchInputElement.addEventListener("keyup", handleSearchChange);

    return () => {
      if (searchInputElement) {
        searchInputElement.removeEventListener("keyup", handleSearchChange);
      }
    };
  }, []);

  const searchScrip = async (input) => {
    if (!input) return;

    let scrips = searchInstruments(input);
    if ( scrips && scrips.length > 0) {
      setResults(scrips);
      setShowResults(true);
    } else {
      console.log("Search failed:");
    }

    // const jData = {
    //   uid: uid,
    //   stext: input.toString(),
    //   exch: ["NSE", "BSE"],
    // };

    // try {
    //   const res = await postRequest("searchscrip", jData, userToken);
    //   const data = res.data;
    //   if (data.stat === "Ok") {
    //     setResults(data.values);
    //     setShowResults(true);
    //   } else if (data.stat === "Not_Ok") {
    //     window.location.href = "./login.html";
    //   } else {
    //     console.log("Search failed:", data.emsg);
    //   }
    // } catch (err) {
    //   console.error(err);
    // }
  };

  const addStock = async (token, tsym) => {
    let newList = [...watchList, {tsym: tsym, token: parseInt(token)}];
    localStorage.setItem(wlCode, JSON.stringify(newList));
    setWatchList(newList);
    triggerTouchLine({token: token, tsym: tsym.split('-')[0]});

    setRefresh(!refresh);
    removeSearchWatchList();
 
    // const jData = {
    //   uid: uid,
    //   wlname: "pro",
    //   scrips: `NSE|${token}`,
    // };
    // const jKey = userToken;
    // postRequest("watchlist_add", jData, jKey)
    //   .then((response) => {
    //     if (response && response.data && response.data.stat === "Ok") {
    //       triggerTouchLine({token: token, tsym: tsym.split('-')[0]});
    //       setRefresh(!refresh);
    //       removeSearchWatchList();
    //     }
    // });
  };

  const removeStock = async (token) => {
    if (token) {
      let newList = watchList.filter(item => item.token != token);
      localStorage.setItem(wlCode, JSON.stringify(newList));
      setWatchList(newList);
      setRefresh(!refresh);
      fetchWatchList();

    //   const jData = {
    //     uid: uid,
    //     wlname: "pro",
    //     scrips: `NSE|${token}`,
    //   };
    //   const jKey = userToken;
    //  postRequest("watchlist_delete", jData, jKey)
    //   .then((response) => {
    //     if (response && response.data && response.data.stat === "Ok") {
    //       setRefresh(!refresh);
    //       fetchWatchList();
    //     }
    //   });
    }
  }

  const removeSearchWatchList = () => {
    setResults([]);
    setShowResults(false);
  };

  return (
    <div id="popup-overlay-watch-list" className="popup-overlay-watch-list">
      <div className="popup-watch-list" id="popup-watch-list">
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <span className="close-modal" onClick={closeWatchList}></span>
        </div>
        <div style={{ position: "relative" }}>
          <input
            type="text"
            id="search-bar"
            placeholder="Search for stocks..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        {showResults && (
          <div id="watch-search-container">
            {results && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginRight: "5px",
                    marginTop: "3px",
                  }}
                >
                  <span
                    className={"close-modal"}
                    onClick={removeSearchWatchList}
                  ></span>
                </div>
                <ul>
                  {" "}
                  {results.map((stock) => (
                    <li className={"watch-result-item"} key={stock.token}>
                      <span>
                        {stock.exch}: {stock.tsym} - {stock.token}
                      </span>
                      <button onClick={() => addStock(stock.token, stock.tsym)}>Add</button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
        <div className="watch-list">
          {watchList.map((stock) => (
            <div
              key={stock.token}
              className="watch-list-stock-item"
              data-token={stock.token}
            >
              <span style={{ color: "whitesmoke" }}>{stock.tsym}</span>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "4px",
                }}
              >
                <span
                  className="close-modal"
                  onClick={() => removeStock(stock.token)}
                ></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WatchlistPopup;
