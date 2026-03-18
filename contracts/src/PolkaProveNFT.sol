// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title PolkaProveNFT — Soulbound ERC-721 with on-chain SVG
interface IPolkaProve {
    function soulboundTokens(uint256 tokenId) external view returns (
        address holder, bytes32 anchorId, string memory credentialType, uint256 mintedAt
    );
    function sbtNextId() external view returns (uint256);
    function getHolderTokens(address holder) external view returns (uint256[] memory);
}

contract PolkaProveNFT {
    IPolkaProve public immutable polkaProve;
    string public constant name = "PolkaProve Credential";
    string public constant symbol = "PPROVE";

    constructor(address _polkaProve) {
        polkaProve = IPolkaProve(_polkaProve);
    }

    function totalSupply() external view returns (uint256) {
        return polkaProve.sbtNextId();
    }

    function balanceOf(address owner) external view returns (uint256) {
        return polkaProve.getHolderTokens(owner).length;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        (address holder,,,) = polkaProve.soulboundTokens(tokenId);
        require(holder != address(0), "nonexistent");
        return holder;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        (address holder,, string memory credType,) = polkaProve.soulboundTokens(tokenId);
        require(holder != address(0), "nonexistent");

        string memory color = "#E6007A";
        bytes32 h = keccak256(bytes(credType));
        if (h == keccak256("kyc")) color = "#10B981";
        else if (h == keccak256("trader")) color = "#F59E0B";
        else if (h == keccak256("investor")) color = "#8B5CF6";

        // Return raw SVG data URI (no base64 needed)
        return string(abi.encodePacked(
            "data:image/svg+xml,",
            "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 500'%3E",
            "%3Crect width='400' height='500' rx='24' fill='", color, "'/%3E",
            "%3Ctext x='30' y='45' fill='white' font-family='monospace' font-size='14'%3EPolkaProve%3C/text%3E",
            "%3Ctext x='370' y='45' fill='white' font-family='monospace' font-size='10' text-anchor='end'%3ESOULBOUND%3C/text%3E",
            "%3Ctext x='200' y='220' fill='white' font-family='sans-serif' font-size='36' font-weight='bold' text-anchor='middle'%3E", credType, "%3C/text%3E",
            "%3Ctext x='200' y='260' fill='white' font-family='monospace' font-size='12' text-anchor='middle' opacity='0.7'%3E%23", _toString(tokenId), "%3C/text%3E",
            "%3Ctext x='30' y='470' fill='white' font-family='monospace' font-size='10' opacity='0.5'%3EPolkadot Hub | zkTLS Verified%3C/text%3E",
            "%3C/svg%3E"
        ));
    }

    function _toString(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 d; uint256 t = v;
        while (t != 0) { d++; t /= 10; }
        bytes memory b = new bytes(d);
        while (v != 0) { d--; b[d] = bytes1(uint8(48 + v % 10)); v /= 10; }
        return string(b);
    }

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    /// @notice Register an existing SBT to make it visible on explorers
    function register(uint256 tokenId) external {
        (address holder,,,) = polkaProve.soulboundTokens(tokenId);
        require(holder != address(0), "nonexistent");
        emit Transfer(address(0), holder, tokenId);
    }

    // Soulbound — block all transfers
    function transferFrom(address, address, uint256) external pure { revert("SOULBOUND"); }
    function safeTransferFrom(address, address, uint256) external pure { revert("SOULBOUND"); }
    function approve(address, uint256) external pure { revert("SOULBOUND"); }
}
