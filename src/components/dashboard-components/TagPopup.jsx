import React, { useEffect, useRef } from 'react';

const TagPopup = ({ name, tokenId, orderTagRect, closePopup, handleBuy, handleSell, addToDetailsList, setData }) => {
  const popupRef = useRef(null);

  useEffect(() => {
    if (popupRef.current) {
      let left = 0;

      left = window.innerWidth < 450 ? window.innerWidth/2 - 120 : 100;
      if (window.innerWidth > 700) {
        left = window.innerWidth * .07
      }
      console.log(left)
      let top = orderTagRect.top - 40 + window.scrollY;
      popupRef.current.style.left = `${left}px`;
      popupRef.current.style.top = `${top}px`;
    }
  }, [orderTagRect]);

  return (
    <div id="dynamic-popup" ref={popupRef} style={{ position: 'absolute' }}>
      <span id="dynamic-popup-top">
        <p id="dynamic-popup-title">{name}</p>
        <div className="close-modal" onClick={closePopup} id='btn-close-dynamic-popup'></div>
      </span>
      <button style={{ backgroundColor: '#bbffbb' }} onClick={() => handleBuy(tokenId)}>Buy</button>
      <button style={{ backgroundColor: '#ff9898' }} onClick={() => handleSell(tokenId)}>Sell</button>
      <button style={{ backgroundColor: '#9e5fa9' }} onClick={() => addToDetailsList(tokenId, name)}>Card</button>
      <button style={{ backgroundColor: 'rgb(155, 255, 155)' }} data-name={name} onClick={(e) => setData(tokenId, e.target)}>Chart</button>
    </div>
  );
};

export default TagPopup;
