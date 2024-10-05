// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./errors/Errors.sol";

// контракт моего стейбл коина
contract StableCoin is ERC20 {
    // владелец 
    address immutable public owner;
    // mint && burn контракт менеджер
    address immutable public manager;

    /**
     * @dev Конструктор вызывается при создании контракта
     * @param _owner - адрес владальца токена
     * @param _manager - адрес контракт менеджера
     */
    constructor(address _owner, address _manager) ERC20("StableCoin", "sUSD") {
        owner = _owner;
        manager = _manager;
    }

    // Модификатор проверяет, что данную функцию может вызывать только владелец контракта или менеджер.
    modifier onlyOwnerOrManager() {
        require(msg.sender == owner || msg.sender == manager, StableCoin__OnlyOwnerOrManagerCanMintToken());
        _;
    }

    /**
     * @dev Вызывается для минта токенов, может быть вызвана только владельцем или менеджером
     * @param to - адрес того кому минтим.
     * @param amount - значение сколько минтим
     */
    function mint(address to, uint256 amount) external onlyOwnerOrManager {
        _mint(to, amount);
    }
}
