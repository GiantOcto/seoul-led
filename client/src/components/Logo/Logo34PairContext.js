import React, { createContext, useContext, useEffect, useState } from "react";

/** true → Logo3, false → Logo4 (기존 showLogo3 / showLogo1 과 동일) */
const Logo34PairContext = createContext(true);

export function Logo34PairProvider({ children }) {
  const [showLogo3, setShowLogo3] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setShowLogo3((prev) => !prev), 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <Logo34PairContext.Provider value={showLogo3}>
      {children}
    </Logo34PairContext.Provider>
  );
}

export function useLogo34Pair() {
  return useContext(Logo34PairContext);
}
