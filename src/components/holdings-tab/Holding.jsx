import React, { useState, useEffect } from "react";
import { uid, postRequest } from "../utility/config";

const Holding = ({ trigger, token, name, buyVal, npoadQty, upldPrc, updateTotalCurVal }) => {
  const [curVal, setCurVal] = useState(null);
  const [pnl, setPnl] = useState(null);
  const userToken = localStorage.getItem("kite-userToken");
  const [lastPrice, setLastPrice] = useState(0);

  useEffect(() => {
    if (trigger && trigger.tk && trigger.tk === token) {
      const ltp = trigger.lp;
      if (ltp !== undefined) {
        var val = parseFloat(npoadQty * ltp).toFixed(2);
        setCurVal(val);
        updateTotalCurVal(trigger.tk, val);
        setLastPrice(ltp);
      }
    }
  }, [trigger]);

  useEffect(() => {
    const jData = {
      uid: uid,
      token: token.toString(),
      exch: "NSE",
    };
    const jKey = userToken;

    postRequest("getquotes", jData, jKey)
      .then((res) => {
        if (res.data.stat === "Ok") {
          var val = parseFloat(res.data.lp*npoadQty).toFixed(2);
          setLastPrice(res.data.lp)
          setCurVal(val);
          updateTotalCurVal(res.data.token, val);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }, [token]);

  useEffect(()=> {
    setPnl(parseFloat(curVal - buyVal).toFixed(2));
  }, [curVal])

  return (
    <div className="holding-item">
      <div className="flex flex-col">
        <span>{name}</span>
        <span>{npoadQty} @ {upldPrc}</span>
      </div>

      <div className="flex flex-col">
        <span>Buy: {buyVal}</span>
        <span id={`watch-pl-buy-${token}`} style={{color: pnl > 0 ? 'white': 'red'}}>Cur: {curVal}</span>
      </div>
      <div className="flex flex-col">
        <span className="watch-pl" style={{ fontWeight: 600, fontSize:'11px', color: pnl > 0 ? 'white': 'red' }}>
          {pnl}({parseFloat((curVal-buyVal)/buyVal*100).toFixed(2)}%)
        </span>
        <span className="text-cyan-500">{lastPrice}</span>
      </div>
    </div>
  );
};

export default Holding;
