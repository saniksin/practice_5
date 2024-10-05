import { ethers } from "./setup";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { INativeBank } from "../typechain-types";

describe("Interact with my ETH smart contract", function () {
  const BankAddress = '0xA0c709229cD8ED1fFb2801D9a250db8aFb5c92cC';
  const GraphDepositedAddress = '0x0e7acfa3412569b0aa7842477b9a1c0a52c9d410';
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let bank: INativeBank;
  let txEthAmount = ethers.parseEther("5000.0");

  // Фикстура для подключения к контрактам
  async function connectToContracts() {
    [user1, user2] = await ethers.getSigners();

    // Создаем объект контракта INativeBank
    bank = await ethers.getContractAt("INativeBank", BankAddress, user1);
  }

  
  // Тесты по взаимодействию с контрактом банка
  describe("check network connection and current gasPrice", function () {
    
    /**
     * @dev Проверяем высоту блока
     */
    it("connected to Sepolia Network", async function () {
      await connectToContracts();
      const startBlocks = [0, 1, 2, 3];
      const block = await ethers.provider.getBlockNumber();
      expect(block).to.not.be.oneOf(startBlocks);
      console.log(`Текущая высота блока - ${block}`);
    });

    /**
     * @dev Проверяем газ 
     */
    it("actualGasPrice, maxFeePerGas, maxPriorityFeePerGas != 0", async function () {
        const gweiDecimals = 1000000000n
        const actualGasPrice = await ethers.provider.getFeeData();
        
        // Проверка, что gasPrice не null и не равно 0
        expect(actualGasPrice.gasPrice).to.not.be.null;
        expect(actualGasPrice.gasPrice!).to.not.eq(0);
  
        // Проверка, что maxFeePerGas не null и не равно 0
        expect(actualGasPrice.maxFeePerGas).to.not.be.null;
        expect(actualGasPrice.maxFeePerGas!).to.not.eq(0);
  
        // Проверка, что maxPriorityFeePerGas не null и не равно 0
        expect(actualGasPrice.maxPriorityFeePerGas).to.not.be.null;
        expect(actualGasPrice.maxPriorityFeePerGas!).to.not.eq(0);
  
        console.log(`Текущий gasPrice: ${actualGasPrice.gasPrice! / gweiDecimals} GWEI`);
        console.log(`Текущий maxFeePerGas: ${actualGasPrice.maxFeePerGas! / gweiDecimals} GWEI`);
        console.log(`Текущий maxPriorityFeePerGas: ${actualGasPrice.maxPriorityFeePerGas! / gweiDecimals} GWEI`);
    });
  });

  // проверяем баланс юзера и делаем трансфер ETH
  describe("check user balance and txTrasfer", function () {
    /**
     * @dev Проверяем балансы пользователей
     */
    it("check user balance", async function () {
      const firstUserBalance = await ethers.provider.getBalance(user1.address);
      console.log(`Current user1 balance ${ethers.formatEther(firstUserBalance)} ETH`); 

      const secondUserBalance = await ethers.provider.getBalance(user2.address);
      console.log(`Current user2 balance ${ethers.formatEther(firstUserBalance)} ETH`); 
      
      expect(firstUserBalance).not.be.eq(0);
      expect(secondUserBalance).not.be.eq(0);
      expect(secondUserBalance).be.eq(firstUserBalance);
    });

    /**
     * @dev Переводим эфир
     */
    it("should transfer 5000 ETH from user1 to user2", async function () {
      // Получаем текущие балансы пользователей
      const initialUser1Balance = await ethers.provider.getBalance(user1.address);
      const initialUser2Balance = await ethers.provider.getBalance(user2.address);
    
      console.log(`User1 initial balance: ${ethers.formatEther(initialUser1Balance)} ETH`);
      console.log(`User2 initial balance: ${ethers.formatEther(initialUser2Balance)} ETH`);
    
      // Переводим ETH от user1 к user2
      const tx = await user1.sendTransaction({
        to: user2.address,
        value: txEthAmount,
      });
    
      await tx.wait();
    
      // Получаем обновленные балансы пользователей
      const finalUser1Balance = await ethers.provider.getBalance(user1.address);
      const finalUser2Balance = await ethers.provider.getBalance(user2.address);
    
      console.log(`User1 final balance: ${ethers.formatEther(finalUser1Balance)} ETH`);
      console.log(`User2 final balance: ${ethers.formatEther(finalUser2Balance)} ETH`);
    
      expect(tx).to.changeEtherBalances([user1, user2], [-txEthAmount, txEthAmount]);
    });
  });

  // депозитим на контракт
  describe("contract deposit", function () {
    /**
     * @dev Отправляем ETH на адрес банка
     */
    it("deposit 5000 ETH to INativeBank", async function () {
      
      const bankBalanceBefore = await ethers.provider.getBalance(bank.target);
      console.log(`Bank balance before tx: ${ethers.formatEther(bankBalanceBefore)} ETH`);

      // Отправляем транзакцию
      const depositTx = await bank.connect(user2).deposit({ value: txEthAmount })
      await depositTx.wait();

      expect(depositTx).to.changeEtherBalances([user2, bank], [-txEthAmount, txEthAmount]);

      // Получаем обновленные балансы пользователей
      const bankBalanceAfter = await ethers.provider.getBalance(bank.target);
      const finalUser2Balance = await ethers.provider.getBalance(user2.address);
    
      console.log(`Bank final balance: ${ethers.formatEther(bankBalanceAfter)} ETH`);
      console.log(`User2 final balance: ${ethers.formatEther(finalUser2Balance)} ETH`);
      });

    /**
     * @dev Проверяем создание события Deposit
     */
    it("Deposit emit created", async function () {
      // Проверяем, что событие Deposit было сгенерировано
      await expect(bank.connect(user2).deposit({ value: txEthAmount }))
      .to.emit(bank, "Deposit")
      .withArgs(user2.address, txEthAmount);
    });

    // Тесты TheGraph
    describe("TheGraph successfullyDeposit and totalAmount user amount", function () {
      /**
       * @dev проверяем первый депозит юзера
       */
      it(`address ${GraphDepositedAddress} already deposited 0.001 ETH `, async function () {
        let depositedAmount = ethers.parseEther("0.001");

        const query = `
          query {
            deposits(where: { user: "${GraphDepositedAddress}" }) {
              user {
                id
              }
              amount
            }
          }
        `;
      
        const response = await fetch('https://api.studio.thegraph.com/query/90870/nativebank/v.0.0.4', {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query })
        });
      
        const result = await response.json();
      
        // Проверяем результат
        expect(result.data.deposits[0].user.id).to.equal(GraphDepositedAddress);
        expect(result.data.deposits[0].amount).to.equal(depositedAmount);

        console.log(`User ${GraphDepositedAddress} | firstDeposit: ${ethers.formatEther(depositedAmount)} ETH`);
      });

      /**
       * @dev проверяем первый депозит юзера
       */
      it(`address ${GraphDepositedAddress} total depositAmount 0.002 ETH`, async function () {
        let totalDepositAmount = ethers.parseEther("0.002");
      
        const query = `
        query {
          users(where: { id: "${GraphDepositedAddress}" }) {
            id
            balance
          }
        }
        `;
      
        const response = await fetch('https://api.studio.thegraph.com/query/90870/nativebank/v.0.0.4', {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query })
        });
      
        const result = await response.json();
      
        // Преобразуем баланс из строки в BigInt
        const userBalance = BigInt(result.data.users[0].balance);
      
        // Проверяем результат
        expect(userBalance).to.be.eq(totalDepositAmount); // проверяем, что баланс получен и совпадает
        console.log(`User ${GraphDepositedAddress} | total balance: ${ethers.formatEther(userBalance)} ETH`);
      });      
    });
  });
});
