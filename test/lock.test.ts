import { anyValue } from "@nomicfoundation/hardhat-viem-assertions/predicates";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import hre from "hardhat";

const { viem, networkHelpers } = await hre.network.connect();

describe("Lock", function () {
  async function deployOneYearLockFixture() {
    const ONE_YEAR_IN_SECS = 365n * 24n * 60n * 60n;
    const ONE_GWEI = 1_000_000_000n;

    const publicClient = await viem.getPublicClient();
    const [owner, otherAccount] = await viem.getWalletClients();

    const lockedAmount = ONE_GWEI;
    const unlockTime = BigInt(await networkHelpers.time.latest()) + ONE_YEAR_IN_SECS;

    const lock = await viem.deployContract("Lock", [unlockTime], { value: lockedAmount });

    return { lock, unlockTime, lockedAmount, owner, otherAccount, publicClient };
  }

  describe("Deployment", function () {
    it("Should set the right unlockTime", async function () {
      const { lock, unlockTime } = await networkHelpers.loadFixture(deployOneYearLockFixture);

      assert.equal(await lock.read.unlockTime(), unlockTime);
    });

    it("Should set the right owner", async function () {
      const { lock, owner } = await networkHelpers.loadFixture(deployOneYearLockFixture);

      assert.equal((await lock.read.owner()).toLowerCase(), owner.account.address.toLowerCase());
    });

    it("Should receive and store the funds to lock", async function () {
      const { lock, lockedAmount, publicClient } = await networkHelpers.loadFixture(deployOneYearLockFixture);

      assert.equal(await publicClient.getBalance({ address: lock.address }), lockedAmount);
    });

    it("Should fail if the unlockTime is not in the future", async function () {
      const latestTime = await networkHelpers.time.latest();

      await viem.assertions.revertWith(
        viem.deployContract("Lock", [BigInt(latestTime)], { value: 1n }),
        "Unlock time should be in the future",
      );
    });
  });

  describe("Withdrawals", function () {
    describe("Validations", function () {
      it("Should revert with the right error if called too soon", async function () {
        const { lock } = await networkHelpers.loadFixture(deployOneYearLockFixture);

        await viem.assertions.revertWith(lock.write.withdraw(), "You can't withdraw yet");
      });

      it("Should revert with the right error if called from another account", async function () {
        const { lock, unlockTime, otherAccount } = await networkHelpers.loadFixture(deployOneYearLockFixture);

        await networkHelpers.time.increaseTo(unlockTime);

        await viem.assertions.revertWith(
          lock.write.withdraw({ account: otherAccount.account }),
          "You aren't the owner",
        );
      });

      it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
        const { lock, unlockTime } = await networkHelpers.loadFixture(deployOneYearLockFixture);

        await networkHelpers.time.increaseTo(unlockTime);

        await lock.write.withdraw();
      });
    });

    describe("Events", function () {
      it("Should emit an event on withdrawals", async function () {
        const { lock, unlockTime, lockedAmount } = await networkHelpers.loadFixture(deployOneYearLockFixture);

        await networkHelpers.time.increaseTo(unlockTime);

        await viem.assertions.emitWithArgs(lock.write.withdraw(), lock, "Withdrawal", [lockedAmount, anyValue]);
      });
    });

    describe("Transfers", function () {
      it("Should transfer the funds to the owner", async function () {
        const { lock, unlockTime, lockedAmount, owner, publicClient } =
          await networkHelpers.loadFixture(deployOneYearLockFixture);

        await networkHelpers.time.increaseTo(unlockTime);

        const ownerBalanceBefore = await publicClient.getBalance({ address: owner.account.address });
        const hash = await lock.write.withdraw();
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        const ownerBalanceAfter = await publicClient.getBalance({ address: owner.account.address });

        assert.equal(
          ownerBalanceAfter + receipt.gasUsed * receipt.effectiveGasPrice - ownerBalanceBefore,
          lockedAmount,
        );
        assert.equal(await publicClient.getBalance({ address: lock.address }), 0n);
      });
    });
  });
});
