import type { NextPage } from "next";
import { useEffect } from "react";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { useWeb3Context } from "../context/web3.context";
import { Web3Button } from "../components/web3.button";
import { RPGGame__factory } from "../abi";

const providerOptions = {
  walletconnect: {
    package: WalletConnectProvider, // required
    options: {
      infuraId: "61edc118de51475da1600decfcb8ccaf",
    },
  },
};

const Home: NextPage = () => {
  const { network, address, web3Provider } = useWeb3Context();

  useEffect(() => {
    const rpg = RPGGame__factory.connect(
      "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      web3Provider!
    );
    rpg.getActiveBosses().then((bosses) => {
      console.log("bosses", bosses);
    });
  }, []);

  return (
    <div>
      <main>
        <p>
          Network:{" "}
          <code>
            {network?.name}({network?.chainId})
          </code>
        </p>
        <p>
          Address: <code>{address}</code>
        </p>
        <Web3Button />
      </main>
    </div>
  );
};

export default Home;
