import React, { ReactNode, createContext, useContext } from "react";
import { useWeb3 } from "../hooks/web3.hook";
import { Web3ProviderState, web3InitialState } from "../reducers";

const Web3Context = createContext<Web3ProviderState>(web3InitialState);

interface Props {
  children: ReactNode;
}

export const Web3ContextProvider: React.FC<Props> = ({ children }) => {
  const web3ProviderState = useWeb3();

  return (
    <Web3Context.Provider value={web3ProviderState}>
      {children}
    </Web3Context.Provider>
  );
};

export function useWeb3Context() {
  return useContext(Web3Context);
}
