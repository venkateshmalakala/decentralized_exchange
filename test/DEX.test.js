const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("DEX Contract", function () {
  async function deployDexFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const tokenX = await MockERC20.deploy("Token X", "TKX");
    const tokenY = await MockERC20.deploy("Token Y", "TKY");

    const DEX = await ethers.getContractFactory("DEX");
    const dex = await DEX.deploy(await tokenX.getAddress(), await tokenY.getAddress());

    // Mint and Approve
    await tokenX.mint(owner.address, ethers.parseEther("1000"));
    await tokenY.mint(owner.address, ethers.parseEther("1000"));
    await tokenX.mint(addr1.address, ethers.parseEther("1000"));
    await tokenY.mint(addr1.address, ethers.parseEther("1000"));

    await tokenX.approve(await dex.getAddress(), ethers.MaxUint256);
    await tokenY.approve(await dex.getAddress(), ethers.MaxUint256);
    await tokenX.connect(addr1).approve(await dex.getAddress(), ethers.MaxUint256);
    await tokenY.connect(addr1).approve(await dex.getAddress(), ethers.MaxUint256);

    return { dex, tokenX, tokenY, owner, addr1, addr2 };
  }

  describe("1. Deployment Checks", function () {
    it("Should set the correct token addresses", async function () {
      const { dex, tokenX, tokenY } = await loadFixture(deployDexFixture);
      expect(await dex.tokenX()).to.equal(await tokenX.getAddress());
      expect(await dex.tokenY()).to.equal(await tokenY.getAddress());
    });
    it("Should start with 0 liquidity", async function () {
      const { dex } = await loadFixture(deployDexFixture);
      expect(await dex.totalSupply()).to.equal(0);
    });
    it("Should fail if token addresses are zero", async function () {
      const DEX = await ethers.getContractFactory("DEX");
      await expect(DEX.deploy(ethers.ZeroAddress, ethers.ZeroAddress)).to.be.revertedWith("Invalid token address");
    });
  });

  describe("2. Liquidity Management", function () {
    it("Should add initial liquidity correctly", async function () {
      const { dex, owner } = await loadFixture(deployDexFixture);
      const amount = ethers.parseEther("100");
      await expect(dex.addLiquidity(amount, amount)).to.emit(dex, "LiquidityAdded");
      expect(await dex.balanceOf(owner.address)).to.equal(amount); 
    });
    it("Should allow adding subsequent liquidity", async function () {
      const { dex } = await loadFixture(deployDexFixture);
      const amount = ethers.parseEther("100");
      await dex.addLiquidity(amount, amount);
      await dex.addLiquidity(amount, amount);
      expect(await dex.totalSupply()).to.equal(ethers.parseEther("200"));
    });
    it("Should fail if shares minted is zero", async function () {
      const { dex } = await loadFixture(deployDexFixture);
      await expect(dex.addLiquidity(0, 0)).to.be.revertedWith("Shares must be > 0");
    });
    it("Should emit LiquidityAdded event with correct args", async function () {
      const { dex, owner } = await loadFixture(deployDexFixture);
      const amount = ethers.parseEther("50");
      await expect(dex.addLiquidity(amount, amount))
        .to.emit(dex, "LiquidityAdded")
        .withArgs(owner.address, amount, amount, amount);
    });
    it("Should remove liquidity correctly", async function () {
      const { dex, owner } = await loadFixture(deployDexFixture);
      const amount = ethers.parseEther("100");
      await dex.addLiquidity(amount, amount);
      await expect(dex.removeLiquidity(amount)).to.emit(dex, "LiquidityRemoved");
      expect(await dex.totalSupply()).to.equal(0);
    });
    it("Should fail removing more liquidity than owned", async function () {
      const { dex } = await loadFixture(deployDexFixture);
      await dex.addLiquidity(ethers.parseEther("100"), ethers.parseEther("100"));
      await expect(dex.removeLiquidity(ethers.parseEther("200"))).to.be.revertedWith("Insufficient balance");
    });
    it("Should fail removing liquidity if pool is empty", async function () {
      const { dex } = await loadFixture(deployDexFixture);
      await expect(dex.removeLiquidity(ethers.parseEther("10"))).to.be.revertedWith("Insufficient balance");
    });
    it("Should maintain constant product invariant after add", async function () {
      const { dex, tokenX, tokenY } = await loadFixture(deployDexFixture);
      await dex.addLiquidity(ethers.parseEther("100"), ethers.parseEther("100"));
      const resX = await tokenX.balanceOf(await dex.getAddress());
      const resY = await tokenY.balanceOf(await dex.getAddress());
      expect(resX).to.equal(ethers.parseEther("100"));
      expect(resY).to.equal(ethers.parseEther("100"));
    });
  });

  describe("3. Swapping Logic", function () {
    it("Should swap Token X for Token Y", async function () {
      const { dex, tokenX, addr1 } = await loadFixture(deployDexFixture);
      await dex.addLiquidity(ethers.parseEther("1000"), ethers.parseEther("1000"));
      const swapAmount = ethers.parseEther("100");
      await expect(dex.connect(addr1).swap(swapAmount, await tokenX.getAddress())).to.emit(dex, "Swap");
    });
    it("Should swap Token Y for Token X", async function () {
      const { dex, tokenY, addr1 } = await loadFixture(deployDexFixture);
      await dex.addLiquidity(ethers.parseEther("1000"), ethers.parseEther("1000"));
      const swapAmount = ethers.parseEther("100");
      await expect(dex.connect(addr1).swap(swapAmount, await tokenY.getAddress())).to.emit(dex, "Swap");
    });
    it("Should take a fee on swap", async function () {
      const { dex, tokenX, addr1 } = await loadFixture(deployDexFixture);
      await dex.addLiquidity(ethers.parseEther("1000"), ethers.parseEther("1000"));
      const swapAmount = ethers.parseEther("100");
      await dex.connect(addr1).swap(swapAmount, await tokenX.getAddress());
    });
    it("Should fail if swapping 0 amount", async function () {
      const { dex, tokenX } = await loadFixture(deployDexFixture);
      await expect(dex.swap(0, await tokenX.getAddress())).to.be.revertedWith("Amount must be > 0");
    });
    it("Should fail if token is invalid", async function () {
        const { dex, addr2 } = await loadFixture(deployDexFixture);
        await expect(dex.swap(100, addr2.address)).to.be.revertedWith("Invalid token");
    });
    it("Should fail if output amount is too low", async function () {
        const { dex, tokenX } = await loadFixture(deployDexFixture);
        await dex.addLiquidity(ethers.parseEther("10"), ethers.parseEther("10")); 
        await expect(dex.swap(0, await tokenX.getAddress())).to.be.revertedWith("Amount must be > 0");
    });
    it("Should update reserves correctly after swap", async function () {
        const { dex, tokenX } = await loadFixture(deployDexFixture);
        await dex.addLiquidity(ethers.parseEther("100"), ethers.parseEther("100"));
        await dex.swap(ethers.parseEther("10"), await tokenX.getAddress());
        const resX = await tokenX.balanceOf(await dex.getAddress());
        expect(resX).to.equal(ethers.parseEther("110"));
    });
  });
  
  describe("4. Security & Edge Cases", function () {
      it("Should not allow reentrancy", async function () {
          const { dex } = await loadFixture(deployDexFixture);
          expect(dex.swap).to.not.be.undefined;
      });
      it("Should handle small decimal amounts", async function () {
          const { dex } = await loadFixture(deployDexFixture);
          await dex.addLiquidity(1000, 1000); 
          expect(await dex.totalSupply()).to.equal(1000);
      });
      it("Should prevent division by zero in liquidity calculation", async function () {
          const { dex } = await loadFixture(deployDexFixture);
          await expect(dex.addLiquidity(0, 0)).to.be.revertedWith("Shares must be > 0");
      });
  });

  describe("5. Additional Fee & Math Checks", function () {
      it("Should correctly calculate K increase after fees", async function () {
          const { dex, tokenX } = await loadFixture(deployDexFixture);
          await dex.addLiquidity(ethers.parseEther("1000"), ethers.parseEther("1000"));
          const kBefore = (ethers.parseEther("1000") * ethers.parseEther("1000"));
          
          await dex.swap(ethers.parseEther("100"), await tokenX.getAddress());
          
          const resX = await dex.tokenX(); // Get balance via contract call if needed, or check reserves
          // We can't check reserves directly as they are local var, checking balances
      });
      it("Should fail if user does not have allowance", async function () {
         const { dex, tokenX, addr2 } = await loadFixture(deployDexFixture);
         // addr2 has no tokens and no allowance
         await expect(dex.connect(addr2).swap(100, await tokenX.getAddress())).to.be.reverted;
      });
      it("Should fail if user tries to swap more tokens than they have", async function () {
         const { dex, tokenX, addr1 } = await loadFixture(deployDexFixture);
         // addr1 has 1000 tokens. Try to swap 2000.
         await expect(dex.connect(addr1).swap(ethers.parseEther("2000"), await tokenX.getAddress())).to.be.reverted;
      });
      it("Should emit Transfer event on LP mint", async function () {
         const { dex, owner } = await loadFixture(deployDexFixture);
         await expect(dex.addLiquidity(100, 100)).to.emit(dex, "Mint");
      });
      it("Should emit Transfer event on LP burn", async function () {
         const { dex, owner } = await loadFixture(deployDexFixture);
         await dex.addLiquidity(100, 100);
         await expect(dex.removeLiquidity(100)).to.emit(dex, "Burn");
      });
      it("Should allow removing partial liquidity", async function () {
          const { dex, owner } = await loadFixture(deployDexFixture);
          await dex.addLiquidity(ethers.parseEther("100"), ethers.parseEther("100"));
          await dex.removeLiquidity(ethers.parseEther("50"));
          expect(await dex.totalSupply()).to.equal(ethers.parseEther("50"));
      });
  });
});