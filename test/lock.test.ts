import { anyValue } from "@nomicfoundation/hardhat-ethers-chai-matchers/withArgs";
import { expect } from "chai";
import hre from "hardhat";

describe("Lock", function () {
  async function deployOneYearLockFixture(connection: Awaited<ReturnType<typeof hre.network.connect>>) {
    const ONE_YEAR_IN_SECS = 365n * 24n * 60n * 60n;
    const ONE_GWEI = 1_000_000_000n;

    const { ethers, networkHelpers } = connection;

    const lockedAmount = ONE_GWEI;
    const unlockTime = BigInt(await networkHelpers.time.latest()) + ONE_YEAR_IN_SECS;

    const [owner, otherAccount] = await ethers.getSigners();
    const Lock = await ethers.getContractFactory("Lock");
    const lock = await Lock.deploy(unlockTime, { value: lockedAmount });

    return { lock, unlockTime, lockedAmount, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right unlockTime", async function () {
      const connection = await hre.network.connect();
      const { lock, unlockTime } = await connection.networkHelpers.loadFixture(deployOneYearLockFixture);

      expect(await lock.unlockTime()).to.equal(unlockTime);
    });

    it("Should set the right owner", async function () {
      const connection = await hre.network.connect();
      const { lock, owner } = await connection.networkHelpers.loadFixture(deployOneYearLockFixture);

      expect(await lock.owner()).to.equal(owner.address);
    });

    it("Should receive and store the funds to lock", async function () {
      const connection = await hre.network.connect();
      const { lock, lockedAmount } = await connection.networkHelpers.loadFixture(deployOneYearLockFixture);

      expect(await connection.ethers.provider.getBalance(lock.target)).to.equal(lockedAmount);
    });

    it("Should fail if the unlockTime is not in the future", async function () {
      const connection = await hre.network.connect();
      const latestTime = await connection.networkHelpers.time.latest();
      const Lock = await connection.ethers.getContractFactory("Lock");

      await expect(Lock.deploy(latestTime, { value: 1n })).to.be.revertedWith("Unlock time should be in the future");
    });
  });

  describe("Withdrawals", function () {
    describe("Validations", function () {
      it("Should revert with the right error if called too soon", async function () {
        const connection = await hre.network.connect();
        const { lock } = await connection.networkHelpers.loadFixture(deployOneYearLockFixture);

        await expect(lock.withdraw()).to.be.revertedWith("You can't withdraw yet");
      });

      it("Should revert with the right error if called from another account", async function () {
        const connection = await hre.network.connect();
        const { lock, unlockTime, otherAccount } =
          await connection.networkHelpers.loadFixture(deployOneYearLockFixture);

        await connection.networkHelpers.time.increaseTo(unlockTime);

        await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith("You aren't the owner");
      });

      it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
        const connection = await hre.network.connect();
        const { lock, unlockTime } = await connection.networkHelpers.loadFixture(deployOneYearLockFixture);

        await connection.networkHelpers.time.increaseTo(unlockTime);

        await lock.withdraw();
      });
    });

    describe("Events", function () {
      it("Should emit an event on withdrawals", async function () {
        const connection = await hre.network.connect();
        const { lock, unlockTime, lockedAmount } =
          await connection.networkHelpers.loadFixture(deployOneYearLockFixture);

        await connection.networkHelpers.time.increaseTo(unlockTime);

        await expect(lock.withdraw()).to.emit(lock, "Withdrawal").withArgs(lockedAmount, anyValue);
      });
    });

    describe("Transfers", function () {
      it("Should transfer the funds to the owner", async function () {
        const connection = await hre.network.connect();
        const { lock, unlockTime, lockedAmount, owner } =
          await connection.networkHelpers.loadFixture(deployOneYearLockFixture);

        await connection.networkHelpers.time.increaseTo(unlockTime);

        await expect(() => lock.withdraw()).to.changeEtherBalances(
          connection.ethers,
          [owner, lock],
          [lockedAmount, -lockedAmount],
        );
      });
    });
  });
});
