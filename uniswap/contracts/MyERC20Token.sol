// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./errors/Errors.sol";

// контракт моего стейбл коина
contract MyERC20Token is ERC20 {
    // владелец 
    address immutable public owner;

    /**
     * @dev Конструктор вызывается при создании контракта
     * @param _owner - адрес владальца токена
     */
    constructor(address _owner) ERC20("NinjaFruit", "NJT") {
        owner = _owner;
    }

    // Модификатор проверяет, что данную функцию может вызывать только владелец контракта или менеджер.
    modifier onlyOwner() {
        require(msg.sender == owner, Token__OnlyOwnerCanCallThisFunction());
        _;
    }

    /**
     * @dev Вызывается для минта токенов, может быть вызвана только владельцем или менеджером
     * @param to - адрес того кому минтим.
     * @param amount - значение сколько минтим
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
