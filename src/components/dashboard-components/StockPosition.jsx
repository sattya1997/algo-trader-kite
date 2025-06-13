import React from "react";
import { searchStockName } from "../utility/mapping";

const StockPosition = ({ orderDetailsForPnL }) => {

  return (
    <div>
      <span className="text-pink-300">Positions</span>
      <div id="position">
        {orderDetailsForPnL.length > 0 ? (
          orderDetailsForPnL.map((result) => {
            const token = result.stock;
            let name = searchStockName(token);
            let pnl = result.totalPnL;
            const color = pnl > 0 ? "#45f8f8" : pnl < 0 ? "#ff9898" : "#d2d2d2";
            pnl = pnl > 0 ? `+${pnl}` : pnl;

            return (
              <div
                key={token}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span>{name}:&nbsp;&nbsp;</span>
                <span style={{ color: color }} id={'position-'+token}>{pnl}</span>
              </div>
            );
          })
        ) : (
          <div style={{color: 'whitesmoke'}}>No postion yet</div>
        )}
      </div>
    </div>
  );
};

export default StockPosition;
