// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @dev Генерируется в StableCoin в функциях mint/burn.
 */
error StableCoin__OnlyOwnerOrManagerCanMintToken();

/**
 * @dev Только владелец может вывести эфир с контракта.
 */
error Manager__OnlyOwnerCanCallThisFunction();

/**
 * @dev Недостаточно эфира в контракте для вывода указанной суммы.
 */
error Manager__WithdrawAmountExceedsContractBalance();

/**
 * @dev Ошибка при попытке вывода эфира. Операция не завершилась успешно.
 */
error Manager__WithdrawETHFailed();

/**
 * @dev Сумма эфира не может быть равна нулю.
 */
error Manager__ETHAmountCannotBeZero();
