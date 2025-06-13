export function updateCardBar(
  cardElement,
  openPrice,
  currentPrice,
  highPrice,
  lowPrice
) {
  if (openPrice < lowPrice) lowPrice = openPrice;
  if (openPrice > highPrice) highPrice = openPrice;
  cardElement.querySelector("#low-price").innerHTML = lowPrice;
  cardElement.querySelector("#low-price").style.fontWeight = "500";
  cardElement.querySelector("#high-price").innerHTML = highPrice;
  cardElement.querySelector("#high-price").style.fontWeight = "500";

  const currentPercentage =
    ((currentPrice - lowPrice) / (highPrice - lowPrice)) * 100;
  const openPercent = ((openPrice - lowPrice) / (highPrice - lowPrice)) * 100;

  const barElement = cardElement.querySelector("#priceBar");
  const arrowElement = cardElement.querySelector("#arrow");
  const arrowText = cardElement.querySelector("#arrowText");

  barElement.style.backgroundColor =
    currentPrice >= openPrice ? "rgb(59 136 63)" : "rgb(158 55 55)";
  barElement.style.left = `${openPercent}%`;

  arrowElement.style.left = `${currentPercentage}%`;
  arrowText.innerHTML = currentPrice;

  if (currentPrice >= openPrice) {
    let width = currentPercentage - openPercent;
    if (width+openPercent >= 100) width = 100;
    barElement.style.left = `${openPercent}%`;
    barElement.style.width = `${width}%`;
  } else {
    let left = currentPercentage;
    if (currentPercentage < 0) {
      left = 0;
    }
    barElement.style.left = `${left}%`;
    barElement.style.width = `${openPercent - currentPercentage}%`;
  }

  if (openPrice === highPrice || currentPrice === highPrice) {
    barElement.style.borderBottomRightRadius = "5px";
    barElement.style.borderTopRightRadius = "5px";
    barElement.style.borderRight = "1px solid rgb(255, 0, 0)";
  } else {
    barElement.style.borderBottomRightRadius = "0";
    barElement.style.borderTopRightRadius = "0";
    barElement.style.borderRight = "0";
  }

  if (openPrice === lowPrice || currentPrice === lowPrice) {
    barElement.style.borderBottomLeftRadius = "5px";
    barElement.style.borderTopLeftRadius = "5px";
    barElement.style.borderLeft = "1px solid rgb(0, 255, 17)";

  } else {
    barElement.style.borderBottomLeftRadius = "0";
    barElement.style.borderTopLeftRadius = "0";
    barElement.style.borderLeft ="0";
  }
}
