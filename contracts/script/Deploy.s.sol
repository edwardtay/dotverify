// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../src/DotVerify.sol";
import "../src/resolvers/ExampleResolvers.sol";

contract DeployDotVerify is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        DotVerify dv = new DotVerify();
        console.log("DotVerify deployed at:", address(dv));

        AllowlistResolver resolver = new AllowlistResolver();
        console.log("AllowlistResolver deployed at:", address(resolver));

        // Add the deployer to the allowlist
        address deployer = vm.addr(deployerPrivateKey);
        resolver.addToAllowlist(deployer);
        console.log("Deployer added to allowlist:", deployer);

        vm.stopBroadcast();
    }
}
