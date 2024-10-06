import { ethers } from "./setup";
import { expect } from "chai";
import { MyERC20Token, IUniswapV2Router02, IUniswapV2Factory } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";


describe("Interaction with UniswapV2 - Forked Mainnet", function () {
    // address UniswapV2 роутера
    const UniswapV2RouterAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    // address UniswapV2Factory
    const UniswapV2Factory = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
    // контракт ERC20 токена
    let token: MyERC20Token;
    // контракт роутера
    let router: IUniswapV2Router02;
    // контракт Factory;
    let factory: IUniswapV2Factory;
    // владельцец токена/LP
    let owner: SignerWithAddress;
    // пользователь
    let user: SignerWithAddress;

    // Подключаемся к контрактам и получаем необходимые данные
    before(async function () {
        [owner, user] = await ethers.getSigners();

        // Деплоим ERC20 токен
        const myERC20Token = await ethers.getContractFactory("MyERC20Token");
        token = await myERC20Token.deploy(owner.address);
        await token.waitForDeployment();

        // Подключаемся к UniswapV2Router
        router = await ethers.getContractAt("IUniswapV2Router02", UniswapV2RouterAddress);
        // Подключаемся к Factory
        factory = await ethers.getContractAt("IUniswapV2Factory", UniswapV2Factory);
    });

    // Первый блок: проверяем баланс ETH и минтим токены владельцу
    describe("Initial Setup", function () {
        // Проверка ETH баланса владельца
        it("Owner's ETH balance should not be 0", async function () {
            const ownerBalance = await ethers.provider.getBalance(owner.address);
            expect(ownerBalance).to.be.gt(0);
        });

        // Проверка минта ERC20 токенов владельцу
        it("Should mint ERC20 tokens to owner", async function () {
          
          // баланс owner'а изначально 0
          const ownerTokenBalanceBefore = await token.balanceOf(owner.address);
          expect(ownerTokenBalanceBefore).to.be.eq(0);
          
          // минтим owner'y 100_000 токенов
          const mintTokenAmount = ethers.parseUnits('100000', 18);
      
          const mintTokenTx = await token.mint(owner, mintTokenAmount);
          await mintTokenTx.wait()
          
          // баланс владельца больше 0
          const ownerTokenBalanceAfter = await token.balanceOf(owner.address);
          expect(ownerTokenBalanceAfter).to.be.gt(ownerTokenBalanceBefore);
          
          // баланс владельца не равен начальному балансу
          expect(ownerTokenBalanceAfter).to.be.eq(mintTokenAmount);
        });
    });

    // Второй блок: создаем LP пару на Uniswap
    describe("Create LP Pair", function () {
        it("Should create LP pair with 5000 ETH and 50,000 tokens", async function () {
            const lpDepositTokenAmount = ethers.parseUnits("50000", 18); // 50,000 токенов
            const lpDepositEthAmount = ethers.parseEther("5000"); // 5000 ETH
            const finalOwnerLPBalance = 15811388300841896658994n;

            // Апрув токенов для Uniswap
            await token.approve(router.target, lpDepositTokenAmount);

            // Добавляем ликвидность (ETH + токены)
            await router.addLiquidityETH(
                token.target,
                lpDepositTokenAmount,
                lpDepositTokenAmount,
                lpDepositEthAmount,
                owner.address,
                ethers.MaxUint256,
                { value: lpDepositEthAmount }
            );
            // Проверяем остатки
            const ownerTokenBalance = await token.balanceOf(owner.address);
            expect(ownerTokenBalance).to.be.eq(lpDepositTokenAmount);

            const pairAddress = await factory.getPair(token.target, await router.WETH());
            const pairContract = await ethers.getContractAt("IUniswapV2Pair", pairAddress);
            const reserves = await pairContract.getReserves();
            
            // проверяем резервы пула
            expect(reserves[0]).to.be.eq(lpDepositTokenAmount); // Токены в пуле
            expect(reserves[1]).to.be.eq(lpDepositEthAmount); // ETH в пуле

            // проверяем баланс ЛП владельца
            expect(await pairContract.balanceOf(owner.address)).to.be.eq(finalOwnerLPBalance);
        });
    });

    // Третий блок: покупаем токены через Uniswap
    describe("Buy Tokens via Uniswap", function () {
        it("User should be able to buy tokens using ETH", async function () {
            const ethToSpend = ethers.parseEther("10"); // 10 ETH для покупки
            const minTokenToReceive = ethers.parseUnits("49", 18);

            // Баланс пользователя до покупки
            const initialUserTokenBalance = await token.balanceOf(user.address);

            // Пользователь покупает токены через Uniswap
            await router.connect(user).swapExactETHForTokens(
              minTokenToReceive, // slippege to recieve
              [await router.WETH(), token.target],
              user.address,
              ethers.MaxUint256,
              { value: ethToSpend }
            );

            // Проверяем, что баланс пользователя увеличился
            const finalUserTokenBalance = await token.balanceOf(user.address);
            expect(finalUserTokenBalance).to.be.gt(initialUserTokenBalance);
        });
    });
});
