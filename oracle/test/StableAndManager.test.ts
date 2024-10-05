import { loadFixture, ethers } from "./setup";
import { expect } from "chai";

describe("StableCoin and Manager - Forked Mainnet", function () {
    // Адрес Chainlink оракула ETH/USD на Ethereum mainnet 
   const priceFeedAddress = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
   let futureManagerAddress: string;
   let futureStableCoinAddress: string;
    
  // Функция для расчета адреса контракта на основе создателя и nonce
  function calculateContractAddress(deployerAddress: string, nonce: number) {
    return ethers.getCreateAddress({ from: deployerAddress, nonce });
  }

  // Фикстура для деплоя контрактов
  async function deployContractsFixture() {
    const [owner, user1, user2] = await ethers.getSigners();
    const deployer = owner;

    // Получаем nonce для расчета адресов
    const managerNonce = await ethers.provider.getTransactionCount(deployer.address);
    const nextTxNonceNumber = 1;

    // Рассчитываем адреса будущих контрактов
    futureManagerAddress = calculateContractAddress(deployer.address, managerNonce);
    futureStableCoinAddress = calculateContractAddress(deployer.address, managerNonce + nextTxNonceNumber);

    // Теперь деплоим Manager, передав уже развернутый адрес StableCoin
    const ManagerFactory = await ethers.getContractFactory("Manager");
    const manager = await ManagerFactory.deploy(futureStableCoinAddress, priceFeedAddress, owner.address);
    await manager.waitForDeployment();

    // Деплоим StableCoin, передав будущий адрес Manager
    const StableCoinFactory = await ethers.getContractFactory("StableCoin");
    const stableCoin = await StableCoinFactory.deploy(owner.address, futureManagerAddress);
    await stableCoin.waitForDeployment();
    return { stableCoin, manager, owner, user1, user2 };
  } 

  // Тесты по того что адреса контрактов были верно расчитаны
  describe("Address Calculation", function () {
    /**
     * @dev Проверяем, что корректно рассчитали адреса будущих контрактов и они совпадают с фактическими адресами после деплоя.
     */
    it("Should correctly calculate the future contract address and match the deployed address", async function () {
    const { stableCoin, manager } = await loadFixture(deployContractsFixture);
      expect(futureManagerAddress).to.be.eq(manager.target);
      expect(futureStableCoinAddress).to.be.eq(stableCoin.target);
    })
  });

  // Тесты по проверке функциональности контрактов
  describe("Mint StableCoins", function () {
    /**
     * @dev Проверяем, что пользователь может заминтить токены, отправив эфир на контракт.
     */
    it("Should mint stable coins when user sends ETH", async function () {
      const { stableCoin, manager, user1 } = await loadFixture(deployContractsFixture);

      const initialBalance = await stableCoin.balanceOf(user1.address);

      // Пользователь отправляет 1 ETH на контракт менеджера
      await manager.connect(user1).mintStableCoins({ value: ethers.parseUnits("1", 18) });

      // Проверяем, что баланс пользователя изменился
      const balance = await stableCoin.balanceOf(user1.address);
      expect(balance).to.be.gt(initialBalance);
    });

    /**
     * @dev Проверяем, что нельзя отправить нулевое значение ETH.
     */
    it("Should fail if user sends 0 ETH", async function () {
      const { manager, user1 } = await loadFixture(deployContractsFixture);

      // Ожидаем revert при попытке отправить 0 ETH
      await expect(manager.connect(user1).mintStableCoins({ value: 0 }))
        .to.be.revertedWithCustomError(manager, "Manager__ETHAmountCannotBeZero");
    });

		/**
     * @dev Проверяем, что фактическое количество заминченных токенов совпадает с расчетным на основе цены оракула.
     */
		it("Should correctly mint stable coins based on oracle price", async function () {
			const { manager, stableCoin, user1 } = await loadFixture(deployContractsFixture);

			// Получаем текущую цену ETH/USD с оракула
			const ethPrice = await manager.getLatestPrice();

			// Допустим, пользователь отправляет 1 ETH (1e18 wei)
			const ethAmount = ethers.parseUnits("1", 18);
			
			// Рассчитываем количество токенов, которое должно быть заминчено
      const expectedTokenAmount = (ethAmount * ethPrice) / ethers.WeiPerEther;

			// Минтим токены для пользователя
			await manager.connect(user1).mintStableCoins({ value: ethAmount });

			// Проверяем, что количество заминченных токенов для пользователя совпадает с расчетным
			const actualTokenAmount = await stableCoin.balanceOf(user1.address);
			expect(actualTokenAmount).to.equal(expectedTokenAmount);
		});
  });

  describe("Withdraw ETH", function () {
    /**
     * @dev Проверяем, что владелец может вывести эфир с контракта.
     */
    it("Owner can withdraw ETH from the contract", async function () {
      const { manager, owner, user1 } = await loadFixture(deployContractsFixture);

      // Пользователь отправляет 1 ETH на контракт менеджера
      await manager.connect(user1).mintStableCoins({ value: ethers.parseUnits("1", 18) });

      const initialBalance = await ethers.provider.getBalance(owner.address);

      // Владелец выводит 1 ETH
      await manager.connect(owner).withdrawETH(ethers.parseUnits("1", 18));

      // Проверяем, что баланс владельца увеличился
      const finalBalance = await ethers.provider.getBalance(owner.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });

    /**
     * @dev Проверяем, что нельзя вывести больше эфира, чем есть на балансе контракта.
     */
    it("Should fail if trying to withdraw more ETH than contract balance", async function () {
      const { manager, owner } = await loadFixture(deployContractsFixture);

      // Ожидаем revert при попытке вывести больше, чем есть на балансе
      await expect(manager.connect(owner).withdrawETH(ethers.parseUnits("1", 18)))
			.to.be.revertedWithCustomError(
        manager, "Manager__WithdrawAmountExceedsContractBalance"
      );
    });
  });
});
