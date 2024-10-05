// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "./StableCoin.sol";
import "./interfaces/AggregatorV3Interface.sol";
import "./errors/Errors.sol";

contract Manager {
    // адрес токена
    StableCoin immutable public stableCoin;
    // адрес владельца
    address immutable public owner;
    // интерфейс оракула
    AggregatorV3Interface immutable public priceFeed;

    // Константы для работы с форматами
    uint256 public constant PRICE_DECIMALS = 1e10; // Для приведения цены из оракула к формату с 18 знаками
    uint256 public constant ETH_DECIMALS = 1e18; // Для работы с wei (18 десятичных знаков)
    
    /**
     * @dev Конструктор, который задает адрес контракта стейблкоина и Chainlink Oracle для курса ETH/USD.
     * @param _stableCoin - адрес контракта стейблкоина.
     * @param _priceFeed - адрес Chainlink Oracle для получения курса ETH/USD.
     * @param _owner - адрес владельца.
     */
    constructor(address _stableCoin, address _priceFeed, address _owner) {
        stableCoin = StableCoin(_stableCoin);
        priceFeed = AggregatorV3Interface(_priceFeed);
        owner = _owner;
    }

    // Модификатор для проверки, что функцию вызывает владелец.
    modifier onlyOwner() {
        require(msg.sender == owner, Manager__OnlyOwnerCanCallThisFunction());
        _;
    }

    // Функция для получения текущего курса ETH/USD через Chainlink Oracle.
    function getLatestPrice() public view returns (uint) {
        (
            ,
            int price,
            ,
            ,
        ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price from oracle");
        return uint(price) * PRICE_DECIMALS; // Приводим к формату ETH с 18 десятичными знаками.
    }

    /**
     * @dev Владелец может вывести эфир и заминтить соответствующее количество стейблкоинов.
     * @param ethAmount - количество эфира, которое выводим.
     */
    function withdrawETH(uint ethAmount) external onlyOwner {
        require(address(this).balance >= ethAmount, Manager__WithdrawAmountExceedsContractBalance());
        
        (bool success, ) = owner.call{value: ethAmount}("");
        require(success, Manager__WithdrawETHFailed());
    }

    /**
     * @dev Пользователь может минтить стейблкоины, отправив эфир на контракт.
     */
    function mintStableCoins() public payable {
        require(msg.value > 0, Manager__ETHAmountCannotBeZero());

        uint ethAmount = msg.value;
        uint ethPrice = getLatestPrice(); 

        // Рассчитываем количество токенов на основе текущей цены ETH
        uint tokenAmount = (ethAmount * ethPrice) / ETH_DECIMALS;

        // Минтим токены для отправителя
        stableCoin.mint(msg.sender, tokenAmount);
    }
}
