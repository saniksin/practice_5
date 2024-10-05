// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface IDToken {
    function repay(uint256 subAccountId, uint256 amount) external;
    function balanceOf(address) external returns (uint256);
    function decimals() external returns (uint256);
}