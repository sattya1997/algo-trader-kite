import React, { useState, useEffect } from "react";
import { postRequest } from "../utility/config";
import Holding from "./Holding";

const HoldingsTab = ({ trigger }) => {
  const [holdings, setHoldings] = useState([]);
  const userToken = localStorage.getItem("kite-userToken");
  const [totalBuyVal, setTotalBuyVal] = useState(0.0);
  const [currentValues, setCurrentValues] = useState([]);
  const [totalCurrent, setTotalCurrent] = useState(0.0);

  useEffect(() => {
    const getHoldings = () => {
      const jData = {
      };
      const jKey = userToken;

      //const res = postRequest("holdings", {token: userToken});
      // res.then((response) => {
      //   const holdings = response.data;
      //   if (holdings.length > 0) {
      //     setHoldings(response.data);
      //     let totalBuy = 0.0;
      //     response.data.forEach((item) => {
      //       const buyVal = parseFloat(item.npoadqty) * parseFloat(item.upldprc);
      //       totalBuy += buyVal;
      //     });
      //     setTotalBuyVal(totalBuy.toFixed(2));
      //   }
      // });
    };

    getHoldings();
  }, []);

  const updateTotalCurVal = (token, val) => {
    setCurrentValues((prev) => {
      const updatedValues = { ...prev, [token]: val };
      return updatedValues;
    });
  };

  useEffect(() => {
    setTotalCurrent(Object.values(currentValues).reduce((acc, val) => acc + parseFloat(val), 0).toFixed(2))
  }, [currentValues]);

  return (
    <div id="holding-list">
      {holdings.length > 0 ? (
        <>
          <div className="flex flex-row gap-7 text-yellow-50 text-sm mt-3 mb-3 items-center justify-center">
            <div className="flex flex-col"><span>EQ Invested</span><span style={{color: "#ababff"}}> {totalBuyVal}</span></div>
            <div className="flex flex-col"><span>Current Val</span><span style={{color: totalBuyVal > totalCurrent ? "#f26767": "#7adf7a"}}>{totalCurrent}</span></div>
            <div className="flex flex-col"><span>Gain/Loss</span><span style={{color: totalBuyVal > totalCurrent ? "#f26767": "#7adf7a"}}>{parseFloat((totalCurrent - totalBuyVal)).toFixed(2)}({parseFloat((totalCurrent - totalBuyVal)*100/totalBuyVal).toFixed(2)}%)</span></div>
          </div>
          {holdings.map((item) => {
            const name = item.exch_tsym[0].tsym.split("-")[0];
            const buyVal = (
              parseFloat(item.npoadqty) * parseFloat(item.upldprc)
            ).toFixed(2);
            const token = item.exch_tsym[0].token;
            const upldPrc = item.upldprc;
            const npoadQty = item.npoadqty;
            return (
              <Holding
                trigger={trigger}
                token={token}
                name={name}
                buyVal={buyVal}
                npoadQty={npoadQty}
                upldPrc={upldPrc}
                key={token}
                updateTotalCurVal={updateTotalCurVal}
              />
            );
          })}
        </>
      ) : (
        <div style={{ color: "whitesmoke" }}>No holdings available</div>
      )}
    </div>
  );
};

export default HoldingsTab;
