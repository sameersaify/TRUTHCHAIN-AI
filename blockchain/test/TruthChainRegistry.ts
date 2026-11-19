import { expect } from "chai";
import { ethers } from "hardhat";

const H = (n: number) => ethers.zeroPadValue(ethers.toBeHex(n), 32);

describe("TruthChainRegistry", () => {
  async function setup() {
    const [admin, registrar, stranger] = await ethers.getSigners();
    const reg = await ethers.deployContract("TruthChainRegistry", [admin.address]);
    await reg.connect(admin).grantRole(await reg.REGISTRAR_ROLE(), registrar.address);
    return { reg, admin, registrar, stranger };
  }

  it("rejects a zero admin address", async () => {
    await expect(ethers.deployContract("TruthChainRegistry", [ethers.ZeroAddress]))
      .to.be.revertedWithCustomError(await ethers.getContractFactory("TruthChainRegistry"), "ZeroAddress");
  });

  it("lets only a registrar register", async () => {
    const { reg, stranger } = await setup();
    await expect(reg.connect(stranger).registerScan(H(1), H(2), H(3), 0))
      .to.be.revertedWithCustomError(reg, "AccessControlUnauthorizedAccount");
  });

  it("registers, emits an event and reads back", async () => {
    const { reg, registrar } = await setup();
    await expect(reg.connect(registrar).registerScan(H(1), H(2), H(3), 0))
      .to.emit(reg, "ScanRegistered").withArgs(H(1), H(2), H(3), 0, registrar.address, (t: bigint) => t > 0n);
    const rec = await reg.getScan(H(1));
    expect(rec.fileHash).to.equal(H(2));
    expect(rec.reportHash).to.equal(H(3));
    expect(rec.registeredBy).to.equal(registrar.address);
    expect(rec.exists).to.equal(true);
  });

  it("rejects zero hashes and invalid media types", async () => {
    const { reg, registrar } = await setup();
    await expect(reg.connect(registrar).registerScan(H(0), H(2), H(3), 0)).to.be.revertedWithCustomError(reg, "ZeroHash");
    await expect(reg.connect(registrar).registerScan(H(1), H(0), H(3), 0)).to.be.revertedWithCustomError(reg, "ZeroHash");
    await expect(reg.connect(registrar).registerScan(H(1), H(2), H(0), 0)).to.be.revertedWithCustomError(reg, "ZeroHash");
    await expect(reg.connect(registrar).registerScan(H(1), H(2), H(3), 9)).to.be.revertedWithCustomError(reg, "InvalidMediaType");
  });

  it("rejects a duplicate scanId but allows the same file under a new scanId", async () => {
    const { reg, registrar } = await setup();
    await reg.connect(registrar).registerScan(H(1), H(2), H(3), 0);
    await expect(reg.connect(registrar).registerScan(H(1), H(2), H(3), 0))
      .to.be.revertedWithCustomError(reg, "ScanAlreadyRegistered");
    await reg.connect(registrar).registerScan(H(10), H(2), H(33), 0); // same file, new scan
  });

  it("verifies matching and non-matching hashes", async () => {
    const { reg, registrar } = await setup();
    await reg.connect(registrar).registerScan(H(1), H(2), H(3), 0);
    expect(await reg.verifyScan(H(1), H(2), H(3))).to.deep.equal([true, true, true]);
    expect(await reg.verifyScan(H(1), H(9), H(3))).to.deep.equal([true, false, true]);
    expect(await reg.verifyScan(H(1), H(2), H(9))).to.deep.equal([true, true, false]);
    expect(await reg.verifyScan(H(77), H(2), H(3))).to.deep.equal([false, false, false]);
  });

  it("lets the admin revoke a registrar", async () => {
    const { reg, admin, registrar } = await setup();
    await reg.connect(admin).revokeRole(await reg.REGISTRAR_ROLE(), registrar.address);
    await expect(reg.connect(registrar).registerScan(H(1), H(2), H(3), 0))
      .to.be.revertedWithCustomError(reg, "AccessControlUnauthorizedAccount");
  });
});
