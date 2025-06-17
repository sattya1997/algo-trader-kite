import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { uid, postRequest } from "../utility/config";
import { searchInstruments } from "../utility/mapping";

const SearchBox = forwardRef(({ handleBtnClick }, ref) => {
  useImperativeHandle(ref, () => ({
    closeSearchList,
  }));
  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState([]);
  const searchTimeoutRef = useRef(null);
  const userToken = localStorage.getItem("kite-userToken");
  const searchContainerRef = useRef(null);

  useEffect(() => {
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
  }, [])

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

    const searchInputElement = document.getElementById("search-input");
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
    if (scrips && scrips.length > 0) setResults(scrips);
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

  return (
    <div className="search-container" ref={searchContainerRef}>
      <div className="search-box">
        <input
          type="text"
          className="search-input"
          id="search-input"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search..."
        />
        <span className="search-icon">🔍</span>
      </div>
      <div
        className="search-result-container"
        style={{ marginTop:  results.length > 0 ? '45px': '-450px', opacity: results.length > 0 ? '1': '0'}}
      >
        <ul className="results-list">
          {results.map((item) => (
            <li key={item.token} className="result-item">
              <span>
                {item.exch}: {item.tsym} - {item.token}
              </span>
              <br />
              <span>
                {item.exch === "NSE" && (
                  <button className="auto" onClick={() => handleBtnClick("buy", item.token)}>Buy</button>
                )}
                
                <button className="search-list-btn" onClick={() => handleBtnClick("card", item.token, item.tsym)}>Card</button>
                {item.exch === "NSE" && (
                  <button className="cancel" onClick={() => handleBtnClick("sell", item.token)}>Sell</button>
                )}
                <button style={{ backgroundColor: "#5bd3bb" }} onClick={() => handleBtnClick("chart", item.token, item.tsym.split('-')[0])}>
                  <a>Chart</a>
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
});

export default SearchBox;
