// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ISchemaResolver} from "../DotVerify.sol";

/// @title PaymentResolver — Requires a deposit before attesting
/// @notice Users call `deposit()` first, then the resolver deducts the fee on attest
contract PaymentResolver is ISchemaResolver {
    address public owner;
    uint256 public fee;
    mapping(address => uint256) public balances;

    constructor(uint256 _fee) {
        owner = msg.sender;
        fee = _fee;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    function setFee(uint256 _fee) external onlyOwner {
        fee = _fee;
    }

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external onlyOwner {
        (bool ok,) = owner.call{value: address(this).balance}("");
        require(ok, "withdraw failed");
    }

    function onAttest(bytes32, address issuer, address, bytes calldata) external returns (bool) {
        if (balances[issuer] < fee) return false;
        balances[issuer] -= fee;
        return true;
    }

    function onRevoke(bytes32, address) external pure returns (bool) {
        return true;
    }
}

/// @title TokenGateResolver — Requires minimum ERC20 balance to attest
contract TokenGateResolver is ISchemaResolver {
    address public token;
    uint256 public minBalance;

    constructor(address _token, uint256 _minBalance) {
        token = _token;
        minBalance = _minBalance;
    }

    function onAttest(bytes32, address issuer, address, bytes calldata) external view returns (bool) {
        (bool ok, bytes memory result) = token.staticcall(
            abi.encodeWithSignature("balanceOf(address)", issuer)
        );
        if (!ok || result.length < 32) return false;
        return abi.decode(result, (uint256)) >= minBalance;
    }

    function onRevoke(bytes32, address) external pure returns (bool) {
        return true;
    }
}

/// @title AllowlistResolver — Only whitelisted addresses can attest
contract AllowlistResolver is ISchemaResolver {
    address public owner;
    mapping(address => bool) public allowed;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    function addToAllowlist(address addr) external onlyOwner {
        allowed[addr] = true;
    }

    function removeFromAllowlist(address addr) external onlyOwner {
        allowed[addr] = false;
    }

    function onAttest(bytes32, address issuer, address, bytes calldata) external view returns (bool) {
        return allowed[issuer];
    }

    function onRevoke(bytes32, address revoker) external view returns (bool) {
        return allowed[revoker];
    }
}
