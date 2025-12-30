# Decentralized Exchange (DEX) with Automated Market Maker

A robust implementation of a Decentralized Exchange (DEX) using the Automated Market Maker (AMM) protocol. This project implements the constant product formula ($x \times y = k$) to facilitate decentralized token swapping, liquidity provision, and fee collection.

## 📌 Overview
This DEX allows users to trade ERC20 tokens in a trustless environment without an order book. It features a complete liquidity management system where users can deposit tokens to earn shares of the pool and trading fees.

**Deployed Address (Localhost):** `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`

## ✨ Features
* **Token Swapping:** Instant swaps between two ERC20 tokens using AMM logic.
* **Liquidity Management:**
    * **Add Liquidity:** Users can deposit token pairs to mint LP (Liquidity Provider) shares.
    * **Remove Liquidity:** Users can burn shares to withdraw their underlying assets + accumulated fees.
* **Fee System:** A 0.3% trading fee is applied to every swap and distributed to liquidity providers.
* **Slippage Protection:** Prevents trades that result in zero output.
* **Security:** Protected against reentrancy attacks and integer overflows.

## 🏗 Architecture
The system consists of the following core components:

* **`DEX.sol`**: The main smart contract containing the AMM logic (pricing, swapping, liquidity minting/burning).
* **`MockERC20.sol`**: A standard ERC20 implementation used to simulate "Token X" and "Token Y" for testing purposes.
* **Dockerized Environment**: A self-contained testing environment using Node.js 20 to ensure consistent execution.

## 🧮 Mathematical Implementation
The DEX uses the **Constant Product Formula** to determine prices and maintain reserves.

### 1. The Invariant
$$x \times y = k$$
*Where $x$ and $y$ are the reserves of the two tokens, and $k$ is a constant.*

### 2. Swap Calculation (with Fees)
When a user inputs `dx` amount of tokens, the output `dy` is calculated as:
$$dy = \frac{y \cdot dx \cdot 997}{x \cdot 1000 + dx \cdot 997}$$
*Note: The factor `997` represents the 0.3% fee deduction (1000 - 3).*

### 3. Liquidity Shares
* **Initial Mint:** $Shares = \sqrt{amountX \cdot amountY}$
* **Subsequent Mints:** $Shares = \min(\frac{amountX \cdot TotalShares}{ReserveX}, \frac{amountY \cdot TotalShares}{ReserveY})$

## 🚀 Setup & Installation

### Prerequisites
* Node.js (v18 or v20)
* Docker & Docker Compose

### Option 1: Running with Docker (Recommended)
The project is fully containerized. You can run the entire suite with one command:

```bash
# 1. Start the container
docker-compose up -d --build

# 2. Compile contracts
docker-compose exec app npx hardhat compile

# 3. Run all 25+ tests
docker-compose exec app npx hardhat test

# 4. Check Code Coverage (>80%)
docker-compose exec app npx hardhat coverage

# 5. Stop the container
docker-compose down
```

Option 2: Running Locally

```bash
# Install dependencies
npm install

# Compile
npx hardhat compile

# Run Tests
npx hardhat test
```

🛡 Security Considerations
Reentrancy Protection: All state-changing functions (swap, addLiquidity, removeLiquidity) use OpenZeppelin's nonReentrant modifier.

Safe Transfers: The contract uses SafeERC20 to handle non-standard token implementations that might fail silently.

Ratio Manipulation: Liquidity addition checks ensure subsequent deposits match the current pool ratio to prevent value dilution.

Zero Address Checks: Deployment ensures no invalid token addresses are used.

⚠️ Known Limitations
Single Pair: This contract deployment supports only one specific pair of tokens (Token X / Token Y).

No Deadline: The swap function does not currently include a timestamp deadline, meaning a transaction could theoretically be pending for a long time (though unlikely on modern L2s).

No Slippage Parameter: While the contract ensures output > 0, strict minimum amount output parameters (slippage tolerance) are left for the frontend to calculate.