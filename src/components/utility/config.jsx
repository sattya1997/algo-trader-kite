import axios from "axios";
export var API = (function () {
  var _API = {
    endpoint: "https://kite-server.onrender.com/api",
    websocket: "wss://ws.zerodha.com/",
    eodhost: "https://shoonya.finvasia.com/chartApi/getdata/",
    debug: false,
    timeout: 7000,
  };

    //if remote server is down
    //const apiUrl = "http://localhost:1234/api";

  return {
    endpoint: function () {
      return _API.endpoint;
    },
    websocket: function () {
      return _API.websocket;
    },
    eodhost: function () {
      return _API.eodhost;
    },
    debug: function () {
      return _API.debug;
    },
    timeout: function () {
      return _API.timeout;
    },
  };
})();

const routes = {
  authorize: "/QuickAuth",
  logout: "/Logout",
  forgot_password: "/ForgotPassword",
  watchlist_names: "/MWList",
  watchlist: "/marketWatch",
  watchlist_add: "/AddMultiScripsToMW",
  watchlist_delete: "/DeleteMultiMWScrips",
  placeorder: "/placeOrder",
  modifyorder: "/modifyOrder",
  cancelorder: "/cancelOrder",
  exitorder: "/ExitSNOOrder",
  orderbook: "/getOrders",
  tradebook: "/TradeBook",
  singleorderhistory: "/SingleOrdHist",
  searchscrip: "/SearchScrip",
  TPSeries: "/getHistoricalData",
  optionchain: "/GetOptionChain",
  holdings: "/Holdings",
  limits: "/margins",
  positions: "/PositionBook",
  scripinfo: "/GetSecurityInfo",
  getquotes: "/GetQuotes",
  userDetails: "/userDetails",
  login: "/login",
  twofa: "/twofa"
};

export const API_BASE_URL = "https://kite-server.onrender.com/api";
export const USER_TOKEN_KEY = "kite-userToken";

export function postRequest(route, params) {
  let url = API.endpoint() + routes[route];
  return axios.post(url, params);
}
var totalCash = 0;
var cashAvailable = 0;

export async function getBalance(userToken) {
  postRequest("limits", {token: userToken}).then((res) => {
    const value = res.data;
    if (value.status && value.status === "success") {
      totalCash = parseFloat(value.data.equity.available.opening_balance);
      cashAvailable = parseFloat(value.data.equity.available.live_balance);
      if (totalCash > cashAvailable) {
        document.getElementById("nav-bar-cash-balance").innerHTML =
          "Used: " + Math.abs(totalCash - cashAvailable).toFixed(2);
      } else {
        document.getElementById("nav-bar-cash-balance").innerHTML =
          "Used: 0";
      }

      document.getElementById("nav-bar-total-cash").innerHTML =
        "Cash: " + parseFloat(cashAvailable).toFixed(2);
      let pnL = value.data.equity.utilised.m2m_realised;

      if (pnL < 0) {
        document.getElementById("nav-bar-pl").style.color = "#ff9898";
        document.getElementById("nav-bar-pl").innerHTML =
          "P/L: " + pnL.toFixed(2);
      } else {
        document.getElementById("nav-bar-pl").style.color = "#45f8f8";
        document.getElementById("nav-bar-pl").innerHTML =
          "P/L: " + pnL.toFixed(2);
      }
      const balanceElemetInOrder = document.getElementById("cash-balance");
      if (balanceElemetInOrder) {
        balanceElemetInOrder.textContent = parseFloat(cashAvailable).toFixed(2);
      }
    }
  });
}

export function getCashAvailable() {
  return cashAvailable;
}
