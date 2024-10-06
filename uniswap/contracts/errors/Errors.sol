// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @dev Только владелец может вывести эфир с контракта.
 */
error Token__OnlyOwnerCanCallThisFunction();