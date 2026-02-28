// import { useEffect, useState } from "react";

const QuaLoanPixel = () => {
//   const [transactionId, setTransactionId] = useState("");

//   useEffect(() => {
//     const params = new URLSearchParams(window.location.search);
//     const tid = params.get("transaction_id") || "default_id";
//     setTransactionId(tid);
//   }, []);

  const pixelUrl = `https://www.intellectadz.com/track/conversion.asp?cid=3249&conversionType=1&key=TRANSACTION_ID&opt1=&opt2=&opt3=`;

  return (
    <img
      src={pixelUrl}
      height="1"
      width="1"
      alt=""
      style={{ display: "none" }}
    />
  );

};

export default QuaLoanPixel;