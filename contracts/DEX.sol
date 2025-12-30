// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract DEX is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // State variables
    IERC20 public immutable tokenX;
    IERC20 public immutable tokenY;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    // Events to track activity
    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1);
    event Swap(address indexed sender, uint256 amountIn, uint256 amountOut, address tokenIn, address tokenOut);
    event LiquidityAdded(address indexed provider, uint256 amountX, uint256 amountY, uint256 shares);
    event LiquidityRemoved(address indexed provider, uint256 amountX, uint256 amountY, uint256 shares);

    constructor(address _tokenX, address _tokenY) {
        require(_tokenX != address(0), "Invalid token address");
        require(_tokenY != address(0), "Invalid token address");
        tokenX = IERC20(_tokenX);
        tokenY = IERC20(_tokenY);
    }

    /* * @notice Adds liquidity to the pool
     * @param amountX The amount of Token X to add
     * @param amountY The amount of Token Y to add
     * @return shares The amount of LP tokens (shares) minted
     */
    function addLiquidity(uint256 amountX, uint256 amountY) external nonReentrant returns (uint256 shares) {
        tokenX.safeTransferFrom(msg.sender, address(this), amountX);
        tokenY.safeTransferFrom(msg.sender, address(this), amountY);

        uint256 reserveX = tokenX.balanceOf(address(this));
        uint256 reserveY = tokenY.balanceOf(address(this));

        if (totalSupply == 0) {
            shares = Math.sqrt(amountX * amountY);
        } else {
            // Calculate shares based on the smallest ratio to prevent manipulation
            shares = Math.min(
                (amountX * totalSupply) / (reserveX - amountX),
                (amountY * totalSupply) / (reserveY - amountY)
            );
        }

        require(shares > 0, "Shares must be > 0");
        _mint(msg.sender, shares);
        
        emit LiquidityAdded(msg.sender, amountX, amountY, shares);
    }

    /*
     * @notice Removes liquidity from the pool
     * @param shares The amount of LP tokens to burn
     * @return amountX The amount of Token X returned
     * @return amountY The amount of Token Y returned
     */
    function removeLiquidity(uint256 shares) external nonReentrant returns (uint256 amountX, uint256 amountY) {
        require(balanceOf[msg.sender] >= shares, "Insufficient balance");

        uint256 reserveX = tokenX.balanceOf(address(this));
        uint256 reserveY = tokenY.balanceOf(address(this));

        amountX = (shares * reserveX) / totalSupply;
        amountY = (shares * reserveY) / totalSupply;

        _burn(msg.sender, shares);

        tokenX.safeTransfer(msg.sender, amountX);
        tokenY.safeTransfer(msg.sender, amountY);

        emit LiquidityRemoved(msg.sender, amountX, amountY, shares);
    }

    /*
     * @notice Swaps one token for another
     * @param amountIn The amount of tokens to swap
     * @param tokenIn The address of the token being sold
     * @return amountOut The amount of tokens bought
     */
    function swap(uint256 amountIn, address tokenIn) external nonReentrant returns (uint256 amountOut) {
        require(amountIn > 0, "Amount must be > 0");
        require(tokenIn == address(tokenX) || tokenIn == address(tokenY), "Invalid token");

        bool isTokenX = tokenIn == address(tokenX);
        (IERC20 tokenInContract, IERC20 tokenOutContract) = isTokenX ? (tokenX, tokenY) : (tokenY, tokenX);
        
        uint256 reserveIn = tokenInContract.balanceOf(address(this));
        uint256 reserveOut = tokenOutContract.balanceOf(address(this));

        tokenInContract.safeTransferFrom(msg.sender, address(this), amountIn);

        // Constant Product Formula: x * y = k
        // We charge a 0.3% fee. So amountInWithFee = amountIn * 997
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;

        amountOut = numerator / denominator;

        require(amountOut > 0, "Insufficient output amount");
        tokenOutContract.safeTransfer(msg.sender, amountOut);

        emit Swap(msg.sender, amountIn, amountOut, address(tokenInContract), address(tokenOutContract));
    }

    // Internal functions to manage LP tokens
    function _mint(address to, uint256 amount) private {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Mint(to, amount, 0); // specific event for LP minting
    }

    function _burn(address from, uint256 amount) private {
        balanceOf[from] -= amount;
        totalSupply -= amount;
        emit Burn(from, amount, 0);
    }
}