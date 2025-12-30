# DEX AMM Project

## Overview
This project implements a Decentralized Exchange (DEX) using the Automated Market Maker (AMM) protocol. It enables trustless token swapping between two ERC-20 tokens (Token A and Token B) using the constant product formula ($x \times y = k$). Users can provide liquidity to earn a 0.3% trading fee or swap tokens directly via the smart contract.

## Features
- Initial and subsequent liquidity provision
- Liquidity removal with proportional share calculation
- Token swaps using constant product formula (x * y = k)
- 0.3% trading fee for liquidity providers
- LP token minting and burning

## Architecture
The system consists of the following components:
- **`DEX.sol`**: The core smart contract handling liquidity pools, swap logic, and fee accumulation. It manages reserves for Token A and Token B and tracks LP shares.
- **`MockERC20.sol`**: A standard ERC-20 token used to simulate the trading pair for testing purposes.
- **Docker Environment**: A containerized testing environment ensuring consistent execution across different machines.

## Mathematical Implementation

### Constant Product Formula
The DEX uses the invariant $x \times y = k$ to determine exchange rates.
- $x$: Reserve of Token A
- $y$: Reserve of Token B
- $k$: Constant product
When a swap occurs, the product of the reserves must remain greater than or equal to the previous product (before fees).

### Fee Calculation
A 0.3% fee is applied to every trade. This is implemented by adjusting the input amount before calculating the output:
$$amountInWithFee = amountIn \times 997$$
This effectively adds the fee to the reserves, increasing $k$ and rewarding liquidity providers.

### LP Token Minting
- **Initial Liquidity:** $Shares = \sqrt{amountA \times amountB}$
- **Subsequent Liquidity:** shares are minted proportionally to the existing reserves using:
  $$Shares = min(\frac{amountA \times TotalLiquidity}{ReserveA}, \frac{amountB \times TotalLiquidity}{ReserveB})$$

## Setup Instructions

### Prerequisites
- Docker and Docker Compose installed
- Git

### Installation
1. Clone the repository:
```bash
git clone <your-repo-url>
cd dex-amm
```
2. Start Docker environment:

```bash

docker-compose up -d
```
3. Compile contracts:


```bash

docker-compose exec app npm run compile
```
4. Run tests:

```bash

docker-compose exec app npm test
```
5. Check coverage:

```bash

docker-compose exec app npm run coverage
```
6. Stop Docker:

```bash

docker-compose down
```
### Running Tests Locally (without Docker)
```bash

npm install
npm run compile
npm test
```
### Contract Addresses
- **`DEX Contract`**: 0x5FbDB2315678afecb367f032d93F642f64180aa3 (Localhost)

- **`Token A`**: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 (Localhost)

- **`Token B`**: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0 (Localhost)

### Known Limitations
- **`Single Pair`**: This contract specifically handles two tokens defined at deployment.

- **`Slippage`**: While getAmountOut allows front-ends to calculate expected return, the contract currently lacks a minAmountOut parameter for transaction-level slippage protection.

- **`Rounding`**: Integer division in Solidity may result in minor precision loss for very small amounts.

### Security Considerations
- **`Reentrancy Protection`**: All state-changing functions use OpenZeppelin's nonReentrant modifier.

- **`Safe Transfers`**: The contract uses SafeERC20 to handle non-standard token implementations.

- **`Ratio Checks`**: Liquidity addition enforces the current reserve ratio to prevent manipulation of the pool price.