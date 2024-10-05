"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { ethers } from "ethers";
import { MusicShop__factory } from "@/typechain";
import type { MusicShop } from "@/typechain";
import type { BrowserProvider } from "ethers";

import ConnectWallet from "@/components/ConnectWallet";
import WaitingForTransactionMessage from "@/components/WaitingForTransactionMessage";
import TransactionErrorMessage from "@/components/TransactionErrorMessage";

const HARDHAT_NETWORK_ID = "0x539";
const MUSIC_SHOP_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

declare let window: any;

type CurrentConnectionProps = {
  provider: BrowserProvider | undefined;
  shop: MusicShop | undefined;
  signer: ethers.JsonRpcSigner | undefined;
};

type AlbumProps = {
  index: ethers.BigNumberish;
  uid: string;
  title: string;
  price: ethers.BigNumberish;
  quantity: ethers.BigNumberish;
};

export default function Home() {
  const [networkError, setNetworkError] = useState<string>();
  const [txBeingSent, setTxBeingSent] = useState<string>();
  const [transactionError, setTransactionError] = useState<any>();
  const [currentBalance, setCurrentBalance] = useState<string>();
  const [albums, setAlbums] = useState<AlbumProps[]>([]);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [currentConnection, setCurrentConnection] = useState<CurrentConnectionProps>();

  useEffect(() => {
    (async () => {
      if (currentConnection?.provider && currentConnection.signer) {
        setCurrentBalance(
          (
            await currentConnection.provider.getBalance(
              currentConnection.signer.address,
              await currentConnection.provider.getBlockNumber()
            )
          ).toString()
        );
      }
    })();
  }, [currentConnection, txBeingSent]);

  useEffect(() => {
    (async () => {
      if (currentConnection?.shop && currentConnection.signer) {
        const newAlbums = (await currentConnection.shop.allAlbums()).map((album) => ({
          index: album.index,
          uid: album.uid,
          title: album.title,
          price: album.price,
          quantity: album.quantity,
        }));

        setAlbums(newAlbums);
        setIsOwner(
          ethers.getAddress(await currentConnection.shop.owner()) ===
            (await currentConnection.signer.getAddress())
        );
      }
    })();
  }, [currentConnection]);

  const _connectWallet = async () => {
    if (window.ethereum === undefined) {
      setNetworkError("Please install Metamask!");
      return;
    }

    if (!(await _checkNetwork())) {
      return;
    }

    const [selectedAccount] = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    await _initialize(selectedAccount);

    window.ethereum.on("accountsChanged", async ([newAccount]: [newAccount: string]) => {
      if (newAccount === undefined) {
        return _resetState();
      }

      await _initialize(newAccount);
    });

    window.ethereum.on("chainChanged", () => {
      _resetState();
    });
  };

  const _initialize = async (selectedAccount: string) => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner(selectedAccount);

    setCurrentConnection({
      provider,
      signer,
      shop: MusicShop__factory.connect(MUSIC_SHOP_ADDRESS, signer),
    });
  };

  const _resetState = () => {
    setCurrentBalance(undefined);
    setIsOwner(false);
    setAlbums([]);
    setNetworkError(undefined);
    setTransactionError(undefined);
    setTxBeingSent(undefined);
    setCurrentConnection(undefined);
  };

  const _checkNetwork = async (): Promise<boolean> => {
    const chosenChainId = await window.ethereum.request({
      method: "eth_chainId",
    });

    if (chosenChainId === HARDHAT_NETWORK_ID) {
      return true;
    }

    setNetworkError("Please connect to Hardhat network (localhost:8545)!");
    return false;
  };

  const _dismissNetworkError = () => setNetworkError(undefined);

  const _dismissTransactionError = () => setTransactionError(undefined);

  const _getRpcErrorMessage = (error: any): string => {
    console.log(error);
    if (error.data) {
      return error.data.message;
    }

    return error.message;
  };

  const _handleAddAlbum = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentConnection?.shop || !currentConnection.provider || !currentConnection.signer) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const title = formData.get("albumTitle")?.toString();
    const price = formData.get("albumPrice")?.toString();
    const quantity = formData.get("albumQty")?.toString();

    if (title && price && quantity) {
      const uid = ethers.solidityPackedKeccak256(["string"], [title]);

      try {
        const index = await currentConnection.shop.currentIndex();
        const nonce = await currentConnection.provider.getTransactionCount(
          currentConnection.signer.getAddress(),
          "latest"
        );

        const addTx = await currentConnection.shop.addAlbum(
          uid,
          title,
          BigInt(price),
          BigInt(quantity),
          { nonce }
        );

        setTxBeingSent(addTx.hash);
        await addTx.wait();

        setAlbums([...albums, { index, uid, title, price: BigInt(price), quantity: BigInt(quantity) }]);
      } catch (err) {
        setTransactionError(err);
      } finally {
        setTxBeingSent(undefined);
      }
    }
  };

  const _handleBuyAlbum = async (album: AlbumProps, event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (!currentConnection?.shop) {
      return;
    }

    try {
      const buyTx = await currentConnection.shop.buy(album.index, { value: album.price });
      setTxBeingSent(buyTx.hash);
      await buyTx.wait();

      setAlbums(
        albums.map((a) =>
          a.index === album.index ? { ...a, quantity: BigInt(a.quantity) - BigInt(1) } : a
        )
      );
    } catch (err) {
      console.error(err);
      setTransactionError(err);
    } finally {
      setTxBeingSent(undefined);
    }
  };

  const availableAlbums = () => (
    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-6">
      {albums.map((album) => (
        <li key={album.uid} className="p-6 border rounded-lg shadow-xl bg-gray-800 hover:bg-gray-700 transition-transform transform hover:-translate-y-1">
          <h3 className="text-2xl font-bold mb-2 text-yellow-400">{album.title} (#{album.index.toString()})</h3>
          <p className="text-lg text-gray-300 font-semibold">Price: {ethers.formatEther(album.price.toString())} ETH</p>
          <p className="text-lg text-gray-400">Quantity: {album.quantity.toString()}</p>
          {BigInt(album.quantity) > BigInt(0) && (
            <button
              onClick={(e) => _handleBuyAlbum(album, e)}
              className="mt-4 bg-gradient-to-r from-yellow-500 to-yellow-300 text-gray-900 px-4 py-2 rounded-lg hover:shadow-xl transition duration-300"
            >
              Buy 1 copy
            </button>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 font-sans text-gray-200">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-600 text-white py-8 shadow-2xl">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl font-extrabold tracking-wider drop-shadow-lg">Music Shop DApp</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-8 py-12 bg-gray-800 shadow-2xl rounded-xl mt-8 text-center">
        {!currentConnection?.signer && (
          <div className="flex justify-center mb-8">
            <ConnectWallet
              connectWallet={_connectWallet}
              networkError={networkError}
              dismiss={_dismissNetworkError}
            />
          </div>
        )}

        {currentConnection?.signer && (
          <div className="text-center mb-8">
            <p className="text-xl text-gray-200 font-semibold">Your address: {currentConnection.signer.address}</p>
          </div>
        )}

        {txBeingSent && (
          <div className="text-center mb-8">
            <WaitingForTransactionMessage txHash={txBeingSent} />
          </div>
        )}

        {transactionError && (
          <div className="text-center mb-8">
            <TransactionErrorMessage
              message={_getRpcErrorMessage(transactionError)}
              dismiss={_dismissTransactionError}
            />
          </div>
        )}

        {currentBalance && (
          <div className="text-center mb-8">
            <p className="text-2xl text-gray-200 font-semibold">Your ETH balance: {ethers.formatEther(currentBalance)} ETH</p>
          </div>
        )}

        {albums.length > 0 && (
          <div className="text-center">
            {availableAlbums()}
          </div>
        )}

        {isOwner && !txBeingSent && (
          <div className="flex justify-center mt-12">
            <form onSubmit={_handleAddAlbum} className="w-full max-w-lg bg-gray-700 p-10 rounded-xl shadow-2xl">
              <h2 className="text-3xl font-bold mb-6 text-yellow-400 text-center">Add a New Album</h2>

              <div className="mb-6">
                <label className="block mb-2 text-lg font-medium text-gray-300">Title:</label>
                <input
                  type="text"
                  name="albumTitle"
                  className="w-full px-4 py-3 border border-gray-500 rounded-lg focus:outline-none focus:ring-4 focus:ring-yellow-400 bg-gray-800 text-white"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block mb-2 text-lg font-medium text-gray-300">Price (ETH):</label>
                <input
                  type="text"
                  name="albumPrice"
                  className="w-full px-4 py-3 border border-gray-500 rounded-lg focus:outline-none focus:ring-4 focus:ring-yellow-400 bg-gray-800 text-white"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block mb-2 text-lg font-medium text-gray-300">Quantity:</label>
                <input
                  type="text"
                  name="albumQty"
                  className="w-full px-4 py-3 border border-gray-500 rounded-lg focus:outline-none focus:ring-4 focus:ring-yellow-400 bg-gray-800 text-white"
                  required
                />
              </div>

              <div className="text-center">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-green-500 to-green-400 text-gray-900 px-6 py-3 rounded-lg hover:shadow-xl transition duration-300"
                >
                  Add Album
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-blue-900 to-blue-600 text-white py-8 shadow-2xl mt-8">
        <div className="container mx-auto text-center">
          <p>© 2024 Music Shop DApp. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
