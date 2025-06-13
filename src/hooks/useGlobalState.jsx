import { useState } from 'react';
import { autoToken } from '../components/utility/config';

const useGlobalState = () => {
  const [globalState, setGlobalState] = useState({
    userToken: 'default value',
    orderDetailsForPnL: [],
    autoBought: false,
    autoBuyAttempt: 0,
    autoSellAttempt: 0,
    autoBuyPrice: 0,
    autoBuyPending: false,
    autoSellPending: false,
    isSubscribedOrders: false,
    graphData: [],
    candlestickData: [],
    autoToken: '',
    cashAvailable: 0,
    oldOrderValue: 0,
    // Add other state variables here
  });

  return { globalState, setGlobalState };
};

export default useGlobalState;

